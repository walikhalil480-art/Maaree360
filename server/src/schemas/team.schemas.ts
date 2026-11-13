import { z } from 'zod'
import { Role, InvitationStatus } from '@prisma/client'

export const inviteStaffSchema = z
  .object({
    name: z.string().trim().min(2, 'Employee name must be at least 2 characters').optional().nullable(),
    recipient: z.string().trim().min(3).optional(),
    email: z.string().trim().email('Please enter a valid email address').optional(),
    phone: z.string().trim().min(5).optional(),
    role: z.nativeEnum(Role, {
      errorMap: () => ({ message: 'Invalid role. Supported roles: OWNER, MANAGER, CASHIER, STOCK_CLERK' }),
    }),
    message: z.string().trim().max(500, 'Invitation message cannot exceed 500 characters').optional().nullable(),
  })
  .refine((data) => Boolean(data.recipient || data.email || data.phone), {
    message: 'Recipient, email, or phone is required',
  })

export const acceptInvitationSchema = z.object({
  token: z
    .string({ required_error: 'Invitation token is required' })
    .trim()
    .min(10, 'Invalid invitation token format'),
})

export const acceptAndRegisterSchema = z.object({
  token: z
    .string({ required_error: 'Invitation token is required' })
    .trim()
    .min(10, 'Invalid invitation token format'),
  name: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters'),
  phone: z.string().trim().optional().nullable(),
})

export const updateStaffRoleSchema = z.object({
  role: z.nativeEnum(Role, {
    errorMap: () => ({ message: 'Invalid role' }),
  }),
})

export const staffQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.nativeEnum(Role).optional(),
  status: z.enum(['ALL', 'ACTIVE', 'DEACTIVATED']).default('ALL'),
  search: z.string().trim().optional(),
})

export const invitationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(InvitationStatus).optional(),
})

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>
export type AcceptAndRegisterInput = z.infer<typeof acceptAndRegisterSchema>
export type UpdateStaffRoleInput = z.infer<typeof updateStaffRoleSchema>
export type StaffQueryInput = z.infer<typeof staffQuerySchema>
export type InvitationQueryInput = z.infer<typeof invitationQuerySchema>
