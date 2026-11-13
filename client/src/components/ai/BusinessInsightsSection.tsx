import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../api/client';
import { Link } from 'react-router-dom';
import {
  Lightbulb,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  DollarSign,
  Package,
  ArrowRight,
  Percent,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import type { InsightsResult, InsightType } from '../../types/ai';

interface BusinessInsightsSectionProps {
  currency: string;
}

export default function BusinessInsightsSection({ currency }: BusinessInsightsSectionProps) {
  const { activeBusiness } = useAuth();
  const [data, setData] = useState<InsightsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<InsightType | 'ALL' | 'HIGH_SEVERITY'>('ALL');

  const loadInsights = async () => {
    if (!activeBusiness) return;
    setLoading(true);
    setError(null);
    try {
      const json = await apiFetch<{ success: boolean; data: InsightsResult }>(
        `/api/v1/businesses/${activeBusiness.id}/ai/insights`
      );
      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load business insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, [activeBusiness]);

  const filteredInsights = (data?.insights || []).filter((i) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'HIGH_SEVERITY') return i.severity === 'HIGH';
    return i.type === filterType;
  });

  const getInsightTypeIcon = (type: InsightType) => {
    switch (type) {
      case 'DEAD_STOCK':
        return <Package className="w-4 h-4 text-rose-600" />;
      case 'DEMAND_SURGE':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'DECLINING_SALES':
        return <TrendingUp className="w-4 h-4 text-slate-500 rotate-180" />;
      case 'STOCKOUT_RISK':
        return <AlertOctagon className="w-4 h-4 text-amber-600" />;
      case 'TOP_PROFIT_DRIVER':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'LOW_MARGIN_WARNING':
        return <Percent className="w-4 h-4 text-amber-600" />;
    }
  };

  const getActionLink = (type: InsightType) => {
    switch (type) {
      case 'DEAD_STOCK':
      case 'DECLINING_SALES':
        return { label: 'Manage Inventory', path: '/inventory' };
      case 'STOCKOUT_RISK':
      case 'DEMAND_SURGE':
        return { label: 'Replenish in Purchases', path: '/purchases' };
      case 'LOW_MARGIN_WARNING':
      case 'TOP_PROFIT_DRIVER':
        return { label: 'Review Products', path: '/products' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Actionable Business Intelligence & Diagnostics
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated health checks evaluating dead stock, margin degradation, demand surges, and capital efficiency.
          </p>
        </div>

        <button
          onClick={loadInsights}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-medium text-slate-500">Total Insights</span>
            <div className="mt-1 text-xl font-bold text-slate-900">{data.summary.totalInsights}</div>
            <span className="text-[10px] text-slate-400">Identified diagnostics</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5" />
              High Priority
            </span>
            <div className="mt-1 text-xl font-bold text-rose-700">{data.summary.highSeverityCount}</div>
            <span className="text-[10px] text-rose-500">Urgent action recommended</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-medium text-slate-500">Dead Stock Capital</span>
            <div className="mt-1 text-xl font-bold text-slate-900">
              {currency} {data.summary.deadStockCapitalTiedUp.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400">Tied up in 60d+ idle stock</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-medium text-amber-600">Stockouts / Imminent</span>
            <div className="mt-1 text-xl font-bold text-amber-700">{data.summary.imminentStockoutsCount}</div>
            <span className="text-[10px] text-amber-500">&le; 3 days coverage remaining</span>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-white p-3 rounded-xl border border-slate-200">
        {[
          { id: 'ALL', label: 'All Insights' },
          { id: 'HIGH_SEVERITY', label: 'High Priority' },
          { id: 'DEAD_STOCK', label: 'Dead Stock' },
          { id: 'STOCKOUT_RISK', label: 'Stockout Risks' },
          { id: 'DEMAND_SURGE', label: 'Demand Surges' },
          { id: 'LOW_MARGIN_WARNING', label: 'Low Margins' },
          { id: 'TOP_PROFIT_DRIVER', label: 'Profit Drivers' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filterType === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Feed */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-xl border border-slate-200">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-600">Scanning inventory turnover and margins...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredInsights.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-900">No issues found in this category!</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Your store inventory is performing smoothly with healthy turnover and no critical risks detected in this filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInsights.map((insight) => {
            const severityBadge =
              insight.severity === 'HIGH'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : insight.severity === 'MEDIUM'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : insight.severity === 'LOW'
                ? 'bg-slate-100 text-slate-700 border-slate-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200';

            const action = getActionLink(insight.type);

            return (
              <div
                key={insight.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                        {getInsightTypeIcon(insight.type)}
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        {insight.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${severityBadge}`}
                    >
                      {insight.severity}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{insight.title}</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {insight.description}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Diagnostic Evidence
                    </span>
                    <span className="text-xs font-semibold text-slate-800">
                      {insight.evidence}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                      Recommended Action
                    </span>
                    <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
                      {insight.recommendedAction}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {new Date(insight.createdAt).toLocaleDateString()}
                  </span>

                  <Link
                    to={action.path}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
                  >
                    <span>{action.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
