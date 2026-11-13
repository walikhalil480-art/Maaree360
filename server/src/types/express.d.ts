import { User, Business, BusinessMembership, PlatformAdmin } from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      user?: User
      sessionToken?: string
      business?: Business
      membership?: BusinessMembership & { business?: Business }
      permissions?: string[]
      branchId?: string | null
      platformAdmin?: PlatformAdmin
      platformPermissions?: string[]
    }
  }
}

export {}
