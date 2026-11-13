import { z } from 'zod'

export const createCustomerSchema = z.object({
  name: z
    .string({ required_error: 'Customer name is required' })
    .trim()
    .min(1, 'Customer name cannot be empty')
    .max(100, 'Customer name cannot exceed 100 characters'),
  phone: z
    .string()
    .trim()
    .max(30, 'Phone number cannot exceed 30 characters')
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val && val.length > 0 ? val : null)),
  address: z
    .string()
    .trim()
    .max(255, 'Address cannot exceed 255 characters')
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  taxPin: z
    .string()
    .trim()
    .max(50, 'Tax PIN cannot exceed 50 characters')
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val.toUpperCase() : null)),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
})

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>
