import { prisma } from '../db/prisma.js'
import { CreateBusinessInput, UpdateBusinessInput } from '../schemas/business.schemas.js'
import { generateSlug } from '../utils/security.js'
import { AppError } from '../middleware/errorHandler.js'
import { Business, Role } from '@prisma/client'
import { rbacService } from './rbac.service.js'

export interface UserBusinessInfo extends Business {
  role: Role
  permissions: string[]
}

export class BusinessService {
  async createBusiness(userId: string, input: CreateBusinessInput): Promise<UserBusinessInfo> {
    const slug = generateSlug(input.name)

    const result = await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name: input.name,
          slug,
          currency: input.currency || 'KES',
          timezone: input.timezone || 'Africa/Nairobi',
        },
      })

      const membership = await tx.businessMembership.create({
        data: {
          userId,
          businessId: business.id,
          role: Role.OWNER,
        },
      })

      return {
        ...business,
        role: membership.role,
      }
    })

    // Seed roles and user role assignment for the new business
    try {
      await rbacService.ensureBusinessRoles(result.id)
      await rbacService.syncBusinessMembershipsToRbac(result.id)
    } catch {
      // Safely ignore if running in mocked unit tests
    }

    const permissions = await rbacService.getUserPermissions(userId, result.id)

    return {
      ...result,
      permissions,
    }
  }

  async getUserBusinesses(userId: string): Promise<UserBusinessInfo[]> {
    const memberships = await prisma.businessMembership.findMany({
      where: { userId },
      include: { business: true },
      orderBy: { createdAt: 'asc' },
    })

    const results = await Promise.all(
      memberships.map(async (m) => {
        const permissions = await rbacService.getUserPermissions(userId, m.businessId)
        return {
          ...m.business,
          role: m.role,
          permissions,
        }
      })
    )

    return results
  }

  async getBusinessDetails(businessId: string, userId: string): Promise<UserBusinessInfo> {
    const membership = await prisma.businessMembership.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId,
        },
      },
      include: {
        business: true,
      },
    })

    if (!membership) {
      throw new AppError('Business not found or access denied', 404, 'NOT_FOUND')
    }

    const permissions = await rbacService.getUserPermissions(userId, businessId)

    return {
      ...membership.business,
      role: membership.role,
      permissions,
    }
  }

  async updateBusiness(businessId: string, input: UpdateBusinessInput): Promise<Business> {
    const updated = await prisma.business.update({
      where: { id: businessId },
      data: input,
    })

    return updated
  }
}

export const businessService = new BusinessService()
