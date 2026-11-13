import { Request, Response, NextFunction } from 'express'
import { teamService } from '../services/team.service.js'
import { env } from '../config/env.js'
import { generateSecureToken } from '../utils/security.js'
import { CSRF_COOKIE_NAME } from '../middleware/csrf.js'
import {
  InviteStaffInput,
  AcceptInvitationInput,
  AcceptAndRegisterInput,
  StaffQueryInput,
  InvitationQueryInput,
  UpdateStaffRoleInput,
} from '../schemas/team.schemas.js'
import { Role } from '@prisma/client'

export class TeamController {
  async listStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const query = req.query as unknown as StaffQueryInput
      const data = await teamService.listStaff(businessId, query)
      res.json({ success: true, data: data.items, pagination: data.pagination })
    } catch (error) {
      next(error)
    }
  }

  async inviteStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const actorId = req.user!.id
      const actorRole = req.membership!.role
      const input = req.body as InviteStaffInput

      const result = await teamService.inviteStaff(businessId, actorId, actorRole, input)
      res.status(201).json({
        success: true,
        message: 'Invitation created successfully.',
        data: result.invitation,
        token: result.token,
        invitationUrl: result.invitationUrl,
        emailDelivery: result.emailDelivery,
      })
    } catch (error) {
      next(error)
    }
  }

  async listInvitations(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId } = req.params
      const query = req.query as unknown as InvitationQueryInput
      const data = await teamService.listInvitations(businessId, query)
      res.json({ success: true, data: data.items, pagination: data.pagination })
    } catch (error) {
      next(error)
    }
  }

  async getInvitationById(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId, invitationId } = req.params
      const data = await teamService.getInvitationById(businessId, invitationId)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  async revokeInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId, invitationId } = req.params
      const actorId = req.user!.id
      const actorRole = req.membership!.role

      const data = await teamService.revokeInvitation(businessId, actorId, actorRole, invitationId)
      res.json({ success: true, data, message: 'Invitation revoked successfully.' })
    } catch (error) {
      next(error)
    }
  }

  async resendInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId, invitationId } = req.params
      const actorId = req.user!.id
      const actorRole = req.membership!.role

      const result = await teamService.resendInvitation(businessId, actorId, actorRole, invitationId)
      res.json({
        success: true,
        message: 'Invitation link refreshed successfully.',
        data: result.invitation,
        token: result.token,
        invitationUrl: result.invitationUrl,
      })
    } catch (error) {
      next(error)
    }
  }

  async previewInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params
      const data = await teamService.getInvitationDetailsByToken(token)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  async acceptInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const userEmail = req.user!.email
      const input = req.body as AcceptInvitationInput

      const data = await teamService.acceptInvitation(userId, userEmail, input)
      res.json({ success: true, data, message: 'Invitation accepted successfully.' })
    } catch (error) {
      next(error)
    }
  }

  async acceptAndRegister(req: Request, res: Response, next: NextFunction) {
    try {
      const input = req.body as AcceptAndRegisterInput
      const result = await teamService.acceptAndRegister(input)

      // Set HTTP-only, secure session cookie
      res.cookie(env.COOKIE_NAME, result.sessionToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: result.expiresAt,
        path: '/',
      })

      // Ensure XSRF-TOKEN cookie is set for client CSRF protection
      const csrfToken = req.cookies?.[CSRF_COOKIE_NAME] || generateSecureToken(16)
      res.cookie(CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: false,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })

      res.status(201).json({
        success: true,
        message: 'Account created and invitation accepted successfully.',
        data: {
          user: result.user,
          business: result.business,
          role: result.role,
          membershipId: result.membershipId,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId, membershipId } = req.params
      const actorId = req.user!.id
      const actorRole = req.membership!.role
      const { role } = req.body as UpdateStaffRoleInput

      const data = await teamService.updateStaffRole(businessId, actorId, actorRole, membershipId, role)
      res.json({ success: true, data, message: 'Staff role updated successfully.' })
    } catch (error) {
      next(error)
    }
  }

  async suspendMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId, membershipId } = req.params
      const actorId = req.user!.id
      const actorRole = req.membership!.role

      const data = await teamService.suspendStaff(businessId, actorId, actorRole, membershipId)
      res.json({ success: true, data, message: 'Staff access deactivated successfully.' })
    } catch (error) {
      next(error)
    }
  }

  async reactivateMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId, membershipId } = req.params
      const actorId = req.user!.id
      const actorRole = req.membership!.role

      const data = await teamService.reactivateStaff(businessId, actorId, actorRole, membershipId)
      res.json({ success: true, data, message: 'Staff access reactivated successfully.' })
    } catch (error) {
      next(error)
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessId, membershipId } = req.params
      const actorId = req.user!.id
      const actorRole = req.membership!.role

      const data = await teamService.removeStaff(businessId, actorId, actorRole, membershipId)
      res.json({ success: true, data, message: 'Staff member removed from business.' })
    } catch (error) {
      next(error)
    }
  }
}

export const teamController = new TeamController()
