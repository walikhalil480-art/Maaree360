import { z } from 'zod'

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().trim().optional(),
  resourceType: z.string().trim().optional(),
  actorId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>
