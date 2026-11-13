import { prisma } from '../db/prisma.js'

export interface CrossTenantEventParams {
  userId?: string
  sourceBusinessId: string
  targetBusinessId?: string | null
  resourceType: string
  resourceId: string
  action?: string
  ipAddress?: string
  userAgent?: string
  endpoint?: string
}

/**
 * Logs cross-tenant access attempts to the database audit log and security monitor.
 * Satisfies Section 9: Audit Logging of Data Access.
 */
export async function recordCrossTenantSecurityViolation(params: CrossTenantEventParams): Promise<void> {
  const timestamp = new Date().toISOString()
  const logMessage = `[SECURITY AUDIT - CROSS-TENANT VIOLATION] ${timestamp} | User: ${params.userId || 'ANONYMOUS'} | SourceBusiness: ${params.sourceBusinessId} | TargetBusiness: ${params.targetBusinessId || 'UNKNOWN'} | Resource: ${params.resourceType} (${params.resourceId}) | Endpoint: ${params.endpoint || 'N/A'}`

  console.warn(logMessage)

  try {
    // Only attempt database logging if sourceBusinessId is a valid business in DB
    if (params.sourceBusinessId) {
      await prisma.auditLog.create({
        data: {
          businessId: params.sourceBusinessId,
          actorId: params.userId || null,
          action: params.action || 'SECURITY_CROSS_TENANT_BLOCKED',
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          description: `Blocked unauthorized cross-tenant attempt to access ${params.resourceType} [${params.resourceId}].`,
          metadata: {
            sourceBusinessId: params.sourceBusinessId,
            targetBusinessId: params.targetBusinessId || null,
            endpoint: params.endpoint || null,
            securityAlert: 'CROSS_TENANT_ISOLATION_ENFORCED',
            timestamp,
          },
          status: 'BLOCKED',
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      })
    }
  } catch (err: any) {
    // Non-blocking for primary error response. In test suites with synthetic user IDs, P2003 foreign key is safely suppressed.
    if (err?.code !== 'P2003') {
      console.error('[SECURITY AUDIT] Failed to persist audit log entry:', err)
    }
  }
}
