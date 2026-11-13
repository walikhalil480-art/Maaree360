import { prisma } from '../db/prisma.js'
import { AppError } from '../middleware/errorHandler.js'
import { platformAuditService } from './platformAudit.service.js'

export class PlatformSupportService {
  async createSupportSession(
    data: {
      businessId: string
      reason: string
      durationMinutes?: number
    },
    actor: { id: string; email: string; role: any }
  ) {
    if (!data.reason || data.reason.trim().length < 5) {
      throw new AppError('A valid operational reason (min 5 chars) is required for support access', 400, 'REASON_REQUIRED')
    }

    const business = await prisma.business.findUnique({
      where: { id: data.businessId },
      select: { id: true, name: true },
    })

    if (!business) {
      throw new AppError('Business not found', 404, 'NOT_FOUND')
    }

    const duration = Math.min(240, Math.max(15, data.durationMinutes || 60))
    const now = new Date()
    const expiresAt = new Date(now.getTime() + duration * 60 * 1000)

    const session = await prisma.supportSession.create({
      data: {
        adminId: actor.id,
        businessId: business.id,
        reason: data.reason.trim(),
        authorizedById: actor.id,
        expiresAt,
      },
    })

    await platformAuditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'support.session_granted',
      resourceType: 'SupportSession',
      resourceId: session.id,
      businessId: business.id,
      metadata: {
        businessName: business.name,
        reason: session.reason,
        expiresAt,
        durationMinutes: duration,
      },
    })

    return {
      session,
      businessName: business.name,
    }
  }

  async verifySupportAccess(adminId: string, businessId: string) {
    const session = await prisma.supportSession.findFirst({
      where: {
        adminId,
        businessId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    return session || null
  }

  async revokeSupportSession(
    sessionId: string,
    actor: { id: string; email: string; role: any }
  ) {
    const session = await prisma.supportSession.findUnique({
      where: { id: sessionId },
    })

    if (!session) {
      throw new AppError('Support session not found', 404, 'NOT_FOUND')
    }

    if (session.revokedAt) {
      return session // Already revoked
    }

    const revoked = await prisma.supportSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    })

    await platformAuditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'support.session_revoked',
      resourceType: 'SupportSession',
      resourceId: sessionId,
      businessId: session.businessId,
      metadata: {
        revokedAt: revoked.revokedAt,
      },
    })

    return revoked
  }

  async listSupportSessions(params?: { businessId?: string; activeOnly?: boolean }) {
    const where: any = {}
    if (params?.businessId) {
      where.businessId = params.businessId
    }
    if (params?.activeOnly) {
      where.revokedAt = null
      where.expiresAt = { gt: new Date() }
    }

    const sessions = await prisma.supportSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Fetch business and admin details
    const businessIds = Array.from(new Set(sessions.map((s) => s.businessId)))
    const adminIds = Array.from(new Set(sessions.map((s) => s.adminId)))

    const [businesses, admins] = await Promise.all([
      prisma.business.findMany({
        where: { id: { in: businessIds } },
        select: { id: true, name: true, slug: true },
      }),
      prisma.platformAdmin.findMany({
        where: { id: { in: adminIds } },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ])

    const bizMap = new Map(businesses.map((b) => [b.id, b]))
    const adminMap = new Map(admins.map((a) => [a.id, a]))

    const now = new Date()
    return sessions.map((s) => {
      const biz = bizMap.get(s.businessId)
      const adm = adminMap.get(s.adminId)
      const isExpired = s.expiresAt <= now
      const isRevoked = Boolean(s.revokedAt)
      const isActive = !isExpired && !isRevoked

      return {
        ...s,
        businessName: biz?.name || 'Unknown',
        businessSlug: biz?.slug || '',
        adminName: adm?.user.name || 'Unknown',
        adminEmail: adm?.user.email || 'Unknown',
        adminRole: adm?.role || 'SUPER_ADMIN',
        isActive,
        isExpired,
        isRevoked,
      }
    })
  }
}

export const platformSupportService = new PlatformSupportService()
