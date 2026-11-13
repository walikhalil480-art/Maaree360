import { PaymentMethod, PaymentStatus } from '@prisma/client'

export interface InitiateMpesaStkInput {
  businessId: string
  saleId?: string
  amount: number
  phoneNumber: string
  reference?: string
  description?: string
  idempotencyKey?: string
}

export interface MpesaStkPushResponse {
  success: boolean
  checkoutRequestId: string
  merchantRequestId: string
  customerMessage: string
  status: PaymentStatus
}

export interface MpesaCallbackItem {
  Name: string
  Value?: string | number
}

export interface MpesaCallbackPayload {
  Body: {
    stkCallback: {
      MerchantRequestID: string
      CheckoutRequestID: string
      ResultCode: number
      ResultDesc: string
      CallbackMetadata?: {
        Item: MpesaCallbackItem[]
      }
    }
  }
}

export interface CardPaymentIntentInput {
  businessId: string
  saleId?: string
  amount: number
  currency: string
  terminalId?: string
  reference?: string
  idempotencyKey?: string
}

export interface CardPaymentIntentResult {
  success: boolean
  transactionId: string
  status: PaymentStatus
  amount: number
  currency: string
  clientSecret?: string
  authCode?: string
  message: string
}

export interface CardWebhookPayload {
  eventId: string
  eventType: 'payment_intent.succeeded' | 'payment_intent.payment_failed' | 'payment_intent.canceled'
  data: {
    transactionId: string
    amount: number
    currency: string
    authCode?: string
    failureReason?: string
  }
}

export interface CardPaymentAdapter {
  createPaymentIntent(input: CardPaymentIntentInput): Promise<CardPaymentIntentResult>
  verifyWebhook(payload: any, signature?: string): boolean
  processWebhook(event: CardWebhookPayload): Promise<{ status: PaymentStatus; transactionId: string }>
}
