import { z } from 'zod'
import { ExpenseCategory } from '@prisma/client'

export const EXPENSE_CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; description: string }> = {
  RENT: { label: 'Rent', description: 'Store, warehouse, or retail space rent' },
  ELECTRICITY_AND_WATER: { label: 'Electricity and water', description: 'Power grid, tokens, borehole, municipal water' },
  EMPLOYEE_WAGES: { label: 'Employee wages', description: 'Staff salaries, daily casual wages, commissions' },
  TRANSPORT_AND_DELIVERY: { label: 'Transport and delivery', description: 'Goods transit, matatu/boda fare, fuel, shipping' },
  INTERNET_AND_PHONE: { label: 'Internet and phone', description: 'WiFi router, airtime, bundles, till SMS charges' },
  PACKAGING_AND_SUPPLIES: { label: 'Packaging and supplies', description: 'Paper bags, cartons, receipt paper, tape' },
  REPAIRS_AND_MAINTENANCE: { label: 'Repairs and maintenance', description: 'Shelving, equipment, POS repairs, plumbing' },
  MARKETING: { label: 'Marketing', description: 'Signboard, flyers, local ads, social promotion' },
  OTHER: { label: 'Other expenses', description: 'Licenses, permits, bank fees, misc store expenses' },
}

// Helper to normalize input category to ExpenseCategory enum
const normalizeCategory = (val: unknown): unknown => {
  if (typeof val !== 'string') return val
  const clean = val.trim()
  if (!clean) return val

  // Check exact enum match (e.g. "RENT")
  if (clean in ExpenseCategory) {
    return clean
  }

  // Check case-insensitive enum match
  const upper = clean.toUpperCase()
  if (upper in ExpenseCategory) {
    return upper
  }

  // Check friendly label matches (e.g. "Electricity and water")
  for (const [key, config] of Object.entries(EXPENSE_CATEGORY_CONFIG)) {
    if (config.label.toLowerCase() === clean.toLowerCase()) {
      return key
    }
  }

  // Check normalized underscore/space conversions
  const normalizedKey = clean
    .toUpperCase()
    .replace(/&/g, 'AND')
    .replace(/[\s-]+/g, '_')

  if (normalizedKey in ExpenseCategory) {
    return normalizedKey
  }

  return val
}

export const expenseCategorySchema = z.preprocess(
  normalizeCategory,
  z.nativeEnum(ExpenseCategory, {
    errorMap: () => ({
      message:
        'Invalid expense category. Supported categories: Rent, Electricity and water, Employee wages, Transport and delivery, Internet and phone, Packaging and supplies, Repairs and maintenance, Marketing, Other expenses.',
    }),
  })
)

export const createExpenseSchema = z.object({
  category: expenseCategorySchema,
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(1, 'Description cannot be empty')
    .max(255, 'Description cannot exceed 255 characters'),
  amount: z.coerce
    .number({ required_error: 'Amount is required' })
    .positive('Expense amount must be a positive number greater than 0')
    .max(100000000, 'Expense amount is unusually large'),
  expenseDate: z.coerce
    .date({ required_error: 'Valid expense date is required', invalid_type_error: 'Invalid date format' })
    .refine((date) => !isNaN(date.getTime()), { message: 'Invalid expense date' }),
  referenceNumber: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
})

export const updateExpenseSchema = z
  .object({
    category: expenseCategorySchema.optional(),
    description: z.string().trim().min(1).max(255).optional(),
    amount: z.coerce.number().positive('Expense amount must be positive').max(100000000).optional(),
    expenseDate: z.coerce.date().optional(),
    referenceNumber: z.string().trim().max(100).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update the expense',
  })

export const expenseQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  category: z.preprocess(normalizeCategory, z.nativeEnum(ExpenseCategory).optional()),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  sortBy: z.enum(['expenseDate', 'amount', 'createdAt', 'category']).default('expenseDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const profitSummaryQuerySchema = z.object({
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  period: z.enum(['today', 'week', 'month', 'year', 'all', 'custom']).default('month'),
})

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
export type ExpenseQueryInput = z.infer<typeof expenseQuerySchema>
export type ProfitSummaryQueryInput = z.infer<typeof profitSummaryQuerySchema>
