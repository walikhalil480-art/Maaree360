import { Router } from 'express'
import { authController } from '../controllers/auth.controller.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { registerSchema, loginSchema } from '../schemas/auth.schemas.js'
import { requireAuth } from '../middleware/auth.js'
import { authRateLimiter } from '../middleware/rateLimiter.js'

const router = Router()

// Public authentication routes
router.post('/register', authRateLimiter, validateRequest({ body: registerSchema }), authController.register)
router.post('/login', authRateLimiter, validateRequest({ body: loginSchema }), authController.login)
router.get('/csrf', authController.getCsrfToken)

// Protected authentication routes
router.post('/logout', requireAuth, authController.logout)
router.get('/me', requireAuth, authController.getMe)

export default router
