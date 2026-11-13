import { z } from 'zod'

export const createRoleSchema = z.object({
  name: z
    .string({ required_error: 'Role name is required' })
    .trim()
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name cannot exceed 50 characters'),
  displayName: z.string().trim().max(100).optional(),
  description: z.string().trim().max(200, 'Description cannot exceed 200 characters').optional(),
  permissionKeys: z
    .array(z.string().min(1, 'Permission key cannot be empty'))
    .min(1, 'Role must contain at least one permission'),
})

export const updateRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name cannot exceed 50 characters')
    .optional(),
  displayName: z.string().trim().max(100).optional(),
  description: z.string().trim().max(200, 'Description cannot exceed 200 characters').optional(),
  permissionKeys: z
    .array(z.string().min(1, 'Permission key cannot be empty'))
    .optional(),
})

export const assignRolesSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  roleIds: z
    .array(z.string().min(1, 'Role ID cannot be empty'))
    .min(1, 'At least one role ID must be provided'),
  branchId: z.string().optional().nullable(),
})

export type CreateRoleInput = z.infer<typeof createRoleSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
export type AssignRolesInput = z.infer<typeof assignRolesSchema>
