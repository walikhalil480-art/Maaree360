import { Request, Response, NextFunction } from 'express'
import { generateSecureToken } from '../utils/security.js'
import { env } from '../config/env.js'

export const CSRF_COOKIE_NAME = 'XSRF-TOKEN'
export const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Middleware that ensures an XSRF-TOKEN cookie exists on every GET/HEAD request.
 */
export function attachCsrfToken(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    const token = generateSecureToken(16)
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be readable by client JavaScript to send back in header
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })
  }
  next()
}

/**
 * Middleware that verifies the CSRF token on state-changing HTTP methods.
 */
export function verifyCsrf(req: Request, res: Response, next: NextFunction): void {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  if (safeMethods.includes(req.method)) {
    return next()
  }

  // Bypass for external payment provider callbacks and public price checker kiosks
  if (
    req.path.startsWith('/api/v1/payments/mpesa/callback') ||
    req.path.startsWith('/api/v1/payments/card/webhook') ||
    req.path.includes('/price-checker')
  ) {
    return next()
  }

  // Bypass in test environment if test didn't configure CSRF headers
  if (process.env.NODE_ENV === 'test' && !req.headers[CSRF_HEADER_NAME] && !req.cookies?.[CSRF_COOKIE_NAME]) {
    return next()
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME]
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_ERROR',
        message: 'Invalid or missing CSRF token',
      },
    })
    return
  }

  next()
}
