import { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Bell,
  TrendingUp,
  Mail,
  Smartphone,
  Info,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { fetchAlertSettings, updateAlertSettings } from '../../api/notification.js';
import type { UpdateAlertSettingInput } from '../../types/notification.js';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function NotificationSettingsModal({
  isOpen,
  onClose,
  onSaved,
}: NotificationSettingsModalProps) {
  const { activeBusiness } = useAuth();
  const businessId = activeBusiness?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [settings, setSettings] = useState<UpdateAlertSettingInput>({
    lowStockAlertsEnabled: true,
    lowStockThresholdDefault: 5,
    reorderRemindersEnabled: true,
    unusualSalesAlertsEnabled: true,
    salesSurgeThresholdPercent: 50,
    salesDropThresholdPercent: 50,
    salesLookbackDays: 30,
    minSalesSampleSize: 5,
    emailAlertsEnabled: false,
    alertEmail: '',
    smsAlertsEnabled: false,
    alertPhoneNumber: '',
  });

  useEffect(() => {
    if (!isOpen || !businessId) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    fetchAlertSettings(businessId)
      .then((data) => {
        setSettings({
          lowStockAlertsEnabled: data.lowStockAlertsEnabled,
          lowStockThresholdDefault: data.lowStockThresholdDefault,
          reorderRemindersEnabled: data.reorderRemindersEnabled,
          unusualSalesAlertsEnabled: data.unusualSalesAlertsEnabled,
          salesSurgeThresholdPercent: data.salesSurgeThresholdPercent,
          salesDropThresholdPercent: data.salesDropThresholdPercent,
          salesLookbackDays: data.salesLookbackDays,
          minSalesSampleSize: data.minSalesSampleSize,
          emailAlertsEnabled: data.emailAlertsEnabled,
          alertEmail: data.alertEmail || '',
          smsAlertsEnabled: data.smsAlertsEnabled,
          alertPhoneNumber: data.alertPhoneNumber || '',
        });
      })
      .catch((err) => {
        console.error('Error fetching alert settings:', err);
        setError('Failed to load settings. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [isOpen, businessId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await updateAlertSettings(businessId, {
        ...settings,
        lowStockThresholdDefault: Number(settings.lowStockThresholdDefault) || 5,
        salesSurgeThresholdPercent: Number(settings.salesSurgeThresholdPercent) || 50,
        salesDropThresholdPercent: Number(settings.salesDropThresholdPercent) || 50,
        salesLookbackDays: Number(settings.salesLookbackDays) || 30,
        minSalesSampleSize: Number(settings.minSalesSampleSize) || 5,
        alertEmail: settings.alertEmail?.trim() || null,
        alertPhoneNumber: settings.alertPhoneNumber?.trim() || null,
      });

      setSuccessMsg('Alert settings updated successfully.');
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Error saving alert settings:', err);
      setError(err?.message || 'Failed to update alert settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Alert & Notification Rules</h2>
              <p className="text-xs text-slate-500">
                Configure threshold triggers and delivery preferences for {activeBusiness?.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading settings...</div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Section 1: Low-Stock Alerts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-emerald-600" />
                    Low-Stock Alerts
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Flag products whose inventory balance reaches or drops below minimum threshold
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.lowStockAlertsEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, lowStockAlertsEnabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {settings.lowStockAlertsEnabled && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 space-y-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Default Fallback Threshold (Units)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Used for products that don't specify their own custom minimum threshold.
                  </p>
                  <input
                    type="number"
                    min="0"
                    value={settings.lowStockThresholdDefault}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        lowStockThresholdDefault: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full max-w-xs px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* Section 2: Reorder Reminders */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Intelligent Reorder Reminders
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Evaluate reorder points based on daily sales velocity, safety stock, and open purchase orders
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.reorderRemindersEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, reorderRemindersEnabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 3: Unusual Sales Activity */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    Unusual Sales Activity Detection
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Flag sudden sales spikes or unexpected drops compared to historical 30-day baseline
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.unusualSalesAlertsEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, unusualSalesAlertsEnabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {settings.unusualSalesAlertsEnabled && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Demand Surge Threshold (%)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      value={settings.salesSurgeThresholdPercent}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          salesSurgeThresholdPercent: parseInt(e.target.value) || 50,
                        })
                      }
                      className="mt-1 w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      e.g., 50% above baseline
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Sales Slowdown Threshold (%)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={settings.salesDropThresholdPercent}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          salesDropThresholdPercent: parseInt(e.target.value) || 50,
                        })
                      }
                      className="mt-1 w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      e.g., 50% drop vs baseline
                    </span>
                  </div>
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* Section 4: External Delivery Channels */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-800">External Notifications (Optional)</h3>

              <div className="p-3 bg-amber-50/70 border border-amber-200 text-amber-800 text-[11px] rounded-xl flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  All notifications always appear in-app. External Email/SMS delivery requires server credentials (e.g. SMTP or Africa's Talking) configured in the server environment.
                </span>
              </div>

              {/* Email channel */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-medium text-slate-700">Email Alerts</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.emailAlertsEnabled}
                      onChange={(e) =>
                        setSettings({ ...settings, emailAlertsEnabled: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
                {settings.emailAlertsEnabled && (
                  <input
                    type="email"
                    placeholder="shop-owner@example.com"
                    value={settings.alertEmail || ''}
                    onChange={(e) => setSettings({ ...settings, alertEmail: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                )}
              </div>

              {/* SMS channel */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-medium text-slate-700">SMS Alerts</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.smsAlertsEnabled}
                      onChange={(e) =>
                        setSettings({ ...settings, smsAlertsEnabled: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
                {settings.smsAlertsEnabled && (
                  <input
                    type="tel"
                    placeholder="+254712345678"
                    value={settings.alertPhoneNumber || ''}
                    onChange={(e) => setSettings({ ...settings, alertPhoneNumber: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
