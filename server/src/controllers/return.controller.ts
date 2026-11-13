import { Request, Response, NextFunction } from 'express'
import { returnService } from '../services/return.service.js'

export class ReturnController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const userId = req.user!.id
      const role = req.membership!.role

      const returnRecord = await returnService.createReturn(
        businessId,
        userId,
        role,
        req.body
      )

      res.status(201).json({
        success: true,
        returnRecord,
      })
    } catch (err) {
      next(err)
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const result = await returnService.listReturns(businessId, req.query as any)

      res.status(200).json({
        success: true,
        ...result,
      })
    } catch (err) {
      next(err)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId, returnId } = req.params
      const returnRecord = await returnService.getReturn(businessId, returnId)

      res.status(200).json({
        success: true,
        returnRecord,
      })
    } catch (err) {
      next(err)
    }
  }
}

export const returnController = new ReturnController()
