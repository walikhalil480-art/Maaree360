import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../api/client';
import {
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  CheckCircle,
} from 'lucide-react';
import type { ForecastData } from '../../types/ai';

interface SalesForecastSectionProps {
  currency: string;
}

export default function SalesForecastSection({ currency }: SalesForecastSectionProps) {
  const { activeBusiness } = useAuth();
  const [horizonDays, setHorizonDays] = useState<7 | 30>(30);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!activeBusiness) return;

    async function loadForecast() {
      setLoading(true);
      setError(null);
      try {
        const json = await apiFetch<{ success: boolean; data: ForecastData }>(
          `/api/v1/businesses/${activeBusiness?.id}/ai/forecast?horizonDays=${horizonDays}`
        );
        setForecast(json.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load sales forecast.');
      } finally {
        setLoading(false);
      }
    }

    loadForecast();
  }, [activeBusiness, horizonDays]);

  const filteredProducts = (forecast?.topProductsForecast || []).filter(
    (p) =>
      p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Find maximum projected revenue for chart scaling
  const maxDailyRevenue = Math.max(
    ...(forecast?.dailyForecast.map((d) => d.upperBound) || [1000]),
    100
  );

  return (
    <div className="space-y-6">
      {/* Top Controls & Horizon Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Demand Projection & Sales Trends
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Statistical projection using day-of-week seasonality and 95% confidence intervals.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setHorizonDays(7)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              horizonDays === 7
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7 Days Forecast
          </button>
          <button
            onClick={() => setHorizonDays(30)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              horizonDays === 30
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            30 Days Forecast
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-xl border border-slate-200">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-600">Calculating time-series forecast...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      ) : forecast ? (
        <>
          {/* Data Quality Banner */}
          {!forecast.hasSufficientData ? (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-900">Insufficient Historical Sales Data</p>
                <p className="text-xs text-amber-700 mt-0.5">{forecast.dataQualityNote}</p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{forecast.dataQualityNote}</span>
            </div>
          )}

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Projected Revenue</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-900">
                  {currency} {forecast.projectedRevenue.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs">
                {forecast.projectedGrowthRate >= 0 ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                    <ArrowUpRight className="w-3.5 h-3.5" />+{forecast.projectedGrowthRate}%
                  </span>
                ) : (
                  <span className="text-rose-700 font-semibold flex items-center gap-0.5">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    {forecast.projectedGrowthRate}%
                  </span>
                )}
                <span className="text-slate-400">vs past {horizonDays}d actual</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Past {horizonDays}d Actual</span>
              <div className="mt-1">
                <span className="text-xl font-bold text-slate-900">
                  {currency} {forecast.historicalPeriodRevenue.toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">Verified historical baseline</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Avg. Daily Demand</span>
              <div className="mt-1">
                <span className="text-xl font-bold text-slate-900">
                  {currency} {forecast.historicalDailyAvg.toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">Baseline daily velocity</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Forecast Horizon</span>
              <div className="mt-1">
                <span className="text-xl font-bold text-emerald-600">
                  {forecast.horizonDays} Days Ahead
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">With 95% confidence bounds</p>
            </div>
          </div>

          {/* Daily Demand Projection Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Daily Demand Projection & Bounds
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hover over bars to inspect expected revenue and 95% confidence interval range.
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-emerald-600 rounded" />
                  <span>Projected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded" />
                  <span>Confidence Range</span>
                </div>
              </div>
            </div>

            {/* Daily Bars Visualizer */}
            <div className="pt-6 pb-2 overflow-x-auto">
              <div
                className="flex items-end gap-2 min-w-[600px] h-48 border-b border-slate-200 pb-2"
                style={{ height: '200px' }}
              >
                {forecast.dailyForecast.map((point, idx) => {
                  const heightPercent = Math.min(
                    100,
                    Math.max(8, (point.projectedRevenue / maxDailyRevenue) * 100)
                  );
                  const boundRangePercent = Math.min(
                    100,
                    Math.max(12, (point.upperBound / maxDailyRevenue) * 100)
                  );

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                        <div className="bg-slate-900 text-white text-[11px] rounded-lg py-1.5 px-2.5 shadow-lg whitespace-nowrap">
                          <p className="font-semibold">{point.date} ({point.dayOfWeek})</p>
                          <p className="text-emerald-400">
                            Expected: {currency} {point.projectedRevenue.toLocaleString()}
                          </p>
                          <p className="text-slate-400 text-[10px]">
                            Range: {currency} {point.lowerBound.toLocaleString()} - {point.upperBound.toLocaleString()}
                          </p>
                        </div>
                        <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                      </div>

                      {/* Upper Bound Shadow / Background Bar */}
                      <div
                        className="w-full bg-emerald-50 rounded-t border-t border-emerald-200 transition-all group-hover:bg-emerald-100 flex items-end justify-center"
                        style={{ height: `${boundRangePercent}%` }}
                      >
                        {/* Projected Revenue Core Bar */}
                        <div
                          className="w-full bg-emerald-600 group-hover:bg-emerald-700 rounded-t transition-all"
                          style={{ height: `${(heightPercent / boundRangePercent) * 100}%` }}
                        />
                      </div>

                      <div className="mt-2 text-[10px] text-slate-500 font-medium truncate w-full text-center">
                        {point.dayOfWeek}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate w-full text-center">
                        {point.date.slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Product-Level Forecast & Stockout Risk Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Product Demand Velocity & Stockout Risk
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Top fast-moving products evaluated for demand and days of stock remaining.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search products or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Product / SKU</th>
                    <th className="py-3 px-4 text-right">Current Stock</th>
                    <th className="py-3 px-4 text-right">Daily Velocity</th>
                    <th className="py-3 px-4 text-right">Projected Demand</th>
                    <th className="py-3 px-4 text-right">Projected Value</th>
                    <th className="py-3 px-4 text-center">Days Remaining</th>
                    <th className="py-3 px-4 text-center">Stockout Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No product forecasts matched your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const riskColor =
                        p.stockoutRisk === 'HIGH'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : p.stockoutRisk === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                      return (
                        <tr key={p.productId} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900 block">{p.productName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-800">
                            {p.currentStock}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600">
                            {p.dailyVelocity.toFixed(1)} u/day
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-900">
                            {p.projectedUnits} units
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                            {currency} {p.projectedRevenue.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {p.daysOfStockRemaining !== null ? (
                              <span
                                className={`font-semibold ${
                                  p.daysOfStockRemaining <= 3
                                    ? 'text-rose-600'
                                    : p.daysOfStockRemaining <= 7
                                    ? 'text-amber-600'
                                    : 'text-slate-700'
                                }`}
                              >
                                {p.daysOfStockRemaining} days
                              </span>
                            ) : (
                              <span className="text-slate-400">N/A</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${riskColor}`}
                            >
                              {p.stockoutRisk}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
