import { z } from 'zod'
import { PaymentMethod } from '@prisma/client'

export const reportPeriodEnum = z.enum([
  'today',
  'yesterday',
  'this_week',
  'last_week',
  'this_month',
  'last_month',
  'this_year',
  'custom',
])

export type ReportPeriod = z.infer<typeof reportPeriodEnum>

export const reportSummaryQuerySchema = z.object({
  period: reportPeriodEnum.default('this_month'),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
})

export const revenueTrendQuerySchema = z.object({
  period: reportPeriodEnum.default('this_month'),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  interval: z.enum(['hour', 'day', 'week', 'month']).optional(),
  productId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
})

export const profitabilityQuerySchema = z.object({
  period: reportPeriodEnum.default('this_month'),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  sortBy: z
    .enum(['grossProfit', 'grossMarginPercent', 'netRevenue', 'unitsSold', 'cogs', 'productName'])
    .default('grossProfit'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const inventoryIntelligenceQuerySchema = z.object({
  lookbackDays: z.coerce.number().int().min(7).max(365).default(60),
  classification: z
    .enum(['ALL', 'FAST_MOVING', 'SLOW_MOVING', 'POTENTIALLY_DEAD_STOCK', 'OUT_OF_STOCK'])
    .default('ALL'),
  categoryId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  sortBy: z
    .enum([
      'salesVelocity',
      'unitsSold',
      'stockValuation',
      'currentStock',
      'daysSinceLastSale',
      'productName',
    ])
    .default('salesVelocity'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const reportExportQuerySchema = z.object({
  type: z.enum(['summary', 'revenue', 'profitability', 'inventory', 'dead_stock', 'expenses']),
  format: z.enum(['csv', 'pdf']).default('csv'),
  period: reportPeriodEnum.default('this_month'),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  lookbackDays: z.coerce.number().int().min(7).max(365).default(60),
  categoryId: z.string().uuid().optional(),
})

export type ReportSummaryQuery = z.infer<typeof reportSummaryQuerySchema>
export type RevenueTrendQuery = z.infer<typeof revenueTrendQuerySchema>
export type ProfitabilityQuery = z.infer<typeof profitabilityQuerySchema>
export type InventoryIntelligenceQuery = z.infer<typeof inventoryIntelligenceQuerySchema>
export type ReportExportQuery = z.infer<typeof reportExportQuerySchema>
