import { Request, Response, NextFunction } from 'express'
import { productService } from '../services/product.service.js'
import { ProductQueryInput } from '../schemas/product.schemas.js'
import { AppError } from '../middleware/errorHandler.js'

export class ProductController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await productService.listProducts(
        req.params.businessId,
        req.query as unknown as ProductQueryInput
      )
      res.status(200).json({
        success: true,
        ...result,
      })
    } catch (error) {
      next(error)
    }
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const product = await productService.createProduct(req.params.businessId, req.body)
      res.status(201).json({
        success: true,
        product,
      })
    } catch (error) {
      next(error)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const product = await productService.getProduct(req.params.businessId, req.params.productId)
      res.status(200).json({
        success: true,
        product,
      })
    } catch (error) {
      next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const product = await productService.updateProduct(
        req.params.businessId,
        req.params.productId,
        req.body
      )
      res.status(200).json({
        success: true,
        product,
      })
    } catch (error) {
      next(error)
    }
  }

  archive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const product = await productService.setProductStatus(
        req.params.businessId,
        req.params.productId,
        false
      )
      res.status(200).json({
        success: true,
        message: 'Product archived successfully',
        product,
      })
    } catch (error) {
      next(error)
    }
  }

  reactivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const product = await productService.setProductStatus(
        req.params.businessId,
        req.params.productId,
        true
      )
      res.status(200).json({
        success: true,
        message: 'Product reactivated successfully',
        product,
      })
    } catch (error) {
      next(error)
    }
  }

  uploadImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw new AppError('No image file uploaded', 400, 'NO_FILE')
      }
      const imageUrl = `/products/uploads/${req.file.filename}`
      res.status(200).json({
        success: true,
        imageUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      })
    } catch (error) {
      next(error)
    }
  }

  updateImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw new AppError('No image file uploaded', 400, 'NO_FILE')
      }
      const imageUrl = `/products/uploads/${req.file.filename}`
      const product = await productService.updateProduct(
        req.params.businessId,
        req.params.productId,
        { imageUrl }
      )
      res.status(200).json({
        success: true,
        message: 'Product image updated successfully',
        product,
        imageUrl,
      })
    } catch (error) {
      next(error)
    }
  }
}

export const productController = new ProductController()
