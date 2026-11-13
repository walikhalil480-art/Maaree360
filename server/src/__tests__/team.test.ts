import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import crypto from 'crypto'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import { Role, Prisma, InvitationStatus, ShiftStatus, PaymentMethod } from '@prisma/client'

describe('Team Roles, Shifts & Permissions API', () => {
  const app = createApp()

  const mockUserOwner = {
    id: 'user-owner',
    name: 'Alice Owner',
    email: 'alice@store.co.ke',
    passwordHash: 'hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockUserManager = {
    id: 'user-manager',
    name: 'Bob Manager',
    email: 'bob@store.co.ke',
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

  const mockManagerSession = {
    id: 'session-manager',
    token: 'manager-session-token',
    userId: mockUserManager.id,
    expiresAt: new Date(Date.now() + 1000000),
    createdAt: new Date(),
    user: mockUserManager,
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

  const mockManagerMembership = {
    id: 'mem-manager',
    userId: mockUserManager.id,
    businessId: mockBusiness.id,
    role: Role.MANAGER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    business: mockBusiness,
    user: mockUserManager,
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

  beforeEach(() => {
    vi.restoreAllMocks()

    // Default transaction implementation
    vi.spyOn(prisma, '$transaction').mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') {
        return arg(prisma)
      }
      return Promise.all(arg)
    })

    vi.spyOn(prisma.session, 'findUnique').mockImplementation(async ({ where }: any) => {
      if (where.token === 'owner-session-token') return mockOwnerSession as any
      if (where.token === 'manager-session-token') return mockManagerSession as any
      if (where.token === 'cashier-session-token') return mockCashierSession as any
      return null
    })

    vi.spyOn(prisma.businessMembership, 'findUnique').mockImplementation(async ({ where }: any) => {
      if (where.userId_businessId?.userId === mockUserOwner.id) return mockOwnerMembership as any
      if (where.userId_businessId?.userId === mockUserManager.id) return mockManagerMembership as any
      if (where.userId_businessId?.userId === mockUserCashier.id) return mockCashierMembership as any
      return null
    })

    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({ id: 'audit-1' } as any)
  })

  // =========================================================================
  // 1. Staff Invitations
  // =========================================================================
  describe('Staff Invitations', () => {
    it('Owner can invite a staff member, generating a token and hashing it', async () => {
      vi.spyOn(prisma.staffInvitation, 'findFirst').mockResolvedValue(null)
      const mockCreatedInvite = {
        id: 'inv-1',
        businessId: mockBusiness.id,
        email: 'newclerk@store.co.ke',
        phone: null,
        role: Role.STOCK_CLERK,
        status: InvitationStatus.PENDING,
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 72 * 3600 * 1000),
        invitedById: mockUserOwner.id,
        createdAt: new Date(),
        invitedBy: {
          id: mockUserOwner.id,
          name: mockUserOwner.name,
          email: mockUserOwner.email,
        },
        business: {
          id: mockBusiness.id,
          name: mockBusiness.name,
        },
      }
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.staffInvitation, 'create').mockResolvedValue(mockCreatedInvite as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/team/members/invite`)
        .set('Cookie', ['smartstock_session=owner-session-token'])
        .send({
          email: 'newclerk@store.co.ke',
          role: 'STOCK_CLERK',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.token).toBeDefined()
      expect(res.body.invitationUrl).toContain(res.body.token)
      expect(res.body.data.role).toBe('STOCK_CLERK')
    })

    it('Rejects duplicate pending invitation for the same email', async () => {
      vi.spyOn(prisma.staffInvitation, 'findFirst').mockResolvedValue({
        id: 'inv-existing',
        email: 'already@invited.com',
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 100000),
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/team/members/invite`)
        .set('Cookie', ['smartstock_session=owner-session-token'])
        .send({
          email: 'already@invited.com',
          role: 'CASHIER',
        })

      expect(res.status).toBe(400)
      expect(res.body.error?.code).toBe('INVITATION_ALREADY_PENDING')
    })

    it('Manager cannot invite an Owner', async () => {
      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/team/members/invite`)
        .set('Cookie', ['smartstock_session=manager-session-token'])
        .send({
          email: 'anotherowner@store.co.ke',
          role: 'OWNER',
        })

      expect(res.status).toBe(403)
      expect(res.body.error?.code).toBe('FORBIDDEN')
    })

    it('Cashier cannot invite staff (Forbidden 403)', async () => {
      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/team/members/invite`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])
        .send({
          email: 'clerk@store.co.ke',
          role: 'STOCK_CLERK',
        })

      expect(res.status).toBe(403)
    })

    it('Public preview returns invitation and business without authentication', async () => {
      const plainToken = 'valid-preview-token-12345'
      const hashed = crypto.createHash('sha256').update(plainToken).digest('hex')

      vi.spyOn(prisma.staffInvitation, 'findUnique').mockResolvedValue({
        id: 'inv-1',
        tokenHash: hashed,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 100000),
        role: Role.CASHIER,
        email: 'charlie@store.co.ke',
        business: mockBusiness,
        invitedBy: mockUserOwner,
      } as any)

      const res = await request(app).get(`/api/v1/invitations/${plainToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.business.name).toBe(mockBusiness.name)
      expect(res.body.data.invitation.role).toBe('CASHIER')
    })

    it('Accept invitation fails when logged-in user email does not match invitation recipient', async () => {
      const plainToken = 'token-for-someone-else'
      const hashed = crypto.createHash('sha256').update(plainToken).digest('hex')

      vi.spyOn(prisma.staffInvitation, 'findUnique').mockResolvedValue({
        id: 'inv-1',
        tokenHash: hashed,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 100000),
        role: Role.CASHIER,
        email: 'someoneelse@different.com', // different from charlie@store.co.ke
        businessId: mockBusiness.id,
      } as any)

      const res = await request(app)
        .post('/api/v1/invitations/accept')
        .set('Cookie', ['smartstock_session=cashier-session-token']) // signed in as charlie@store.co.ke
        .send({ token: plainToken })

      expect(res.status).toBe(403)
      expect(res.body.error?.code).toBe('RECIPIENT_MISMATCH')
    })

    it('Accepts invitation atomically, creates membership, and marks status ACCEPTED', async () => {
      const plainToken = 'valid-accept-token'
      const hashed = crypto.createHash('sha256').update(plainToken).digest('hex')

      vi.spyOn(prisma.staffInvitation, 'findUnique').mockResolvedValue({
        id: 'inv-1',
        tokenHash: hashed,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 100000),
        role: Role.CASHIER,
        email: mockUserCashier.email,
        businessId: mockBusiness.id,
        business: mockBusiness,
      } as any)

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          staffInvitation: {
            update: vi.fn().mockResolvedValue({ id: 'inv-1', status: InvitationStatus.ACCEPTED }),
          },
          businessMembership: {
            upsert: vi.fn().mockResolvedValue({
              id: 'mem-new',
              userId: mockUserCashier.id,
              businessId: mockBusiness.id,
              role: Role.CASHIER,
              isActive: true,
            }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({ id: 'audit-accept' }),
          },
        })
      })

      const res = await request(app)
        .post('/api/v1/invitations/accept')
        .set('Cookie', ['smartstock_session=cashier-session-token'])
        .send({ token: plainToken })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toContain('accepted')
    })
  })

  // =========================================================================
  // 2. Staff Roles & Member Management
  // =========================================================================
  describe('Staff Roles & Member Management', () => {
    it('Owner can update a staff member role', async () => {
      vi.spyOn(prisma.businessMembership, 'findFirst').mockResolvedValue({
        ...mockCashierMembership,
        role: Role.CASHIER,
      } as any)
      vi.spyOn(prisma.businessMembership, 'update').mockResolvedValue({
        ...mockCashierMembership,
        role: Role.MANAGER,
      } as any)

      const res = await request(app)
        .patch(`/api/v1/businesses/${mockBusiness.id}/team/members/${mockCashierMembership.id}/role`)
        .set('Cookie', ['smartstock_session=owner-session-token'])
        .send({ role: 'MANAGER' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.role).toBe('MANAGER')
    })

    it('Manager cannot promote anyone to OWNER', async () => {
      vi.spyOn(prisma.businessMembership, 'findFirst').mockResolvedValue(mockCashierMembership as any)

      const res = await request(app)
        .patch(`/api/v1/businesses/${mockBusiness.id}/team/members/${mockCashierMembership.id}/role`)
        .set('Cookie', ['smartstock_session=manager-session-token'])
        .send({ role: 'OWNER' })

      expect(res.status).toBe(403)
      expect(res.body.error?.code).toBe('FORBIDDEN')
    })

    it('Prevents demoting the last remaining active OWNER', async () => {
      vi.spyOn(prisma.businessMembership, 'findFirst').mockResolvedValue(mockOwnerMembership as any)
      vi.spyOn(prisma.businessMembership, 'count').mockResolvedValue(0)

      const res = await request(app)
        .patch(`/api/v1/businesses/${mockBusiness.id}/team/members/${mockOwnerMembership.id}/role`)
        .set('Cookie', ['smartstock_session=owner-session-token'])
        .send({ role: 'MANAGER' })

      expect(res.status).toBe(400)
      expect(res.body.error?.code).toBe('CANNOT_REMOVE_LAST_OWNER')
    })

    it('Prevents suspending the last remaining active OWNER', async () => {
      vi.spyOn(prisma.businessMembership, 'findFirst').mockResolvedValue(mockOwnerMembership as any)
      vi.spyOn(prisma.businessMembership, 'count').mockResolvedValue(0)

      const res = await request(app)
        .patch(`/api/v1/businesses/${mockBusiness.id}/team/members/${mockOwnerMembership.id}/status`)
        .set('Cookie', ['smartstock_session=owner-session-token'])
        .send({ isActive: false })

      expect(res.status).toBe(400)
      expect(res.body.error?.code).toBe('CANNOT_REMOVE_LAST_OWNER')
    })

    it('Deactivated member is immediately rejected on subsequent requests with 403', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue({
        ...mockCashierMembership,
        isActive: false,
      } as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/shifts/current`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])

      expect(res.status).toBe(403)
      expect(res.body.error?.code).toBe('MEMBERSHIP_DEACTIVATED')
    })

    it('Removing a member deletes the membership without deleting the global user', async () => {
      vi.spyOn(prisma.businessMembership, 'findFirst').mockResolvedValue(mockCashierMembership as any)
      vi.spyOn(prisma.businessMembership, 'delete').mockResolvedValue(mockCashierMembership as any)

      const res = await request(app)
        .delete(`/api/v1/businesses/${mockBusiness.id}/team/members/${mockCashierMembership.id}`)
        .set('Cookie', ['smartstock_session=owner-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toContain('removed from business')
    })
  })

  // =========================================================================
  // 3. Registers & Cashier Shifts
  // =========================================================================
  describe('Registers & Cashier Shifts', () => {
    it('Creates a new register with uppercase code', async () => {
      vi.spyOn(prisma.register, 'findFirst').mockResolvedValue(null)
      const mockCreatedRegister = {
        id: 'reg-1',
        businessId: mockBusiness.id,
        name: 'Main Counter',
        code: 'REG-01',
        description: 'Main sales till',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.spyOn(prisma.register, 'create').mockResolvedValue(mockCreatedRegister as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/shifts/registers`)
        .set('Cookie', ['smartstock_session=owner-session-token'])
        .send({
          name: 'Main Counter',
          code: 'reg-01',
          description: 'Main sales till',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.code).toBe('REG-01')
    })

    it('Rejects opening a shift if cashier already has an active open shift', async () => {
      const testRegId = '11111111-1111-4111-a111-111111111111'
      vi.spyOn(prisma.register, 'findFirst').mockResolvedValue({
        id: testRegId,
        name: 'Front Till',
        isActive: true,
      } as any)

      vi.spyOn(prisma.cashierShift, 'findFirst').mockResolvedValue({
        id: 'shift-active-1',
        status: ShiftStatus.OPEN,
        register: { name: 'Front Till' },
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/shifts/open`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])
        .send({
          registerId: testRegId,
          openingFloat: 1500,
        })

      expect(res.status).toBe(400)
      expect(res.body.error?.code).toBe('SHIFT_ALREADY_OPEN')
    })

    it('Rejects opening a shift if register is already in use by another open shift', async () => {
      const occupiedRegId = '22222222-2222-4222-a222-222222222222'
      vi.spyOn(prisma.cashierShift, 'findFirst')
        .mockResolvedValueOnce(null) // Cashier check passes
        .mockResolvedValueOnce({
          id: 'shift-reg-occupied',
          status: ShiftStatus.OPEN,
          cashier: { name: 'Dan Cashier' },
        } as any) // Register occupied

      vi.spyOn(prisma.register, 'findFirst').mockResolvedValue({
        id: occupiedRegId,
        name: 'Front Till',
        isActive: true,
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/shifts/open`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])
        .send({
          registerId: occupiedRegId,
          openingFloat: 1000,
        })

      expect(res.status).toBe(400)
      expect(res.body.error?.code).toBe('REGISTER_IN_USE')
    })

    it('Reconciliation math strictly calculates cash sales and cash refunds into expected drawer cash', async () => {
      const mockShift = {
        id: 'shift-1',
        businessId: mockBusiness.id,
        registerId: 'reg-1',
        cashierId: mockUserCashier.id,
        openedAt: new Date(),
        status: ShiftStatus.OPEN,
        openingFloat: new Prisma.Decimal(2000),
        register: { id: 'reg-1', name: 'Front Counter', code: 'REG-01' },
        cashier: mockUserCashier,
      }
      vi.spyOn(prisma.cashierShift, 'findUnique').mockResolvedValue(mockShift as any)

      // Mock sales with payments
      const mockSales = [
        {
          id: 'sale-1',
          payments: [
            { method: PaymentMethod.CASH, amount: new Prisma.Decimal(5000) },
          ],
        },
        {
          id: 'sale-2',
          payments: [
            { method: PaymentMethod.MOBILE_MONEY, amount: new Prisma.Decimal(3000) }, // M-Pesa non-cash
          ],
        },
      ]
      vi.spyOn(prisma.sale, 'findMany').mockResolvedValue(mockSales as any)

      // Mock sale returns with refunds
      const mockReturns = [
        {
          id: 'ref-1',
          refundMethod: PaymentMethod.CASH,
          refundAmount: new Prisma.Decimal(500),
        },
      ]
      vi.spyOn(prisma.saleReturn, 'findMany').mockResolvedValue(mockReturns as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/shifts/${mockShift.id}/reconcile`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      const data = res.body.data
      expect(data.openingFloat).toBe(2000)
      expect(data.cashPayments).toBe(5000)
      expect(data.nonCashPayments).toBe(3000)
      expect(data.cashRefunds).toBe(500)
      // Expected Cash = 2000 (float) + 5000 (cash in) - 500 (cash out) = 6500
      expect(data.expectedCash).toBe(6500)
    })

    it('Closes shift and calculates cash variance correctly', async () => {
      const mockShift = {
        id: 'shift-1',
        businessId: mockBusiness.id,
        registerId: 'reg-1',
        cashierId: mockUserCashier.id,
        openedAt: new Date(),
        status: ShiftStatus.OPEN,
        openingFloat: new Prisma.Decimal(1000),
        register: { id: 'reg-1', name: 'Front Counter', code: 'REG-01' },
        cashier: mockUserCashier,
      }
      vi.spyOn(prisma.cashierShift, 'findUnique').mockResolvedValue(mockShift as any)
      vi.spyOn(prisma.cashierShift, 'findFirst').mockResolvedValue(mockShift as any)
      vi.spyOn(prisma.sale, 'findMany').mockResolvedValue([
        { id: 'sale-1', payments: [{ method: PaymentMethod.CASH, amount: new Prisma.Decimal(2000) }] },
      ] as any)
      vi.spyOn(prisma.saleReturn, 'findMany').mockResolvedValue([])

      // Expected cash = 1000 + 2000 = 3000.
      // Actual counted cash = 2950 (shortage of 50).
      vi.spyOn(prisma.cashierShift, 'update').mockImplementation(async ({ data }: any) => {
        return {
          ...mockShift,
          status: ShiftStatus.CLOSED,
          closedAt: new Date(),
          expectedCash: data.expectedCash,
          actualCash: data.actualCash,
          cashVariance: data.cashVariance,
        } as any
      })

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/shifts/${mockShift.id}/close`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])
        .send({
          actualCash: 2950,
          notes: 'Short by 50 bob coin change',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Number(res.body.data.expectedCash)).toBe(3000)
      expect(Number(res.body.data.actualCash)).toBe(2950)
      expect(Number(res.body.data.cashVariance)).toBe(-50)
    })

    it('Manager override close records SHIFT_OVERRIDDEN in audit log', async () => {
      const mockShift = {
        id: 'shift-1',
        businessId: mockBusiness.id,
        registerId: 'reg-1',
        cashierId: mockUserCashier.id, // owned by charlie
        openedAt: new Date(),
        status: ShiftStatus.OPEN,
        openingFloat: new Prisma.Decimal(1000),
        register: { id: 'reg-1', name: 'Front Counter', code: 'REG-01' },
        cashier: mockUserCashier,
      }
      vi.spyOn(prisma.cashierShift, 'findUnique').mockResolvedValue(mockShift as any)
      vi.spyOn(prisma.cashierShift, 'findFirst').mockResolvedValue(mockShift as any)
      vi.spyOn(prisma.sale, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.saleReturn, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.cashierShift, 'update').mockResolvedValue({
        ...mockShift,
        status: ShiftStatus.CLOSED,
      } as any)
      const auditSpy = vi.spyOn(prisma.auditLog, 'create')

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/shifts/${mockShift.id}/close`)
        .set('Cookie', ['smartstock_session=manager-session-token']) // Manager closes for Cashier
        .send({
          actualCash: 1000,
          notes: 'Cashier stepped out unexpectedly',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'SHIFT_OVERRIDDEN',
          }),
        })
      )
    })
  })

  // =========================================================================
  // 4. Append-Only Audit Log
  // =========================================================================
  describe('Append-Only Audit Log', () => {
    it('Manager or Owner can query audit logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          businessId: mockBusiness.id,
          actorId: mockUserOwner.id,
          action: 'STAFF_INVITED',
          resourceType: 'StaffInvitation',
          resourceId: 'inv-1',
          metadata: { email: 'newclerk@store.co.ke', role: 'STOCK_CLERK' },
          ipAddress: '127.0.0.1',
          userAgent: 'TestAgent',
          createdAt: new Date(),
          actor: mockUserOwner,
        },
      ]
      vi.spyOn(prisma.auditLog, 'findMany').mockResolvedValue(mockLogs as any)
      vi.spyOn(prisma.auditLog, 'count').mockResolvedValue(1)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/audit`)
        .set('Cookie', ['smartstock_session=manager-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.length).toBe(1)
      expect(res.body.data[0].action).toBe('STAFF_INVITED')
      expect(res.body.pagination.total).toBe(1)
    })

    it('Cashier is forbidden from viewing audit log (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/audit`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])

      expect(res.status).toBe(403)
    })
  })
})
