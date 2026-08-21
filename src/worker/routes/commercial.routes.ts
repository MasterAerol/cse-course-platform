import { Hono } from 'hono'

import { requireAuthentication } from '../middleware/auth.middleware'
import { requireLearner } from '../middleware/learner.middleware'
import {
  createPaymentRequestSchema,
  paymentMethodParamsSchema,
  paymentProofInputSchema,
  paymentRequestParamsSchema,
} from '../schemas/commercial.schemas'
import {
  cancelLearnerPaymentRequest,
  createLearnerPaymentRequest,
  getCommercialSettings,
  getLearnerCommercialAccess,
  getLearnerPaymentMethodQrKey,
  getLearnerPaymentRequest,
  getOwnedReceiptKey,
  listLearnerPaymentRequests,
  listLearnerPlans,
  listPaymentMethods,
  submitLearnerPaymentProof,
} from '../services/commercial.service'
import {
  RECEIPT_REQUEST_MAX_BYTES,
  getPrivateImage,
  requirePaymentReceiptsBucket,
} from '../services/receipt-storage.service'
import type { AppEnv } from '../types/app'
import { AppError } from '../utils/app-error'
import { successResponse } from '../utils/responses'
import {
  parseJsonBody,
  parseValidatedInput,
} from '../utils/validation'

export const commercialRoutes = new Hono<AppEnv>()

commercialRoutes.use('*', requireAuthentication, requireLearner)

commercialRoutes.get('/commercial/access', async (context) =>
  successResponse(
    context,
    await getLearnerCommercialAccess(
      context.env.DB,
      context.get('authUser').internalUserId,
    ),
  ),
)

commercialRoutes.get('/commercial/plans', async (context) =>
  successResponse(context, await listLearnerPlans(context.env.DB)),
)

commercialRoutes.get('/commercial/payment-methods', async (context) => {
  const settings = await getCommercialSettings(context.env.DB)
  return successResponse(
    context,
    settings.publicCheckout
      ? await listPaymentMethods(context.env.DB)
      : [],
  )
})

commercialRoutes.get(
  '/commercial/payment-methods/:paymentMethodId/qr',
  async (context) => {
    const params = parseValidatedInput(
      paymentMethodParamsSchema.safeParse(context.req.param()),
    )
    const key = await getLearnerPaymentMethodQrKey(
      context.env.DB,
      params.paymentMethodId,
    )
    return getPrivateImage(
      requirePaymentReceiptsBucket(context.env.PAYMENT_RECEIPTS),
      key,
    )
  },
)

commercialRoutes.get('/commercial/payment-requests', async (context) =>
  successResponse(
    context,
    await listLearnerPaymentRequests(
      context.env.DB,
      context.get('authUser').internalUserId,
    ),
  ),
)

commercialRoutes.post('/commercial/payment-requests', async (context) => {
  const input = await parseJsonBody(context, createPaymentRequestSchema)
  const result = await createLearnerPaymentRequest(
    context.env.DB,
    context.get('authUser').internalUserId,
    input.planSlug,
  )
  return successResponse(context, result, 201)
})

commercialRoutes.get(
  '/commercial/payment-requests/:paymentRequestId',
  async (context) => {
    const params = parseValidatedInput(
      paymentRequestParamsSchema.safeParse(context.req.param()),
    )
    return successResponse(
      context,
      await getLearnerPaymentRequest(
        context.env.DB,
        context.get('authUser').internalUserId,
        params.paymentRequestId,
      ),
    )
  },
)

function optionalFormText(
  form: FormData,
  name: string,
): string | undefined {
  const value = form.get(name)
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined
}

commercialRoutes.post(
  '/commercial/payment-requests/:paymentRequestId/proof',
  async (context) => {
    const lengthHeader = context.req.header('content-length')
    const contentLength =
      lengthHeader === undefined ? Number.NaN : Number(lengthHeader)
    if (!Number.isFinite(contentLength) || contentLength <= 0) {
      throw new AppError(
        411,
        'CONTENT_LENGTH_REQUIRED',
        'Receipt uploads require a Content-Length header.',
      )
    }
    if (contentLength > RECEIPT_REQUEST_MAX_BYTES) {
      throw new AppError(
        413,
        'RECEIPT_UPLOAD_TOO_LARGE',
        'The receipt upload request is too large.',
      )
    }

    const params = parseValidatedInput(
      paymentRequestParamsSchema.safeParse(context.req.param()),
    )
    const form = await context.req.formData()
    const receipt = form.get('receipt')
    if (!(receipt instanceof File)) {
      throw new AppError(
        400,
        'RECEIPT_REQUIRED',
        'A receipt image is required.',
      )
    }
    const input = parseValidatedInput(
      paymentProofInputSchema.safeParse({
        paymentMethodId: optionalFormText(form, 'paymentMethodId'),
        transactionReference: optionalFormText(
          form,
          'transactionReference',
        ),
        payerName: optionalFormText(form, 'payerName'),
        senderLastDigits: optionalFormText(form, 'senderLastDigits'),
        paymentOccurredAt: optionalFormText(form, 'paymentOccurredAt'),
        learnerNote: optionalFormText(form, 'learnerNote'),
      }),
    )
    const result = await submitLearnerPaymentProof(
      context.env.DB,
      requirePaymentReceiptsBucket(context.env.PAYMENT_RECEIPTS),
      context.get('authUser').internalUserId,
      params.paymentRequestId,
      { ...input, receipt },
    )
    return successResponse(context, result)
  },
)

commercialRoutes.post(
  '/commercial/payment-requests/:paymentRequestId/cancel',
  async (context) => {
    const params = parseValidatedInput(
      paymentRequestParamsSchema.safeParse(context.req.param()),
    )
    return successResponse(
      context,
      await cancelLearnerPaymentRequest(
        context.env.DB,
        context.get('authUser').internalUserId,
        params.paymentRequestId,
      ),
    )
  },
)

commercialRoutes.get(
  '/commercial/payment-requests/:paymentRequestId/receipt',
  async (context) => {
    const params = parseValidatedInput(
      paymentRequestParamsSchema.safeParse(context.req.param()),
    )
    const key = await getOwnedReceiptKey(
      context.env.DB,
      context.get('authUser').internalUserId,
      params.paymentRequestId,
    )
    return getPrivateImage(
      requirePaymentReceiptsBucket(context.env.PAYMENT_RECEIPTS),
      key,
    )
  },
)
