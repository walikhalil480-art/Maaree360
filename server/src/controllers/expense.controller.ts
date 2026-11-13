import { Request, Response, NextFunction } from 'express'
import { expenseService } from '../services/expense.service.js'

export class ExpenseController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const userId = req.user!.id
      const expense = await expenseService.createExpense(businessId, userId, req.body)

      res.status(201).json({
        success: true,
        expense,
      })
    } catch (err) {
      next(err)
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const result = await expenseService.listExpenses(businessId, req.query as any)

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
      const { businessId, expenseId } = req.params
      const expense = await expenseService.getExpenseById(businessId, expenseId)

      res.status(200).json({
        success: true,
        expense,
      })
    } catch (err) {
      next(err)
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId, expenseId } = req.params
      const expense = await expenseService.updateExpense(businessId, expenseId, req.body)

      res.status(200).json({
        success: true,
        expense,
      })
    } catch (err) {
      next(err)
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId, expenseId } = req.params
      const userRole = req.membership?.role
      const result = await expenseService.deleteExpense(businessId, expenseId, userRole!)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async getProfitSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const summary = await expenseService.getProfitSummary(businessId, req.query as any)

      res.status(200).json({
        success: true,
        summary,
      })
    } catch (err) {
      next(err)
    }
  }
}

export const expenseController = new ExpenseController()
