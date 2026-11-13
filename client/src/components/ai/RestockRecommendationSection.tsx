import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../api/client';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  AlertOctagon,
  Clock,
  ExternalLink,
  Search,
  ShieldCheck,
} from 'lucide-react';
import type { RestockSummary, RestockUrgency } from '../../types/ai';

interface RestockRecommendationSectionProps {
  currency: string;
}

export default function RestockRecommendationSection({
  currency,
}: RestockRecommendationSectionProps) {
  const { activeBusiness } = useAuth();
  const [data, setData] = useState<RestockSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<RestockUrgency | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!activeBusiness) return;

    async function loadRestockData() {
      setLoading(true);
      setError(null);
      try {
        const query = selectedUrgency !== 'ALL' ? `?urgency=${selectedUrgency}` : '';
        const json = await apiFetch<{ success: boolean; data: RestockSummary }>(
          `/api/v1/businesses/${activeBusiness?.id}/ai/restock${query}`
        );
        setData(json.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load restocking recommendations.');
      } finally {
        setLoading(false);
      }
    }

    loadRestockData();
  }, [activeBusiness, selectedUrgency]);

  const filteredRecs = (data?.recommendations || []).filter(
    (r) =>
      r.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.categoryName && r.categoryName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Advisory Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wide">
            Dynamic Reorder Point (ROP) Advisory Engine
          </h4>
          <p className="text-xs text-blue-800 mt-0.5 leading-relaxed">
            Reorder points are dynamically calculated using{' '}
            <code className="bg-blue-100 text-blue-900 px-1 py-0.5 rounded font-mono text-[11px]">
              ROP = (Daily Demand × Lead Time) + Safety Stock
            </code>
            . Pending units from active purchase orders are deducted to avoid double-ordering.
            All suggestions are strictly advisory and require your authorization to execute.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-medium text-slate-500">Products Assessed</span>
            <div className="mt-1 text-xl font-bold text-slate-900">{data.totalProductsAssessed}</div>
            <span className="text-[10px] text-slate-400">Active catalog items</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5" />
              Critical Urgent
            </span>
            <div className="mt-1 text-xl font-bold text-rose-700">{data.criticalCount}</div>
            <span className="text-[10px] text-rose-500">Stockout or &le; 2d left</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-medium text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Reorder Warning
            </span>
            <div className="mt-1 text-xl font-bold text-amber-700">{data.warningCount}</div>
            <span className="text-[10px] text-amber-500">Stock &le; ROP</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-medium text-slate-500">Total Units to Order</span>
            <div className="mt-1 text-xl font-bold text-slate-900">
              {data.totalSuggestedUnits.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400">14-day cycle replenishment</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
            <span className="text-[11px] font-medium text-slate-500">Est. Reorder Cost</span>
            <div className="mt-1 text-xl font-bold text-emerald-700">
              {currency} {data.totalEstimatedRestockCost.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400">At wholesale cost prices</span>
          </div>
        </div>
      )}

      {/* Filter Controls & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'CRITICAL', 'WARNING', 'HEALTHY'] as const).map((urgency) => (
            <button
              key={urgency}
              onClick={() => setSelectedUrgency(urgency)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedUrgency === urgency
                  ? urgency === 'CRITICAL'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : urgency === 'WARNING'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : urgency === 'HEALTHY'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {urgency === 'ALL'
                ? 'All Products'
                : urgency === 'CRITICAL'
                ? `Critical (${data?.criticalCount || 0})`
                : urgency === 'WARNING'
                ? `Warning (${data?.warningCount || 0})`
                : `Healthy (${data?.healthyCount || 0})`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by product, SKU, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-xl border border-slate-200">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-600">Assessing inventory lead times & demand...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4 text-center">Urgency</th>
                  <th className="py-3 px-4 text-right">Current Stock</th>
                  <th className="py-3 px-4 text-right">On-Order (PO)</th>
                  <th className="py-3 px-4 text-right">Reorder Point (ROP)</th>
                  <th className="py-3 px-4 text-right">Suggested Order</th>
                  <th className="py-3 px-4 text-right">Est. Cost</th>
                  <th className="py-3 px-4">Supplier & Lead Time</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No products found matching current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRecs.map((rec) => {
                    const urgencyBadge =
                      rec.urgency === 'CRITICAL'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : rec.urgency === 'WARNING'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                    return (
                      <tr key={rec.productId} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 block">{rec.productName}</span>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span className="font-mono">{rec.sku}</span>
                            {rec.categoryName && <span>• {rec.categoryName}</span>}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${urgencyBadge}`}
                          >
                            {rec.urgency}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-semibold ${
                              rec.currentStock === 0
                                ? 'text-rose-600'
                                : rec.currentStock <= rec.minStockThreshold
                                ? 'text-amber-600'
                                : 'text-slate-800'
                            }`}
                          >
                            {rec.currentStock}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            Min: {rec.minStockThreshold}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          {rec.onOrderQuantity > 0 ? (
                            <div>
                              <span className="font-semibold text-blue-600 block">
                                +{rec.onOrderQuantity}
                              </span>
                              <span className="text-[10px] text-blue-500">
                                {rec.activePurchaseOrders.length} PO pending
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span className="font-semibold text-slate-900 block">
                            {rec.reorderPoint}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            SS: {rec.safetyStock} | {rec.dailyDemand.toFixed(1)} u/d
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          {rec.suggestedQuantity > 0 ? (
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              +{rec.suggestedQuantity}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">None needed</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-medium text-slate-800">
                          {rec.estimatedCost > 0 ? (
                            `${currency} ${rec.estimatedCost.toLocaleString()}`
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-slate-800 font-medium truncate max-w-[140px]">
                            {rec.primarySupplier?.name || 'General Supplier'}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>
                              {rec.leadTimeDays}d lead time {rec.isEstimatedLeadTime ? '(est)' : ''}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <Link
                            to="/purchases"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition"
                          >
                            <span>Create PO</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
