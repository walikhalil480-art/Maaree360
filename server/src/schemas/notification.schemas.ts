import { z } from 'zod';
import { Role, NotificationType, NotificationSeverity, NotificationStatus } from '@prisma/client';

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.nativeEnum(NotificationType).optional(),
  severity: z.nativeEnum(NotificationSeverity).optional(),
  status: z.nativeEnum(NotificationStatus).optional(),
  isRead: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  search: z.string().optional(),
});

export const updateAlertSettingsSchema = z.object({
  lowStockAlertsEnabled: z.boolean().optional(),
  lowStockThresholdDefault: z.number().int().min(1).max(10000).optional(),
  reorderRemindersEnabled: z.boolean().optional(),
  unusualSalesAlertsEnabled: z.boolean().optional(),
  salesSurgeThresholdPercent: z.number().int().min(10).max(500).optional(),
  salesDropThresholdPercent: z.number().int().min(10).max(100).optional(),
  salesLookbackDays: z.number().int().min(7).max(180).optional(),
  minSalesSampleSize: z.number().int().min(1).max(100).optional(),
  emailAlertsEnabled: z.boolean().optional(),
  smsAlertsEnabled: z.boolean().optional(),
  recipientRoles: z.array(z.nativeEnum(Role)).optional(),
});

export type ListNotificationsQueryInput = z.infer<typeof listNotificationsQuerySchema>;
export type UpdateAlertSettingsInput = z.infer<typeof updateAlertSettingsSchema>;
