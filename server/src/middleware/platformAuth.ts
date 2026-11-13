import { Request, Response, NextFunction } from 'express'
import { prisma } from '../db/prisma.js'
import { env } from '../config/env.js'
import { AppError } from './errorHandler.js'
import {
  PLATFORM_ROLE_DEFAULT_PERMISSIONS,
  ALL_PLATFORM_PERMISSIONS,
  PlatformPermissionKey,
} from '../types/platform.types.js'

/**
 * Ensures the requesting user has an active platform administrator account.
 */
export async function requirePlatformAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Verify session if not already verified by requireAuth
    if (!req.user) {
      const sessionToken = req.cookies?.[env.COOKIE_NAME]
      if (!sessionToken) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED')
      }

      const session = await prisma.session.findUnique({
        where: { token: sessionToken },
        include: { user: true },
      })

      if (!session || session.expiresAt <= new Date()) {
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
    }

    // 2. Fetch platform admin account
    const platformAdmin = await prisma.platformAdmin.findUnique({
      where: { userId: req.user.id },
    })

    if (!platformAdmin) {
      throw new AppError(
        'Access denied. Platform administrator privileges required.',
        403,
        'PLATFORM_FORBIDDEN'
      )
    }

    if (!platformAdmin.isActive) {
      throw new AppError(
        'Platform administrator account has been suspended or deactivated.',
        403,
        'PLATFORM_ADMIN_INACTIVE'
      )
    }

    // 3. Compute effective permissions
    let permissions: string[] = []
    if (platformAdmin.role === 'PLATFORM_OWNER' || platformAdmin.role === 'SUPER_ADMIN') {
      permissions = [...ALL_PLATFORM_PERMISSIONS]
    } else {
      const roleDefaults = PLATFORM_ROLE_DEFAULT_PERMISSIONS[platformAdmin.role] || []
      const combined = new Set([...roleDefaults, ...(platformAdmin.customPermissions || [])])
      permissions = Array.from(combined)
    }

    req.platformAdmin = platformAdmin
    req.platformPermissions = permissions
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Enforces that the platform administrator has a specific platform permission.
 */
export function requirePlatformPermission(permissionKey: PlatformPermissionKey) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.platformAdmin) {
        throw new AppError(
          'Platform administrator authentication required',
          403,
          'PLATFORM_FORBIDDEN'
        )
      }

      // Root platform owner has unrestricted platform privileges
      if (req.platformAdmin.role === 'PLATFORM_OWNER') {
        return next()
      }

      if (!req.platformPermissions?.includes(permissionKey)) {
        throw new AppError(
          `Insufficient platform permissions. Required: ${permissionKey}`,
          403,
          'INSUFFICIENT_PLATFORM_PERMISSIONS'
        )
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Enforces that the platform administrator has at least one of the specified platform permissions.
 */
export function requireAnyPlatformPermission(permissionKeys: PlatformPermissionKey[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.platformAdmin) {
        throw new AppError(
          'Platform administrator authentication required',
          403,
          'PLATFORM_FORBIDDEN'
        )
      }

      if (req.platformAdmin.role === 'PLATFORM_OWNER') {
        return next()
      }

      const hasMatch = permissionKeys.some((key) => req.platformPermissions?.includes(key))
      if (!hasMatch) {
        throw new AppError(
          `Insufficient platform permissions. Required one of: ${permissionKeys.join(', ')}`,
          403,
          'INSUFFICIENT_PLATFORM_PERMISSIONS'
        )
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}
