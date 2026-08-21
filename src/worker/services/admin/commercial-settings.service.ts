import {
  commercialSettingKeyToProperty,
  type CommercialSettingKey,
} from '../../domain/commercial-access'
import type {
  CommercialSettingsUpdateInput,
  PaymentMethodUpsertInput,
} from '../../schemas/commercial.schemas'
import type { AuthenticatedPrincipal } from '../../types/auth'
import { AppError } from '../../utils/app-error'
import {
  getCommercialSettings,
  getCommercialSettingsDetail,
  listPaymentMethods,
  type CommercialPaymentMethod,
} from '../commercial.service'
import {
  deletePrivateObject,
  storePaymentMethodQr,
} from '../receipt-storage.service'

interface PaymentMethodRow {
  public_id: string
  slug: string
  display_name: string
  account_display_name: string | null
  masked_account_info: string | null
  instructions: string
  qr_object_key: string | null
  enabled: 0 | 1
  position: number
  created_at: string
  updated_at: string
}

export async function updateCommercialSettings(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  input: CommercialSettingsUpdateInput,
  requestId: string,
): Promise<Awaited<ReturnType<typeof getCommercialSettingsDetail>>> {
  const before = await getCommercialSettings(database)
  const values: ReadonlyArray<[CommercialSettingKey, boolean]> = [
    ['public_signup', input.publicSignup],
    ['show_pricing', input.showPricing],
    ['public_checkout', input.publicCheckout],
    ['premium_access_enforcement', input.premiumAccessEnforcement],
  ]
  const changed = values
    .filter(
      ([key, enabled]) =>
        before[commercialSettingKeyToProperty(key)] !== enabled,
    )
    .map(([key, enabled]) => ({ key, enabled }))
  if (changed.length === 0) return getCommercialSettingsDetail(database)

  const updatedAt = new Date().toISOString()
  const statements = changed.map(({ key, enabled }) =>
    database
      .prepare(
        `UPDATE commercial_settings
        SET enabled = ?1, updated_by_user_id = ?2, updated_at = ?3
        WHERE setting_key = ?4`,
      )
      .bind(enabled ? 1 : 0, actor.internalUserId, updatedAt, key),
  )
  statements.push(
    database
      .prepare(
        `INSERT INTO audit_logs(
          actor_user_id, action, entity_type, entity_id, metadata_json
        ) VALUES (?1, 'commercial.settings.changed', 'commercial_settings', 'global', ?2)`,
      )
      .bind(
        actor.internalUserId,
        JSON.stringify({ changed, requestId }),
      ),
  )
  await database.batch(statements)
  return getCommercialSettingsDetail(database)
}

function mapPaymentMethod(row: PaymentMethodRow): CommercialPaymentMethod {
  return {
    id: row.public_id,
    slug: row.slug,
    displayName: row.display_name,
    accountDisplayName: row.account_display_name,
    maskedAccountInfo: row.masked_account_info,
    instructions: row.instructions,
    hasQr: row.qr_object_key !== null,
    enabled: row.enabled === 1,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function upsertCommercialPaymentMethod(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  input: PaymentMethodUpsertInput,
  requestId: string,
): Promise<CommercialPaymentMethod> {
  const publicId = input.publicId ?? crypto.randomUUID()
  await database.batch([
    database
      .prepare(
        `INSERT INTO commercial_payment_methods(
          public_id, slug, display_name, account_display_name,
          masked_account_info, instructions, enabled, position
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ON CONFLICT(public_id) DO UPDATE SET
          slug = excluded.slug,
          display_name = excluded.display_name,
          account_display_name = excluded.account_display_name,
          masked_account_info = excluded.masked_account_info,
          instructions = excluded.instructions,
          enabled = excluded.enabled,
          position = excluded.position,
          updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(
        publicId,
        input.slug,
        input.displayName,
        input.accountDisplayName ?? null,
        input.maskedAccountInfo ?? null,
        input.instructions,
        input.enabled ? 1 : 0,
        input.position,
      ),
    database
      .prepare(
        `INSERT INTO audit_logs(
          actor_user_id, action, entity_type, entity_id, metadata_json
        ) VALUES (?1, 'commercial.payment_method.saved', 'payment_method', ?2, ?3)`,
      )
      .bind(
        actor.internalUserId,
        publicId,
        JSON.stringify({
          slug: input.slug,
          enabled: input.enabled,
          position: input.position,
          requestId,
        }),
      ),
  ])
  const row = await database
    .prepare('SELECT * FROM commercial_payment_methods WHERE public_id = ?1')
    .bind(publicId)
    .first<PaymentMethodRow>()
  if (row === null) {
    throw new AppError(
      500,
      'PAYMENT_METHOD_SAVE_FAILED',
      'Payment method could not be loaded after it was saved.',
    )
  }
  return mapPaymentMethod(row)
}


export async function setCommercialPaymentMethodQr(
  database: D1Database,
  bucket: R2Bucket,
  actor: AuthenticatedPrincipal,
  paymentMethodPublicId: string,
  file: File,
  requestId: string,
): Promise<CommercialPaymentMethod> {
  const existing = await database
    .prepare('SELECT * FROM commercial_payment_methods WHERE public_id = ?1')
    .bind(paymentMethodPublicId)
    .first<PaymentMethodRow>()
  if (existing === null) {
    throw new AppError(
      404,
      'PAYMENT_METHOD_NOT_FOUND',
      'Payment method not found.',
    )
  }
  const key = await storePaymentMethodQr(bucket, {
    file,
    paymentMethodPublicId,
  })
  try {
    await database.batch([
      database
        .prepare(
          `UPDATE commercial_payment_methods
          SET qr_object_key = ?1, updated_at = CURRENT_TIMESTAMP
          WHERE public_id = ?2`,
        )
        .bind(key, paymentMethodPublicId),
      database
        .prepare(
          `INSERT INTO audit_logs(
            actor_user_id, action, entity_type, entity_id, metadata_json
          ) VALUES (?1, 'commercial.payment_method.qr_saved', 'payment_method', ?2, ?3)`,
        )
        .bind(
          actor.internalUserId,
          paymentMethodPublicId,
          JSON.stringify({ requestId }),
        ),
    ])
  } catch (error: unknown) {
    await deletePrivateObject(bucket, key)
    throw error
  }
  if (existing.qr_object_key !== null) {
    try {
      await deletePrivateObject(bucket, existing.qr_object_key)
    } catch (error: unknown) {
      console.error('Obsolete payment QR cleanup failed.', {
        paymentMethodId: paymentMethodPublicId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      })
    }
  }
  const row = await database
    .prepare('SELECT * FROM commercial_payment_methods WHERE public_id = ?1')
    .bind(paymentMethodPublicId)
    .first<PaymentMethodRow>()
  if (row === null) {
    throw new AppError(
      500,
      'PAYMENT_METHOD_SAVE_FAILED',
      'Payment method could not be loaded after its QR image was saved.',
    )
  }
  return mapPaymentMethod(row)
}

export async function getAdminPaymentMethodQrKey(
  database: D1Database,
  paymentMethodPublicId: string,
): Promise<string> {
  const row = await database
    .prepare(
      `SELECT qr_object_key
      FROM commercial_payment_methods
      WHERE public_id = ?1 AND qr_object_key IS NOT NULL
      LIMIT 1`,
    )
    .bind(paymentMethodPublicId)
    .first<{ qr_object_key: string }>()
  if (row === null) {
    throw new AppError(
      404,
      'PAYMENT_METHOD_QR_NOT_FOUND',
      'Payment method QR image not found.',
    )
  }
  return row.qr_object_key
}
export function listAdminPaymentMethods(
  database: D1Database,
): Promise<CommercialPaymentMethod[]> {
  return listPaymentMethods(database, true)
}
