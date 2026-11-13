import { prisma } from '../db/prisma.js'
import { PlatformRoleType, Prisma, Role } from '@prisma/client'
import { AppError } from '../middleware/errorHandler.js'
import { hashPassword } from '../utils/password.js'
import { platformAuditService } from './platformAudit.service.js'

export class PlatformUserService {
  async listAdmins() {
    const admins = await prisma.platformAdmin.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            phone: true,
          },
        },
      },
    })

    return admins.map((a) => ({
      id: a.id,
      userId: a.userId,
      name: a.user.name,
      email: a.user.email,
      phone: a.user.phone,
      role: a.role,
      customPermissions: a.customPermissions,
      isActive: a.isActive,
      mfaEnabled: a.mfaEnabled,
      lastLoginAt: a.lastLoginAt,
      createdAt: a.createdAt,
    }))
  }

  async createAdmin(
    data: {
      email: string
      name: string
      role: PlatformRoleType
      password?: string
      customPermissions?: string[]
    },
    actor: { id: string; email: string; role: any }
  ) {
    // 1. Check if user exists or create
    let user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { platformAdmin: true },
    })

    if (user?.platformAdmin) {
      throw new AppError('User is already a platform administrator', 400, 'ADMIN_EXISTS')
    }

    if (!user) {
      const password = data.password || 'MaareePlatform@2026!'
      const passwordHash = await hashPassword(password)
      user = await prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
        },
        include: { platformAdmin: true },
      })
    }

    // 2. Create platform admin record
    const admin = await prisma.platformAdmin.create({
      data: {
        userId: user.id,
        role: data.role || PlatformRoleType.SUPER_ADMIN,
        customPermissions: data.customPermissions || [],
        isActive: true,
      },
      include: { user: true },
    })

    await platformAuditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'admin.create',
      resourceType: 'PlatformAdmin',
      resourceId: admin.id,
      metadata: { targetEmail: admin.user.email, role: admin.role },
    })

    return {
      id: admin.id,
      userId: admin.userId,
      name: admin.user.name,
      email: admin.user.email,
      role: admin.role,
      customPermissions: admin.customPermissions,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
    }
  }

  async updateAdmin(
    adminId: string,
    data: {
      role?: PlatformRoleType
      customPermissions?: string[]
      isActive?: boolean
    },
    actor: { id: string; email: string; role: any }
  ) {
    const admin = await prisma.platformAdmin.findUnique({
      where: { id: adminId },
      include: { user: true },
    })

    if (!admin) {
      throw new AppError('Platform administrator not found', 404, 'NOT_FOUND')
    }

    // Protection: Root PLATFORM_OWNER cannot be suspended, deactivated, or demoted
    if (admin.role === PlatformRoleType.PLATFORM_OWNER) {
      if (data.isActive === false) {
        throw new AppError(
          'Root Platform Owner cannot be deactivated or suspended.',
          400,
          'CANNOT_MODIFY_ROOT_OWNER'
        )
      }
      if (data.role && data.role !== PlatformRoleType.PLATFORM_OWNER) {
        throw new AppError(
          'Root Platform Owner role cannot be demoted.',
          400,
          'CANNOT_MODIFY_ROOT_OWNER'
        )
      }
    }

    const updated = await prisma.platformAdmin.update({
      where: { id: adminId },
      data: {
        role: data.role !== undefined ? data.role : admin.role,
        customPermissions: data.customPermissions !== undefined ? data.customPermissions : admin.customPermissions,
        isActive: data.isActive !== undefined ? data.isActive : admin.isActive,
      },
      include: { user: true },
    })

    // If deactivated, immediately revoke all active sessions
    if (data.isActive === false) {
      await prisma.session.deleteMany({
        where: { userId: admin.userId },
      })
    }

    await platformAuditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'admin.update',
      resourceType: 'PlatformAdmin',
      resourceId: admin.id,
      metadata: {
        targetEmail: admin.user.email,
        previousRole: admin.role,
        newRole: updated.role,
        isActive: updated.isActive,
      },
    })

    return {
      id: updated.id,
      userId: updated.userId,
      name: updated.user.name,
      email: updated.user.email,
      role: updated.role,
      customPermissions: updated.customPermissions,
      isActive: updated.isActive,
    }
  }

  async revokeSessions(adminId: string, actor: { id: string; email: string; role: any }) {
    const admin = await prisma.platformAdmin.findUnique({
      where: { id: adminId },
      include: { user: true },
    })

    if (!admin) {
      throw new AppError('Platform administrator not found', 404, 'NOT_FOUND')
    }

    const deleted = await prisma.session.deleteMany({
      where: { userId: admin.userId },
    })

    await platformAuditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'admin.revoke_sessions',
      resourceType: 'PlatformAdmin',
      resourceId: admin.id,
      metadata: { targetEmail: admin.user.email, revokedCount: deleted.count },
    })

    return { revokedCount: deleted.count }
  }

  async listTenantUsers(params: {
    page?: number
    limit?: number
    search?: string
    role?: Role
  }) {
    const page = Math.max(1, Number(params.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20))
    const skip = (page - 1) * limit

    const where: Prisma.UserWhereInput = {}

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
      ]
    }

    if (params.role) {
      where.memberships = {
        some: {
          role: params.role,
        },
      }
    }

    const now = new Date()

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          memberships: {
            include: {
              business: {
                select: { id: true, name: true, slug: true, status: true },
              },
            },
          },
          platformAdmin: {
            select: { id: true, role: true, isActive: true },
          },
          sessions: {
            where: { expiresAt: { gt: now } },
            take: 1,
            select: { id: true, expiresAt: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    return {
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        createdAt: u.createdAt,
        isPlatformAdmin: Boolean(u.platformAdmin),
        platformRole: u.platformAdmin?.role || null,
        hasActiveSession: u.sessions.length > 0,
        memberships: u.memberships.map((m) => ({
          businessId: m.businessId,
          businessName: m.business.name,
          businessSlug: m.business.slug,
          role: m.role,
          isActive: m.isActive,
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }
}

export const platformUserService = new PlatformUserService()
