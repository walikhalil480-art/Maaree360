import { prisma } from '../db/prisma.js';
import {
  NotificationType,
  NotificationSeverity,
  NotificationStatus,
  DeliveryStatus,
  Role,
  Prisma,
} from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { ListNotificationsQueryInput } from '../schemas/notification.schemas.js';
import { externalNotificationService } from './externalNotification.service.js';
import { alertSettingsService } from './alertSettings.service.js';

export interface CreateNotificationOptions {
  businessId: string;
  userId?: string | null;
  title: string;
  message: string;
  type?: NotificationType;
  severity?: NotificationSeverity;
  resourceType?: string | null;
  resourceId?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, any> | null;
  conditionKey?: string | null;
}

export class NotificationService {
  /**
   * Builds Prisma where clause enforcing role-based visibility and business boundaries.
   */
  private getRoleVisibilityFilter(
    businessId: string,
    userId: string,
    userRole: Role
  ): Prisma.NotificationWhereInput {
    const base: Prisma.NotificationWhereInput = { businessId };

    if (userRole === Role.CASHIER) {
      return {
        ...base,
        OR: [{ userId }, { type: NotificationType.GENERAL_ALERT }],
      };
    }

    if (userRole === Role.STOCK_CLERK) {
      return {
        ...base,
        OR: [
          { userId },
          {
            type: {
              in: [
                NotificationType.LOW_STOCK,
                NotificationType.REORDER_REMINDER,
                NotificationType.GENERAL_ALERT,
              ],
            },
          },
        ],
      };
    }

    // OWNER and MANAGER have full access to all business notifications
    return base;
  }

  /**
   * Creates a persisted notification with idempotency check on conditionKey.
   */
  public async createNotification(options: CreateNotificationOptions) {
    const {
      businessId,
      userId,
      title,
      message,
      type = NotificationType.GENERAL_ALERT,
      severity = NotificationSeverity.INFO,
      resourceType,
      resourceId,
      actionUrl,
      metadata,
      conditionKey,
    } = options;

    // Idempotency check: avoid duplicate unread alerts for the same ongoing condition
    if (conditionKey) {
      const activeAlert = await prisma.notification.findFirst({
        where: {
          businessId,
          conditionKey,
          isRead: false,
          status: NotificationStatus.UNREAD,
        },
      });

      if (activeAlert) {
        // Condition already flagged and unread; touch updatedAt and return existing
        return prisma.notification.update({
          where: { id: activeAlert.id },
          data: {
            metadata: (metadata !== undefined && metadata !== null)
              ? (metadata as Prisma.InputJsonValue)
              : (activeAlert.metadata === null ? Prisma.JsonNull : activeAlert.metadata as Prisma.InputJsonValue),
            updatedAt: new Date(),
          },
        });
      }
    }

    // Persist notification
    const notification = await prisma.notification.create({
      data: {
        businessId,
        userId: userId ?? null,
        title,
        message,
        type,
        severity,
        status: NotificationStatus.UNREAD,
        isRead: false,
        resourceType: resourceType ?? null,
        resourceId: resourceId ?? null,
        actionUrl: actionUrl ?? null,
        metadata: metadata ?? Prisma.JsonNull,
        conditionKey: conditionKey ?? null,
        deliveryStatus: DeliveryStatus.NOT_APPLICABLE,
      },
    });

    // Check alert settings for asynchronous external dispatch (non-blocking)
    alertSettingsService
      .getSettings(businessId)
      .then(async (settings) => {
        if (!settings.emailAlertsEnabled && !settings.smsAlertsEnabled) return;

        let targetEmail: string | undefined;
        let targetPhone: string | undefined;

        if (userId) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, phone: true },
          });
          targetEmail = user?.email;
          targetPhone = user?.phone ?? undefined;
        }

        const delivery = await externalNotificationService.deliver({
          toEmail: settings.emailAlertsEnabled ? targetEmail : undefined,
          toPhone: settings.smsAlertsEnabled ? targetPhone : undefined,
          subject: `[TillPro Alert] ${title}`,
          body: message,
          severity,
        });

        if (delivery.channel !== 'NONE') {
          await prisma.notification.update({
            where: { id: notification.id },
            data: {
              deliveryStatus: delivery.delivered ? DeliveryStatus.SENT : DeliveryStatus.FAILED,
              deliveryAttempts: delivery.attempts,
              lastDeliveryError: delivery.error ?? null,
            },
          });
        }
      })
      .catch((err) => {
        console.error('[NotificationService] External delivery error:', err);
      });

    return notification;
  }

  /**
   * Resolves an ongoing condition (e.g. stock back above threshold).
   */
  public async resolveCondition(businessId: string, conditionKey: string) {
    return prisma.notification.updateMany({
      where: {
        businessId,
        conditionKey,
        isRead: false,
        status: NotificationStatus.UNREAD,
      },
      data: {
        status: NotificationStatus.ARCHIVED,
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Lists notifications with filters, role enforcement, and pagination.
   */
  public async listNotifications(
    businessId: string,
    userId: string,
    userRole: Role,
    query: ListNotificationsQueryInput
  ) {
    const { page, limit, type, severity, status, isRead, search } = query;
    const skip = (page - 1) * limit;

    const roleWhere = this.getRoleVisibilityFilter(businessId, userId, userRole);

    const where: Prisma.NotificationWhereInput = {
      ...roleWhere,
      ...(type ? { type } : {}),
      ...(severity ? { severity } : {}),
      ...(status ? { status } : {}),
      ...(isRead !== undefined ? { isRead } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { message: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          ...roleWhere,
          isRead: false,
          status: NotificationStatus.UNREAD,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      unreadCount,
    };
  }

  /**
   * Gets unread count for badge indicators.
   */
  public async getUnreadCount(businessId: string, userId: string, userRole: Role) {
    const roleWhere = this.getRoleVisibilityFilter(businessId, userId, userRole);
    const count = await prisma.notification.count({
      where: {
        ...roleWhere,
        isRead: false,
        status: NotificationStatus.UNREAD,
      },
    });
    return { count };
  }

  /**
   * Marks a single notification as read.
   */
  public async markAsRead(businessId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, businessId },
    });

    if (!notification) {
      throw new AppError('Notification not found', 404, 'NOT_FOUND');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  /**
   * Marks all eligible unread notifications as read.
   */
  public async markAllAsRead(businessId: string, userId: string, userRole: Role) {
    const roleWhere = this.getRoleVisibilityFilter(businessId, userId, userRole);

    const result = await prisma.notification.updateMany({
      where: {
        ...roleWhere,
        isRead: false,
        status: NotificationStatus.UNREAD,
      },
      data: {
        isRead: true,
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    return { markedCount: result.count };
  }

  /**
   * Dismisses a notification.
   */
  public async dismissNotification(businessId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, businessId },
    });

    if (!notification) {
      throw new AppError('Notification not found', 404, 'NOT_FOUND');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.DISMISSED,
        isRead: true,
      },
    });
  }

  /**
   * Archives a notification.
   */
  public async archiveNotification(businessId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, businessId },
    });

    if (!notification) {
      throw new AppError('Notification not found', 404, 'NOT_FOUND');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.ARCHIVED,
        isRead: true,
      },
    });
  }
}

export const notificationService = new NotificationService();
