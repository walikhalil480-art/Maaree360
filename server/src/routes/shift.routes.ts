import { Router } from 'express'
import { shiftController } from '../controllers/shift.controller.js'
import { validateRequest } from '../middleware/validateRequest.js'
import {
  createRegisterSchema,
  updateRegisterSchema,
  openShiftSchema,
  closeShiftSchema,
  shiftQuerySchema,
} from '../schemas/shift.schemas.js'
import { requirePermission, requireAnyPermission } from '../middleware/rbac.js'

const router = Router({ mergeParams: true })

// 1. Registers
router.get(
  '/registers',
  requirePermission('pos.access'),
  shiftController.listRegisters
)

router.post(
  '/registers',
  requirePermission('settings.edit'),
  validateRequest({ body: createRegisterSchema }),
  shiftController.createRegister
)

router.patch(
  '/registers/:registerId',
  requirePermission('settings.edit'),
  validateRequest({ body: updateRegisterSchema }),
  shiftController.updateRegister
)

// 2. Cashier Shifts
router.get(
  '/current',
  requirePermission('pos.access'),
  shiftController.getCurrentShift
)

router.post(
  '/open',
  requirePermission('pos.access'),
  validateRequest({ body: openShiftSchema }),
  shiftController.openShift
)

router.get(
  '/:shiftId/reconcile',
  requirePermission('pos.access'),
  shiftController.getShiftReconciliation
)

router.get(
  '/:shiftId/reconciliation',
  requirePermission('pos.access'),
  shiftController.getShiftReconciliation
)

router.post(
  '/:shiftId/close',
  requirePermission('pos.access'),
  validateRequest({ body: closeShiftSchema }),
  shiftController.closeShift
)

router.get(
  '/history',
  requireAnyPermission(['reports.sales.view', 'pos.access']),
  validateRequest({ query: shiftQuerySchema }),
  shiftController.listShifts
)

router.get(
  '/',
  requireAnyPermission(['reports.sales.view', 'pos.access']),
  validateRequest({ query: shiftQuerySchema }),
  shiftController.listShifts
)

router.get(
  '/:shiftId',
  requirePermission('pos.access'),
  shiftController.getShiftById
)

export default router
