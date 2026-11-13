import { Router } from 'express'
import { teamController } from '../controllers/team.controller.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { acceptInvitationSchema, acceptAndRegisterSchema } from '../schemas/team.schemas.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Public preview of invitation details (business name, role, email/phone, isExistingUser)
router.get('/:token', teamController.previewInvitation)
router.get('/preview/:token', teamController.previewInvitation)

// Public account registration & invitation acceptance for new users
router.post(
  '/accept-and-register',
  validateRequest({ body: acceptAndRegisterSchema }),
  teamController.acceptAndRegister
)

// Accept invitation for existing authenticated user
router.post(
  '/accept',
  requireAuth,
  validateRequest({ body: acceptInvitationSchema }),
  teamController.acceptInvitation
)

export default router
