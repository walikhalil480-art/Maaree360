import { z } from 'zod'

export const createBusinessSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name cannot exceed 100 characters'),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, 'Currency must be 3 characters')
    .max(3, 'Currency must be 3 characters')
    .default('KES'),
  timezone: z.string().trim().default('Africa/Nairobi'),
})

export const updateBusinessSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Business name must be at least 2 characters')
      .max(100, 'Business name cannot exceed 100 characters')
      .optional(),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, 'Currency must be 3 characters')
      .max(3, 'Currency must be 3 characters')
      .optional(),
    timezone: z.string().trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>
