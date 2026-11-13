import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db/prisma.js';
import {
  Role,
  NotificationType,
  NotificationSeverity,
  NotificationStatus,
  DeliveryStatus,
} from '@prisma/client';
import { alertEvaluationService } from '../services/alertEvaluation.service.js';

describe('Installment 15: Notifications & Alerts Module', () => {
  const app = createApp();

  const mockUser = {
    id: 'user-kamau',
    name: 'Kamau Njoroge',
    email: 'kamau@smartstock.co.ke',
    passwordHash: 'hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSession = {
    id: 'session-kamau',
    token: 'kamau-token',
    userId: mockUser.id,
    expiresAt: new Date(Date.now() + 1000000),
    createdAt: new Date(),
    user: mockUser,
  };

  const mockBusiness = {
    id: 'biz-downtown',
    name: 'Downtown General Stores',
    slug: 'downtown-general-stores',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOwnerMembership = {
    id: 'mem-owner-kamau',
    userId: mockUser.id,
    businessId: mockBusiness.id,
    role: Role.OWNER,
    isActive: true,
    createdAt: new Date(),
    business: mockBusiness,
  };

  const mockCashierMembership = {
    id: 'mem-cashier-kamau',
    userId: mockUser.id,
    businessId: mockBusiness.id,
    role: Role.CASHIER,
    isActive: true,
    createdAt: new Date(),
    business: mockBusiness,
  };

  const mockClerkMembership = {
    id: 'mem-clerk-kamau',
    userId: mockUser.id,
    businessId: mockBusiness.id,
    role: Role.STOCK_CLERK,
    isActive: true,
    createdAt: new Date(),
    business: mockBusiness,
  };

  const sampleNotification = {
    id: 'notif-1',
    businessId: mockBusiness.id,
    userId: null,
    title: 'Low Stock Alert: Maize Flour 2kg',
    message: 'Maize Flour 2kg reached 2 pcs, at or below threshold of 10 pcs.',
    type: NotificationType.LOW_STOCK,
    severity: NotificationSeverity.WARNING,
    status: NotificationStatus.UNREAD,
    isRead: false,
    resourceType: 'PRODUCT',
    resourceId: 'prod-unga',
    actionUrl: '/inventory',
    conditionKey: 'LOW_STOCK:prod-unga',
    metadata: { currentStock: 2, threshold: 10 },
    deliveryStatus: DeliveryStatus.NOT_APPLICABLE,
    deliveredAt: null,
    dismissedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: null,
  };

  const sampleSettings = {
    id: 'settings-1',
    businessId: mockBusiness.id,
    lowStockAlertsEnabled: true,
    lowStockThresholdDefault: 5,
    reorderRemindersEnabled: true,
    unusualSalesAlertsEnabled: true,
    salesSurgeThresholdPercent: 150,
    salesDropThresholdPercent: 60,
    salesLookbackDays: 30,
    minSalesSampleSize: 10,
    emailAlertsEnabled: false,
    alertEmail: null,
    smsAlertsEnabled: false,
    alertPhoneNumber: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any);
    vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockOwnerMembership as any);
  });

  describe('1. Listing Notifications & Unread Counts', () => {
    it('returns paginated notifications for the authenticated business', async () => {
      vi.spyOn(prisma.notification, 'count').mockResolvedValue(1);
      vi.spyOn(prisma.notification, 'findMany').mockResolvedValue([sampleNotification as any]);

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/notifications?page=1&limit=20`)
        .set('Cookie', ['smartstock_session=kamau-token']);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].title).toBe('Low Stock Alert: Maize Flour 2kg');
      expect(res.body.data.total).toBe(1);
    });

    it('returns unread count accurately', async () => {
      vi.spyOn(prisma.notification, 'count').mockResolvedValue(3);

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/notifications/unread-count`)
        .set('Cookie', ['smartstock_session=kamau-token']);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(3);
    });

    it('enforces role filtering for Cashier role', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockCashierMembership as any);
      const findManySpy = vi.spyOn(prisma.notification, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.notification, 'count').mockResolvedValue(0);

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/notifications`)
        .set('Cookie', ['smartstock_session=kamau-token']);

      expect(res.status).toBe(200);
      expect(findManySpy).toHaveBeenCalled();
      const whereArg = (findManySpy.mock.calls[0][0] as any).where;
      expect(whereArg.businessId).toBe(mockBusiness.id);
      expect(whereArg.OR).toBeDefined();
    });

    it('enforces role filtering for Stock Clerk role', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockClerkMembership as any);
      const findManySpy = vi.spyOn(prisma.notification, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.notification, 'count').mockResolvedValue(0);

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/notifications`)
        .set('Cookie', ['smartstock_session=kamau-token']);

      expect(res.status).toBe(200);
      expect(findManySpy).toHaveBeenCalled();
      const whereArg = (findManySpy.mock.calls[0][0] as any).where;
      expect(whereArg.businessId).toBe(mockBusiness.id);
      expect(whereArg.OR).toBeDefined();
    });
  });

  describe('2. Notification Actions (Read, Mark All Read, Dismiss, Archive)', () => {
    it('marks a single notification as read', async () => {
      vi.spyOn(prisma.notification, 'findFirst').mockResolvedValue(sampleNotification as any);
      vi.spyOn(prisma.notification, 'update').mockResolvedValue({
        ...sampleNotification,
        isRead: true,
        status: NotificationStatus.READ,
      } as any);

      const res = await request(app)
        .patch(`/api/v1/businesses/${mockBusiness.id}/notifications/${sampleNotification.id}/read`)
        .set('Cookie', ['smartstock_session=kamau-token']);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isRead).toBe(true);
      expect(res.body.data.status).toBe('READ');
    });

    it('marks all unread notifications as read', async () => {
      vi.spyOn(prisma.notification, 'updateMany').mockResolvedValue({ count: 5 });

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/notifications/mark-all-read`)
        .set('Cookie', ['smartstock_session=kamau-token']);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.markedCount).toBe(5);
    });

    it('dismisses a notification', async () => {
      vi.spyOn(prisma.notification, 'findFirst').mockResolvedValue(sampleNotification as any);
      vi.spyOn(prisma.notification, 'update').mockResolvedValue({
        ...sampleNotification,
        status: NotificationStatus.DISMISSED,
        dismissedAt: new Date(),
      } as any);

      const res = await request(app)
        .patch(`/api/v1/businesses/${mockBusiness.id}/notifications/${sampleNotification.id}/dismiss`)
        .set('Cookie', ['smartstock_session=kamau-token']);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DISMISSED');
    });

    it('archives a notification', async () => {
      vi.spyOn(prisma.notification, 'findFirst').mockResolvedValue(sampleNotification as any);
      vi.spyOn(prisma.notification, 'update').mockResolvedValue({
        ...sampleNotification,
        status: NotificationStatus.ARCHIVED,
      } as any);

      const res = await request(app)
        .patch(`/api/v1/businesses/${mockBusiness.id}/notifications/${sampleNotification.id}/archive`)
        .set('Cookie', ['smartstock_session=kamau-token']);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ARCHIVED');
    });
  });

  describe('3. Alert Settings & Permissions', () => {
    it('retrieves business alert settings', async () => {
      vi.spyOn(prisma.alertSetting, 'findUnique').mockResolvedValue(sampleSettings as any);

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/notifications/settings`)
        .set('Cookie', ['smartstock_session=kamau-token']);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lowStockAlertsEnabled).toBe(true);
      expect(res.body.data.lowStockThresholdDefault).toBe(5);
    });

    it('updates alert settings with audit logging for OWNER role', async () => {
      vi.spyOn(prisma.alertSetting, 'findUnique').mockResolvedValue(sampleSettings as any);
      vi.spyOn(prisma.alertSetting, 'upsert').mockResolvedValue({
        ...sampleSettings,
        lowStockThresholdDefault: 8,
      } as any);
      const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      const res = await request(app)
        .put(`/api/v1/businesses/${mockBusiness.id}/notifications/settings`)
        .set('Cookie', ['smartstock_session=kamau-token'])
        .send({
          lowStockThresholdDefault: 8,
          reorderRemindersEnabled: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lowStockThresholdDefault).toBe(8);
      expect(auditSpy).toHaveBeenCalled();
    });

    it('forbids Cashier from modifying alert settings', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockCashierMembership as any);

      const res = await request(app)
        .put(`/api/v1/businesses/${mockBusiness.id}/notifications/settings`)
        .set('Cookie', ['smartstock_session=kamau-token'])
        .send({
          lowStockThresholdDefault: 12,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('4. Condition Deduplication & Auto-Recovery in Alert Evaluation', () => {
    it('creates low stock alert when stock drops below threshold', async () => {
      vi.spyOn(prisma.alertSetting, 'findUnique').mockResolvedValue(sampleSettings as any);
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue({
        id: 'prod-sugar',
        businessId: mockBusiness.id,
        name: 'Kabras Sugar 1kg',
        sku: 'SUG-1KG',
        unit: 'kg',
        minStockThreshold: 10,
        isActive: true,
        stockLevel: { quantity: 4 },
      } as any);

      // No active alert currently
      vi.spyOn(prisma.notification, 'findFirst').mockResolvedValue(null);
      const createSpy = vi.spyOn(prisma.notification, 'create').mockResolvedValue({
        id: 'notif-sugar',
        businessId: mockBusiness.id,
        title: 'Low Stock Alert: Kabras Sugar 1kg',
      } as any);

      await alertEvaluationService.evaluateProductStock(mockBusiness.id, 'prod-sugar');

      expect(createSpy).toHaveBeenCalled();
      const createCall = createSpy.mock.calls[0][0];
      expect(createCall.data.title).toContain('Low Stock Alert: Kabras Sugar 1kg');
      expect(createCall.data.conditionKey).toBe('LOW_STOCK:prod-sugar');
    });

    it('deduplicates when an unread alert for conditionKey already exists', async () => {
      vi.spyOn(prisma.alertSetting, 'findUnique').mockResolvedValue(sampleSettings as any);
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue({
        id: 'prod-sugar',
        businessId: mockBusiness.id,
        name: 'Kabras Sugar 1kg',
        sku: 'SUG-1KG',
        unit: 'kg',
        minStockThreshold: 10,
        isActive: true,
        stockLevel: { quantity: 2 },
      } as any);

      // Active alert already exists
      const existingAlert = {
        id: 'notif-existing-sugar',
        conditionKey: 'LOW_STOCK:prod-sugar',
        isRead: false,
        metadata: { currentStock: 4, threshold: 10 },
      };
      vi.spyOn(prisma.notification, 'findFirst').mockResolvedValue(existingAlert as any);
      const createSpy = vi.spyOn(prisma.notification, 'create');
      const updateSpy = vi.spyOn(prisma.notification, 'update').mockResolvedValue({} as any);

      await alertEvaluationService.evaluateProductStock(mockBusiness.id, 'prod-sugar');

      expect(createSpy).not.toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: existingAlert.id },
        })
      );
    });

    it('auto-resolves (archives) active low stock alert when stock rises above threshold', async () => {
      vi.spyOn(prisma.alertSetting, 'findUnique').mockResolvedValue(sampleSettings as any);
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue({
        id: 'prod-sugar',
        businessId: mockBusiness.id,
        name: 'Kabras Sugar 1kg',
        sku: 'SUG-1KG',
        unit: 'kg',
        minStockThreshold: 10,
        isActive: true,
        stockLevel: { quantity: 25 }, // Stock recovered!
      } as any);

      const updateManySpy = vi.spyOn(prisma.notification, 'updateMany').mockResolvedValue({ count: 1 });

      await alertEvaluationService.evaluateProductStock(mockBusiness.id, 'prod-sugar');

      expect(updateManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            businessId: mockBusiness.id,
            conditionKey: 'LOW_STOCK:prod-sugar',
            isRead: false,
            status: NotificationStatus.UNREAD,
          },
          data: expect.objectContaining({
            status: NotificationStatus.ARCHIVED,
            isRead: true,
          }),
        })
      );
    });
  });

  describe('5. Catalog Reconciliation Endpoint', () => {
    it('triggers reconciliation for authorized users', async () => {
      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([
        { id: 'p1' },
        { id: 'p2' },
      ] as any);
      vi.spyOn(prisma.alertSetting, 'findUnique').mockResolvedValue(sampleSettings as any);

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/notifications/reconcile`)
        .set('Cookie', ['smartstock_session=kamau-token']);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.productsEvaluated).toBe(2);
    });
  });
});
