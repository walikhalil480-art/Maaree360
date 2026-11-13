import { apiFetch } from './client.js';
import type {
  Notification,
  ListNotificationsParams,
  ListNotificationsResponse,
  AlertSetting,
  UpdateAlertSettingInput,
} from '../types/notification.js';

export async function fetchNotifications(
  businessId: string,
  params: ListNotificationsParams = {}
): Promise<ListNotificationsResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.type) searchParams.set('type', params.type);
  if (params.severity) searchParams.set('severity', params.severity);
  if (params.status) searchParams.set('status', params.status);
  if (params.isRead !== undefined) searchParams.set('isRead', String(params.isRead));
  if (params.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  const url = `/api/v1/businesses/${businessId}/notifications${query ? `?${query}` : ''}`;
  const res = await apiFetch<{ success: boolean; data: ListNotificationsResponse }>(url);
  return res.data;
}

export async function fetchUnreadCount(businessId: string): Promise<number> {
  const res = await apiFetch<{ success: boolean; data: { count: number } }>(
    `/api/v1/businesses/${businessId}/notifications/unread-count`
  );
  return res.data.count;
}

export async function markNotificationRead(
  businessId: string,
  notificationId: string
): Promise<Notification> {
  const res = await apiFetch<{ success: boolean; data: Notification }>(
    `/api/v1/businesses/${businessId}/notifications/${notificationId}/read`,
    { method: 'PATCH' }
  );
  return res.data;
}

export async function markAllNotificationsRead(
  businessId: string
): Promise<{ markedCount: number }> {
  const res = await apiFetch<{ success: boolean; data: { markedCount: number } }>(
    `/api/v1/businesses/${businessId}/notifications/mark-all-read`,
    { method: 'POST' }
  );
  return res.data;
}

export async function dismissNotification(
  businessId: string,
  notificationId: string
): Promise<Notification> {
  const res = await apiFetch<{ success: boolean; data: Notification }>(
    `/api/v1/businesses/${businessId}/notifications/${notificationId}/dismiss`,
    { method: 'PATCH' }
  );
  return res.data;
}

export async function archiveNotification(
  businessId: string,
  notificationId: string
): Promise<Notification> {
  const res = await apiFetch<{ success: boolean; data: Notification }>(
    `/api/v1/businesses/${businessId}/notifications/${notificationId}/archive`,
    { method: 'PATCH' }
  );
  return res.data;
}

export async function fetchAlertSettings(businessId: string): Promise<AlertSetting> {
  const res = await apiFetch<{ success: boolean; data: AlertSetting }>(
    `/api/v1/businesses/${businessId}/notifications/settings`
  );
  return res.data;
}

export async function updateAlertSettings(
  businessId: string,
  input: UpdateAlertSettingInput
): Promise<AlertSetting> {
  const res = await apiFetch<{ success: boolean; data: AlertSetting }>(
    `/api/v1/businesses/${businessId}/notifications/settings`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    }
  );
  return res.data;
}

export async function reconcileAlerts(
  businessId: string
): Promise<{ success: boolean; productsEvaluated: number; reconciledAt: string }> {
  const res = await apiFetch<{
    success: boolean;
    data: { success: boolean; productsEvaluated: number; reconciledAt: string };
  }>(`/api/v1/businesses/${businessId}/notifications/reconcile`, {
    method: 'POST',
  });
  return res.data;
}
