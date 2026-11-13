import { z } from 'zod'
import { SaleStatus, PaymentStatus, PaymentMethod } from '@prisma/client'

export const saleItemInputSchema = z.object({
  productId: z.string().uuid('Invalid product ID format'),
  quantity: z
    .number({ invalid_type_error: 'Quantity must be a number' })
    .positive('Quantity must be greater than zero'),
  discount: z
    .number({ invalid_type_error: 'Discount must be a number' })
    .nonnegative('Discount cannot be negative')
    .optional()
    .default(0),
  notes: z.string().max(255).optional(),
})

export const salePaymentInputSchema = z.object({
  method: z.nativeEnum(PaymentMethod, {
    errorMap: () => ({ message: 'Invalid payment method' }),
  }),
  amount: z
    .number({ invalid_type_error: 'Payment amount must be a number' })
    .positive('Payment amount must be greater than zero')
    .optional(),
  amountTendered: z
    .number({ invalid_type_error: 'Amount tendered must be a number' })
    .nonnegative('Amount tendered cannot be negative')
    .optional(),
  reference: z
    .string()
    .max(100, 'Transaction reference cannot exceed 100 characters')
    .optional(),
  notes: z.string().max(255).optional(),
})

export const createSaleSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID format').optional().nullable(),
  items: z
    .array(saleItemInputSchema)
    .min(1, 'Sale must include at least one product item'),
  discount: z
    .number({ invalid_type_error: 'Order discount must be a number' })
    .nonnegative('Order discount cannot be negative')
    .optional()
    .default(0),
  taxAmount: z
    .number({ invalid_type_error: 'Tax amount must be a number' })
    .nonnegative('Tax amount cannot be negative')
    .optional()
    .default(0),
  payment: salePaymentInputSchema.optional(),
  payments: z.array(salePaymentInputSchema).optional(),
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().max(100).optional(),
})

export const saleQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  status: z.nativeEnum(SaleStatus).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export const cancelSaleSchema = z.object({
  reason: z.string().max(255).optional(),
})

export type CreateSaleInput = z.infer<typeof createSaleSchema>
export type SaleQueryInput = z.infer<typeof saleQuerySchema>
export type CancelSaleInput = z.infer<typeof cancelSaleSchema>
