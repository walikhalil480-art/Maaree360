import { Request, Response, NextFunction } from 'express'
import { rbacService } from '../services/rbac.service.js'

function formatRole(role: any) {
  if (!role) return null
  const permissions = (role.permissions || []).map((rp: any) =>
    rp.permission ? rp.permission.key : rp.permissionId || rp
  )
  return {
    id: role.id,
    businessId: role.businessId,
    name: role.code || role.name,
    displayName: role.name || role.displayName || role.code,
    description: role.description,
    isSystem: role.isSystem ?? false,
    isCustom: !(role.isSystem ?? false),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
    permissions,
    userCount:
      role._count?.roleAssignments ??
      (role.roleAssignments?.length || role.userAssignments?.length || 0),
  }
}

export class RbacController {
  /**
   * GET /api/v1/permissions
   * List all available permissions in the system.
   */
  async listPermissions(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const permissions = await rbacService.listPermissions()
      const grouped: Record<string, typeof permissions> = {}
      for (const p of permissions) {
        if (!grouped[p.module]) grouped[p.module] = []
        grouped[p.module].push(p)
      }

      res.status(200).json({
        success: true,
        permissions,
        data: { permissions, grouped },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/v1/businesses/:businessId/roles
   * List all roles for this business (system templates + custom roles) with their assigned permissions.
   */
  async listRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId } = req.params
      const rawRoles = await rbacService.listRoles(businessId)
      const roles = rawRoles.map(formatRole)

      res.status(200).json({
        success: true,
        roles,
        data: roles,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/v1/businesses/:businessId/roles/my-permissions
   * Return the current user's effective permissions for this business.
   */
  async getMyPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId } = req.params
      const branchId = (req.query.branchId as string) || req.branchId || null
      const permissions = await rbacService.getUserPermissions(req.user!.id, businessId, branchId)
      res.status(200).json({
        success: true,
        permissions,
        data: { permissions },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/v1/businesses/:businessId/roles
   * Create a new custom role.
   */
  async createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId } = req.params
      const roleName = req.body.displayName || req.body.name
      const rawRole = await rbacService.createCustomRole(businessId, req.user!.id, {
        name: roleName,
        description: req.body.description,
        permissionKeys: req.body.permissionKeys,
      })
      const role = formatRole(rawRole)

      res.status(201).json({
        success: true,
        role,
        data: role,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * PUT /api/v1/businesses/:businessId/roles/:roleId
   * Update a custom role's details or permissions.
   */
  async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId, roleId } = req.params
      const roleName = req.body.displayName || req.body.name
      const rawRole = await rbacService.updateRole(businessId, roleId, req.user!.id, {
        name: roleName,
        description: req.body.description,
        permissionKeys: req.body.permissionKeys,
      })
      const role = formatRole(rawRole)

      res.status(200).json({
        success: true,
        role,
        data: role,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * DELETE /api/v1/businesses/:businessId/roles/:roleId
   * Delete a custom role.
   */
  async deleteRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId, roleId } = req.params
      await rbacService.deleteRole(businessId, roleId, req.user!.id)
      res.status(200).json({
        success: true,
        message: 'Role deleted successfully',
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/v1/businesses/:businessId/roles/assign
   * Assign roles to a staff member.
   */
  async assignUserRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId } = req.params
      const { userId, roleIds, branchId } = req.body
      const permissions = await rbacService.assignUserRoles(
        businessId,
        userId,
        roleIds,
        req.user!.id,
        branchId
      )
      res.status(200).json({
        success: true,
        message: 'Roles assigned successfully',
        permissions,
        data: {
          userId,
          permissions,
        },
      })
    } catch (error) {
      next(error)
    }
  }
}

export const rbacController = new RbacController()
