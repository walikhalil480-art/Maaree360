import { Request, Response, NextFunction } from 'express'
import { purchaseOrderService } from '../services/purchaseOrder.service.js'
import {
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  ReceiveDeliveryInput,
  CancelPurchaseOrderInput,
  PurchaseOrderQueryInput,
} from '../schemas/purchaseOrder.schemas.js'

export class PurchaseOrderController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await purchaseOrderService.listPurchaseOrders(
        req.params.businessId,
        req.query as unknown as PurchaseOrderQueryInput
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
      const purchaseOrder = await purchaseOrderService.getPurchaseOrder(
        req.params.businessId,
        req.params.orderId
      )
      res.status(200).json({
        success: true,
        purchaseOrder,
      })
    } catch (error) {
      next(error)
    }
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const purchaseOrder = await purchaseOrderService.createPurchaseOrder(
        req.params.businessId,
        req.user!.id,
        req.body as CreatePurchaseOrderInput
      )
      res.status(201).json({
        success: true,
        message: 'Purchase order draft created successfully',
        purchaseOrder,
      })
    } catch (error) {
      next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const purchaseOrder = await purchaseOrderService.updatePurchaseOrder(
        req.params.businessId,
        req.params.orderId,
        req.body as UpdatePurchaseOrderInput
      )
      res.status(200).json({
        success: true,
        message: 'Purchase order updated successfully',
        purchaseOrder,
      })
    } catch (error) {
      next(error)
    }
  }

  place = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const purchaseOrder = await purchaseOrderService.placeOrder(
        req.params.businessId,
        req.params.orderId
      )
      res.status(200).json({
        success: true,
        message: `Purchase order ${purchaseOrder.orderNumber} placed successfully`,
        purchaseOrder,
      })
    } catch (error) {
      next(error)
    }
  }

  receive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await purchaseOrderService.receiveDelivery(
        req.params.businessId,
        req.user!.id,
        req.params.orderId,
        req.body as ReceiveDeliveryInput
      )
      res.status(200).json({
        success: true,
        message: `Goods received against ${result.purchaseOrder.orderNumber} successfully`,
        ...result,
      })
    } catch (error) {
      next(error)
    }
  }

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const purchaseOrder = await purchaseOrderService.cancelOrder(
        req.params.businessId,
        req.params.orderId,
        req.body as CancelPurchaseOrderInput
      )
      res.status(200).json({
        success: true,
        message: `Purchase order ${purchaseOrder.orderNumber} cancelled`,
        purchaseOrder,
      })
    } catch (error) {
      next(error)
    }
  }

  dashboardSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await purchaseOrderService.getDashboardSummary(req.params.businessId)
      res.status(200).json({
        success: true,
        summary,
      })
    } catch (error) {
      next(error)
    }
  }
}

export const purchaseOrderController = new PurchaseOrderController()
