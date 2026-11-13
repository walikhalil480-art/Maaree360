import { Request, Response, NextFunction } from 'express'
import { saleService } from '../services/sale.service.js'

export class SaleController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const cashierId = req.user!.id
      const cashierRole = req.membership!.role

      const sale = await saleService.createSale(
        businessId,
        cashierId,
        cashierRole,
        req.body
      )

      res.status(201).json({
        success: true,
        sale,
      })
    } catch (err) {
      next(err)
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const result = await saleService.listSales(businessId, req.query as any)

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
      const { businessId, saleId } = req.params
      const sale = await saleService.getSale(businessId, saleId)

      res.status(200).json({
        success: true,
        sale,
      })
    } catch (err) {
      next(err)
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId, saleId } = req.params
      const userRole = req.membership!.role

      const sale = await saleService.cancelSale(businessId, saleId, userRole, req.body)

      res.status(200).json({
        success: true,
        sale,
      })
    } catch (err) {
      next(err)
    }
  }

  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const summary = await saleService.getDashboardSummary(businessId)

      res.status(200).json({
        success: true,
        summary,
      })
    } catch (err) {
      next(err)
    }
  }
}

export const saleController = new SaleController()
