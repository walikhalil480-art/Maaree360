import { Request, Response, NextFunction } from 'express'
import { priceCheckerService } from '../services/priceChecker.service.js'

export class PriceCheckerController {
  checkPrice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { businessId } = req.params
      const code = (req.query.code as string) || (req.body.code as string)
      const result = await priceCheckerService.checkPrice(businessId, code)
      res.status(200).json({
        success: true,
        product: result,
      })
    } catch (error) {
      next(error)
    }
  }

  getStoreInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { businessId } = req.params
      const store = await priceCheckerService.getKioskStoreInfo(businessId)
      res.status(200).json({
        success: true,
        store,
      })
    } catch (error) {
      next(error)
    }
  }
}

export const priceCheckerController = new PriceCheckerController()
