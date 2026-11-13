import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { priceCheckerController } from '../controllers/priceChecker.controller.js'

const router = Router({ mergeParams: true })

// Safe rate-limiter for customer kiosks: 120 scans per minute per IP
const priceCheckerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many price checks in a short window. Please wait a moment and scan again.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Public store kiosk info
router.get('/info', priceCheckerLimiter, priceCheckerController.getStoreInfo)

// Customer scan lookup (supports GET with ?code= and POST with { code })
router.get('/lookup', priceCheckerLimiter, priceCheckerController.checkPrice)
router.post('/lookup', priceCheckerLimiter, priceCheckerController.checkPrice)

export default router
