import { Request, Response, NextFunction } from 'express'
import { mpesaService } from '../services/payments/mpesa.service.js'
import { cardPaymentAdapter } from '../services/payments/card.service.js'
import { AppError } from '../middleware/errorHandler.js'
import { prisma } from '../db/prisma.js'

export class PaymentController {
  initiateMpesaStk = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { businessId, amount, phoneNumber, reference, description, idempotencyKey } = req.body
      if (!businessId || !amount || !phoneNumber) {
        throw new AppError('businessId, amount, and phoneNumber are required for M-Pesa STK push.', 400, 'MISSING_FIELDS')
      }

      // Verify authenticated user is an active member of target business
      const membership = await prisma.businessMembership.findUnique({
        where: {
          userId_businessId: {
            userId: req.user!.id,
            businessId,
          },
        },
      })
      if (!membership || !membership.isActive) {
        throw new AppError('Business not found or access denied', 404, 'NOT_FOUND')
      }

      const result = await mpesaService.initiateStkPush({
        businessId,
        amount: Number(amount),
        phoneNumber: String(phoneNumber),
        reference,
        description,
        idempotencyKey,
      })

      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  }

  handleMpesaCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await mpesaService.handleCallback(req.body)
      // Safaricom Daraja expects standard acknowledgment
      res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' })
    } catch (error) {
      console.warn('[PaymentController] Error handling M-Pesa callback:', error)
      // Acknowledge Safaricom to prevent infinite retry storms
      res.status(200).json({ ResultCode: 0, ResultDesc: 'Error recorded' })
    }
  }

  getMpesaStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { checkoutRequestId } = req.params
      const status = await mpesaService.checkStatus(checkoutRequestId)
      res.status(200).json({
        success: true,
        ...status,
      })
    } catch (error) {
      next(error)
    }
  }

  simulateMpesaApproval = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { checkoutRequestId, receiptNumber } = req.body
      if (!checkoutRequestId) {
        throw new AppError('checkoutRequestId is required.', 400, 'MISSING_CHECKOUT_ID')
      }

      const success = await mpesaService.simulateCallbackSuccess(checkoutRequestId, receiptNumber)
      res.status(200).json({
        success,
        message: 'M-Pesa STK approval simulated successfully.',
      })
    } catch (error) {
      next(error)
    }
  }

  createCardIntent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { businessId, amount, currency, reference, idempotencyKey } = req.body
      if (!businessId || !amount) {
        throw new AppError('businessId and amount are required.', 400, 'MISSING_FIELDS')
      }

      // Verify authenticated user is an active member of target business
      const membership = await prisma.businessMembership.findUnique({
        where: {
          userId_businessId: {
            userId: req.user!.id,
            businessId,
          },
        },
      })
      if (!membership || !membership.isActive) {
        throw new AppError('Business not found or access denied', 404, 'NOT_FOUND')
      }

      const result = await cardPaymentAdapter.createPaymentIntent({
        businessId,
        amount: Number(amount),
        currency: currency || 'KES',
        reference,
        idempotencyKey,
      })
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  }

  handleCardWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const signature = req.headers['x-provider-signature'] as string | undefined
      const isValid = cardPaymentAdapter.verifyWebhook(req.body, signature)

      if (!isValid) {
        res.status(401).json({ error: 'Invalid webhook signature' })
        return
      }

      const result = await cardPaymentAdapter.processWebhook(req.body)
      res.status(200).json({ success: true, ...result })
    } catch (error) {
      next(error)
    }
  }
}

export const paymentController = new PaymentController()
