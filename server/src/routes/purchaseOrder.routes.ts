import { Router } from 'express'
import { purchaseOrderController } from '../controllers/purchaseOrder.controller.js'
import { validateRequest } from '../middleware/validateRequest.js'
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  receiveDeliverySchema,
  cancelPurchaseOrderSchema,
  purchaseOrderQuerySchema,
} from '../schemas/purchaseOrder.schemas.js'
import { requirePermission } from '../middleware/rbac.js'

const router = Router({ mergeParams: true })

// 1. Dashboard summary of purchasing metrics
router.get(
  '/summary',
  requirePermission('purchases.view'),
  purchaseOrderController.dashboardSummary
)

// 2. List purchase orders with filters
router.get(
  '/',
  requirePermission('purchases.view'),
  validateRequest({ query: purchaseOrderQuerySchema }),
  purchaseOrderController.list
)

// 3. View single purchase order details
router.get(
  '/:orderId',
  requirePermission('purchases.view'),
  purchaseOrderController.getById
)

// 4. Create draft purchase order
router.post(
  '/',
  requirePermission('purchases.create'),
  validateRequest({ body: createPurchaseOrderSchema }),
  purchaseOrderController.create
)

// 5. Update draft purchase order
router.patch(
  '/:orderId',
  requirePermission('purchases.create'),
  validateRequest({ body: updatePurchaseOrderSchema }),
  purchaseOrderController.update
)

// 6. Place order (DRAFT -> ORDERED)
router.post(
  '/:orderId/place',
  requirePermission('purchases.approve'),
  purchaseOrderController.place
)

// 7. Receive goods delivery
router.post(
  '/:orderId/receive',
  requirePermission('purchases.receive'),
  validateRequest({ body: receiveDeliverySchema }),
  purchaseOrderController.receive
)

// 8. Cancel order
router.post(
  '/:orderId/cancel',
  requirePermission('purchases.cancel'),
  validateRequest({ body: cancelPurchaseOrderSchema }),
  purchaseOrderController.cancel
)

export default router
