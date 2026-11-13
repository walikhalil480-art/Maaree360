import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import { Role, Prisma } from '@prisma/client'

describe('Customer Management API', () => {
  const app = createApp()

  const mockUser = {
    id: 'user-1',
    name: 'Alice Wanjiku',
    email: 'alice@smartstock.co.ke',
    passwordHash: 'hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockSession = {
    id: 'session-1',
    token: 'alice-session-token',
    userId: mockUser.id,
    expiresAt: new Date(Date.now() + 1000000),
    createdAt: new Date(),
    user: mockUser,
  }

  const mockBusiness = {
    id: 'biz-1',
    name: 'Nairobi Mini-Mart',
    slug: 'nairobi-mini-mart',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockOwnerMembership = {
    id: 'mem-1',
    userId: mockUser.id,
    businessId: mockBusiness.id,
    role: Role.OWNER,
    createdAt: new Date(),
    business: mockBusiness,
  }

  const mockCashierMembership = {
    id: 'mem-2',
    userId: mockUser.id,
    businessId: mockBusiness.id,
    role: Role.CASHIER,
    createdAt: new Date(),
    business: mockBusiness,
  }

  const mockClerkMembership = {
    id: 'mem-3',
    userId: mockUser.id,
    businessId: mockBusiness.id,
    role: Role.STOCK_CLERK,
    createdAt: new Date(),
    business: mockBusiness,
  }

  const sampleCustomer = {
    id: 'cust-1',
    businessId: mockBusiness.id,
    name: 'Kamau Mwangi',
    phone: '+254712345678',
    email: 'kamau@example.com',
    address: 'Kenyatta Avenue, Nairobi',
    taxPin: 'A001234567X',
    notes: 'Loyal customer',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { sales: 2, returns: 1 },
    sales: [
      { total: new Prisma.Decimal(1500) },
      { total: new Prisma.Decimal(2500) },
    ],
    returns: [
      { refundAmount: new Prisma.Decimal(500) },
    ],
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any)
    vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockOwnerMembership as any)
  })

  describe('GET /api/v1/businesses/:businessId/customers', () => {
    it('should list customers with pagination and spend aggregations', async () => {
      vi.spyOn(prisma.customer, 'count').mockResolvedValue(1)
      vi.spyOn(prisma.customer, 'findMany').mockResolvedValue([sampleCustomer] as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/customers`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.customers).toHaveLength(1)
      expect(res.body.customers[0].name).toBe('Kamau Mwangi')
      expect(res.body.customers[0].totalPurchases).toBe(2)
      expect(res.body.customers[0].totalSpent).toBe(4000)
      expect(res.body.customers[0].totalRefunded).toBe(500)
      expect(res.body.customers[0].netSpend).toBe(3500)
      expect(res.body.pagination.total).toBe(1)
    })

    it('should forbid stock clerks from accessing customers', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockClerkMembership as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/customers`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(403)
    })
  })

  describe('GET /api/v1/businesses/:businessId/customers/:customerId', () => {
    it('should return customer details with sales and returns history', async () => {
      vi.spyOn(prisma.customer, 'findFirst').mockResolvedValue({
        ...sampleCustomer,
        sales: [
          {
            id: 'sale-1',
            receiptNumber: 'REC-0001',
            status: 'COMPLETED',
            total: new Prisma.Decimal(4000),
            createdAt: new Date(),
            items: [],
            payments: [],
            returns: [],
          },
        ],
        returns: [
          {
            id: 'ret-1',
            returnNumber: 'RET-0001',
            refundAmount: new Prisma.Decimal(500),
            createdAt: new Date(),
            sale: { id: 'sale-1', receiptNumber: 'REC-0001', total: new Prisma.Decimal(4000) },
            items: [],
          },
        ],
      } as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/customers/${sampleCustomer.id}`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.customer.name).toBe('Kamau Mwangi')
      expect(res.body.customer.metrics.totalSpent).toBe(4000)
      expect(res.body.customer.metrics.totalRefunded).toBe(500)
      expect(res.body.customer.metrics.netSpend).toBe(3500)
    })

    it('should return 404 if customer not found', async () => {
      vi.spyOn(prisma.customer, 'findFirst').mockResolvedValue(null)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/customers/missing-id`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/v1/businesses/:businessId/customers', () => {
    it('should create customer successfully (cashier allowed)', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockCashierMembership as any)
      vi.spyOn(prisma.customer, 'findFirst').mockResolvedValue(null)
      vi.spyOn(prisma.customer, 'create').mockResolvedValue({
        id: 'cust-2',
        businessId: mockBusiness.id,
        name: 'Jane Atieno',
        phone: '+254722998877',
        email: null,
        address: 'Westlands, Nairobi',
        taxPin: null,
        notes: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/customers`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          name: 'Jane Atieno',
          phone: '+254722998877',
          address: 'Westlands, Nairobi',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.customer.name).toBe('Jane Atieno')
    })

    it('should reject duplicate customer phone within the same business', async () => {
      vi.spyOn(prisma.customer, 'findFirst').mockResolvedValue(sampleCustomer as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/customers`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          name: 'Kamau Duplicate',
          phone: '+254712345678',
        })

      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('CUSTOMER_PHONE_EXISTS')
    })

    it('should validate customer name is required', async () => {
      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/customers`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          phone: '+254712345678',
        })

      expect(res.status).toBe(400)
    })
  })

  describe('PUT /api/v1/businesses/:businessId/customers/:customerId', () => {
    it('should update customer details', async () => {
      vi.spyOn(prisma.customer, 'findFirst').mockResolvedValue(sampleCustomer as any)
      vi.spyOn(prisma.customer, 'update').mockResolvedValue({
        ...sampleCustomer,
        name: 'Kamau Mwangi Updated',
      } as any)

      const res = await request(app)
        .put(`/api/v1/businesses/${mockBusiness.id}/customers/${sampleCustomer.id}`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          name: 'Kamau Mwangi Updated',
        })

      expect(res.status).toBe(200)
      expect(res.body.customer.name).toBe('Kamau Mwangi Updated')
    })
  })

  describe('DELETE /api/v1/businesses/:businessId/customers/:customerId', () => {
    it('should soft delete (archive) customer if sales exist', async () => {
      vi.spyOn(prisma.customer, 'findFirst').mockResolvedValue(sampleCustomer as any)
      const updateSpy = vi.spyOn(prisma.customer, 'update').mockResolvedValue({
        ...sampleCustomer,
        isActive: false,
      } as any)

      const res = await request(app)
        .delete(`/api/v1/businesses/${mockBusiness.id}/customers/${sampleCustomer.id}`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: sampleCustomer.id },
        data: { isActive: false },
      })
    })

    it('should forbid cashier from deleting customer', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockCashierMembership as any)

      const res = await request(app)
        .delete(`/api/v1/businesses/${mockBusiness.id}/customers/${sampleCustomer.id}`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(403)
    })
  })
})
