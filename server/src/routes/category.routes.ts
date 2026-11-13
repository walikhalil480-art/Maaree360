import { Router } from 'express'
import { categoryController } from '../controllers/category.controller.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { createCategorySchema, updateCategorySchema } from '../schemas/category.schemas.js'
import { requireBusinessMember } from '../middleware/auth.js'
import { Role } from '@prisma/client'

const router = Router({ mergeParams: true })

// List categories - any member can view
router.get('/', categoryController.list)

// Create, update, delete categories - restricted to OWNER and MANAGER
router.post(
  '/',
  requireBusinessMember([Role.OWNER, Role.MANAGER]),
  validateRequest({ body: createCategorySchema }),
  categoryController.create
)

router.patch(
  '/:categoryId',
  requireBusinessMember([Role.OWNER, Role.MANAGER]),
  validateRequest({ body: updateCategorySchema }),
  categoryController.update
)

router.delete(
  '/:categoryId',
  requireBusinessMember([Role.OWNER, Role.MANAGER]),
  categoryController.delete
)

export default router
