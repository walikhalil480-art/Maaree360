export type NotificationType =
  | 'LOW_STOCK'
  | 'REORDER_REMINDER'
  | 'UNUSUAL_SALES'
  | 'PAYMENT_ISSUE'
  | 'GENERAL_ALERT';

export type NotificationSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type NotificationStatus = 'UNREAD' | 'READ' | 'DISMISSED' | 'ARCHIVED';

export type DeliveryStatus = 'NOT_APPLICABLE' | 'PENDING' | 'SENT' | 'FAILED';

export interface Notification {
  id: string;
  businessId: string;
  userId?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  severity: NotificationSeverity;
  status: NotificationStatus;
  isRead: boolean;
  resourceType?: string | null;
  resourceId?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, any> | null;
  conditionKey?: string | null;
  deliveryStatus: DeliveryStatus;
  deliveredAt?: string | null;
  readAt?: string | null;
  dismissedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
  type?: NotificationType;
  severity?: NotificationSeverity;
  status?: NotificationStatus;
  isRead?: boolean;
  search?: string;
}

export interface ListNotificationsResponse {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

export interface AlertSetting {
  id: string;
  businessId: string;
  lowStockAlertsEnabled: boolean;
  lowStockThresholdDefault: number;
  reorderRemindersEnabled: boolean;
  unusualSalesAlertsEnabled: boolean;
  salesSurgeThresholdPercent: number;
  salesDropThresholdPercent: number;
  salesLookbackDays: number;
  minSalesSampleSize: number;
  emailAlertsEnabled: boolean;
  alertEmail?: string | null;
  smsAlertsEnabled: boolean;
  alertPhoneNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAlertSettingInput {
  lowStockAlertsEnabled?: boolean;
  lowStockThresholdDefault?: number;
  reorderRemindersEnabled?: boolean;
  unusualSalesAlertsEnabled?: boolean;
  salesSurgeThresholdPercent?: number;
  salesDropThresholdPercent?: number;
  salesLookbackDays?: number;
  minSalesSampleSize?: number;
  emailAlertsEnabled?: boolean;
  alertEmail?: string | null;
  smsAlertsEnabled?: boolean;
  alertPhoneNumber?: string | null;
}
