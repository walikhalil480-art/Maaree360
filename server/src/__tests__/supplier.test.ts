import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import { Role } from '@prisma/client'

describe('Supplier Management API', () => {
  const app = createApp()

  const mockUser = {
    id: 'user-1',
    name: 'Alice',
    email: 'alice@example.com',
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
    name: 'Nairobi Groceries',
    slug: 'nairobi-groceries-1',
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

  const sampleSupplier = {
    id: 'sup-1',
    businessId: mockBusiness.id,
    name: 'Eldoret Farmers Millers',
    contactPerson: 'David Kiprono',
    phone: '+254712345678',
    email: 'sales@eldoretmillers.co.ke',
    address: 'Uganda Road, Industrial Area, Eldoret',
    taxPin: 'P051234567Z',
    notes: 'Primary grain and flour distributor',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { purchaseOrders: 3 },
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession)
    vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockOwnerMembership)
  })

  describe('GET /api/v1/businesses/:businessId/suppliers', () => {
    it('should list suppliers with pagination and count', async () => {
      vi.spyOn(prisma.supplier, 'count').mockResolvedValue(1)
      vi.spyOn(prisma.supplier, 'findMany').mockResolvedValue([sampleSupplier as any])

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/suppliers?page=1&limit=10`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.suppliers).toHaveLength(1)
      expect(res.body.suppliers[0].name).toBe('Eldoret Farmers Millers')
      expect(res.body.suppliers[0]._count.purchaseOrders).toBe(3)
      expect(res.body.pagination.total).toBe(1)
    })

    it('should filter suppliers by search and active status', async () => {
      const countSpy = vi.spyOn(prisma.supplier, 'count').mockResolvedValue(0)
      const findSpy = vi.spyOn(prisma.supplier, 'findMany').mockResolvedValue([])

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/suppliers?search=millers&isActive=true`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(countSpy).toHaveBeenCalled()
      expect(findSpy).toHaveBeenCalled()
    })
  })

  describe('POST /api/v1/businesses/:businessId/suppliers', () => {
    it('should create supplier with valid fields', async () => {
      vi.spyOn(prisma.supplier, 'create').mockResolvedValue(sampleSupplier as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/suppliers`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          name: 'Eldoret Farmers Millers',
          contactPerson: 'David Kiprono',
          phone: '+254712345678',
          email: 'sales@eldoretmillers.co.ke',
          taxPin: 'P051234567Z',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.supplier.name).toBe('Eldoret Farmers Millers')
    })

    it('should allow creating supplier without an email address', async () => {
      vi.spyOn(prisma.supplier, 'create').mockResolvedValue({
        ...sampleSupplier,
        email: null,
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/suppliers`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          name: 'Local Fresh Greens',
          contactPerson: 'Mama Mboga',
          phone: '0722000111',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
    })

    it('should reject invalid email format with 400', async () => {
      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/suppliers`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          name: 'Invalid Email Supplier',
          email: 'not-an-email',
        })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should forbid CASHIER from creating suppliers with 403', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockCashierMembership)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/suppliers`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          name: 'Unauthorized Supplier',
        })

      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
    })
  })

  describe('PATCH /api/v1/businesses/:businessId/suppliers/:supplierId', () => {
    it('should update supplier information', async () => {
      vi.spyOn(prisma.supplier, 'findFirst').mockResolvedValue(sampleSupplier as any)
      vi.spyOn(prisma.supplier, 'update').mockResolvedValue({
        ...sampleSupplier,
        phone: '+254799888777',
      } as any)

      const res = await request(app)
        .patch(`/api/v1/businesses/${mockBusiness.id}/suppliers/${sampleSupplier.id}`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          phone: '+254799888777',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.supplier.phone).toBe('+254799888777')
    })

    it('should return 404 when updating non-existent supplier or from other business', async () => {
      vi.spyOn(prisma.supplier, 'findFirst').mockResolvedValue(null)

      const res = await request(app)
        .patch(`/api/v1/businesses/${mockBusiness.id}/suppliers/unknown-id`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({ name: 'Changed Name' })

      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/v1/businesses/:businessId/suppliers/:supplierId/archive & reactivate', () => {
    it('should archive supplier and preserve history (soft delete)', async () => {
      vi.spyOn(prisma.supplier, 'findFirst').mockResolvedValue(sampleSupplier as any)
      vi.spyOn(prisma.supplier, 'update').mockResolvedValue({
        ...sampleSupplier,
        isActive: false,
      } as any)

      const res = await request(app)
        .patch(`/api/v1/businesses/${mockBusiness.id}/suppliers/${sampleSupplier.id}/archive`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.supplier.isActive).toBe(false)
    })

    it('should reactivate archived supplier', async () => {
      vi.spyOn(prisma.supplier, 'findFirst').mockResolvedValue({
        ...sampleSupplier,
        isActive: false,
      } as any)
      vi.spyOn(prisma.supplier, 'update').mockResolvedValue({
        ...sampleSupplier,
        isActive: true,
      } as any)

      const res = await request(app)
        .patch(`/api/v1/businesses/${mockBusiness.id}/suppliers/${sampleSupplier.id}/reactivate`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.supplier.isActive).toBe(true)
    })
  })
})
