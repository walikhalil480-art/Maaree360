import { Request, Response, NextFunction } from 'express'
import { Role } from '@prisma/client'
import { prisma } from '../db/prisma.js'
import { env } from '../config/env.js'
import { AppError } from './errorHandler.js'
import { recordCrossTenantSecurityViolation } from '../utils/securityAudit.js'

/**
 * Ensures the request is authenticated via an active, unexpired database session cookie.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessionToken = req.cookies?.[env.COOKIE_NAME]

    if (!sessionToken) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED')
    }

    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    })

    if (!session || session.expiresAt <= new Date()) {
      // Clear invalid/expired cookie
      res.clearCookie(env.COOKIE_NAME, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })
      throw new AppError('Session expired or invalid', 401, 'SESSION_EXPIRED')
    }

    req.user = session.user
    req.sessionToken = session.token
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Validates that the authenticated user is an active member of the business specified in req.params.businessId.
 * Optionally enforces specific role privileges (e.g. ['OWNER', 'MANAGER']).
 */
export function requireBusinessMember(allowedRoles?: Role[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED')
      }

      const { businessId } = req.params

      if (!businessId) {
        throw new AppError('Business ID is required', 400, 'BAD_REQUEST')
      }

      const membership = await prisma.businessMembership.findUnique({
        where: {
          userId_businessId: {
            userId: req.user.id,
            businessId,
          },
        },
        include: {
          business: true,
        },
      })

      if (!membership) {
        // Check if the business actually exists in the database
        const businessExists = await prisma.business.findUnique({
          where: { id: businessId },
          select: { id: true },
        })

        if (businessExists) {
          recordCrossTenantSecurityViolation({
            userId: req.user.id,
            sourceBusinessId: businessId,
            targetBusinessId: businessId,
            resourceType: 'Business',
            resourceId: businessId,
            action: 'CROSS_TENANT_BUSINESS_ACCESS_BLOCKED',
            endpoint: req.originalUrl,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] as string,
          }).catch(() => {})
        }

        // Return 404 to avoid leaking existence of business IDs across tenant boundaries
        throw new AppError('Business not found or access denied', 404, 'NOT_FOUND')
      }

      if (membership.isActive === false) {
        throw new AppError(
          'Your staff account has been deactivated or suspended for this business. Please contact the business owner.',
          403,
          'MEMBERSHIP_DEACTIVATED'
        )
      }

      if (membership.business.status === 'SUSPENDED' || membership.business.status === 'DEACTIVATED') {
        throw new AppError(
          `This business account has been ${membership.business.status.toLowerCase()}. ${membership.business.suspensionReason || membership.business.deactivationReason || 'Please contact MAAREE 360 platform administration.'}`,
          403,
          'BUSINESS_SUSPENDED'
        )
      }

      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        throw new AppError(
          'Insufficient permissions for this business operation',
          403,
          'FORBIDDEN'
        )
      }

      req.membership = membership
      req.business = membership.business
      next()
    } catch (error) {
      next(error)
    }
  }
}
