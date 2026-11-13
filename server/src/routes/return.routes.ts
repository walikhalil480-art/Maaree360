import { Router } from 'express'
import { returnController } from '../controllers/return.controller.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { createReturnSchema, returnQuerySchema } from '../schemas/return.schemas.js'
import { requireAnyPermission } from '../middleware/rbac.js'

const router = Router({ mergeParams: true })

// 1. List Returns
router.get(
  '/',
  requireAnyPermission(['pos.refund', 'pos.sell', 'reports.sales.view']),
  validateRequest({ query: returnQuerySchema }),
  returnController.list
)

// 2. Get Single Return with Line Items and Credit Note
router.get(
  '/:returnId',
  requireAnyPermission(['pos.refund', 'pos.sell', 'reports.sales.view']),
  returnController.getById
)

// 3. Process Sales Return and Refund (Requires pos.refund or pos.sell permission)
router.post(
  '/',
  requireAnyPermission(['pos.refund', 'pos.sell']),
  validateRequest({ body: createReturnSchema }),
  returnController.create
)

export default router
