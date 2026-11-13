import express, { Express } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import healthRoutes from './routes/health.routes.js'
import authRoutes from './routes/auth.routes.js'
import invitationRoutes from './routes/invitation.routes.js'
import businessRoutes from './routes/business.routes.js'
import priceCheckerRoutes from './routes/priceChecker.routes.js'
import paymentRoutes from './routes/payment.routes.js'
import platformRoutes from './routes/platform.routes.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'
import { attachCsrfToken, verifyCsrf } from './middleware/csrf.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function createApp(): Express {
  const app = express()

  // Development request logging
  app.use(requestLogger)

  // Configure CORS for the explicitly configured frontend origin with credentials
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
    })
  )

  // Parse cookies, JSON, and URL-encoded requests with size limits
  app.use(cookieParser())
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))

  // Attach and verify CSRF protection for cookie-based sessions
  app.use(attachCsrfToken)
  app.use(verifyCsrf)

  // Primary API v1 routes
  app.use('/api/v1', healthRoutes)
  app.use('/api/v1/auth', authRoutes)
  app.use('/api/v1/invitations', invitationRoutes)
  app.use('/api/v1/businesses', businessRoutes)
  app.use('/api/v1/price-checker/:businessId', priceCheckerRoutes)
  app.use('/api/v1/payments', paymentRoutes)
  app.use('/api/v1/platform', platformRoutes)

  // Backward compatibility alias for /api/health from Installment 1
  app.use('/api', healthRoutes)

  // Serve local product catalog images & uploads (supports container volume mounts)
  const productsDir = process.env.PRODUCTS_DIR || path.join(__dirname, '../../client/public/products')
  const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../client/public/products/uploads')
  app.use('/products', express.static(productsDir))
  app.use('/uploads', express.static(uploadsDir))

  // Centralized Error Handling Middleware
  app.use(errorHandler)

  return app
}
