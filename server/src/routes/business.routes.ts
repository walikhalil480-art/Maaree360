import { Router } from 'express'
import { businessController } from '../controllers/business.controller.js'
import { requireAuth, requireBusinessMember } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { createBusinessSchema, updateBusinessSchema } from '../schemas/business.schemas.js'
import { Role } from '@prisma/client'

import { productCodeController } from '../controllers/productCode.controller.js'
import { resolveCodeQuerySchema } from '../schemas/productCode.schemas.js'
import categoryRoutes from './category.routes.js'
import productRoutes from './product.routes.js'
import inventoryRoutes from './inventory.routes.js'
import supplierRoutes from './supplier.routes.js'
import purchaseOrderRoutes from './purchaseOrder.routes.js'
import saleRoutes from './sale.routes.js'
import customerRoutes from './customer.routes.js'
import returnRoutes from './return.routes.js'
import expenseRoutes from './expense.routes.js'
import reportRoutes from './report.routes.js'
import teamRoutes from './team.routes.js'
import shiftRoutes from './shift.routes.js'
import auditRoutes from './audit.routes.js'
import aiRoutes from './ai.routes.js'
import notificationRoutes from './notification.routes.js'
import rbacRoutes from './rbac.routes.js'
import { rbacController } from '../controllers/rbac.controller.js'

const router = Router()

// All business routes require an authenticated user
router.use(requireAuth)

// Create business & list businesses for authenticated user
router.post('/', validateRequest({ body: createBusinessSchema }), businessController.create)
router.get('/', businessController.list)

// Access specific business - requires verified membership
router.get('/:businessId', requireBusinessMember(), businessController.getById)

// Update business - restricted via settings.edit permission
router.patch(
  '/:businessId',
  requirePermission('settings.edit'),
  validateRequest({ body: updateBusinessSchema }),
  businessController.update
)

// Resolve scanned barcode or QR code within the active business
router.get(
  '/:businessId/codes/resolve',
  requireBusinessMember(),
  validateRequest({ query: resolveCodeQuerySchema }),
  productCodeController.resolve
)

// Nested sub-resources scoped to business
router.use('/:businessId/categories', requireBusinessMember(), categoryRoutes)
router.use('/:businessId/products', requireBusinessMember(), productRoutes)
router.use('/:businessId/inventory', requireBusinessMember(), inventoryRoutes)
router.use('/:businessId/suppliers', requireBusinessMember(), supplierRoutes)
router.use('/:businessId/purchase-orders', requireBusinessMember(), purchaseOrderRoutes)
router.use('/:businessId/sales', requireBusinessMember(), saleRoutes)
router.use('/:businessId/customers', requireBusinessMember(), customerRoutes)
router.use('/:businessId/returns', requireBusinessMember(), returnRoutes)
router.use('/:businessId/expenses', requireBusinessMember(), expenseRoutes)
router.use('/:businessId/reports', requireBusinessMember([Role.OWNER, Role.MANAGER]), reportRoutes)
router.use('/:businessId/team', requireBusinessMember(), teamRoutes)
router.use('/:businessId/shifts', requireBusinessMember(), shiftRoutes)
router.use('/:businessId/audit', requireBusinessMember(), auditRoutes)
router.use('/:businessId/audit-logs', requireBusinessMember(), auditRoutes)
router.use('/:businessId/ai', requireBusinessMember(), aiRoutes)
router.use('/:businessId/notifications', requireBusinessMember(), notificationRoutes)
router.use('/:businessId/roles', requireBusinessMember(), rbacRoutes)
router.get('/:businessId/permissions', requireBusinessMember(), rbacController.listPermissions)

export default router
