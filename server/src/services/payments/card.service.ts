import { prisma } from '../../db/prisma.js'
import { env } from '../../config/env.js'
import { AppError } from '../../middleware/errorHandler.js'
import { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client'
import crypto from 'crypto'
import type {
  CardPaymentAdapter,
  CardPaymentIntentInput,
  CardPaymentIntentResult,
  CardWebhookPayload,
} from './payment.types.js'

export class MockCardPaymentAdapter implements CardPaymentAdapter {
  /**
   * Creates a card payment intent for a retail sale transaction.
   * Never stores or accepts prohibited PAN, PIN, or CVV data.
   */
  async createPaymentIntent(input: CardPaymentIntentInput): Promise<CardPaymentIntentResult> {
    const { businessId, saleId, amount, currency, reference, idempotencyKey } = input

    if (amount <= 0) {
      throw new AppError('Payment intent amount must be greater than zero.', 400, 'INVALID_AMOUNT')
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })
    if (!business) {
      throw new AppError('Business not found', 404, 'BUSINESS_NOT_FOUND')
    }

    const transactionRef = `CARD_PI_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const authCode = `AUTH-${Math.floor(100000 + Math.random() * 900000)}`

    // Create PaymentTransaction record
    const transaction = await prisma.paymentTransaction.create({
      data: {
        businessId,
        saleId: saleId || null,
        method: PaymentMethod.CARD,
        status: PaymentStatus.PENDING,
        amount: new Prisma.Decimal(amount),
        currency: currency || business.currency || 'KES',
        checkoutRequestId: transactionRef,
        merchantRequestId: reference || null,
        idempotencyKey: idempotencyKey || null,
        providerResponse: {
          authCode,
          provider: env.CARD_PROVIDER || 'mock',
          initiatedAt: new Date().toISOString(),
        },
      },
    })

    return {
      success: true,
      transactionId: transaction.id,
      status: PaymentStatus.PENDING,
      amount,
      currency: currency || business.currency || 'KES',
      authCode,
      message: 'Card payment intent created. Ready for terminal tap/swipe or webhook confirmation.',
    }
  }

  /**
   * Verifies provider webhook HMAC signature.
   */
  verifyWebhook(payload: any, signature?: string): boolean {
    const secret = env.CARD_WEBHOOK_SECRET
    if (!secret) {
      // In development / mock mode, allow mock events if secret is not set
      return true
    }

    if (!signature) {
      return false
    }

    try {
      const hmac = crypto.createHmac('sha256', secret)
      const digest = hmac.update(JSON.stringify(payload)).digest('hex')
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
    } catch {
      return false
    }
  }

  /**
   * Processes card provider webhook event.
   */
  async processWebhook(event: CardWebhookPayload): Promise<{ status: PaymentStatus; transactionId: string }> {
    const { transactionId, authCode, failureReason } = event.data

    const transaction = await prisma.paymentTransaction.findFirst({
      where: {
        OR: [{ id: transactionId }, { checkoutRequestId: transactionId }],
      },
    })

    if (!transaction) {
      throw new AppError(`Card transaction '${transactionId}' not found.`, 404, 'TRANSACTION_NOT_FOUND')
    }

    let nextStatus: PaymentStatus = PaymentStatus.PENDING

    if (event.eventType === 'payment_intent.succeeded') {
      nextStatus = PaymentStatus.PAID
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: PaymentStatus.PAID,
          resultCode: 0,
          resultDesc: 'Approved by card network',
          providerResponse: {
            authCode: authCode || 'AUTH-OK',
            verifiedAt: new Date().toISOString(),
          },
        },
      })
    } else {
      nextStatus = PaymentStatus.FAILED
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: PaymentStatus.FAILED,
          resultCode: 400,
          resultDesc: failureReason || 'Card payment declined or cancelled',
          providerResponse: {
            failureReason: failureReason || 'Declined',
            failedAt: new Date().toISOString(),
          },
        },
      })
    }

    return {
      status: nextStatus,
      transactionId: transaction.id,
    }
  }
}

export const cardPaymentAdapter = new MockCardPaymentAdapter()
