import { Router } from 'express'
import { expenseController } from '../controllers/expense.controller.js'
import { validateRequest } from '../middleware/validateRequest.js'
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseQuerySchema,
  profitSummaryQuerySchema,
} from '../schemas/expense.schemas.js'
import { requirePermission } from '../middleware/rbac.js'

const router = Router({ mergeParams: true })

// 1. Financial & Operating Profit Summary
router.get(
  '/profit-summary',
  requirePermission('finance.profit.view'),
  validateRequest({ query: profitSummaryQuerySchema }),
  expenseController.getProfitSummary
)

// 2. List Expenses
router.get(
  '/',
  requirePermission('finance.expenses.view'),
  validateRequest({ query: expenseQuerySchema }),
  expenseController.list
)

// 3. Create Operating Expense
router.post(
  '/',
  requirePermission('finance.expenses.create'),
  validateRequest({ body: createExpenseSchema }),
  expenseController.create
)

// 4. View Single Expense Details
router.get(
  '/:expenseId',
  requirePermission('finance.expenses.view'),
  expenseController.getById
)

// 5. Update Expense (Requires finance.expenses.approve)
router.put(
  '/:expenseId',
  requirePermission('finance.expenses.approve'),
  validateRequest({ body: updateExpenseSchema }),
  expenseController.update
)

// 6. Delete Expense (Requires finance.expenses.approve)
router.delete(
  '/:expenseId',
  requirePermission('finance.expenses.approve'),
  expenseController.delete
)

export default router
