import { prisma } from '../db/prisma.js'
import { RegisterInput, LoginInput } from '../schemas/auth.schemas.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import { generateSecureToken } from '../utils/security.js'
import { AppError } from '../middleware/errorHandler.js'
import { env } from '../config/env.js'

export interface SafeUser {
  id: string
  name: string
  email: string
  createdAt: Date
  platformAdmin?: {
    id: string
    role: string
    isActive: boolean
    mfaEnabled: boolean
  } | null
}

export class AuthService {
  async register(input: RegisterInput): Promise<SafeUser> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    })

    if (existing) {
      throw new AppError('Email is already registered', 409, 'EMAIL_ALREADY_EXISTS')
    }

    const passwordHash = await hashPassword(input.password)

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
      },
      include: {
        platformAdmin: true,
      },
    })

    // Strict sanitization: never expose passwordHash under any circumstances
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      platformAdmin: user.platformAdmin
        ? {
            id: user.platformAdmin.id,
            role: user.platformAdmin.role,
            isActive: user.platformAdmin.isActive,
            mfaEnabled: user.platformAdmin.mfaEnabled,
          }
        : null,
    }
  }

  async login(input: LoginInput): Promise<{ user: SafeUser; sessionToken: string; expiresAt: Date }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { platformAdmin: true },
    })

    // Generic failure error message prevents account enumeration
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
    }

    const isValidPassword = await verifyPassword(input.password, user.passwordHash)
    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
    }

    const sessionToken = generateSecureToken(32)
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)

    await prisma.session.create({
      data: {
        token: sessionToken,
        userId: user.id,
        expiresAt,
      },
    })

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        platformAdmin: user.platformAdmin
          ? {
              id: user.platformAdmin.id,
              role: user.platformAdmin.role,
              isActive: user.platformAdmin.isActive,
              mfaEnabled: user.platformAdmin.mfaEnabled,
            }
          : null,
      },
      sessionToken,
      expiresAt,
    }
  }

  async logout(sessionToken?: string): Promise<void> {
    if (!sessionToken) return
    await prisma.session.deleteMany({
      where: { token: sessionToken },
    })
  }

  async getProfile(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { platformAdmin: true },
    })

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND')
    }

    // Strict sanitization
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      platformAdmin: user.platformAdmin
        ? {
            id: user.platformAdmin.id,
            role: user.platformAdmin.role,
            isActive: user.platformAdmin.isActive,
            mfaEnabled: user.platformAdmin.mfaEnabled,
          }
        : null,
    }
  }
}

export const authService = new AuthService()
