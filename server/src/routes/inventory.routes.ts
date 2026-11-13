import { Router } from 'express'
import { inventoryController } from '../controllers/inventory.controller.js'
import { validateRequest } from '../middleware/validateRequest.js'
import {
  recordOpeningStockSchema,
  receiveStockSchema,
  issueStockSchema,
  adjustStockSchema,
  recordLossDamageSchema,
  recordReturnSchema,
  inventoryQuerySchema,
  movementsQuerySchema,
} from '../schemas/inventory.schemas.js'
import { requirePermission } from '../middleware/rbac.js'

const router = Router({ mergeParams: true })

// 1. Current stock balances list - requires inventory.view
router.get(
  '/',
  requirePermission('inventory.view'),
  validateRequest({ query: inventoryQuerySchema }),
  inventoryController.list
)

// 2. Low-stock alerts - requires inventory.view
router.get(
  '/low-stock',
  requirePermission('inventory.view'),
  inventoryController.lowStock
)

// 3. Movement history ledger - requires inventory.view
router.get(
  '/movements',
  requirePermission('inventory.view'),
  validateRequest({ query: movementsQuerySchema }),
  inventoryController.listMovements
)

// 4. Single product inventory balance and recent movements
router.get(
  '/products/:productId',
  requirePermission('inventory.view'),
  inventoryController.productInventory
)

// 5. Stock Operations
router.post(
  '/products/:productId/opening-stock',
  requirePermission('inventory.adjust'),
  validateRequest({ body: recordOpeningStockSchema }),
  inventoryController.recordOpeningStock
)

router.post(
  '/products/:productId/receive',
  requirePermission('purchases.receive'),
  validateRequest({ body: receiveStockSchema }),
  inventoryController.receiveStock
)

router.post(
  '/products/:productId/issue',
  requirePermission('inventory.adjust'),
  validateRequest({ body: issueStockSchema }),
  inventoryController.issueStock
)

router.post(
  '/products/:productId/adjust',
  requirePermission('inventory.adjust'),
  validateRequest({ body: adjustStockSchema }),
  inventoryController.adjustStock
)

router.post(
  '/products/:productId/loss-damage',
  requirePermission('inventory.write_off'),
  validateRequest({ body: recordLossDamageSchema }),
  inventoryController.recordLossDamage
)

router.post(
  '/products/:productId/return',
  requirePermission('inventory.adjust'),
  validateRequest({ body: recordReturnSchema }),
  inventoryController.recordReturn
)

export default router
