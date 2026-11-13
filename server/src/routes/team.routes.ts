import { Router } from 'express'
import { teamController } from '../controllers/team.controller.js'
import { validateRequest } from '../middleware/validateRequest.js'
import {
  inviteStaffSchema,
  updateStaffRoleSchema,
  staffQuerySchema,
  invitationQuerySchema,
} from '../schemas/team.schemas.js'
import { requirePermission } from '../middleware/rbac.js'

const router = Router({ mergeParams: true })

// 1. Staff Members Management
router.get(
  '/members',
  requirePermission('team.view'),
  validateRequest({ query: staffQuerySchema }),
  teamController.listStaff
)

router.patch(
  '/members/:membershipId/role',
  requirePermission('team.assign'),
  validateRequest({ body: updateStaffRoleSchema }),
  teamController.updateRole
)

router.patch(
  '/members/:membershipId/status',
  requirePermission('team.suspend'),
  (req, res, next) => {
    if (req.body?.isActive === false) {
      return teamController.suspendMember(req, res, next)
    }
    return teamController.reactivateMember(req, res, next)
  }
)

router.post(
  '/members/:membershipId/suspend',
  requirePermission('team.suspend'),
  teamController.suspendMember
)

router.post(
  '/members/:membershipId/reactivate',
  requirePermission('team.suspend'),
  teamController.reactivateMember
)

router.delete(
  '/members/:membershipId',
  requirePermission('team.suspend'),
  teamController.removeMember
)

// 2. Staff Invitations
router.get(
  '/invitations',
  requirePermission('team.view'),
  validateRequest({ query: invitationQuerySchema }),
  teamController.listInvitations
)

router.get(
  '/invitations/:invitationId',
  requirePermission('team.view'),
  teamController.getInvitationById
)

router.post(
  '/invitations',
  requirePermission('team.invite'),
  validateRequest({ body: inviteStaffSchema }),
  teamController.inviteStaff
)

router.post(
  '/members/invite',
  requirePermission('team.invite'),
  validateRequest({ body: inviteStaffSchema }),
  teamController.inviteStaff
)

router.delete(
  '/invitations/:invitationId',
  requirePermission('team.invite'),
  teamController.revokeInvitation
)

router.post(
  '/invitations/:invitationId/revoke',
  requirePermission('team.invite'),
  teamController.revokeInvitation
)

router.post(
  '/invitations/:invitationId/resend',
  requirePermission('team.invite'),
  teamController.resendInvitation
)

export default router
