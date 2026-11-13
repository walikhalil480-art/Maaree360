import { Request, Response, NextFunction } from 'express'
import { shiftService } from '../services/shift.service.js'
import {
  CreateRegisterInput,
  UpdateRegisterInput,
  OpenShiftInput,
  CloseShiftInput,
  ShiftQueryInput,
} from '../schemas/shift.schemas.js'

export class ShiftController {
  async listRegisters(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const data = await shiftService.listRegisters(businessId)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  async createRegister(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const actorId = req.user!.id
      const actorRole = req.membership!.role
      const input = req.body as CreateRegisterInput

      const data = await shiftService.createRegister(businessId, actorId, actorRole, input)
      res.status(201).json({ success: true, data, message: 'Register created successfully.' })
    } catch (error) {
      next(error)
    }
  }

  async updateRegister(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId, registerId } = req.params
      const actorId = req.user!.id
      const actorRole = req.membership!.role
      const input = req.body as UpdateRegisterInput

      const data = await shiftService.updateRegister(businessId, actorId, actorRole, registerId, input)
      res.json({ success: true, data, message: 'Register updated successfully.' })
    } catch (error) {
      next(error)
    }
  }

  async getCurrentShift(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const cashierId = req.user!.id
      const data = await shiftService.getCurrentShift(businessId, cashierId)
      res.json({
        success: true,
        data: data ? { ...data.shift, reconciliation: data.reconciliation } : null,
      })
    } catch (error) {
      next(error)
    }
  }

  async openShift(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const cashierId = req.user!.id
      const input = req.body as OpenShiftInput

      const data = await shiftService.openShift(businessId, cashierId, input)
      res.status(201).json({ success: true, data, message: 'Cashier shift opened successfully.' })
    } catch (error) {
      next(error)
    }
  }

  async getShiftReconciliation(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId, shiftId } = req.params
      const data = await shiftService.calculateShiftExpectedCash(businessId, shiftId)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  async closeShift(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId, shiftId } = req.params
      const actorId = req.user!.id
      const actorRole = req.membership!.role
      const input = req.body as CloseShiftInput

      const result = await shiftService.closeShift(businessId, actorId, actorRole, shiftId, input)
      res.json({
        success: true,
        data: result.shift,
        reconciliation: result.reconciliation,
        message: 'Cashier shift closed successfully.',
      })
    } catch (error) {
      next(error)
    }
  }

  async listShifts(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const query = req.query as unknown as ShiftQueryInput
      const data = await shiftService.listShifts(businessId, query)
      res.json({ success: true, data: data.items, pagination: data.pagination })
    } catch (error) {
      next(error)
    }
  }

  async getShiftById(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId, shiftId } = req.params
      const data = await shiftService.getShiftById(businessId, shiftId)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }
}

export const shiftController = new ShiftController()
