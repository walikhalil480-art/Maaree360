import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db/prisma.js';
import { Role, SaleStatus, PurchaseOrderStatus } from '@prisma/client';
import { aiProviderService } from '../services/aiProvider.service.js';

describe('AI Business Assistant & Sales Forecasting API (Installment 14)', () => {
  const app = createApp();

  const mockUser = {
    id: 'user-bob',
    name: 'Bob Mwangi',
    email: 'bob@smartstock.co.ke',
    passwordHash: 'hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSession = {
    id: 'session-bob',
    token: 'bob-session-token',
    userId: mockUser.id,
    expiresAt: new Date(Date.now() + 1000000),
    createdAt: new Date(),
    user: mockUser,
  };

  const mockBusiness = {
    id: 'biz-kenya-shop',
    name: 'Maziwa & Unga Retailers',
    slug: 'maziwa-unga-retailers',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOwnerMembership = {
    id: 'mem-owner-bob',
    userId: mockUser.id,
    businessId: mockBusiness.id,
    role: Role.OWNER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    business: mockBusiness,
  };

  const mockCashierMembership = {
    id: 'mem-cashier-bob',
    userId: mockUser.id,
    businessId: mockBusiness.id,
    role: Role.CASHIER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    business: mockBusiness,
  };

  const mockProductA = {
    id: 'prod-milk-500ml',
    businessId: mockBusiness.id,
    name: 'Fresh Cow Milk 500ml',
    sku: 'MILK-500',
    minStockThreshold: 10,
    costPrice: 50.0,
    sellingPrice: 65.0,
    isActive: true,
    createdAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    category: { name: 'Dairy' },
    stockLevel: { quantity: 4 }, // low stock
  };

  const mockProductB = {
    id: 'prod-unga-2kg',
    businessId: mockBusiness.id,
    name: 'Maize Flour 2kg',
    sku: 'UNGA-2KG',
    minStockThreshold: 15,
    costPrice: 180.0,
    sellingPrice: 210.0,
    isActive: true,
    createdAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    category: { name: 'Grains' },
    stockLevel: { quantity: 2 }, // critical stockout risk
  };

  const mockProductDead = {
    id: 'prod-slow-gadget',
    businessId: mockBusiness.id,
    name: 'Obsolete Battery Charger',
    sku: 'CHG-999',
    minStockThreshold: 5,
    costPrice: 600.0,
    sellingPrice: 650.0, // Low margin (<10%)
    isActive: true,
    createdAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    category: { name: 'Electronics' },
    stockLevel: { quantity: 12 },
  };

  beforeEach(() => {
    vi.resetAllMocks();

    // Default auth mocks
    vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any);
    vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockOwnerMembership as any);
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  describe('1. AI Provider Status & Capabilities', () => {
    it('returns configured: false when no API key is present in environment', async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/ai/status`)
        .set('Cookie', [`smartstock_session=${mockSession.token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.configured).toBe(false);
      expect(res.body.data.provider).toBe('none');
      expect(res.body.data.suggestedQuestions.length).toBeGreaterThan(0);
    });

    it('detects GEMINI_API_KEY when configured', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key-12345';

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/ai/status`)
        .set('Cookie', [`smartstock_session=${mockSession.token}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.configured).toBe(true);
      expect(res.body.data.provider).toBe('gemini');
    });
  });

  describe('2. Sales Forecasting Engine', () => {
    it('computes 7-day and 30-day horizons with confidence intervals and insufficient data warning', async () => {
      // Simulate 3 sales across 3 days (< 7 days => hasSufficientData should be false)
      const mockSales = [
        {
          id: 's-1',
          total: 1300.0,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          items: [
            { productId: mockProductA.id, quantity: 20, unitPrice: 65, lineTotal: 1300 },
          ],
        },
        {
          id: 's-2',
          total: 2100.0,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          items: [
            { productId: mockProductB.id, quantity: 10, unitPrice: 210, lineTotal: 2100 },
          ],
        },
      ];

      vi.spyOn(prisma.sale, 'findMany').mockResolvedValue(mockSales as any);
      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([mockProductA, mockProductB] as any);

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/ai/forecast?horizonDays=7`)
        .set('Cookie', [`smartstock_session=${mockSession.token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.horizonDays).toBe(7);
      expect(res.body.data.hasSufficientData).toBe(false);
      expect(res.body.data.dataQualityNote).toContain('Limited historical sales data');
      expect(res.body.data.dailyForecast).toHaveLength(7);
      expect(res.body.data.dailyForecast[0]).toHaveProperty('projectedRevenue');
      expect(res.body.data.dailyForecast[0]).toHaveProperty('lowerBound');
      expect(res.body.data.dailyForecast[0]).toHaveProperty('upperBound');
      expect(res.body.data.topProductsForecast.length).toBeGreaterThan(0);
    });

    it('rejects invalid horizon values', async () => {
      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/ai/forecast?horizonDays=15`)
        .set('Cookie', [`smartstock_session=${mockSession.token}`]);

      expect(res.status).toBe(400);
    });
  });

  describe('3. Smart Restock Recommendations', () => {
    it('calculates reorder points and deducts pending on-order purchase orders', async () => {
      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([mockProductA, mockProductB] as any);
      vi.spyOn(prisma.sale, 'findMany').mockResolvedValue([
        {
          createdAt: new Date(),
          items: [
            { productId: mockProductA.id, quantity: 30 },
            { productId: mockProductB.id, quantity: 60 },
          ],
        },
      ] as any);

      // Suppose Product A has an active PO pending 20 units
      vi.spyOn(prisma.purchaseOrder, 'findMany')
        .mockResolvedValueOnce([
          {
            id: 'po-1',
            orderNumber: 'PO-0001',
            status: PurchaseOrderStatus.ORDERED,
            expectedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            items: [
              {
                productId: mockProductA.id,
                quantityOrdered: 20,
                quantityReceived: 0,
              },
            ],
          },
        ] as any)
        .mockResolvedValueOnce([] as any); // receivedOrders

      vi.spyOn(prisma.supplier, 'findMany').mockResolvedValue([]);

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/ai/restock`)
        .set('Cookie', [`smartstock_session=${mockSession.token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const recA = res.body.data.recommendations.find(
        (r: any) => r.productId === mockProductA.id
      );
      expect(recA).toBeDefined();
      expect(recA.onOrderQuantity).toBe(20);
      expect(recA.effectiveStock).toBe(recA.currentStock + 20);
      expect(res.body.data.disclaimer).toContain('advisory');
    });

    it('filters recommendations by urgency', async () => {
      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([mockProductB] as any);
      vi.spyOn(prisma.sale, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.purchaseOrder, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.supplier, 'findMany').mockResolvedValue([]);

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/ai/restock?urgency=CRITICAL`)
        .set('Cookie', [`smartstock_session=${mockSession.token}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.recommendations.every((r: any) => r.urgency === 'CRITICAL')).toBe(true);
    });
  });

  describe('4. Business Insights Engine', () => {
    it('detects dead stock (>60 days 0 sales with stock >0) and low profit margin', async () => {
      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([
        mockProductDead,
        mockProductA,
      ] as any);

      // Only Product A has sales in the past 60 days
      vi.spyOn(prisma.sale, 'findMany').mockResolvedValue([
        {
          createdAt: new Date(),
          items: [
            {
              productId: mockProductA.id,
              quantity: 25,
              unitPrice: 65,
              unitCost: 50,
              lineTotal: 1625,
            },
          ],
        },
      ] as any);

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/ai/insights`)
        .set('Cookie', [`smartstock_session=${mockSession.token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deadStockInsight = res.body.data.insights.find(
        (i: any) => i.type === 'DEAD_STOCK' && i.productId === mockProductDead.id
      );
      expect(deadStockInsight).toBeDefined();
      expect(deadStockInsight.severity).toBe('HIGH');
      expect(res.body.data.summary.deadStockCapitalTiedUp).toBe(12 * 600); // 7200 KES

      const marginInsight = res.body.data.insights.find(
        (i: any) => i.type === 'LOW_MARGIN_WARNING' && i.productId === mockProductDead.id
      );
      expect(marginInsight).toBeDefined();
    });
  });

  describe('5. AI Chat Assistant & Role-Based Security', () => {
    it('redacts financial profits and store overheads when user is CASHIER', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(
        mockCashierMembership as any
      );
      vi.spyOn(prisma.business, 'findUnique').mockResolvedValue(mockBusiness as any);
      vi.spyOn(prisma.product, 'count').mockResolvedValue(10);
      vi.spyOn(prisma.stockLevel, 'count').mockResolvedValue(2);
      vi.spyOn(prisma.sale, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.purchaseOrder, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.supplier, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([]);

      const mockConversation = {
        id: 'conv-123',
        businessId: mockBusiness.id,
        userId: mockUser.id,
        title: 'Stock question',
      };
      const mockCreatedMessage = {
        id: 'msg-456',
        conversationId: mockConversation.id,
        businessId: mockBusiness.id,
        role: 'assistant',
        content: 'Response',
        metadata: {},
        createdAt: new Date(),
      };

      vi.spyOn(prisma.aiConversation, 'create').mockResolvedValue(mockConversation as any);
      vi.spyOn(prisma.aiChatMessage, 'create').mockResolvedValue(mockCreatedMessage as any);
      vi.spyOn(prisma.aiChatMessage, 'findMany').mockResolvedValue([]);

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/ai/chat`)
        .set('Cookie', [`smartstock_session=${mockSession.token}`])
        .send({ message: 'What is our net operating profit this month?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metadata.roleRestricted).toBe(true);
    });

    it('enforces multi-tenant isolation and rejects non-member requests', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/ai/chat`)
        .set('Cookie', [`smartstock_session=${mockSession.token}`])
        .send({ message: 'Hello' });

      expect(res.status).toBe(404);
    });
  });
});
