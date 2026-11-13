import { z } from 'zod'
import { StockMovementType } from '@prisma/client'

export const recordOpeningStockSchema = z.object({
  quantity: z.coerce
    .number({ required_error: 'Opening stock quantity is required' })
    .min(0, 'Quantity cannot be negative'),
  notes: z.string().trim().max(500).optional().nullable(),
})

export const receiveStockSchema = z.object({
  quantity: z.coerce
    .number({ required_error: 'Quantity is required' })
    .positive('Quantity received must be greater than zero'),
  reference: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  idempotencyKey: z.string().trim().max(100).optional().nullable(),
})

export const issueStockSchema = z.object({
  quantity: z.coerce
    .number({ required_error: 'Quantity is required' })
    .positive('Quantity issued must be greater than zero'),
  reference: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  idempotencyKey: z.string().trim().max(100).optional().nullable(),
})

export const adjustStockSchema = z
  .object({
    mode: z.enum(['COUNT', 'DIFF'], {
      required_error: "Adjustment mode must be 'COUNT' or 'DIFF'",
    }),
    countedQuantity: z.coerce.number().min(0, 'Counted quantity cannot be negative').optional(),
    quantityChange: z.coerce.number().optional(),
    reason: z
      .string({ required_error: 'Adjustment reason is required' })
      .trim()
      .min(3, 'Adjustment reason must be at least 3 characters')
      .max(500),
    reference: z.string().trim().max(100).optional().nullable(),
    idempotencyKey: z.string().trim().max(100).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'COUNT' && data.countedQuantity == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['countedQuantity'],
        message: "Counted quantity is required when adjustment mode is 'COUNT'",
      })
    }
    if (data.mode === 'DIFF') {
      if (data.quantityChange == null || data.quantityChange === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['quantityChange'],
          message: "Non-zero quantity change is required when adjustment mode is 'DIFF'",
        })
      }
    }
  })

export const recordLossDamageSchema = z.object({
  type: z.enum(['DAMAGE', 'LOSS'], {
    required_error: "Type must be 'DAMAGE' or 'LOSS'",
  }),
  quantity: z.coerce
    .number({ required_error: 'Quantity is required' })
    .positive('Loss/damage quantity must be greater than zero'),
  reason: z
    .string({ required_error: 'Reason is required' })
    .trim()
    .min(3, 'Reason must be at least 3 characters')
    .max(500),
  reference: z.string().trim().max(100).optional().nullable(),
  idempotencyKey: z.string().trim().max(100).optional().nullable(),
})

export const recordReturnSchema = z.object({
  quantity: z.coerce
    .number({ required_error: 'Quantity is required' })
    .positive('Return quantity must be greater than zero'),
  reason: z
    .string({ required_error: 'Return reason is required' })
    .trim()
    .min(3, 'Return reason must be at least 3 characters')
    .max(500),
  reference: z.string().trim().max(100).optional().nullable(),
  idempotencyKey: z.string().trim().max(100).optional().nullable(),
})

export const inventoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  lowStockOnly: z.enum(['true', 'false', 'all']).default('all'),
  sortBy: z.enum(['name', 'quantity', 'minStockThreshold', 'lastUpdated']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

export const movementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  productId: z.string().trim().optional(),
  type: z.nativeEnum(StockMovementType).optional(),
  startDate: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  endDate: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
})

export type RecordOpeningStockInput = z.infer<typeof recordOpeningStockSchema>
export type ReceiveStockInput = z.infer<typeof receiveStockSchema>
export type IssueStockInput = z.infer<typeof issueStockSchema>
export type AdjustStockInput = z.infer<typeof adjustStockSchema>
export type RecordLossDamageInput = z.infer<typeof recordLossDamageSchema>
export type RecordReturnInput = z.infer<typeof recordReturnSchema>
export type InventoryQueryInput = z.infer<typeof inventoryQuerySchema>
export type MovementsQueryInput = z.infer<typeof movementsQuerySchema>
