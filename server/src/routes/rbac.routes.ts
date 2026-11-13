import { Router } from 'express'
import { rbacController } from '../controllers/rbac.controller.js'
import { validateRequest } from '../middleware/validateRequest.js'
import {
  createRoleSchema,
  updateRoleSchema,
  assignRolesSchema,
} from '../schemas/rbac.schemas.js'
import { requirePermission, attachUserPermissions } from '../middleware/rbac.js'

const router = Router({ mergeParams: true })

// 1. My permissions in this business
router.get('/my-permissions', attachUserPermissions, rbacController.getMyPermissions)

// 2. List all roles in this business (accessible to team.view or team.roles.manage)
router.get(
  '/',
  requirePermission('team.view'),
  rbacController.listRoles
)

// 3. Create custom role (requires team.roles.manage)
router.post(
  '/',
  requirePermission('team.roles.manage'),
  validateRequest({ body: createRoleSchema }),
  rbacController.createRole
)

// 4. Update role (requires team.roles.manage)
router.put(
  '/:roleId',
  requirePermission('team.roles.manage'),
  validateRequest({ body: updateRoleSchema }),
  rbacController.updateRole
)

// 5. Delete role (requires team.roles.manage)
router.delete(
  '/:roleId',
  requirePermission('team.roles.manage'),
  rbacController.deleteRole
)

// 6. Assign roles to staff member (requires team.assign)
router.post(
  '/assign',
  requirePermission('team.assign'),
  validateRequest({ body: assignRolesSchema }),
  rbacController.assignUserRoles
)

export default router
