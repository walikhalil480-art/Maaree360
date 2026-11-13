import { Request, Response, NextFunction } from 'express'
import { inventoryService } from '../services/inventory.service.js'
import {
  InventoryQueryInput,
  MovementsQueryInput,
} from '../schemas/inventory.schemas.js'

export class InventoryController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await inventoryService.listInventory(
        req.params.businessId,
        req.query as unknown as InventoryQueryInput
      )
      res.status(200).json({
        success: true,
        ...result,
      })
    } catch (error) {
      next(error)
    }
  }

  lowStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const items = await inventoryService.getLowStockProducts(req.params.businessId)
      res.status(200).json({
        success: true,
        count: items.length,
        items,
      })
    } catch (error) {
      next(error)
    }
  }

  productInventory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await inventoryService.getProductInventory(
        req.params.businessId,
        req.params.productId
      )
      res.status(200).json({
        success: true,
        ...data,
      })
    } catch (error) {
      next(error)
    }
  }

  recordOpeningStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await inventoryService.recordOpeningStock(
        req.params.businessId,
        req.params.productId,
        req.user!.id,
        req.body
      )
      res.status(200).json({
        success: true,
        message: 'Opening stock count recorded successfully',
        ...result,
      })
    } catch (error) {
      next(error)
    }
  }

  receiveStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await inventoryService.receiveStock(
        req.params.businessId,
        req.params.productId,
        req.user!.id,
        req.body
      )
      res.status(200).json({
        success: true,
        message: 'Stock received successfully',
        ...result,
      })
    } catch (error) {
      next(error)
    }
  }

  issueStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await inventoryService.issueStock(
        req.params.businessId,
        req.params.productId,
        req.user!.id,
        req.body
      )
      res.status(200).json({
        success: true,
        message: 'Stock issued successfully',
        ...result,
      })
    } catch (error) {
      next(error)
    }
  }

  adjustStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await inventoryService.adjustStock(
        req.params.businessId,
        req.params.productId,
        req.user!.id,
        req.body
      )
      res.status(200).json({
        success: true,
        message: 'Stock adjusted successfully',
        ...result,
      })
    } catch (error) {
      next(error)
    }
  }

  recordLossDamage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await inventoryService.recordLossDamage(
        req.params.businessId,
        req.params.productId,
        req.user!.id,
        req.body
      )
      res.status(200).json({
        success: true,
        message: 'Damage/loss recorded successfully',
        ...result,
      })
    } catch (error) {
      next(error)
    }
  }

  recordReturn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await inventoryService.recordReturn(
        req.params.businessId,
        req.params.productId,
        req.user!.id,
        req.body
      )
      res.status(200).json({
        success: true,
        message: 'Stock return recorded successfully',
        ...result,
      })
    } catch (error) {
      next(error)
    }
  }

  listMovements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await inventoryService.listMovements(
        req.params.businessId,
        req.query as unknown as MovementsQueryInput
      )
      res.status(200).json({
        success: true,
        ...result,
      })
    } catch (error) {
      next(error)
    }
  }
}

export const inventoryController = new InventoryController()
