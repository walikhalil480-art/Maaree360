import { z } from 'zod'
import { PaymentMethod, ReturnRestockAction } from '@prisma/client'

export const returnItemInputSchema = z.object({
  saleItemId: z.string().uuid('Invalid sale item ID format'),
  quantity: z
    .number({ invalid_type_error: 'Quantity must be a number' })
    .positive('Quantity must be greater than zero'),
  restockAction: z
    .nativeEnum(ReturnRestockAction, {
      errorMap: () => ({ message: 'Restock action must be RESTOCK or WRITE_OFF' }),
    })
    .default(ReturnRestockAction.RESTOCK),
  notes: z.string().max(255).optional(),
})

export const createReturnSchema = z.object({
  saleId: z.string().uuid('Invalid sale ID format'),
  items: z
    .array(returnItemInputSchema)
    .min(1, 'At least one return item must be provided'),
  refundMethod: z
    .nativeEnum(PaymentMethod, {
      errorMap: () => ({ message: 'Invalid refund payment method' }),
    })
    .default(PaymentMethod.CASH),
  refundReference: z
    .string()
    .trim()
    .max(100, 'Refund reference cannot exceed 100 characters')
    .optional()
    .nullable(),
  reason: z
    .string()
    .trim()
    .max(255, 'Reason cannot exceed 255 characters')
    .optional()
    .nullable(),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .nullable(),
  idempotencyKey: z
    .string()
    .trim()
    .max(100, 'Idempotency key cannot exceed 100 characters')
    .optional()
    .nullable(),
})

export const returnQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  saleId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  refundMethod: z.nativeEnum(PaymentMethod).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export type ReturnItemInput = z.infer<typeof returnItemInputSchema>
export type CreateReturnInput = z.infer<typeof createReturnSchema>
export type ReturnQueryInput = z.infer<typeof returnQuerySchema>
