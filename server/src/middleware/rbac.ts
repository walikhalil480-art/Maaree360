import { Request, Response, NextFunction } from 'express'
import { prisma } from '../db/prisma.js'
import { AppError } from './errorHandler.js'
import { rbacService } from '../services/rbac.service.js'

export interface RbacOptions {
  checkBranch?: boolean
}

/**
 * Ensures that the authenticated user has verified active membership in the business
 * and attaches effective permissions to req.permissions.
 */
export async function attachUserPermissions(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED')
    }

    const businessId = req.params.businessId || req.body?.businessId || (req.query?.businessId as string)

    if (!businessId) {
      throw new AppError('Business ID is required for permission resolution', 400, 'BAD_REQUEST')
    }

    // Check membership if not already attached
    if (!req.membership) {
      const membership = await prisma.businessMembership.findUnique({
        where: {
          userId_businessId: {
            userId: req.user.id,
            businessId,
          },
        },
        include: { business: true },
      })

      if (!membership) {
        throw new AppError('Business not found or access denied', 404, 'NOT_FOUND')
      }

      if (membership.isActive === false) {
        throw new AppError(
          'Your staff account has been deactivated for this business. Please contact the store owner.',
          403,
          'MEMBERSHIP_DEACTIVATED'
        )
      }

      req.membership = membership
      req.business = membership.business
    }

    const branchId =
      (req.headers['x-branch-id'] as string) ||
      (req.query?.branchId as string) ||
      req.body?.branchId ||
      null

    req.branchId = branchId

    // Resolve user's permissions
    const permissions = await rbacService.getUserPermissions(
      req.user.id,
      businessId,
      branchId,
      req.membership
    )
    req.permissions = permissions

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Enforces that the authenticated user possesses a specific permission.
 * Deny-by-default architecture: if permission is missing, immediately throws 403.
 */
export function requirePermission(permissionKey: string, options?: RbacOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // First ensure permissions are loaded
      if (!req.permissions) {
        await new Promise<void>((resolve, reject) => {
          attachUserPermissions(req, res, (err) => (err ? reject(err) : resolve()))
        })
      }

      const permissions = req.permissions || []

      // If user has OWNER membership or wildcard permission, permit immediately
      if (req.membership?.role === 'OWNER' || permissions.includes('*')) {
        return next()
      }

      if (!permissions.includes(permissionKey)) {
        throw new AppError(
          `Access denied: You do not have the required permission (${permissionKey}) to perform this operation.`,
          403,
          'FORBIDDEN'
        )
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Enforces that the user possesses at least one of the specified permissions.
 */
export function requireAnyPermission(permissionKeys: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.permissions) {
        await new Promise<void>((resolve, reject) => {
          attachUserPermissions(req, res, (err) => (err ? reject(err) : resolve()))
        })
      }

      const permissions = req.permissions || []

      if (req.membership?.role === 'OWNER' || permissions.includes('*')) {
        return next()
      }

      const hasAny = permissionKeys.some((k) => permissions.includes(k))
      if (!hasAny) {
        throw new AppError(
          `Access denied: This operation requires one of the following permissions: ${permissionKeys.join(', ')}`,
          403,
          'FORBIDDEN'
        )
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Enforces that the user possesses all of the specified permissions.
 */
export function requireAllPermissions(permissionKeys: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.permissions) {
        await new Promise<void>((resolve, reject) => {
          attachUserPermissions(req, res, (err) => (err ? reject(err) : resolve()))
        })
      }

      const permissions = req.permissions || []

      if (req.membership?.role === 'OWNER' || permissions.includes('*')) {
        return next()
      }

      const missing = permissionKeys.filter((k) => !permissions.includes(k))
      if (missing.length > 0) {
        throw new AppError(
          `Access denied: Missing required permissions: ${missing.join(', ')}`,
          403,
          'FORBIDDEN'
        )
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}
