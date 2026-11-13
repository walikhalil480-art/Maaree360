import { prisma } from '../db/prisma.js'
import { Prisma } from '@prisma/client'
import { AuditLogQueryInput } from '../schemas/audit.schemas.js'

export interface RecordAuditOptions {
  businessId: string
  actorId?: string | null
  action: string
  resourceType: string
  resourceId?: string | null
  description: string
  metadata?: Record<string, any> | null
  status?: 'SUCCESS' | 'FAILURE'
  ipAddress?: string | null
  userAgent?: string | null
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'tokenhash',
  'cookie',
  'secret',
  'accesstoken',
  'refreshtoken',
])

function sanitizeMetadata(data: any): any {
  if (!data || typeof data !== 'object') return data
  if (Array.isArray(data)) return data.map(sanitizeMetadata)

  const sanitized: Record<string, any> = {}
  for (const [key, val] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]'
    } else if (val && typeof val === 'object') {
      sanitized[key] = sanitizeMetadata(val)
    } else {
      sanitized[key] = val
    }
  }
  return sanitized
}

export class AuditService {
  /**
   * Records an immutable audit log entry.
   * Can be executed inside an existing Prisma transaction client for atomicity.
   */
  async record(options: RecordAuditOptions, tx?: Prisma.TransactionClient) {
    const db = tx || prisma
    const safeMetadata = options.metadata ? sanitizeMetadata(options.metadata) : undefined

    return db.auditLog.create({
      data: {
        businessId: options.businessId,
        actorId: options.actorId || null,
        action: options.action,
        resourceType: options.resourceType,
        resourceId: options.resourceId || null,
        description: options.description,
        metadata: safeMetadata ?? Prisma.DbNull,
        status: options.status || 'SUCCESS',
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent ? options.userAgent.slice(0, 255) : null,
      },
    })
  }

  /**
   * Lists audit logs for a business with filtering and pagination.
   */
  async list(businessId: string, query: AuditLogQueryInput) {
    const page = query.page || 1
    const limit = query.limit || 20
    const skip = (page - 1) * limit

    const where: Prisma.AuditLogWhereInput = {
      businessId,
      ...(query.action ? { action: query.action } : {}),
      ...(query.resourceType ? { resourceType: query.resourceType } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.search
        ? {
            OR: [
              { description: { contains: query.search, mode: 'insensitive' } },
              { action: { contains: query.search, mode: 'insensitive' } },
              { resourceType: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      }
    }

    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: query.sortOrder || 'desc' },
        include: {
          actor: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ])

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }
}

export const auditService = new AuditService()
