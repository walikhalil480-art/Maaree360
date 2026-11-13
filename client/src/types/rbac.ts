export type PermissionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface Permission {
  id: string
  key: string
  name: string
  description?: string | null
  module: string
  riskLevel: PermissionRiskLevel
  createdAt: string
  updatedAt: string
}

export interface AppRole {
  id: string
  businessId: string | null
  name: string
  displayName: string
  description?: string | null
  isSystem: boolean
  isCustom: boolean
  createdAt: string
  updatedAt: string
  permissions: string[]
  userCount: number
}

export interface CreateRoleInput {
  name: string
  displayName: string
  description?: string
  permissionKeys: string[]
}

export interface UpdateRoleInput {
  displayName?: string
  description?: string
  permissionKeys?: string[]
}

export interface AssignRolesInput {
  userId: string
  roleIds: string[]
  branchId?: string
}
