import { Request, Response, NextFunction } from 'express'
import { businessService } from '../services/business.service.js'

export class BusinessController {
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const business = await businessService.createBusiness(req.user!.id, req.body)
      res.status(201).json({
        success: true,
        business,
      })
    } catch (error) {
      next(error)
    }
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const businesses = await businessService.getUserBusinesses(req.user!.id)
      res.status(200).json({
        success: true,
        businesses,
      })
    } catch (error) {
      next(error)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const business = await businessService.getBusinessDetails(
        req.params.businessId,
        req.user!.id
      )
      res.status(200).json({
        success: true,
        business,
      })
    } catch (error) {
      next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const business = await businessService.updateBusiness(
        req.params.businessId,
        req.body
      )
      res.status(200).json({
        success: true,
        business,
      })
    } catch (error) {
      next(error)
    }
  }
}

export const businessController = new BusinessController()
