import { Request, Response, NextFunction } from 'express'
import { supplierService } from '../services/supplier.service.js'
import {
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierQueryInput,
} from '../schemas/supplier.schemas.js'

export class SupplierController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await supplierService.listSuppliers(
        req.params.businessId,
        req.query as unknown as SupplierQueryInput
      )
      res.status(200).json({
        success: true,
        ...result,
      })
    } catch (error) {
      next(error)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const supplier = await supplierService.getSupplier(
        req.params.businessId,
        req.params.supplierId
      )
      res.status(200).json({
        success: true,
        supplier,
      })
    } catch (error) {
      next(error)
    }
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const supplier = await supplierService.createSupplier(
        req.params.businessId,
        req.body as CreateSupplierInput
      )
      res.status(201).json({
        success: true,
        message: 'Supplier created successfully',
        supplier,
      })
    } catch (error) {
      next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const supplier = await supplierService.updateSupplier(
        req.params.businessId,
        req.params.supplierId,
        req.body as UpdateSupplierInput
      )
      res.status(200).json({
        success: true,
        message: 'Supplier updated successfully',
        supplier,
      })
    } catch (error) {
      next(error)
    }
  }

  archive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const supplier = await supplierService.archiveSupplier(
        req.params.businessId,
        req.params.supplierId
      )
      res.status(200).json({
        success: true,
        message: 'Supplier archived successfully',
        supplier,
      })
    } catch (error) {
      next(error)
    }
  }

  reactivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const supplier = await supplierService.reactivateSupplier(
        req.params.businessId,
        req.params.supplierId
      )
      res.status(200).json({
        success: true,
        message: 'Supplier reactivated successfully',
        supplier,
      })
    } catch (error) {
      next(error)
    }
  }
}

export const supplierController = new SupplierController()
