import type { StaffUser } from './team'

export interface AuditLogEntry {
  id: string
  businessId: string
  actorId: string
  actor: StaffUser
  action: string
  resourceType: string
  resourceId?: string | null
  metadata: Record<string, any>
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: string
}

export interface AuditLogQuery {
  actorId?: string
  action?: string
  resourceType?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}
