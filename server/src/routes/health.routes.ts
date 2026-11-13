import { Router } from 'express'
import { healthController } from '../controllers/health.controller.js'

const router = Router()

// GET /api/v1/health - Liveness check
router.get('/health', healthController.getLiveness)

// GET /api/v1/health/ready - Database readiness check
router.get('/health/ready', healthController.getReadiness)

export default router
