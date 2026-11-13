import { Router } from 'express'
import { customerController } from '../controllers/customer.controller.js'
import { validateRequest } from '../middleware/validateRequest.js'
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
} from '../schemas/customer.schemas.js'
import { requirePermission, requireAnyPermission } from '../middleware/rbac.js'

const router = Router({ mergeParams: true })

// 1. List Customers
router.get(
  '/',
  requireAnyPermission(['pos.sell', 'reports.sales.view']),
  validateRequest({ query: customerQuerySchema }),
  customerController.list
)

// 2. Get Single Customer with Lifetime Spend and Order History
router.get(
  '/:customerId',
  requireAnyPermission(['pos.sell', 'reports.sales.view']),
  customerController.getById
)

// 3. Create Customer
router.post(
  '/',
  requirePermission('pos.sell'),
  validateRequest({ body: createCustomerSchema }),
  customerController.create
)

// 4. Update Customer Details
router.put(
  '/:customerId',
  requirePermission('pos.sell'),
  validateRequest({ body: updateCustomerSchema }),
  customerController.update
)

// 5. Delete or Archive Customer
router.delete(
  '/:customerId',
  requirePermission('settings.edit'),
  customerController.delete
)

export default router
