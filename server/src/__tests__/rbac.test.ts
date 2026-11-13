import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import { Role } from '@prisma/client'

describe('Enterprise RBAC & Dynamic Permissions API', () => {
  const app = createApp()

  const mockUserOwner = {
    id: 'user-owner',
    name: 'Alice Owner',
    email: 'alice@store.co.ke',
    passwordHash: 'hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockUserCashier = {
    id: 'user-cashier',
    name: 'Charlie Cashier',
    email: 'charlie@store.co.ke',
    passwordHash: 'hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockOwnerSession = {
    id: 'session-owner',
    token: 'owner-session-token',
    userId: mockUserOwner.id,
    expiresAt: new Date(Date.now() + 1000000),
    createdAt: new Date(),
    user: mockUserOwner,
  }

  const mockCashierSession = {
    id: 'session-cashier',
    token: 'cashier-session-token',
    userId: mockUserCashier.id,
    expiresAt: new Date(Date.now() + 1000000),
    createdAt: new Date(),
    user: mockUserCashier,
  }

  const mockBusiness = {
    id: 'biz-1',
    name: 'SmartStock Demo Mini-Mart',
    slug: 'smartstock-demo-mini-mart',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockOwnerMembership = {
    id: 'mem-owner',
    userId: mockUserOwner.id,
    businessId: mockBusiness.id,
    role: Role.OWNER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    business: mockBusiness,
    user: mockUserOwner,
  }

  const mockCashierMembership = {
    id: 'mem-cashier',
    userId: mockUserCashier.id,
    businessId: mockBusiness.id,
    role: Role.CASHIER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    business: mockBusiness,
    user: mockUserCashier,
  }

  const samplePermissions = [
    {
      id: 'perm-1',
      key: 'pos.sell',
      name: 'Process Sales & Checkout',
      description: 'Access Point of Sale and process sales',
      module: 'pos',
      riskLevel: 'LOW',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'perm-2',
      key: 'products.view',
      name: 'View Products & Catalog',
      description: 'View products and stock levels',
      module: 'products',
      riskLevel: 'LOW',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'perm-3',
      key: 'team.assign',
      name: 'Manage Roles & Assign Access',
      description: 'Create and assign roles to staff',
      module: 'team',
      riskLevel: 'HIGH',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'perm-4',
      key: 'pos.refund',
      name: 'Process Customer Refunds',
      description: 'Process customer returns and cash refunds',
      module: 'pos',
      riskLevel: 'MEDIUM',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  const mockSystemRole = {
    id: 'role-sys-1',
    businessId: mockBusiness.id,
    name: 'Store Manager',
    code: 'STORE_MANAGER',
    description: 'Manages store operations and reporting',
    isSystem: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    permissions: [
      { permission: samplePermissions[0] },
      { permission: samplePermissions[1] },
      { permission: samplePermissions[2] },
    ],
    _count: { roleAssignments: 1 },
    roleAssignments: [{ id: 'asgn-1' }],
  }

  const mockCustomRole = {
    id: 'role-cust-1',
    businessId: mockBusiness.id,
    name: 'Inventory Auditor',
    code: 'INVENTORY_AUDITOR',
    description: 'Audits physical store stock',
    isSystem: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    permissions: [{ permission: samplePermissions[1] }],
    _count: { roleAssignments: 0 },
    roleAssignments: [],
  }

  beforeEach(() => {
    vi.restoreAllMocks()

    // Default transaction implementation
    vi.spyOn(prisma, '$transaction').mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') {
        return arg(prisma)
      }
      return Promise.all(arg)
    })

    // Mock sessions
    vi.spyOn(prisma.session, 'findUnique').mockImplementation((async (args: any) => {
      if (args.where?.token === 'owner-session-token') return mockOwnerSession
      if (args.where?.token === 'cashier-session-token') return mockCashierSession
      return null
    }) as any)

    // Mock memberships
    vi.spyOn(prisma.businessMembership, 'findUnique').mockImplementation((async (args: any) => {
      const uId = args.where?.userId_businessId?.userId
      const bId = args.where?.userId_businessId?.businessId
      if (bId === mockBusiness.id) {
        if (uId === mockUserOwner.id) return mockOwnerMembership
        if (uId === mockUserCashier.id) return mockCashierMembership
      }
      return null
    }) as any)

    // Mock audit service
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({ id: 'audit-1' } as any)
  })

  describe('GET /api/v1/businesses/:businessId/permissions', () => {
    it('should return catalog of all system permissions grouped by functional module', async () => {
      vi.spyOn(prisma.permission, 'findMany').mockResolvedValue(samplePermissions as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/permissions`)
        .set('Cookie', ['smartstock_session=owner-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data.permissions)).toBe(true)
      expect(res.body.data.permissions.length).toBe(4)
      expect(res.body.data.grouped.pos).toBeDefined()
      expect(res.body.data.grouped.products).toBeDefined()
      expect(res.body.data.grouped.team).toBeDefined()
    })
  })

  describe('GET /api/v1/businesses/:businessId/roles', () => {
    it('should return system and custom roles with permissions array and assigned userCount', async () => {
      vi.spyOn(prisma.appRole, 'findMany').mockResolvedValue([mockSystemRole, mockCustomRole] as any)
      vi.spyOn(prisma.permission, 'findMany').mockResolvedValue(samplePermissions as any)
      vi.spyOn(prisma.appRole, 'findUnique').mockResolvedValue(mockSystemRole as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/roles`)
        .set('Cookie', ['smartstock_session=owner-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.length).toBe(2)
      expect(res.body.data[0].displayName).toBe('Store Manager')
      expect(res.body.data[0].permissions).toContain('pos.sell')
      expect(res.body.data[0].userCount).toBe(1)
      expect(res.body.data[1].isCustom).toBe(true)
      expect(res.body.data[1].userCount).toBe(0)
    })
  })

  describe('POST /api/v1/businesses/:businessId/roles', () => {
    it('should allow owner/manager to create a new custom role with valid permissions', async () => {
      vi.spyOn(prisma.appRole, 'findFirst').mockResolvedValue(null)
      vi.spyOn(prisma.permission, 'findMany').mockResolvedValue([
        samplePermissions[0],
        samplePermissions[1],
      ] as any)

      const createdRole = {
        id: 'new-role-id',
        businessId: mockBusiness.id,
        name: 'Shift Lead',
        code: 'SHIFT_LEAD',
        description: 'Supervises floor operations',
        isSystem: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        permissions: [
          { permission: samplePermissions[0] },
          { permission: samplePermissions[1] },
        ],
        roleAssignments: [],
      }

      vi.spyOn(prisma.appRole, 'create').mockResolvedValue(createdRole as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/roles`)
        .set('Cookie', ['smartstock_session=owner-session-token'])
        .send({
          name: 'Shift Lead',
          description: 'Supervises floor operations',
          permissionKeys: ['pos.sell', 'products.view'],
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.displayName).toBe('Shift Lead')
      expect(res.body.data.permissions).toEqual(['pos.sell', 'products.view'])
    })

    it('should reject creating duplicate role name with 409 Conflict', async () => {
      vi.spyOn(prisma.appRole, 'findFirst').mockResolvedValue(mockCustomRole as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/roles`)
        .set('Cookie', ['smartstock_session=owner-session-token'])
        .send({
          name: 'Inventory Auditor',
          description: 'Another Auditor',
          permissionKeys: ['products.view'],
        })

      expect(res.status).toBe(409)
      expect(res.body.success).toBe(false)
      expect(res.body.error?.message || res.body.message).toMatch(/already exists/i)
    })

    it('should deny unauthorized user lacking team.assign permission with 403', async () => {
      // Mock cashier without team.assign permission
      vi.spyOn(prisma.userRoleAssignment, 'findMany').mockResolvedValue([])

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/roles`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])
        .send({
          name: 'Hacked Role',
          permissionKeys: ['pos.sell'],
        })

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })
  })

  describe('PUT /api/v1/businesses/:businessId/roles/:roleId', () => {
    it('should update role name, description and permissions', async () => {
      vi.spyOn(prisma.appRole, 'findFirst').mockResolvedValue(mockCustomRole as any)
      vi.spyOn(prisma.permission, 'findMany').mockResolvedValue([
        samplePermissions[0],
        samplePermissions[1],
      ] as any)
      vi.spyOn(prisma.rolePermission, 'deleteMany').mockResolvedValue({ count: 1 } as any)
      vi.spyOn(prisma.rolePermission, 'createMany').mockResolvedValue({ count: 2 } as any)

      const updatedRole = {
        ...mockCustomRole,
        name: 'Lead Stock Auditor',
        permissions: [
          { permission: samplePermissions[0] },
          { permission: samplePermissions[1] },
        ],
      }
      vi.spyOn(prisma.appRole, 'update').mockResolvedValue(updatedRole as any)

      const res = await request(app)
        .put(`/api/v1/businesses/${mockBusiness.id}/roles/${mockCustomRole.id}`)
        .set('Cookie', ['smartstock_session=owner-session-token'])
        .send({
          name: 'Lead Stock Auditor',
          permissionKeys: ['pos.sell', 'products.view'],
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.displayName).toBe('Lead Stock Auditor')
    })
  })

  describe('DELETE /api/v1/businesses/:businessId/roles/:roleId', () => {
    it('should reject deleting a system default role with 400', async () => {
      vi.spyOn(prisma.appRole, 'findFirst').mockResolvedValue(mockSystemRole as any)

      const res = await request(app)
        .delete(`/api/v1/businesses/${mockBusiness.id}/roles/${mockSystemRole.id}`)
        .set('Cookie', ['smartstock_session=owner-session-token'])

      expect(res.status).toBe(400)
      expect(res.body.error?.message || res.body.message).toMatch(/cannot be deleted/i)
    })

    it('should reject deleting a role that currently has active users assigned', async () => {
      const assignedCustomRole = {
        ...mockCustomRole,
        _count: { roleAssignments: 2 },
      }
      vi.spyOn(prisma.appRole, 'findFirst').mockResolvedValue(assignedCustomRole as any)

      const res = await request(app)
        .delete(`/api/v1/businesses/${mockBusiness.id}/roles/${mockCustomRole.id}`)
        .set('Cookie', ['smartstock_session=owner-session-token'])

      expect(res.status).toBe(400)
      expect(res.body.error?.message || res.body.message).toMatch(/assigned to 2 staff/i)
    })

    it('should successfully delete an unassigned custom role', async () => {
      vi.spyOn(prisma.appRole, 'findFirst').mockResolvedValue(mockCustomRole as any)
      vi.spyOn(prisma.appRole, 'delete').mockResolvedValue(mockCustomRole as any)

      const res = await request(app)
        .delete(`/api/v1/businesses/${mockBusiness.id}/roles/${mockCustomRole.id}`)
        .set('Cookie', ['smartstock_session=owner-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toMatch(/deleted successfully/i)
    })
  })

  describe('POST /api/v1/businesses/:businessId/roles/assign', () => {
    it('should assign roles to a user in the business', async () => {
      vi.spyOn(prisma.appRole, 'findMany').mockResolvedValue([mockCustomRole] as any)
      vi.spyOn(prisma.userRoleAssignment, 'deleteMany').mockResolvedValue({ count: 1 } as any)
      vi.spyOn(prisma.userRoleAssignment, 'createMany').mockResolvedValue({ count: 1 } as any)
      vi.spyOn(prisma.businessMembership, 'update').mockResolvedValue(mockCashierMembership as any)

      // Mock user permissions return
      vi.spyOn(prisma.userRoleAssignment, 'findMany').mockResolvedValue([
        {
          role: {
            permissions: [{ permission: { key: 'products.view' } }],
          },
        },
      ] as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/roles/assign`)
        .set('Cookie', ['smartstock_session=owner-session-token'])
        .send({
          userId: mockUserCashier.id,
          roleIds: [mockCustomRole.id],
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.userId).toBe(mockUserCashier.id)
      expect(res.body.data.permissions).toContain('products.view')
    })
  })

  describe('GET /api/v1/businesses/:businessId/roles/my-permissions', () => {
    it('should return all granular permissions for the authenticated owner', async () => {
      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/roles/my-permissions`)
        .set('Cookie', ['smartstock_session=owner-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.permissions).toContain('*')
    })

    it('should return specific assigned permissions for a cashier', async () => {
      vi.spyOn(prisma.userRoleAssignment, 'findMany').mockResolvedValue([
        {
          role: {
            permissions: [
              { permission: { key: 'pos.sell' } },
              { permission: { key: 'pos.refund' } },
            ],
          },
        },
      ] as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/roles/my-permissions`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.permissions).toContain('pos.sell')
      expect(res.body.permissions).toContain('pos.refund')
      expect(res.body.permissions).not.toContain('*')
    })
  })
})
