import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../api/notification.js';
import type { Notification, NotificationSeverity } from '../../types/notification.js';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getSeverityIcon(severity: NotificationSeverity) {
  switch (severity) {
    case 'CRITICAL':
      return <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />;
    case 'WARNING':
      return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
    case 'INFO':
    default:
      return <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />;
  }
}

export default function NotificationBellDropdown() {
  const { activeBusiness } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const businessId = activeBusiness?.id;

  // Load unread count periodically or on business change
  const loadUnreadCount = async () => {
    if (!businessId) return;
    try {
      const count = await fetchUnreadCount(businessId);
      setUnreadCount(count);
    } catch {
      // Quietly ignore network/auth errors in background poll
    }
  };

  useEffect(() => {
    loadUnreadCount();
    const timer = setInterval(loadUnreadCount, 30000); // 30-sec polling
    return () => clearInterval(timer);
  }, [businessId]);

  // Load recent preview notifications when dropdown opens
  useEffect(() => {
    if (!isOpen || !businessId) return;

    let isMounted = true;
    setIsLoading(true);

    fetchNotifications(businessId, { page: 1, limit: 5 })
      .then((data) => {
        if (isMounted) {
          setRecentNotifications(data.items);
          setUnreadCount(data.unreadCount);
        }
      })
      .catch((err) => {
        console.error('Error loading recent notifications:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, businessId]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    if (!businessId || isMarkingAll) return;
    try {
      setIsMarkingAll(true);
      await markAllNotificationsRead(businessId);
      setUnreadCount(0);
      setRecentNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, status: 'READ' }))
      );
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleItemClick = async (notif: Notification) => {
    if (!businessId) return;

    // Mark as read if unread
    if (!notif.isRead) {
      try {
        await markNotificationRead(businessId, notif.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setRecentNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true, status: 'READ' } : n))
        );
      } catch {
        // Continue navigation even if read sync fails
      }
    }

    setIsOpen(false);

    if (notif.actionUrl) {
      navigate(notif.actionUrl);
    } else {
      navigate('/notifications');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition relative focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-label="Notifications"
        title={unreadCount > 0 ? `${unreadCount} unread notification(s)` : 'Notifications'}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-600 rounded-full ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1 transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List or Loading or Empty State */}
          <div className="max-h-84 overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading alerts...</div>
            ) : recentNotifications.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">All clear</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No active stock or business alerts at the moment.
                </p>
              </div>
            ) : (
              recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`px-4 py-3 cursor-pointer transition hover:bg-slate-50 flex items-start gap-3 text-left ${
                    !notif.isRead ? 'bg-amber-50/30' : ''
                  }`}
                >
                  <div className="mt-0.5">{getSeverityIcon(notif.severity)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-xs truncate ${
                          !notif.isRead
                            ? 'font-semibold text-slate-900'
                            : 'font-medium text-slate-700'
                        }`}
                      >
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                      {notif.message}
                    </p>
                    {notif.actionUrl && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 mt-1 hover:underline">
                        Review details <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-white border border-transparent hover:border-slate-200 transition flex items-center justify-center gap-1.5"
            >
              <span>View all notifications & settings</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
