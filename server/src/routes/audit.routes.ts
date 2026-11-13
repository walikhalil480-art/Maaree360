import { Router } from 'express'
import { auditController } from '../controllers/audit.controller.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { auditLogQuerySchema } from '../schemas/audit.schemas.js'
import { requirePermission } from '../middleware/rbac.js'

const router = Router({ mergeParams: true })

// Audit logs are restricted via granular audit.view permission
router.get(
  '/',
  requirePermission('audit.view'),
  validateRequest({ query: auditLogQuerySchema }),
  auditController.list
)

export default router
