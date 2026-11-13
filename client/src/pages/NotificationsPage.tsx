import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Check,
  Sliders,
  RefreshCw,
  Search,
  AlertTriangle,
  AlertCircle,
  Info,
  Archive,
  EyeOff,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Package,
  Truck,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
  archiveNotification,
  reconcileAlerts,
} from '../api/notification.js';
import type {
  Notification,
  NotificationType,
  NotificationSeverity,
  NotificationStatus,
} from '../types/notification.js';
import NotificationSettingsModal from '../components/notifications/NotificationSettingsModal.js';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NotificationsPage() {
  const { activeBusiness } = useAuth();
  const navigate = useNavigate();
  const businessId = activeBusiness?.id;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREAD' | 'READ' | 'DISMISSED' | 'ARCHIVED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | NotificationType>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | NotificationSeverity>('ALL');
  const [search, setSearch] = useState('');

  const loadNotifications = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const data = await fetchNotifications(businessId, {
        page,
        limit: 15,
        status: statusFilter === 'ALL' ? undefined : (statusFilter as NotificationStatus),
        type: typeFilter === 'ALL' ? undefined : typeFilter,
        severity: severityFilter === 'ALL' ? undefined : severityFilter,
        search: search.trim() || undefined,
      });

      setNotifications(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId, page, statusFilter, typeFilter, severityFilter, search]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    if (!businessId) return;
    try {
      await markNotificationRead(businessId, id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, status: 'READ' } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleDismiss = async (id: string) => {
    if (!businessId) return;
    try {
      await dismissNotification(businessId, id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'DISMISSED' } : n))
      );
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  const handleArchive = async (id: string) => {
    if (!businessId) return;
    try {
      await archiveNotification(businessId, id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'ARCHIVED' } : n))
      );
    } catch (err) {
      console.error('Failed to archive notification:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!businessId) return;
    try {
      const res = await markAllNotificationsRead(businessId);
      setActionMessage(`Marked ${res.markedCount} notifications as read.`);
      loadNotifications();
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleReconcile = async () => {
    if (!businessId || reconciling) return;
    try {
      setReconciling(true);
      const res = await reconcileAlerts(businessId);
      setActionMessage(
        `Catalog reconciled successfully. Checked ${res.productsEvaluated} active products.`
      );
      loadNotifications();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error('Failed to reconcile alerts:', err);
    } finally {
      setReconciling(false);
    }
  };

  const getSeverityBadge = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3" /> Critical
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3" /> Warning
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Info className="w-3 h-3" /> Advisory
          </span>
        );
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'LOW_STOCK':
        return <Package className="w-4 h-4 text-rose-500" />;
      case 'REORDER_REMINDER':
        return <Truck className="w-4 h-4 text-emerald-600" />;
      case 'UNUSUAL_SALES':
        return <TrendingUp className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Notifications & Business Alerts
              </h1>
              <p className="text-xs text-slate-500">
                Authoritative event indicators, stockout alerts, and restocking recommendations
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition flex items-center gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleReconcile}
            disabled={reconciling}
            title="Scan whole catalog and recalculate stock alert conditions"
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{reconciling ? 'Reconciling...' : 'Reconcile Catalog'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Alert Rules</span>
          </button>
        </div>
      </div>

      {/* Action Toast / Feedback message */}
      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        {/* Top Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-100 text-xs">
          {(
            [
              { key: 'ALL', label: 'All Alerts' },
              { key: 'UNREAD', label: `Unread (${unreadCount})` },
              { key: 'READ', label: 'Read' },
              { key: 'DISMISSED', label: 'Dismissed' },
              { key: 'ARCHIVED', label: 'Archived / Auto-Resolved' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                statusFilter === tab.key
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Secondary Filters row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search alerts by title or description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
            >
              <option value="ALL">All Alert Types</option>
              <option value="LOW_STOCK">Low Stock & Stockouts</option>
              <option value="REORDER_REMINDER">Reorder Reminders (ROP)</option>
              <option value="UNUSUAL_SALES">Unusual Sales Velocity</option>
              <option value="PAYMENT_ISSUE">Payment Issues</option>
              <option value="GENERAL_ALERT">General Alerts</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Advisory / Info</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading alerts...</div>
        ) : notifications.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No alerts found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              There are no notifications matching your current filter criteria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 sm:p-5 transition hover:bg-slate-50/70 flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                  !notif.isRead ? 'bg-amber-50/20' : ''
                }`}
              >
                {/* Left side: Icon, Badges, Title, Message, Metadata */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="p-2 rounded-xl bg-slate-100 flex-shrink-0 mt-0.5">
                    {getTypeIcon(notif.type)}
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {getSeverityBadge(notif.severity)}
                      <span className="text-[11px] font-medium text-slate-500">
                        {notif.type.replace('_', ' ')}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-400">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                      {!notif.isRead && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                          NEW
                        </span>
                      )}
                      {notif.status === 'ARCHIVED' && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                          Auto-Resolved
                        </span>
                      )}
                    </div>

                    <h2 className="text-sm font-semibold text-slate-900 leading-snug">
                      {notif.title}
                    </h2>

                    <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>

                    {/* Metadata Pill Box if present */}
                    {notif.metadata && Object.keys(notif.metadata).length > 0 && (
                      <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        {notif.metadata.currentStock !== undefined && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200/60 font-mono">
                            Current Stock: {notif.metadata.currentStock} {notif.metadata.unit || ''}
                          </span>
                        )}
                        {notif.metadata.threshold !== undefined && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200/60 font-mono">
                            Min Threshold: {notif.metadata.threshold}
                          </span>
                        )}
                        {notif.metadata.suggestedQuantity !== undefined && (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-medium">
                            Suggested Order: {notif.metadata.suggestedQuantity} units
                          </span>
                        )}
                        {notif.metadata.surgePercent !== undefined && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                            Demand Surge: +{notif.metadata.surgePercent}%
                          </span>
                        )}
                        {notif.metadata.dropPercent !== undefined && (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono">
                            Sales Slowdown: -{notif.metadata.dropPercent}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side: Resource Link & State Buttons */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {notif.actionUrl && (
                    <button
                      type="button"
                      onClick={() => navigate(notif.actionUrl!)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition flex items-center gap-1.5"
                    >
                      <span>Take Action</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}

                  <div className="flex items-center gap-1 text-slate-400">
                    {!notif.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(notif.id)}
                        title="Mark as read"
                        className="p-1.5 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    {notif.status !== 'DISMISSED' && notif.status !== 'ARCHIVED' && (
                      <button
                        type="button"
                        onClick={() => handleDismiss(notif.id)}
                        title="Dismiss alert"
                        className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    )}
                    {notif.status !== 'ARCHIVED' && (
                      <button
                        type="button"
                        onClick={() => handleArchive(notif.id)}
                        title="Archive alert"
                        className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Showing page {page} of {totalPages} ({total} total alerts)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <NotificationSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={loadNotifications}
      />
    </div>
  );
}
