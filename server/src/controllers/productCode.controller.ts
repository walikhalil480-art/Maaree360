import { Request, Response, NextFunction } from 'express'
import { productCodeService } from '../services/productCode.service.js'

export class ProductCodeController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const codes = await productCodeService.listCodes(
        req.params.businessId,
        req.params.productId
      )
      res.status(200).json({
        success: true,
        codes,
      })
    } catch (error) {
      next(error)
    }
  }

  add = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = await productCodeService.addCode(
        req.params.businessId,
        req.params.productId,
        req.body
      )
      res.status(201).json({
        success: true,
        code,
      })
    } catch (error) {
      next(error)
    }
  }

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await productCodeService.removeCode(
        req.params.businessId,
        req.params.productId,
        req.params.codeId
      )
      res.status(200).json({
        success: true,
        message: 'Product code removed successfully',
      })
    } catch (error) {
      next(error)
    }
  }

  resolve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await productCodeService.resolveCode(
        req.params.businessId,
        req.query.code as string
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

export const productCodeController = new ProductCodeController()
