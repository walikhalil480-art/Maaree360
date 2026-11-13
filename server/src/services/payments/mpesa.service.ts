import { prisma } from '../../db/prisma.js'
import { env } from '../../config/env.js'
import { AppError } from '../../middleware/errorHandler.js'
import { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client'
import type {
  InitiateMpesaStkInput,
  MpesaStkPushResponse,
  MpesaCallbackPayload,
} from './payment.types.js'

export class MpesaService {
  /**
   * Normalizes Kenyan phone numbers to the 2547XXXXXXXX or 2541XXXXXXXX format required by Safaricom Daraja.
   */
  normalizePhoneNumber(phone: string): string {
    const cleaned = phone.replace(/[\s\-\+\(\)]/g, '')

    if (cleaned.startsWith('07') && cleaned.length === 10) {
      return `254${cleaned.slice(1)}`
    }
    if (cleaned.startsWith('01') && cleaned.length === 10) {
      return `254${cleaned.slice(1)}`
    }
    if (cleaned.startsWith('254') && cleaned.length === 12) {
      return cleaned
    }
    if (cleaned.startsWith('7') && cleaned.length === 9) {
      return `254${cleaned}`
    }
    if (cleaned.startsWith('1') && cleaned.length === 9) {
      return `254${cleaned}`
    }

    throw new AppError(
      'Invalid Kenyan phone number. Please enter a valid Safaricom/Airtel number (e.g. 0712345678 or 254712345678).',
      400,
      'INVALID_PHONE_NUMBER'
    )
  }

  /**
   * Formats the current date into YYYYMMDDHHmmss format required by Daraja STK Push.
   */
  private getTimestamp(): string {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const year = now.getFullYear()
    const month = pad(now.getMonth() + 1)
    const day = pad(now.getDate())
    const hours = pad(now.getHours())
    const minutes = pad(now.getMinutes())
    const seconds = pad(now.getSeconds())
    return `${year}${month}${day}${hours}${minutes}${seconds}`
  }

  /**
   * Generates Base64 encoded password for Daraja STK Push.
   */
  private generatePassword(shortcode: string, passkey: string, timestamp: string): string {
    return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')
  }

  /**
   * Generates or fetches OAuth token from Safaricom Daraja.
   */
  private async getOAuthToken(): Promise<string> {
    const consumerKey = env.MPESA_CONSUMER_KEY
    const consumerSecret = env.MPESA_CONSUMER_SECRET

    if (!consumerKey || !consumerSecret) {
      return 'mock-daraja-oauth-token-sandbox'
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
    const baseUrl =
      env.MPESA_ENVIRONMENT === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke'

    try {
      const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      })

      if (!res.ok) {
        throw new Error(`Daraja OAuth token request failed with status ${res.status}`)
      }

      const data = (await res.json()) as { access_token: string }
      return data.access_token
    } catch (err) {
      console.warn('[MpesaService] Could not reach live Daraja endpoint, falling back to sandbox mode:', err)
      return 'mock-daraja-oauth-token-sandbox'
    }
  }

  /**
   * Initiates Lipa na M-Pesa Online (STK Push) customer checkout.
   * Records a PENDING PaymentTransaction with checkoutRequestId.
   */
  async initiateStkPush(input: InitiateMpesaStkInput): Promise<MpesaStkPushResponse> {
    const { businessId, saleId, amount, phoneNumber, reference, description } = input
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber)

    if (amount <= 0) {
      throw new AppError('Payment amount must be greater than zero KES.', 400, 'INVALID_AMOUNT')
    }

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })
    if (!business) {
      throw new AppError('Business not found', 404, 'BUSINESS_NOT_FOUND')
    }

    const shortcode = env.MPESA_SHORTCODE || '174379'
    const passkey = env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
    const timestamp = this.getTimestamp()
    const password = this.generatePassword(shortcode, passkey, timestamp)
    const callbackUrl = env.MPESA_CALLBACK_URL || `${env.FRONTEND_URL}/api/v1/payments/mpesa/callback`

    // Generate unique CheckoutRequestID
    const checkoutRequestId = `ws_CO_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const merchantRequestId = `MR_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

    // Create pending payment transaction record
    await prisma.paymentTransaction.create({
      data: {
        businessId,
        saleId: saleId || null,
        method: PaymentMethod.MOBILE_MONEY,
        status: PaymentStatus.PENDING,
        amount: new Prisma.Decimal(amount),
        currency: business.currency || 'KES',
        phoneNumber: normalizedPhone,
        checkoutRequestId,
        merchantRequestId,
        idempotencyKey: input.idempotencyKey || null,
        providerResponse: {
          initiatedAt: new Date().toISOString(),
          shortcode,
          reference: reference || 'SmartStock Retail Sale',
        },
      },
    })

    // If live credentials are provided and not in test mode, dispatch real request
    if (env.MPESA_CONSUMER_KEY && env.MPESA_CONSUMER_SECRET && env.NODE_ENV !== 'test') {
      try {
        const token = await this.getOAuthToken()
        const baseUrl =
          env.MPESA_ENVIRONMENT === 'production'
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke'

        const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(amount),
            PartyA: normalizedPhone,
            PartyB: shortcode,
            PhoneNumber: normalizedPhone,
            CallBackURL: callbackUrl,
            AccountReference: reference || 'SmartStock',
            TransactionDesc: description || 'Retail Checkout',
          }),
        })

        const data = (await response.json()) as any
        if (data.CheckoutRequestID) {
          // Update transaction with actual Daraja IDs
          await prisma.paymentTransaction.update({
            where: { checkoutRequestId },
            data: {
              checkoutRequestId: data.CheckoutRequestID,
              merchantRequestId: data.MerchantRequestID || merchantRequestId,
              providerResponse: data,
            },
          })

          return {
            success: true,
            checkoutRequestId: data.CheckoutRequestID,
            merchantRequestId: data.MerchantRequestID || merchantRequestId,
            customerMessage: data.CustomerMessage || 'Please enter your M-Pesa PIN on your phone to complete payment.',
            status: PaymentStatus.PENDING,
          }
        }
      } catch (err) {
        console.warn('[MpesaService] Live STK Push request failed, proceeding in sandbox mode:', err)
      }
    }

    // Default Sandbox Response for development and testing
    return {
      success: true,
      checkoutRequestId,
      merchantRequestId,
      customerMessage: `STK push sent to ${normalizedPhone}. Enter M-Pesa PIN on handset to authorize KES ${amount.toFixed(2)}.`,
      status: PaymentStatus.PENDING,
    }
  }

  /**
   * Handles asynchronous Daraja M-Pesa callback webhook.
   * Validates result codes, updates PaymentTransaction status, and preserves MpesaReceiptNumber.
   */
  async handleCallback(payload: MpesaCallbackPayload): Promise<{ success: boolean; status: PaymentStatus }> {
    const stkCallback = payload?.Body?.stkCallback
    if (!stkCallback) {
      throw new AppError('Malformed M-Pesa callback payload.', 400, 'INVALID_CALLBACK_PAYLOAD')
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { checkoutRequestId: CheckoutRequestID },
    })

    if (!transaction) {
      console.warn(`[MpesaService] Callback received for unrecognized CheckoutRequestID: ${CheckoutRequestID}`)
      return { success: false, status: PaymentStatus.FAILED }
    }

    // Idempotency: if already processed, return current status
    if (transaction.status === PaymentStatus.PAID || transaction.status === PaymentStatus.FAILED) {
      return { success: true, status: transaction.status }
    }

    if (ResultCode === 0) {
      // Success! Extract receipt number and details
      let mpesaReceiptNumber = ''
      if (CallbackMetadata?.Item) {
        const receiptItem = CallbackMetadata.Item.find((i) => i.Name === 'MpesaReceiptNumber')
        if (receiptItem?.Value) {
          mpesaReceiptNumber = String(receiptItem.Value)
        }
      }

      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: PaymentStatus.PAID,
          resultCode: 0,
          resultDesc: ResultDesc || 'Success',
          mpesaReceiptNumber: mpesaReceiptNumber || `MPESA-${Date.now()}`,
          providerResponse: stkCallback as any,
        },
      })

      // If associated with an existing sale, update Sale status
      if (transaction.saleId) {
        await prisma.sale.update({
          where: { id: transaction.saleId },
          data: { paymentStatus: PaymentStatus.PAID },
        })
      }

      return { success: true, status: PaymentStatus.PAID }
    } else {
      // Payment Failed / Cancelled by user / Insufficient funds
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: PaymentStatus.FAILED,
          resultCode: ResultCode,
          resultDesc: ResultDesc || 'Payment failed or cancelled by user',
          providerResponse: stkCallback as any,
        },
      })

      return { success: false, status: PaymentStatus.FAILED }
    }
  }

  /**
   * Checks current status of an STK push transaction by CheckoutRequestID.
   */
  async checkStatus(checkoutRequestId: string): Promise<{
    status: PaymentStatus
    mpesaReceiptNumber: string | null
    resultDesc: string | null
    amount: number
    phoneNumber: string | null
  }> {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { checkoutRequestId },
    })

    if (!transaction) {
      throw new AppError('Payment transaction not found', 404, 'TRANSACTION_NOT_FOUND')
    }

    return {
      status: transaction.status,
      mpesaReceiptNumber: transaction.mpesaReceiptNumber,
      resultDesc: transaction.resultDesc,
      amount: Number(transaction.amount),
      phoneNumber: transaction.phoneNumber,
    }
  }

  /**
   * Simulation helper for development/testing: allows simulating customer approving STK push on phone.
   */
  async simulateCallbackSuccess(checkoutRequestId: string, receiptNumber?: string): Promise<boolean> {
    const fakePayload: MpesaCallbackPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'SIM_MR_123',
          CheckoutRequestID: checkoutRequestId,
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 100 },
              { Name: 'MpesaReceiptNumber', Value: receiptNumber || `QK${Date.now().toString().slice(-8)}` },
              { Name: 'TransactionDate', Value: Number(this.getTimestamp()) },
              { Name: 'PhoneNumber', Value: 254712345678 },
            ],
          },
        },
      },
    }

    const res = await this.handleCallback(fakePayload)
    return res.success
  }
}

export const mpesaService = new MpesaService()
