import { z } from 'zod'
import { ShiftStatus } from '@prisma/client'

export const createRegisterSchema = z.object({
  name: z
    .string({ required_error: 'Register name is required' })
    .trim()
    .min(1, 'Register name cannot be empty')
    .max(60, 'Register name cannot exceed 60 characters'),
  code: z.string().trim().max(30).optional().nullable(),
  description: z.string().trim().max(255).optional().nullable(),
})

export const updateRegisterSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    code: z.string().trim().max(30).optional().nullable(),
    description: z.string().trim().max(255).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update the register',
  })

export const openShiftSchema = z.object({
  registerId: z.string().uuid({ message: 'Valid register ID is required' }),
  openingFloat: z.coerce
    .number({ required_error: 'Opening cash float is required' })
    .min(0, 'Opening float cannot be negative')
    .max(10000000, 'Opening float amount is unusually large'),
  notes: z.string().trim().max(500).optional().nullable(),
})

export const closeShiftSchema = z.object({
  actualCash: z.coerce
    .number({ required_error: 'Actual counted cash is required to close shift' })
    .min(0, 'Actual cash count cannot be negative')
    .max(50000000, 'Actual cash count is unusually large'),
  notes: z.string().trim().max(1000).optional().nullable(),
})

export const shiftQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(ShiftStatus).optional(),
  registerId: z.string().uuid().optional(),
  cashierId: z.string().uuid().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
})

export type CreateRegisterInput = z.infer<typeof createRegisterSchema>
export type UpdateRegisterInput = z.infer<typeof updateRegisterSchema>
export type OpenShiftInput = z.infer<typeof openShiftSchema>
export type CloseShiftInput = z.infer<typeof closeShiftSchema>
export type ShiftQueryInput = z.infer<typeof shiftQuerySchema>
