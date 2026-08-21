import { Hono } from 'hono'

import {
  adminExtendAccessSchema,
  adminGrantAccessSchema,
  adminLearnerListQuerySchema,
  adminLearnerParamsSchema,
  adminRevokeAccessSchema,
  commercialPaymentListQuerySchema,
  commercialSettingsUpdateSchema,
  paymentDecisionSchema,
  paymentMethodParamsSchema,
  paymentMethodUpsertSchema,
  paymentRequestParamsSchema,
} from '../../schemas/commercial.schemas'
import {
  extendAdminAccess,
  getAdminLearnerDetail,
  getBusinessOverview,
  grantAdminAccess,
  listAdminLearners,
  revokeAdminAccess,
} from '../../services/admin/commercial-learners.service'
import {
  approvePaymentRequest,
  getAdminPaymentRequest,
  getAdminReceiptKey,
  listAdminPaymentRequests,
  markPaymentUnderReview,
  refundPaymentRequest,
  rejectPaymentRequest,
} from '../../services/admin/commercial-payments.service'
import {
  listAdminPaymentMethods,
  getAdminPaymentMethodQrKey,
  setCommercialPaymentMethodQr,
  updateCommercialSettings,
  upsertCommercialPaymentMethod,
} from '../../services/admin/commercial-settings.service'
import {
  getCommercialSettingsDetail,
  listInternalPlans,
} from '../../services/commercial.service'
import {
  getPrivateImage,
  RECEIPT_REQUEST_MAX_BYTES,
  requirePaymentReceiptsBucket,
} from '../../services/receipt-storage.service'
import type { AppEnv } from '../../types/app'
import { AppError } from '../../utils/app-error'
import { successResponse } from '../../utils/responses'
import {
  parseJsonBody,
  parseValidatedInput,
} from '../../utils/validation'

export const adminCommercialRoutes = new Hono<AppEnv>()

adminCommercialRoutes.get('/commercial/settings', async (context) =>
  successResponse(context, {
    ...(await getCommercialSettingsDetail(context.env.DB)),
    plans: await listInternalPlans(context.env.DB),
    paymentMethods: await listAdminPaymentMethods(context.env.DB),
  }),
)

adminCommercialRoutes.patch('/commercial/settings', async (context) => {
  const input = await parseJsonBody(context, commercialSettingsUpdateSchema)
  return successResponse(
    context,
    await updateCommercialSettings(
      context.env.DB,
      context.get('authUser'),
      input,
      context.get('requestId'),
    ),
  )
})

adminCommercialRoutes.put(
  '/commercial/payment-methods',
  async (context) => {
    const input = await parseJsonBody(context, paymentMethodUpsertSchema)
    return successResponse(
      context,
      await upsertCommercialPaymentMethod(
        context.env.DB,
        context.get('authUser'),
        input,
        context.get('requestId'),
      ),
    )
  },
)

adminCommercialRoutes.post(
  '/commercial/payment-methods/:paymentMethodId/qr',
  async (context) => {
    const lengthHeader = context.req.header('content-length')
    const contentLength =
      lengthHeader === undefined ? Number.NaN : Number(lengthHeader)
    if (!Number.isFinite(contentLength) || contentLength <= 0) {
      throw new AppError(
        411,
        'CONTENT_LENGTH_REQUIRED',
        'QR uploads require a Content-Length header.',
      )
    }
    if (contentLength > RECEIPT_REQUEST_MAX_BYTES) {
      throw new AppError(
        413,
        'QR_UPLOAD_TOO_LARGE',
        'The QR image upload request is too large.',
      )
    }
    const params = parseValidatedInput(
      paymentMethodParamsSchema.safeParse(context.req.param()),
    )
    const form = await context.req.formData()
    const qr = form.get('qr')
    if (!(qr instanceof File)) {
      throw new AppError(
        400,
        'QR_IMAGE_REQUIRED',
        'A QR image is required.',
      )
    }
    return successResponse(
      context,
      await setCommercialPaymentMethodQr(
        context.env.DB,
        requirePaymentReceiptsBucket(context.env.PAYMENT_RECEIPTS),
        context.get('authUser'),
        params.paymentMethodId,
        qr,
        context.get('requestId'),
      ),
    )
  },
)

adminCommercialRoutes.get(
  '/commercial/payment-methods/:paymentMethodId/qr',
  async (context) => {
    const params = parseValidatedInput(
      paymentMethodParamsSchema.safeParse(context.req.param()),
    )
    const key = await getAdminPaymentMethodQrKey(
      context.env.DB,
      params.paymentMethodId,
    )
    return getPrivateImage(
      requirePaymentReceiptsBucket(context.env.PAYMENT_RECEIPTS),
      key,
    )
  },
)

adminCommercialRoutes.get('/commercial/business', async (context) =>
  successResponse(context, await getBusinessOverview(context.env.DB)),
)

adminCommercialRoutes.get('/commercial/learners', async (context) => {
  const query = parseValidatedInput(
    adminLearnerListQuerySchema.safeParse(context.req.query()),
  )
  return successResponse(
    context,
    await listAdminLearners(context.env.DB, query),
  )
})

adminCommercialRoutes.get(
  '/commercial/learners/:learnerId',
  async (context) => {
    const params = parseValidatedInput(
      adminLearnerParamsSchema.safeParse(context.req.param()),
    )
    return successResponse(
      context,
      await getAdminLearnerDetail(context.env.DB, params.learnerId),
    )
  },
)

adminCommercialRoutes.post(
  '/commercial/learners/:learnerId/grant',
  async (context) => {
    const params = parseValidatedInput(
      adminLearnerParamsSchema.safeParse(context.req.param()),
    )
    const input = await parseJsonBody(context, adminGrantAccessSchema)
    return successResponse(
      context,
      await grantAdminAccess(
        context.env.DB,
        context.get('authUser'),
        params.learnerId,
        input,
        context.get('requestId'),
      ),
    )
  },
)

adminCommercialRoutes.post(
  '/commercial/learners/:learnerId/extend',
  async (context) => {
    const params = parseValidatedInput(
      adminLearnerParamsSchema.safeParse(context.req.param()),
    )
    const input = await parseJsonBody(context, adminExtendAccessSchema)
    return successResponse(
      context,
      await extendAdminAccess(
        context.env.DB,
        context.get('authUser'),
        params.learnerId,
        input,
        context.get('requestId'),
      ),
    )
  },
)

adminCommercialRoutes.post(
  '/commercial/learners/:learnerId/revoke',
  async (context) => {
    const params = parseValidatedInput(
      adminLearnerParamsSchema.safeParse(context.req.param()),
    )
    const input = await parseJsonBody(context, adminRevokeAccessSchema)
    return successResponse(
      context,
      await revokeAdminAccess(
        context.env.DB,
        context.get('authUser'),
        params.learnerId,
        input,
        context.get('requestId'),
      ),
    )
  },
)

adminCommercialRoutes.get('/commercial/payments', async (context) => {
  const query = parseValidatedInput(
    commercialPaymentListQuerySchema.safeParse(context.req.query()),
  )
  return successResponse(
    context,
    await listAdminPaymentRequests(context.env.DB, query.status),
  )
})

function paymentRequestId(context: {
  req: { param(): Record<string, string> }
}): string {
  return parseValidatedInput(
    paymentRequestParamsSchema.safeParse(context.req.param()),
  ).paymentRequestId
}

adminCommercialRoutes.get(
  '/commercial/payments/:paymentRequestId',
  async (context) =>
    successResponse(
      context,
      await getAdminPaymentRequest(context.env.DB, paymentRequestId(context)),
    ),
)

adminCommercialRoutes.post(
  '/commercial/payments/:paymentRequestId/review',
  async (context) =>
    successResponse(
      context,
      await markPaymentUnderReview(
        context.env.DB,
        context.get('authUser'),
        paymentRequestId(context),
        context.get('requestId'),
      ),
    ),
)

adminCommercialRoutes.post(
  '/commercial/payments/:paymentRequestId/approve',
  async (context) => {
    await parseJsonBody(context, paymentDecisionSchema)
    return successResponse(
      context,
      await approvePaymentRequest(
        context.env.DB,
        context.get('authUser'),
        paymentRequestId(context),
        context.get('requestId'),
      ),
    )
  },
)

adminCommercialRoutes.post(
  '/commercial/payments/:paymentRequestId/reject',
  async (context) => {
    const input = await parseJsonBody(context, paymentDecisionSchema)
    return successResponse(
      context,
      await rejectPaymentRequest(
        context.env.DB,
        context.get('authUser'),
        paymentRequestId(context),
        input,
        context.get('requestId'),
      ),
    )
  },
)

adminCommercialRoutes.post(
  '/commercial/payments/:paymentRequestId/refund',
  async (context) => {
    await parseJsonBody(context, paymentDecisionSchema)
    return successResponse(
      context,
      await refundPaymentRequest(
        context.env.DB,
        context.get('authUser'),
        paymentRequestId(context),
        context.get('requestId'),
      ),
    )
  },
)

adminCommercialRoutes.get(
  '/commercial/payments/:paymentRequestId/receipt',
  async (context) => {
    const key = await getAdminReceiptKey(
      context.env.DB,
      paymentRequestId(context),
    )
    return getPrivateImage(
      requirePaymentReceiptsBucket(context.env.PAYMENT_RECEIPTS),
      key,
    )
  },
)
