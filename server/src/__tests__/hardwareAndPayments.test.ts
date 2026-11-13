import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import { Role, ProductCodeType, StockMovementType, PaymentMethod, PaymentStatus } from '@prisma/client'
import { mpesaService } from '../services/payments/mpesa.service.js'
import { cardPaymentAdapter } from '../services/payments/card.service.js'

describe('Installment 16: Hardware, Price Checker & Payment Integrations', () => {
  const app = createApp()

  let businessId: string
  let ownerId: string
  let cashierId: string
  let productId: string
  let testBarcode = 'BARCODE-TEST-123'
  let testSku = 'TEST-SKU-999'

  beforeEach(async () => {
    // 1. Create Business
    const business = await prisma.business.create({
      data: {
        name: 'Hardware Test Store',
        slug: `hardware-store-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        currency: 'KES',
      },
    })
    businessId = business.id

    // 2. Create Users
    const owner = await prisma.user.create({
      data: {
        email: `owner-${Date.now()}@test.co.ke`,
        passwordHash: 'hashed_password',
        name: 'Store Owner',
      },
    })
    ownerId = owner.id

    const cashier = await prisma.user.create({
      data: {
        email: `cashier-${Date.now()}@test.co.ke`,
        passwordHash: 'hashed_password',
        name: 'Terminal Cashier',
      },
    })
    cashierId = cashier.id

    // 3. Create Business Memberships
    await prisma.businessMembership.createMany({
      data: [
        { businessId, userId: ownerId, role: Role.OWNER, isActive: true },
        { businessId, userId: cashierId, role: Role.CASHIER, isActive: true },
      ],
    })

    // 4. Create Product
    const product = await prisma.product.create({
      data: {
        businessId,
        name: 'Unga wa Dola 2kg',
        sku: testSku,
        brand: 'Dola',
        unit: 'Pack',
        costPrice: 180.0,
        sellingPrice: 220.0,
        minStockThreshold: 10,
        isActive: true,
      },
    })
    productId = product.id

    // 5. Add barcode code
    await prisma.productCode.create({
      data: {
        businessId,
        productId,
        code: testBarcode,
        type: ProductCodeType.EAN_13,
      },
    })

    // 6. Set initial stock
    await prisma.stockLevel.create({
      data: {
        businessId,
        productId,
        quantity: 50,
      },
    })
  })

  describe('1. Customer-Facing Price Checker', () => {
    it('should return public customer price details and strictly omit cost price and internal stock counts', async () => {
      const res = await request(app)
        .get(`/api/v1/price-checker/${businessId}/lookup?code=${testBarcode}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      const { product } = res.body

      expect(product.name).toBe('Unga wa Dola 2kg')
      expect(product.sellingPrice).toBe(220)
      expect(product.currency).toBe('KES')
      expect(product.unit).toBe('Pack')
      expect(product.inStock).toBe(true)
      expect(product.businessName).toBe('Hardware Test Store')

      // STRICT SECURITY VERIFICATION: No cost price, margins, or internal ledger counts
      expect(product.costPrice).toBeUndefined()
      expect(product.minStockThreshold).toBeUndefined()
      expect(product.quantity).toBeUndefined()
      expect(product.margin).toBeUndefined()
      expect(product.suppliers).toBeUndefined()
    })

    it('should resolve product in Price Checker by SKU when barcode is entered', async () => {
      const res = await request(app)
        .get(`/api/v1/price-checker/${businessId}/lookup?code=${testSku}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.product.name).toBe('Unga wa Dola 2kg')
      expect(res.body.product.sellingPrice).toBe(220)
    })

    it('should return 404 with a helpful message for unknown or missing barcodes', async () => {
      const res = await request(app)
        .get(`/api/v1/price-checker/${businessId}/lookup?code=UNKNOWN-BARCODE-999`)
        .expect(404)

      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND')
      expect(res.body.error.message).toMatch(/Product not found/i)
    })

    it('should reject checking prices for archived or inactive products', async () => {
      await prisma.product.update({
        where: { id: productId },
        data: { isActive: false },
      })

      const res = await request(app)
        .get(`/api/v1/price-checker/${businessId}/lookup?code=${testBarcode}`)
        .expect(404)

      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND')
    })

    it('should provide kiosk store info for the Price Checker header', async () => {
      const res = await request(app)
        .get(`/api/v1/price-checker/${businessId}/info`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.store.name).toBe('Hardware Test Store')
      expect(res.body.store.currency).toBe('KES')
    })
  })

  describe('2. M-Pesa Daraja Integration & STK Push', () => {
    it('should correctly normalize Kenyan phone numbers into 254XXXXXXXXX format', () => {
      expect(mpesaService.normalizePhoneNumber('0712345678')).toBe('254712345678')
      expect(mpesaService.normalizePhoneNumber('0112345678')).toBe('254112345678')
      expect(mpesaService.normalizePhoneNumber('+254712345678')).toBe('254712345678')
      expect(mpesaService.normalizePhoneNumber('254712345678')).toBe('254712345678')
      expect(mpesaService.normalizePhoneNumber('712345678')).toBe('254712345678')

      expect(() => mpesaService.normalizePhoneNumber('020123456')).toThrowError()
      expect(() => mpesaService.normalizePhoneNumber('12345')).toThrowError()
    })

    it('should initiate STK push and record a PENDING PaymentTransaction', async () => {
      const res = await mpesaService.initiateStkPush({
        businessId,
        amount: 220,
        phoneNumber: '0712345678',
        reference: 'REC-001',
      })

      expect(res.success).toBe(true)
      expect(res.status).toBe(PaymentStatus.PENDING)
      expect(res.checkoutRequestId).toBeDefined()

      // Verify transaction in DB
      const tx = await prisma.paymentTransaction.findUnique({
        where: { checkoutRequestId: res.checkoutRequestId },
      })

      expect(tx).toBeDefined()
      expect(tx?.status).toBe(PaymentStatus.PENDING)
      expect(Number(tx?.amount)).toBe(220)
      expect(tx?.phoneNumber).toBe('254712345678')
    })

    it('should process successful M-Pesa callback and update transaction to PAID with receipt number', async () => {
      const initRes = await mpesaService.initiateStkPush({
        businessId,
        amount: 500,
        phoneNumber: '0712345678',
      })

      const callbackPayload = {
        Body: {
          stkCallback: {
            MerchantRequestID: initRes.merchantRequestId,
            CheckoutRequestID: initRes.checkoutRequestId,
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 500 },
                { Name: 'MpesaReceiptNumber', Value: 'QJD789X123' },
                { Name: 'TransactionDate', Value: 20261019171500 },
                { Name: 'PhoneNumber', Value: 254712345678 },
              ],
            },
          },
        },
      }

      const cbRes = await mpesaService.handleCallback(callbackPayload)
      expect(cbRes.success).toBe(true)
      expect(cbRes.status).toBe(PaymentStatus.PAID)

      // Verify status query
      const statusRes = await mpesaService.checkStatus(initRes.checkoutRequestId)
      expect(statusRes.status).toBe(PaymentStatus.PAID)
      expect(statusRes.mpesaReceiptNumber).toBe('QJD789X123')
    })

    it('should process failed or cancelled M-Pesa callback and record FAILED status', async () => {
      const initRes = await mpesaService.initiateStkPush({
        businessId,
        amount: 300,
        phoneNumber: '0722000000',
      })

      const failedPayload = {
        Body: {
          stkCallback: {
            MerchantRequestID: initRes.merchantRequestId,
            CheckoutRequestID: initRes.checkoutRequestId,
            ResultCode: 1032,
            ResultDesc: 'Request cancelled by user',
          },
        },
      }

      const cbRes = await mpesaService.handleCallback(failedPayload)
      expect(cbRes.success).toBe(false)
      expect(cbRes.status).toBe(PaymentStatus.FAILED)

      const statusRes = await mpesaService.checkStatus(initRes.checkoutRequestId)
      expect(statusRes.status).toBe(PaymentStatus.FAILED)
      expect(statusRes.resultDesc).toBe('Request cancelled by user')
    })

    it('should be idempotent and not alter completed transaction on duplicate callback', async () => {
      const initRes = await mpesaService.initiateStkPush({
        businessId,
        amount: 150,
        phoneNumber: '0712345678',
      })

      const successPayload = {
        Body: {
          stkCallback: {
            MerchantRequestID: initRes.merchantRequestId,
            CheckoutRequestID: initRes.checkoutRequestId,
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [{ Name: 'MpesaReceiptNumber', Value: 'MPESA-DUPL-001' }],
            },
          },
        },
      }

      // First delivery
      await mpesaService.handleCallback(successPayload)
      // Second duplicate delivery
      const secondCall = await mpesaService.handleCallback(successPayload)
      expect(secondCall.status).toBe(PaymentStatus.PAID)

      const tx = await prisma.paymentTransaction.findUnique({
        where: { checkoutRequestId: initRes.checkoutRequestId },
      })
      expect(tx?.mpesaReceiptNumber).toBe('MPESA-DUPL-001')
    })
  })

  describe('3. Card Payment Adapter', () => {
    it('should create a card payment intent with status PENDING', async () => {
      const intent = await cardPaymentAdapter.createPaymentIntent({
        businessId,
        amount: 1000,
        currency: 'KES',
        reference: 'SALE-CARD-001',
      })

      expect(intent.success).toBe(true)
      expect(intent.status).toBe(PaymentStatus.PENDING)
      expect(intent.authCode).toBeDefined()

      const tx = await prisma.paymentTransaction.findUnique({
        where: { id: intent.transactionId },
      })
      expect(tx).toBeDefined()
      expect(tx?.method).toBe(PaymentMethod.CARD)
      expect(Number(tx?.amount)).toBe(1000)
    })

    it('should process webhook event for approved card payment', async () => {
      const intent = await cardPaymentAdapter.createPaymentIntent({
        businessId,
        amount: 450,
        currency: 'KES',
      })

      const result = await cardPaymentAdapter.processWebhook({
        eventId: 'evt_123',
        eventType: 'payment_intent.succeeded',
        data: {
          transactionId: intent.transactionId,
          amount: 450,
          currency: 'KES',
          authCode: 'AUTH-999888',
        },
      })

      expect(result.status).toBe(PaymentStatus.PAID)

      const tx = await prisma.paymentTransaction.findUnique({
        where: { id: intent.transactionId },
      })
      expect(tx?.status).toBe(PaymentStatus.PAID)
    })
  })

  describe('4. Split Payments & Multi-Product Checkout', () => {
    it('should allow split payments (part Cash, part M-Pesa) satisfying total due', async () => {
      // Create session for Cashier
      const session = await prisma.session.create({
        data: {
          userId: cashierId,
          token: `sess-cashier-${Date.now()}`,
          expiresAt: new Date(Date.now() + 86400000),
        },
      })

      const totalDue = 220 * 2 // 440 KES

      const res = await request(app)
        .post(`/api/v1/businesses/${businessId}/sales`)
        .set('Cookie', [`smartstock_session=${session.token}`])
        .send({
          items: [{ productId, quantity: 2 }],
          payments: [
            { method: PaymentMethod.CASH, amount: 200, amountTendered: 200 },
            { method: PaymentMethod.MOBILE_MONEY, amount: 240, reference: 'MPESA-SPLIT-888' },
          ],
        })
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.sale.payments).toHaveLength(2)
      expect(Number(res.body.sale.total)).toBe(440)

      // Stock should have deducted exactly 2 units (50 -> 48)
      const stock = await prisma.stockLevel.findUnique({ where: { productId } })
      expect(Number(stock?.quantity)).toBe(48)
    })

    it('should reject checkout if sum of split payments does not equal total amount due', async () => {
      const session = await prisma.session.create({
        data: {
          userId: cashierId,
          token: `sess-cashier-mismatch-${Date.now()}`,
          expiresAt: new Date(Date.now() + 86400000),
        },
      })

      const res = await request(app)
        .post(`/api/v1/businesses/${businessId}/sales`)
        .set('Cookie', [`smartstock_session=${session.token}`])
        .send({
          items: [{ productId, quantity: 1 }], // Price: 220
          payments: [
            { method: PaymentMethod.CASH, amount: 100, amountTendered: 100 },
            { method: PaymentMethod.MOBILE_MONEY, amount: 100 }, // Total: 200 != 220
          ],
        })
        .expect(400)

      expect(res.body.error.code).toBe('PAYMENT_SUM_MISMATCH')
    })
  })
})
