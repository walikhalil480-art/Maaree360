import { Request, Response, NextFunction } from 'express'
import { customerService } from '../services/customer.service.js'

export class CustomerController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const customer = await customerService.createCustomer(businessId, req.body)

      res.status(201).json({
        success: true,
        customer,
      })
    } catch (err) {
      next(err)
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const result = await customerService.listCustomers(businessId, req.query as any)

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
      const { businessId, customerId } = req.params
      const customer = await customerService.getCustomer(businessId, customerId)

      res.status(200).json({
        success: true,
        customer,
      })
    } catch (err) {
      next(err)
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId, customerId } = req.params
      const customer = await customerService.updateCustomer(businessId, customerId, req.body)

      res.status(200).json({
        success: true,
        customer,
      })
    } catch (err) {
      next(err)
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId, customerId } = req.params
      const result = await customerService.deleteCustomer(businessId, customerId)

      res.status(200).json({
        success: true,
        ...result,
      })
    } catch (err) {
      next(err)
    }
  }
}

export const customerController = new CustomerController()
