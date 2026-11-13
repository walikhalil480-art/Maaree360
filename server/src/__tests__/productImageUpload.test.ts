import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import { Role } from '@prisma/client'

describe('Product Image Upload API', () => {
  const app = createApp()

  const mockUser = {
    id: 'user-img-1',
    name: 'Alice Manager',
    email: 'alice@store.co.ke',
    passwordHash: 'hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockSession = {
    id: 'session-img-1',
    token: 'alice-img-token',
    userId: mockUser.id,
    expiresAt: new Date(Date.now() + 1000000),
    createdAt: new Date(),
    user: mockUser,
  }

  const mockBusiness = {
    id: 'biz-img-1',
    name: 'TillPro Supermarket',
    slug: 'tillpro-supermarket',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockOwnerMembership = {
    id: 'mem-img-1',
    userId: mockUser.id,
    businessId: mockBusiness.id,
    role: Role.OWNER,
    createdAt: new Date(),
    business: mockBusiness,
  }

  const mockCashierMembership = {
    id: 'mem-img-2',
    userId: mockUser.id,
    businessId: mockBusiness.id,
    role: Role.CASHIER,
    createdAt: new Date(),
    business: mockBusiness,
  }

  const sampleProduct = {
    id: 'prod-img-100',
    businessId: mockBusiness.id,
    name: 'Fresh Whole Milk 500ml',
    sku: 'MILK-500ML',
    description: 'Pasteurized whole fresh milk',
    brand: 'Brookside',
    categoryId: null,
    imageUrl: '/products/brookside-whole-milk-500ml.jpg',
    unit: 'pouch',
    costPrice: '55.00',
    sellingPrice: '65.00',
    minStockThreshold: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    vi.restoreAllMocks()

    // Auth middleware resolution mocks
    vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any)
    vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockOwnerMembership as any)
  })

  it('should successfully upload a valid JPG image and return image URL in uploads directory', async () => {
    const fakeImageBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])

    const res = await request(app)
      .post(`/api/v1/businesses/${mockBusiness.id}/products/upload-image`)
      .set('Cookie', [`smartstock_session=${mockSession.token}`])
      .attach('image', fakeImageBuffer, 'test-product.jpg')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.imageUrl).toMatch(/^\/products\/uploads\/prod-.*\.jpg$/)
  })

  it('should reject file upload when no image is attached', async () => {
    const res = await request(app)
      .post(`/api/v1/businesses/${mockBusiness.id}/products/upload-image`)
      .set('Cookie', [`smartstock_session=${mockSession.token}`])

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('NO_FILE')
  })

  it('should reject invalid file types with 400 and INVALID_FILE_TYPE', async () => {
    const fakeTextBuffer = Buffer.from('this is not an image')

    const res = await request(app)
      .post(`/api/v1/businesses/${mockBusiness.id}/products/upload-image`)
      .set('Cookie', [`smartstock_session=${mockSession.token}`])
      .attach('image', fakeTextBuffer, 'test-doc.txt')

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE')
  })

  it('should forbid non-manager (CASHIER) from uploading product images', async () => {
    vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockCashierMembership as any)

    const fakeImageBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
    const res = await request(app)
      .post(`/api/v1/businesses/${mockBusiness.id}/products/upload-image`)
      .set('Cookie', [`smartstock_session=${mockSession.token}`])
      .attach('image', fakeImageBuffer, 'sample.jpg')

    expect(res.status).toBe(403)
  })

  it('should update product image directly via PATCH /:productId/image', async () => {
    vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(sampleProduct as any)
    vi.spyOn(prisma.product, 'update').mockResolvedValue({
      ...sampleProduct,
      imageUrl: '/products/uploads/prod-updated.jpg',
    } as any)

    const fakeImageBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47])
    const res = await request(app)
      .patch(`/api/v1/businesses/${mockBusiness.id}/products/${sampleProduct.id}/image`)
      .set('Cookie', [`smartstock_session=${mockSession.token}`])
      .attach('image', fakeImageBuffer, 'new-photo.png')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.imageUrl).toMatch(/^\/products\/uploads\/prod-.*\.png$/)
  })

  it('should preserve existing image when updating other product fields without imageUrl', async () => {
    vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(sampleProduct as any)
    const updateSpy = vi.spyOn(prisma.product, 'update').mockResolvedValue({
      ...sampleProduct,
      sellingPrice: '70.00',
    } as any)

    const res = await request(app)
      .patch(`/api/v1/businesses/${mockBusiness.id}/products/${sampleProduct.id}`)
      .set('Cookie', [`smartstock_session=${mockSession.token}`])
      .send({
        sellingPrice: 70,
      })

    expect(res.status).toBe(200)
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: sampleProduct.id },
        data: expect.objectContaining({
          sellingPrice: 70,
        }),
      })
    )
    // Note that imageUrl was NOT provided, so it is not in data
    expect(updateSpy.mock.calls[0][0].data.imageUrl).toBeUndefined()
  })
})
