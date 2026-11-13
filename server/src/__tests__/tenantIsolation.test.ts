import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import {
  Role,
  Prisma,
  SaleStatus,
  PaymentStatus,
  PaymentMethod,
  PurchaseOrderStatus,
  ReturnRestockAction,
} from '@prisma/client'

describe('Multi-Tenant Data Isolation & Security Test Suite', () => {
  const app = createApp()

  // Define Shop A (Shabeele Whole Sellers)
  const shopA = {
    id: 'biz-shop-a',
    name: 'Shabeele Whole Sellers',
    slug: 'shabeele-whole-sellers',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  // Define Shop B (RAQIIS Electronics)
  const shopB = {
    id: 'biz-shop-b',
    name: 'RAQIIS Electronics',
    slug: 'raqiis-electronics',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  // User A (Owner of Shop A)
  const userA = {
    id: 'user-shop-a',
    name: 'Omar Faruk',
    email: 'omar@shabeele.com',
    passwordHash: 'hashA',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const sessionA = {
    id: 'session-a',
    token: 'token-shop-a',
    userId: userA.id,
    expiresAt: new Date(Date.now() + 10000000),
    createdAt: new Date(),
    user: userA,
  }

  const membershipA = {
    id: 'mem-a',
    userId: userA.id,
    businessId: shopA.id,
    role: Role.OWNER,
    isActive: true,
    createdAt: new Date(),
    business: shopA,
  }

  // User B (Owner of Shop B)
  const userB = {
    id: 'user-shop-b',
    name: 'Ahmed Nuur',
    email: 'ahmed@raqiis.com',
    passwordHash: 'hashB',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const sessionB = {
    id: 'session-b',
    token: 'token-shop-b',
    userId: userB.id,
    expiresAt: new Date(Date.now() + 10000000),
    createdAt: new Date(),
    user: userB,
  }

  const membershipB = {
    id: 'mem-b',
    userId: userB.id,
    businessId: shopB.id,
    role: Role.OWNER,
    isActive: true,
    createdAt: new Date(),
    business: shopB,
  }

  // Shop A Entities
  const customerA = {
    id: '550e8400-e29b-41d4-a716-4466554400a1',
    businessId: shopA.id,
    name: 'Halima Osman',
    phone: '+254711000001',
    email: 'halima@shabeele-cust.com',
    address: 'Eastleigh, Nairobi',
    taxPin: 'P051234567A',
    notes: 'Shop A Wholesale client',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { sales: 1, returns: 0 },
    sales: [{ total: new Prisma.Decimal(5000) }],
    returns: [],
  }

  const productA = {
    id: '550e8400-e29b-41d4-a716-4466554400a2',
    businessId: shopA.id,
    name: 'Basmati Rice 25kg',
    sku: 'RICE-BASMATI-25KG',
    barcode: '616110000101',
    unit: 'bag',
    costPrice: new Prisma.Decimal('3200.00'),
    sellingPrice: new Prisma.Decimal('3800.00'),
    minStockThreshold: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: null,
    inventory: { currentStock: 50 },
  }

  const supplierA = {
    id: '550e8400-e29b-41d4-a716-4466554400a3',
    businessId: shopA.id,
    name: 'Mombasa Grain Millers Ltd',
    contactPerson: 'Mr. Ali',
    email: 'orders@mgm.co.ke',
    phone: '+254700111222',
    address: 'Mombasa Port Rd',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const saleA = {
    id: '550e8400-e29b-41d4-a716-4466554400a4',
    businessId: shopA.id,
    receiptNumber: 'REC-0001',
    cashierId: userA.id,
    customerId: customerA.id,
    subtotal: new Prisma.Decimal('3800.00'),
    tax: new Prisma.Decimal('0.00'),
    discount: new Prisma.Decimal('0.00'),
    total: new Prisma.Decimal('3800.00'),
    status: SaleStatus.COMPLETED,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: PaymentMethod.CASH,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 'sale-item-a1',
        saleId: '550e8400-e29b-41d4-a716-4466554400a4',
        productId: productA.id,
        quantity: 1,
        unitPrice: new Prisma.Decimal('3800.00'),
        subtotal: new Prisma.Decimal('3800.00'),
        discount: new Prisma.Decimal('0.00'),
        total: new Prisma.Decimal('3800.00'),
        returnedQty: 0,
        product: productA,
      },
    ],
    payments: [],
    returns: [],
    cashier: { id: userA.id, name: userA.name, email: userA.email },
    customer: customerA,
    business: shopA,
  }

  // Shop B Entities
  const customerB = {
    id: '550e8400-e29b-41d4-a716-4466554400b1',
    businessId: shopB.id,
    name: 'Warsame Tech Solutions',
    phone: '+254722000002',
    email: 'info@warsametech.com',
    address: 'Luthuli Avenue, Nairobi',
    taxPin: 'P059876543B',
    notes: 'Shop B Corporate account',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { sales: 2, returns: 0 },
    sales: [{ total: new Prisma.Decimal(45000) }],
    returns: [],
  }

  const productB = {
    id: '550e8400-e29b-41d4-a716-4466554400b2',
    businessId: shopB.id,
    name: 'Samsung 55-inch 4K UHD Smart TV',
    sku: 'SAM-55-4K-UHD',
    barcode: '880609123456',
    unit: 'piece',
    costPrice: new Prisma.Decimal('52000.00'),
    sellingPrice: new Prisma.Decimal('68000.00'),
    minStockThreshold: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: null,
    inventory: { currentStock: 12 },
  }

  const supplierB = {
    id: '550e8400-e29b-41d4-a716-4466554400b3',
    businessId: shopB.id,
    name: 'Dubai Electronics Importers',
    contactPerson: 'Mr. Rashid',
    email: 'sales@dubai-elec.com',
    phone: '+254733444555',
    address: 'Moi Avenue, Nairobi',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const saleB = {
    id: '550e8400-e29b-41d4-a716-4466554400b4',
    businessId: shopB.id,
    receiptNumber: 'REC-0099',
    cashierId: userB.id,
    customerId: customerB.id,
    subtotal: new Prisma.Decimal('68000.00'),
    tax: new Prisma.Decimal('0.00'),
    discount: new Prisma.Decimal('0.00'),
    total: new Prisma.Decimal('68000.00'),
    status: SaleStatus.COMPLETED,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: PaymentMethod.BANK_TRANSFER,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: '550e8400-e29b-41d4-a716-4466554400b5',
        saleId: '550e8400-e29b-41d4-a716-4466554400b4',
        productId: productB.id,
        quantity: 1,
        unitPrice: new Prisma.Decimal('68000.00'),
        subtotal: new Prisma.Decimal('68000.00'),
        discount: new Prisma.Decimal('0.00'),
        total: new Prisma.Decimal('68000.00'),
        returnedQty: 0,
        product: productB,
      },
    ],
    payments: [],
    returns: [],
    cashier: { id: userB.id, name: userB.name, email: userB.email },
    customer: customerB,
    business: shopB,
  }

  beforeEach(() => {
    vi.restoreAllMocks()

    // Default audit log spy to capture security events without DB writes
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any)

    // Session resolution based on incoming cookie token
    vi.spyOn(prisma.session, 'findUnique').mockImplementation(async ({ where }: any) => {
      if (where.token === 'token-shop-a') return sessionA as any
      if (where.token === 'token-shop-b') return sessionB as any
      return null
    })

    // Business membership resolution
    vi.spyOn(prisma.businessMembership, 'findUnique').mockImplementation(async ({ where }: any) => {
      const uId = where.userId_businessId?.userId
      const bId = where.userId_businessId?.businessId

      if (uId === userA.id && bId === shopA.id) return membershipA as any
      if (uId === userB.id && bId === shopB.id) return membershipB as any
      return null
    })

    // Business findUnique resolution
    vi.spyOn(prisma.business, 'findUnique').mockImplementation(async ({ where }: any) => {
      if (where.id === shopA.id) return shopA as any
      if (where.id === shopB.id) return shopB as any
      return null
    })
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 1: Shop A user requests customer list -> sees ONLY Shop A customers
  // ---------------------------------------------------------------------------
  it('Scenario 1: Shop A user requests customer list -> sees ONLY Shop A customers', async () => {
    const countSpy = vi.spyOn(prisma.customer, 'count').mockResolvedValue(1)
    const findManySpy = vi.spyOn(prisma.customer, 'findMany').mockResolvedValue([customerA] as any)

    const res = await request(app)
      .get(`/api/v1/businesses/${shopA.id}/customers`)
      .set('Cookie', ['smartstock_session=token-shop-a'])

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.customers).toHaveLength(1)
    expect(res.body.customers[0].name).toBe('Halima Osman')
    expect(res.body.customers[0].businessId).toBe(shopA.id)

    // Enforce that Prisma query was strictly scoped to Shop A's businessId
    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ businessId: shopA.id }),
      })
    )
    expect(countSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ businessId: shopA.id }),
      })
    )
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 2: Shop B user requests customer list -> sees ONLY Shop B customers
  // ---------------------------------------------------------------------------
  it('Scenario 2: Shop B user requests customer list -> sees ONLY Shop B customers', async () => {
    const countSpy = vi.spyOn(prisma.customer, 'count').mockResolvedValue(1)
    const findManySpy = vi.spyOn(prisma.customer, 'findMany').mockResolvedValue([customerB] as any)

    const res = await request(app)
      .get(`/api/v1/businesses/${shopB.id}/customers`)
      .set('Cookie', ['smartstock_session=token-shop-b'])

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.customers).toHaveLength(1)
    expect(res.body.customers[0].name).toBe('Warsame Tech Solutions')
    expect(res.body.customers[0].businessId).toBe(shopB.id)

    // Enforce that Prisma query was strictly scoped to Shop B's businessId
    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ businessId: shopB.id }),
      })
    )
    expect(countSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ businessId: shopB.id }),
      })
    )
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 3: Shop A user requests Shop B customer by ID -> receives 404 Not Found
  // ---------------------------------------------------------------------------
  it('Scenario 3: Shop A user requests Shop B customer by ID -> receives 404 Not Found', async () => {
    // Scoped findFirst returns null for Shop A
    vi.spyOn(prisma.customer, 'findFirst').mockResolvedValue(null)
    // Global findUnique detects it exists in Shop B
    vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(customerB as any)
    const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any)

    const res = await request(app)
      .get(`/api/v1/businesses/${shopA.id}/customers/${customerB.id}`)
      .set('Cookie', ['smartstock_session=token-shop-a'])

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.error.message).toContain('Customer not found')

    // Verify security violation was recorded in audit log
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessId: shopA.id,
          action: 'CROSS_TENANT_CUSTOMER_READ_BLOCKED',
          resourceType: 'Customer',
          resourceId: customerB.id,
        }),
      })
    )
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 4: Shop A user attempts to update Shop B customer -> receives 404 Not Found, record unchanged
  // ---------------------------------------------------------------------------
  it('Scenario 4: Shop A user attempts to update Shop B customer -> receives 404 Not Found, record unchanged', async () => {
    vi.spyOn(prisma.customer, 'findFirst').mockResolvedValue(null)
    vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(customerB as any)
    const updateSpy = vi.spyOn(prisma.customer, 'update')

    const res = await request(app)
      .put(`/api/v1/businesses/${shopA.id}/customers/${customerB.id}`)
      .set('Cookie', ['smartstock_session=token-shop-a'])
      .send({ name: 'Hacked Name Attempt' })

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.error.message).toContain('Customer not found')
    // Ensure update was NEVER executed against the database
    expect(updateSpy).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 5: Shop A user attempts to delete Shop B customer -> receives 404 Not Found, record unchanged
  // ---------------------------------------------------------------------------
  it('Scenario 5: Shop A user attempts to delete Shop B customer -> receives 404 Not Found, record unchanged', async () => {
    vi.spyOn(prisma.customer, 'findFirst').mockResolvedValue(null)
    vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(customerB as any)
    const updateSpy = vi.spyOn(prisma.customer, 'update')
    const deleteSpy = vi.spyOn(prisma.customer, 'delete')

    const res = await request(app)
      .delete(`/api/v1/businesses/${shopA.id}/customers/${customerB.id}`)
      .set('Cookie', ['smartstock_session=token-shop-a'])

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.error.message).toContain('Customer not found')
    // Verify record was not modified or deleted
    expect(updateSpy).not.toHaveBeenCalled()
    expect(deleteSpy).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 6: Shop A user creates customer with same phone/email as Shop B customer -> succeeds (scoped uniqueness)
  // ---------------------------------------------------------------------------
  it('Scenario 6: Shop A user creates customer with same phone/email as Shop B customer -> succeeds (scoped uniqueness)', async () => {
    // Check in Shop A returns null (no existing customer with this phone in Shop A)
    vi.spyOn(prisma.customer, 'findFirst').mockResolvedValue(null)

    const newlyCreatedInShopA = {
      id: 'cust-a-duplicate-phone',
      businessId: shopA.id,
      name: 'Aden Guled',
      phone: customerB.phone, // Same phone as Shop B's customer
      email: customerB.email, // Same email as Shop B's customer
      address: 'Shop A branch',
      taxPin: null,
      notes: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const createSpy = vi.spyOn(prisma.customer, 'create').mockResolvedValue(newlyCreatedInShopA as any)

    const res = await request(app)
      .post(`/api/v1/businesses/${shopA.id}/customers`)
      .set('Cookie', ['smartstock_session=token-shop-a'])
      .send({
        name: 'Aden Guled',
        phone: customerB.phone,
        email: customerB.email,
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.customer.phone).toBe(customerB.phone)
    expect(res.body.customer.businessId).toBe(shopA.id)

    expect(createSpy).toHaveBeenCalledWith({
      data: expect.objectContaining({
        businessId: shopA.id,
        phone: customerB.phone,
      }),
    })
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 7: Shop A user requests product list -> sees ONLY Shop A products
  // ---------------------------------------------------------------------------
  it('Scenario 7: Shop A user requests product list -> sees ONLY Shop A products', async () => {
    const countSpy = vi.spyOn(prisma.product, 'count').mockResolvedValue(1)
    const findManySpy = vi.spyOn(prisma.product, 'findMany').mockResolvedValue([productA] as any)

    const res = await request(app)
      .get(`/api/v1/businesses/${shopA.id}/products`)
      .set('Cookie', ['smartstock_session=token-shop-a'])

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.products).toHaveLength(1)
    expect(res.body.products[0].sku).toBe('RICE-BASMATI-25KG')
    expect(res.body.products[0].businessId).toBe(shopA.id)

    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ businessId: shopA.id }),
      })
    )
    expect(countSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ businessId: shopA.id }),
      })
    )
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 8: Shop A user requests Shop B product by ID -> receives 404 Not Found
  // ---------------------------------------------------------------------------
  it('Scenario 8: Shop A user requests Shop B product by ID -> receives 404 Not Found', async () => {
    vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(null)
    vi.spyOn(prisma.product, 'findUnique').mockResolvedValue(productB as any)
    const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any)

    const res = await request(app)
      .get(`/api/v1/businesses/${shopA.id}/products/${productB.id}`)
      .set('Cookie', ['smartstock_session=token-shop-a'])

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.error.message).toContain('Product not found')

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessId: shopA.id,
          action: 'CROSS_TENANT_PRODUCT_READ_BLOCKED',
          resourceType: 'Product',
          resourceId: productB.id,
        }),
      })
    )
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 9: Shop A user creates product with same SKU as Shop B product -> succeeds (scoped uniqueness)
  // ---------------------------------------------------------------------------
  it('Scenario 9: Shop A user creates product with same SKU as Shop B product -> succeeds (scoped uniqueness)', async () => {
    // Prisma composite lookup for Shop A returns null
    vi.spyOn(prisma.product, 'findUnique').mockImplementation(async ({ where }: any) => {
      if (where.businessId_sku?.businessId === shopA.id) return null
      return null
    })

    const newProductInShopA = {
      id: 'prod-a-shared-sku',
      businessId: shopA.id,
      name: 'Electronics Item with Same SKU',
      sku: productB.sku, // Same SKU as Shop B's product
      barcode: null,
      unit: 'piece',
      costPrice: new Prisma.Decimal('100.00'),
      sellingPrice: new Prisma.Decimal('150.00'),
      minStockThreshold: 5,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: null,
      codes: [],
    }

    vi.spyOn(prisma.product, 'create').mockResolvedValue(newProductInShopA as any)

    const res = await request(app)
      .post(`/api/v1/businesses/${shopA.id}/products`)
      .set('Cookie', ['smartstock_session=token-shop-a'])
      .send({
        name: 'Electronics Item with Same SKU',
        sku: productB.sku,
        unit: 'piece',
        costPrice: 100,
        sellingPrice: 150,
        minStockThreshold: 5,
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.product.sku).toBe(productB.sku)
    expect(res.body.product.businessId).toBe(shopA.id)
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 10: Shop A user attempts to create sale referencing Shop B customer_id -> rejected with 400
  // ---------------------------------------------------------------------------
  it('Scenario 10: Shop A user attempts to create sale referencing Shop B customer_id -> rejected with 400', async () => {
    // When looking for customer in Shop A -> null
    vi.spyOn(prisma.customer, 'findFirst').mockResolvedValue(null)
    // Global customer lookup reveals customer belongs to Shop B
    vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(customerB as any)
    const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any)

    const res = await request(app)
      .post(`/api/v1/businesses/${shopA.id}/sales`)
      .set('Cookie', ['smartstock_session=token-shop-a'])
      .send({
        customerId: customerB.id, // Foreign customer belonging to Shop B
        items: [
          {
            productId: productA.id,
            quantity: 1,
            unitPrice: 3800,
          },
        ],
        payments: [
          {
            method: PaymentMethod.CASH,
            amount: 3800,
          },
        ],
      })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error.message).toContain('does not belong to this business')

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessId: shopA.id,
          resourceType: 'Customer',
          resourceId: customerB.id,
          action: 'CROSS_TENANT_SALE_CUSTOMER_LINK_BLOCKED',
        }),
      })
    )
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 11: Shop A user attempts to create sale referencing Shop B product_id -> rejected with 400
  // ---------------------------------------------------------------------------
  it('Scenario 11: Shop A user attempts to create sale referencing Shop B product_id -> rejected with 400', async () => {
    // Looking up products in Shop A finds nothing
    vi.spyOn(prisma.product, 'findMany').mockImplementation(async ({ where }: any) => {
      if (where.businessId === shopA.id) return []
      if (where.businessId?.not === shopA.id) return [{ id: productB.id, businessId: shopB.id }] as any
      return []
    })

    const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any)

    const res = await request(app)
      .post(`/api/v1/businesses/${shopA.id}/sales`)
      .set('Cookie', ['smartstock_session=token-shop-a'])
      .send({
        items: [
          {
            productId: productB.id, // Foreign product belonging to Shop B
            quantity: 1,
            unitPrice: 68000,
          },
        ],
        payments: [
          {
            method: PaymentMethod.CASH,
            amount: 68000,
          },
        ],
      })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error.message).toContain('One or more selected products are invalid or do not belong to this business')

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessId: shopA.id,
          resourceType: 'Product',
          resourceId: productB.id,
          action: 'CROSS_TENANT_SALE_PRODUCT_LINK_BLOCKED',
        }),
      })
    )
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 12: Shop A user requests sales list -> sees ONLY Shop A sales
  // ---------------------------------------------------------------------------
  it('Scenario 12: Shop A user requests sales list -> sees ONLY Shop A sales', async () => {
    const countSpy = vi.spyOn(prisma.sale, 'count').mockResolvedValue(1)
    const findManySpy = vi.spyOn(prisma.sale, 'findMany').mockResolvedValue([saleA] as any)

    const res = await request(app)
      .get(`/api/v1/businesses/${shopA.id}/sales`)
      .set('Cookie', ['smartstock_session=token-shop-a'])

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.sales).toHaveLength(1)
    expect(res.body.sales[0].receiptNumber).toBe('REC-0001')
    expect(res.body.sales[0].businessId).toBe(shopA.id)

    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ businessId: shopA.id }),
      })
    )
    expect(countSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ businessId: shopA.id }),
      })
    )
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 13: Shop A user requests Shop B sale receipt by ID -> receives 404 Not Found
  // ---------------------------------------------------------------------------
  it('Scenario 13: Shop A user requests Shop B sale receipt by ID -> receives 404 Not Found', async () => {
    vi.spyOn(prisma.sale, 'findFirst').mockResolvedValue(null)
    vi.spyOn(prisma.sale, 'findUnique').mockResolvedValue(saleB as any)
    const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any)

    const res = await request(app)
      .get(`/api/v1/businesses/${shopA.id}/sales/${saleB.id}`)
      .set('Cookie', ['smartstock_session=token-shop-a'])

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.error.message).toContain('Sale transaction not found')

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessId: shopA.id,
          resourceType: 'Sale',
          resourceId: saleB.id,
          action: 'CROSS_TENANT_SALE_READ_BLOCKED',
        }),
      })
    )
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 14: Shop A user attempts to refund Shop B sale -> rejected with 404 Not Found
  // ---------------------------------------------------------------------------
  it('Scenario 14: Shop A user attempts to refund Shop B sale -> rejected with 404 Not Found', async () => {
    vi.spyOn(prisma.sale, 'findFirst').mockResolvedValue(null)
    vi.spyOn(prisma.sale, 'findUnique').mockResolvedValue(saleB as any)
    const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any)

    const res = await request(app)
      .post(`/api/v1/businesses/${shopA.id}/returns`)
      .set('Cookie', ['smartstock_session=token-shop-a'])
      .send({
        saleId: saleB.id, // Foreign sale belonging to Shop B
        reason: 'Defective product',
        refundMethod: PaymentMethod.CASH,
        items: [
          {
            saleItemId: '550e8400-e29b-41d4-a716-4466554400b5',
            quantity: 1,
            restockAction: ReturnRestockAction.RESTOCK,
          },
        ],
      })

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.error.message).toContain('Sale record not found or does not belong to this business')

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessId: shopA.id,
          resourceType: 'Sale',
          resourceId: saleB.id,
          action: 'CROSS_TENANT_RETURN_SALE_LINK_BLOCKED',
        }),
      })
    )
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 15: Shop A user requests purchase orders -> sees ONLY Shop A purchase orders
  // ---------------------------------------------------------------------------
  it('Scenario 15: Shop A user requests purchase orders -> sees ONLY Shop A purchase orders', async () => {
    const purchaseOrderA = {
      id: '550e8400-e29b-41d4-a716-4466554400a5',
      businessId: shopA.id,
      supplierId: supplierA.id,
      orderNumber: 'PO-0001',
      status: PurchaseOrderStatus.ORDERED,
      subtotal: new Prisma.Decimal('32000.00'),
      tax: new Prisma.Decimal('0.00'),
      total: new Prisma.Decimal('32000.00'),
      currency: 'KES',
      createdAt: new Date(),
      updatedAt: new Date(),
      supplier: supplierA,
      createdBy: { id: userA.id, name: userA.name, email: userA.email },
      items: [],
      receipts: [],
    }

    const countSpy = vi.spyOn(prisma.purchaseOrder, 'count').mockResolvedValue(1)
    const findManySpy = vi.spyOn(prisma.purchaseOrder, 'findMany').mockResolvedValue([purchaseOrderA] as any)

    const res = await request(app)
      .get(`/api/v1/businesses/${shopA.id}/purchase-orders`)
      .set('Cookie', ['smartstock_session=token-shop-a'])

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.purchaseOrders).toHaveLength(1)
    expect(res.body.purchaseOrders[0].orderNumber).toBe('PO-0001')
    expect(res.body.purchaseOrders[0].businessId).toBe(shopA.id)

    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ businessId: shopA.id }),
      })
    )
    expect(countSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ businessId: shopA.id }),
      })
    )
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 16: Shop A user attempts to create PO referencing Shop B supplier_id -> rejected with 404
  // ---------------------------------------------------------------------------
  it('Scenario 16: Shop A user attempts to create PO referencing Shop B supplier_id -> rejected with 404', async () => {
    vi.spyOn(prisma.supplier, 'findFirst').mockResolvedValue(null)
    vi.spyOn(prisma.supplier, 'findUnique').mockResolvedValue(supplierB as any)
    const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any)

    const res = await request(app)
      .post(`/api/v1/businesses/${shopA.id}/purchase-orders`)
      .set('Cookie', ['smartstock_session=token-shop-a'])
      .send({
        supplierId: supplierB.id, // Foreign supplier belonging to Shop B
        items: [
          {
            productId: productA.id,
            quantityOrdered: 10,
            unitCost: 3200,
          },
        ],
      })

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.error.message).toContain('Supplier not found')

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessId: shopA.id,
          resourceType: 'Supplier',
          resourceId: supplierB.id,
          action: 'CROSS_TENANT_PO_SUPPLIER_LINK_BLOCKED',
        }),
      })
    )
  })

  // ---------------------------------------------------------------------------
  // SCENARIO 17: User belonging to Shop A attempts to call Shop B endpoints directly -> receives 404 Not Found
  // ---------------------------------------------------------------------------
  it('Scenario 17: User belonging to Shop A attempts to call Shop B endpoints directly -> receives 404 Not Found', async () => {
    // User A has token-shop-a, but tries to access /api/v1/businesses/biz-shop-b/customers
    // Business B exists in DB, but user A does NOT have a membership in Business B
    const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any)

    const res = await request(app)
      .get(`/api/v1/businesses/${shopB.id}/customers`)
      .set('Cookie', ['smartstock_session=token-shop-a'])

    // Must be 404 Not Found to prevent leaking business IDs or tenant structure
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.error.message).toContain('Business not found or access denied')

    // Verify security violation was recorded in audit log
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessId: shopB.id,
          actorId: userA.id,
          action: 'CROSS_TENANT_BUSINESS_ACCESS_BLOCKED',
          resourceType: 'Business',
          resourceId: shopB.id,
        }),
      })
    )
  })
})
