import { Request, Response, NextFunction } from 'express'
import { categoryService } from '../services/category.service.js'

export class CategoryController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const categories = await categoryService.listCategories(req.params.businessId)
      res.status(200).json({
        success: true,
        categories,
      })
    } catch (error) {
      next(error)
    }
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const category = await categoryService.createCategory(req.params.businessId, req.body)
      res.status(201).json({
        success: true,
        category,
      })
    } catch (error) {
      next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const category = await categoryService.updateCategory(
        req.params.businessId,
        req.params.categoryId,
        req.body
      )
      res.status(200).json({
        success: true,
        category,
      })
    } catch (error) {
      next(error)
    }
  }

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await categoryService.deleteCategory(req.params.businessId, req.params.categoryId)
      res.status(200).json({
        success: true,
        message: 'Category deleted successfully',
      })
    } catch (error) {
      next(error)
    }
  }
}

export const categoryController = new CategoryController()
