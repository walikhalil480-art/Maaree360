import { Router } from 'express'
import { saleController } from '../controllers/sale.controller.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { createSaleSchema, saleQuerySchema, cancelSaleSchema } from '../schemas/sale.schemas.js'
import { requirePermission, requireAnyPermission } from '../middleware/rbac.js'

const router = Router({ mergeParams: true })

// 1. Sales Dashboard Summary (Accessible to anyone with reports.sales.view or pos.sell)
router.get(
  '/summary',
  requireAnyPermission(['reports.sales.view', 'pos.sell']),
  saleController.getSummary
)

// 2. List Sales History
router.get(
  '/',
  requireAnyPermission(['reports.sales.view', 'pos.sell']),
  validateRequest({ query: saleQuerySchema }),
  saleController.list
)

// 3. Get Single Sale by ID
router.get(
  '/:saleId',
  requireAnyPermission(['reports.sales.view', 'pos.sell']),
  saleController.getById
)

// 4. Complete POS Sale (Requires pos.sell permission)
router.post(
  '/',
  requirePermission('pos.sell'),
  validateRequest({ body: createSaleSchema }),
  saleController.create
)

// 5. Cancel Sale (Requires pos.cancel_sale permission)
router.post(
  '/:saleId/cancel',
  requirePermission('pos.cancel_sale'),
  validateRequest({ body: cancelSaleSchema }),
  saleController.cancel
)

export default router
