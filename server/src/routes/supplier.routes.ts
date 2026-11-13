import { Router } from 'express'
import { supplierController } from '../controllers/supplier.controller.js'
import { validateRequest } from '../middleware/validateRequest.js'
import {
  createSupplierSchema,
  updateSupplierSchema,
  supplierQuerySchema,
} from '../schemas/supplier.schemas.js'
import { requirePermission } from '../middleware/rbac.js'

const router = Router({ mergeParams: true })

// List suppliers
router.get(
  '/',
  requirePermission('suppliers.view'),
  validateRequest({ query: supplierQuerySchema }),
  supplierController.list
)

// View single supplier details
router.get(
  '/:supplierId',
  requirePermission('suppliers.view'),
  supplierController.getById
)

// Create supplier
router.post(
  '/',
  requirePermission('suppliers.manage'),
  validateRequest({ body: createSupplierSchema }),
  supplierController.create
)

// Update supplier
router.patch(
  '/:supplierId',
  requirePermission('suppliers.manage'),
  validateRequest({ body: updateSupplierSchema }),
  supplierController.update
)

// Archive supplier
router.patch(
  '/:supplierId/archive',
  requirePermission('suppliers.manage'),
  supplierController.archive
)

// Reactivate supplier
router.patch(
  '/:supplierId/reactivate',
  requirePermission('suppliers.manage'),
  supplierController.reactivate
)

export default router
