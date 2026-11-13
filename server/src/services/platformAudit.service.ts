import { prisma } from '../db/prisma.js'
import { PlatformRoleType, Prisma } from '@prisma/client'

export interface LogPlatformActionParams {
  actorId: string
  actorEmail: string
  actorRole: PlatformRoleType
  action: string
  resourceType: string
  resourceId?: string
  businessId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

export interface PlatformAuditQueryFilters {
  page?: number
  limit?: number
  actorId?: string
  action?: string
  resourceType?: string
  businessId?: string
  startDate?: string
  endDate?: string
  search?: string
}

export class PlatformAuditService {
  /**
   * Appends an immutable platform audit record.
   */
  async log(params: LogPlatformActionParams) {
    try {
      return await prisma.platformAuditLog.create({
        data: {
          actorId: params.actorId,
          actorEmail: params.actorEmail,
          actorRole: params.actorRole,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          businessId: params.businessId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      })
    } catch (error) {
      console.error('[PlatformAuditService] Failed to record audit log:', error)
      return null
    }
  }

  /**
   * Retrieves paginated, filtered audit logs for platform administrators.
   */
  async queryLogs(filters: PlatformAuditQueryFilters) {
    const page = Math.max(1, Number(filters.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20))
    const skip = (page - 1) * limit

    const where: Prisma.PlatformAuditLogWhereInput = {}

    if (filters.actorId) {
      where.actorId = filters.actorId
    }

    if (filters.action) {
      where.action = { contains: filters.action, mode: 'insensitive' }
    }

    if (filters.resourceType) {
      where.resourceType = filters.resourceType
    }

    if (filters.businessId) {
      where.businessId = filters.businessId
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate)
      }
    }

    if (filters.search) {
      where.OR = [
        { action: { contains: filters.search, mode: 'insensitive' } },
        { actorEmail: { contains: filters.search, mode: 'insensitive' } },
        { resourceType: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.platformAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.platformAuditLog.count({ where }),
    ])

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }
}

export const platformAuditService = new PlatformAuditService()
