import { Router } from 'express'
import { paymentController } from '../controllers/payment.controller.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Public Webhooks (called by payment networks / Safaricom Daraja)
router.post('/mpesa/callback', paymentController.handleMpesaCallback)
router.post('/card/webhook', paymentController.handleCardWebhook)

// Status checking & Simulation (Authenticated or in-checkout)
router.get('/mpesa/status/:checkoutRequestId', paymentController.getMpesaStatus)
router.post('/mpesa/simulate-approval', paymentController.simulateMpesaApproval)

// Payment Initiation (Requires Authenticated Session)
router.post('/mpesa/stkpush', requireAuth, paymentController.initiateMpesaStk)
router.post('/card/intent', requireAuth, paymentController.createCardIntent)

export default router
