import { Request, Response, NextFunction } from 'express'
import { authService } from '../services/auth.service.js'
import { env } from '../config/env.js'
import { generateSecureToken } from '../utils/security.js'
import { CSRF_COOKIE_NAME } from '../middleware/csrf.js'

export class AuthController {
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await authService.register(req.body)
      res.status(201).json({
        success: true,
        user,
      })
    } catch (error) {
      next(error)
    }
  }

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user, sessionToken, expiresAt } = await authService.login(req.body)

      // Set HTTP-only, secure session cookie
      res.cookie(env.COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
      })

      // Ensure XSRF-TOKEN cookie is initialized for client CSRF protection
      const csrfToken = req.cookies?.[CSRF_COOKIE_NAME] || generateSecureToken(16)
      res.cookie(CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: false, // Accessible to frontend JavaScript to attach in headers
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })

      res.status(200).json({
        success: true,
        user,
      })
    } catch (error) {
      next(error)
    }
  }

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await authService.logout(req.sessionToken)

      res.clearCookie(env.COOKIE_NAME, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      })
    } catch (error) {
      next(error)
    }
  }

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        })
        return
      }

      const user = await authService.getProfile(req.user.id)
      res.status(200).json({
        success: true,
        user,
      })
    } catch (error) {
      next(error)
    }
  }

  getCsrfToken = (req: Request, res: Response): void => {
    let csrfToken = req.cookies?.[CSRF_COOKIE_NAME]
    if (!csrfToken) {
      csrfToken = generateSecureToken(16)
      res.cookie(CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: false,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })
    }

    res.status(200).json({
      success: true,
      csrfToken,
    })
  }
}

export const authController = new AuthController()
