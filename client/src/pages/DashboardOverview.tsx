import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api/client'
import { MetricCard } from '../components/ui/MetricCard'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ProductImage } from '../components/ui/ProductImage'
import type { LowStockResponse, LowStockItem } from '../types/inventory'
import type { ProductListResponse } from '../types/product'
import type { SaleSummaryResponse } from '../types/sale'
import type {
  FinancialSummaryData,
  RevenueTrendsData,
  ProductProfitabilityData,
  ReportPeriod,
} from '../types/report'
import {
  DollarSign,
  AlertTriangle,
  ShoppingCart,
  QrCode,
  Boxes,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Package,
  Calendar,
  Building2,
} from 'lucide-react'

export default function DashboardOverview() {
  const { activeBusiness } = useAuth()
  const businessId = activeBusiness?.id
  const currency = activeBusiness?.currency || 'KES'
  const userRole = activeBusiness?.role || 'CASHIER'
  const isFinancialAuthorized = userRole === 'OWNER' || userRole === 'MANAGER'

  // Selected date-range period
  const [period, setPeriod] = useState<ReportPeriod>('this_month')

  // Core Data States
  const [loading, setLoading] = useState(true)
  const [productCount, setProductCount] = useState<number>(0)
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [saleSummary, setSaleSummary] = useState<SaleSummaryResponse['summary'] | null>(null)
  const [summaryData, setSummaryData] = useState<FinancialSummaryData | null>(null)
  const [trendData, setTrendData] = useState<RevenueTrendsData | null>(null)
  const [topProducts, setTopProducts] = useState<ProductProfitabilityData['items']>([])
  const [inventoryValuation, setInventoryValuation] = useState<number>(0)

  // Chart hover interaction
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null)

  // Currency Formatter
  const formatCurrency = (val: number | undefined | null) => {
    const num = Number(val) || 0
    return `${currency} ${num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Load live database records
  const loadDashboardData = useCallback(async () => {
    if (!businessId) return
    setLoading(true)

    try {
      // 1. Fetch live sales summary (available to all roles)
      const salePromise = apiFetch<SaleSummaryResponse>(
        `/api/v1/businesses/${businessId}/sales/summary`
      ).catch(() => null)

      // 2. Fetch low-stock alert items (with real product imagery)
      const lowStockPromise = apiFetch<LowStockResponse>(
        `/api/v1/businesses/${businessId}/inventory/low-stock`
      ).catch(() => null)

      // 3. Fetch product catalog count
      const prodCountPromise = apiFetch<ProductListResponse>(
        `/api/v1/businesses/${businessId}/products?limit=1`
      ).catch(() => null)

      // 4. Financial & trend analytics (OWNER/MANAGER only)
      let summaryPromise: Promise<{ success: boolean; data: FinancialSummaryData } | null> =
        Promise.resolve(null)
      let trendsPromise: Promise<{ success: boolean; data: RevenueTrendsData } | null> =
        Promise.resolve(null)
      let profitPromise: Promise<{ success: boolean; data: ProductProfitabilityData } | null> =
        Promise.resolve(null)
      let invIntelPromise: Promise<any | null> = Promise.resolve(null)

      if (isFinancialAuthorized) {
        summaryPromise = apiFetch<{ success: boolean; data: FinancialSummaryData }>(
          `/api/v1/businesses/${businessId}/reports/summary?period=${period}`
        ).catch(() => null)

        trendsPromise = apiFetch<{ success: boolean; data: RevenueTrendsData }>(
          `/api/v1/businesses/${businessId}/reports/revenue-trends?period=${period}`
        ).catch(() => null)

        profitPromise = apiFetch<{ success: boolean; data: ProductProfitabilityData }>(
          `/api/v1/businesses/${businessId}/reports/profitability?period=${period}&limit=5`
        ).catch(() => null)

        invIntelPromise = apiFetch<{ success: boolean; data: any }>(
          `/api/v1/businesses/${businessId}/reports/inventory-intelligence?lookbackDays=60&limit=5`
        ).catch(() => null)
      }

      const [saleRes, lowRes, prodRes, summaryRes, trendsRes, profitRes, invIntelRes] =
        await Promise.all([
          salePromise,
          lowStockPromise,
          prodCountPromise,
          summaryPromise,
          trendsPromise,
          profitPromise,
          invIntelPromise,
        ])

      if (saleRes?.success && saleRes.summary) {
        setSaleSummary(saleRes.summary)
      }
      if (lowRes?.success && lowRes.items) {
        setLowStockItems(lowRes.items)
      }
      if (prodRes?.success && prodRes.pagination) {
        setProductCount(prodRes.pagination.total)
      }
      if (summaryRes?.success && summaryRes.data) {
        setSummaryData(summaryRes.data)
      }
      if (trendsRes?.success && trendsRes.data) {
        setTrendData(trendsRes.data)
      }
      if (profitRes?.success && profitRes.data) {
        setTopProducts(profitRes.data.items || [])
      }
      if (invIntelRes?.success && invIntelRes.data?.summary) {
        setInventoryValuation(Number(invIntelRes.data.summary.totalStockValuation) || 0)
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [businessId, period, isFinancialAuthorized])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Period display label
  const periodLabels: Record<ReportPeriod, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    this_week: 'This Week',
    last_week: 'Last Week',
    this_month: 'This Month',
    last_month: 'Last Month',
    this_year: 'This Year',
    custom: 'Custom Range',
  }

  // Chart Calculations
  const chartPoints = trendData?.timeSeries || []
  const maxRevenue = Math.max(...chartPoints.map((p) => p.netRevenue), 1000)

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#E8ECF1]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#172033] m-0">
              Dashboard
            </h1>
            {activeBusiness?.name && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white text-[#172033] border border-[#E8ECF1] shadow-2xs">
                <Building2 className="w-3.5 h-3.5 text-[#697586]" />
                <span className="truncate max-w-[160px]">{activeBusiness.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Header Controls: Date Range Filter + Primary Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Reporting Period Filter */}
          {isFinancialAuthorized && (
            <div className="inline-flex items-center rounded-lg border border-[#E8ECF1] bg-white p-0.5 shadow-2xs">
              {(['today', 'this_week', 'this_month', 'this_year'] as ReportPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors select-none ${
                    period === p
                      ? 'bg-[#101A2D] text-white font-semibold shadow-2xs'
                      : 'text-[#697586] hover:text-[#172033] hover:bg-[#F7F8FA]'
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          )}

          {/* Secondary Action: Scan Product */}
          <Link to="/barcodes">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<QrCode className="w-3.5 h-3.5 text-[#697586]" />}
              className="border-[#E8ECF1] hover:border-slate-300 text-[#172033]"
            >
              Scan
            </Button>
          </Link>

          {/* Primary Action: New Sale */}
          <Link to="/sales">
            <Button
              size="sm"
              variant="primary"
              leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}
              className="bg-[#059669] hover:bg-[#047857] text-white shadow-xs font-semibold px-4"
            >
              New Sale
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Key Performance Indicators (4 Compact, Aligned KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Sales Today */}
        <Link to="/sales/history" className="block focus:outline-none">
          <MetricCard
            title="Sales Today"
            value={loading ? '...' : formatCurrency(saleSummary?.todaySalesValue || 0)}
            icon={<DollarSign className="w-4 h-4 text-[#059669]" />}
            subtitle={`${saleSummary?.todayTransactionsCount || 0} completed order(s)`}
          />
        </Link>

        {/* KPI 2: Gross Profit */}
        <Link to="/reports" className="block focus:outline-none">
          <MetricCard
            title="Gross Profit"
            value={
              loading
                ? '...'
                : isFinancialAuthorized
                ? formatCurrency(summaryData?.metrics.grossProfit || 0)
                : 'Role Restricted'
            }
            icon={<TrendingUp className="w-4 h-4 text-[#059669]" />}
            subtitle={
              isFinancialAuthorized && summaryData
                ? `${summaryData.metrics.grossMarginPercent}% margin (${periodLabels[period]})`
                : 'Manager/Owner view'
            }
            trend={
              isFinancialAuthorized && summaryData?.comparisons.grossProfit && summaryData.comparisons.grossProfit.delta !== 0
                ? {
                    value: `${Math.abs(summaryData.comparisons.grossProfit.percent)}%`,
                    isPositive: summaryData.comparisons.grossProfit.delta >= 0,
                    label: 'vs prior',
                  }
                : undefined
            }
          />
        </Link>

        {/* KPI 3: Inventory Value */}
        <Link to="/inventory" className="block focus:outline-none">
          <MetricCard
            title="Inventory Value"
            value={
              loading
                ? '...'
                : isFinancialAuthorized
                ? formatCurrency(inventoryValuation)
                : `${productCount.toLocaleString()} SKUs`
            }
            icon={<Boxes className="w-4 h-4 text-[#697586]" />}
            subtitle={`${productCount.toLocaleString()} tracked products`}
          />
        </Link>

        {/* KPI 4: Low-Stock Items */}
        <Link to="/inventory" className="block focus:outline-none">
          <MetricCard
            title="Low-Stock Items"
            value={loading ? '...' : lowStockItems.length.toString()}
            icon={<AlertTriangle className="w-4 h-4 text-[#D97706]" />}
            subtitle={lowStockItems.length > 0 ? `${lowStockItems.length} require reorder` : 'All items optimal'}
            statusBadge={
              lowStockItems.length > 0
                ? {
                    text: 'Requires Reorder',
                    variant: 'warning',
                  }
                : undefined
            }
          />
        </Link>
      </div>

      {/* 3. Main Dashboard Layout Grid (2 Columns on Large Screens) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Sales Performance Chart, Recent Transactions, Financial Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sales Performance Chart */}
          {/* Sales Performance Chart */}
          <Card>
            <CardHeader
              title="Sales Performance"
              subtitle={`Net revenue for ${periodLabels[period].toLowerCase()}`}
              badge={
                trendData?.totals?.netRevenue !== undefined && trendData.totals.netRevenue > 0 ? (
                  <span className="text-xs font-semibold font-tabular text-[#059669] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                    Total: {formatCurrency(trendData.totals.netRevenue)}
                  </span>
                ) : undefined
              }
              action={
                <Link
                  to="/reports"
                  className="text-xs font-semibold text-[#059669] hover:underline inline-flex items-center gap-1"
                >
                  <span>Analytics</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
            />
            <CardContent>
              {chartPoints.length === 0 ? (
                <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
                  <div className="w-8 h-8 rounded-lg bg-[#F7F8FA] border border-[#E8ECF1] flex items-center justify-center text-[#697586] mb-2.5">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-semibold text-[#172033] m-0">
                    No sales recorded for {periodLabels[period].toLowerCase()}
                  </p>
                  <p className="text-[11px] text-[#697586] mt-0.5 max-w-sm m-0">
                    Transactions completed at the register will automatically chart here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Interactive SVG Bar Chart */}
                  <div className="relative h-52 w-full pt-2">
                    {/* Y-Axis Guidelines & Labels */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] font-mono text-[#9AA4B2]">
                      <div className="border-b border-[#F1F3F6] pb-0.5">
                        {formatCurrency(maxRevenue)}
                      </div>
                      <div className="border-b border-dashed border-[#F1F3F6] pb-0.5">
                        {formatCurrency(maxRevenue * 0.5)}
                      </div>
                      <div className="border-b border-[#F1F3F6] pb-0.5">KES 0.00</div>
                    </div>

                    {/* Chart Bars */}
                    <div className="relative h-full flex items-end justify-between gap-1 sm:gap-2 px-10 pb-6 pt-2 z-10">
                      {chartPoints.map((point, idx) => {
                        const heightPct = Math.min(
                          100,
                          Math.max(4, (point.netRevenue / maxRevenue) * 100)
                        )
                        const isHovered = hoveredPointIndex === idx

                        return (
                          <div
                            key={point.date || idx}
                            className="flex-1 h-full flex flex-col items-center justify-end relative group cursor-pointer"
                            onMouseEnter={() => setHoveredPointIndex(idx)}
                            onMouseLeave={() => setHoveredPointIndex(null)}
                          >
                            {/* Hover Tooltip */}
                            {isHovered && (
                              <div className="absolute bottom-full mb-2 z-30 bg-[#101A2D] text-white text-[11px] rounded-lg p-2.5 shadow-lg pointer-events-none whitespace-nowrap -translate-x-1/2 left-1/2 border border-[#19243B] animate-in fade-in duration-100">
                                <div className="font-semibold text-slate-300">
                                  {point.label || point.date}
                                </div>
                                <div className="font-bold text-white text-xs mt-0.5 font-tabular">
                                  {formatCurrency(point.netRevenue)}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {point.transactionCount} order(s) &bull; {point.unitsSold} unit(s)
                                </div>
                              </div>
                            )}

                            {/* Bar Graphic */}
                            <div
                              style={{ height: `${heightPct}%` }}
                              className={`w-full max-w-[28px] rounded-t transition-all duration-150 ${
                                isHovered
                                  ? 'bg-[#047857] shadow-2xs ring-2 ring-[#059669]/30'
                                  : point.netRevenue > 0
                                  ? 'bg-[#059669]'
                                  : 'bg-slate-200/80'
                              }`}
                            />

                            {/* X-Axis Date Label */}
                            <span className="absolute top-full mt-1.5 text-[10px] text-[#697586] font-mono truncate max-w-full">
                              {point.label || point.date.slice(5)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader
              title="Recent Transactions"
              subtitle="Latest checkout transactions from the cash register"
              action={
                <Link
                  to="/sales/history"
                  className="text-xs font-semibold text-[#059669] hover:underline inline-flex items-center gap-1"
                >
                  <span>View All Sales</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
            />
            <CardContent className="p-0">
              {!saleSummary?.recentSales || saleSummary.recentSales.length === 0 ? (
                <EmptyState
                  icon={<ShoppingCart className="w-5 h-5 text-[#697586]" />}
                  title="No sales recorded yet"
                  description="Completed sales will appear here once your first transaction is processed."
                  action={
                    <Link to="/sales">
                      <Button size="sm" variant="primary" leftIcon={<ShoppingCart className="w-4 h-4" />}>
                        Open Point of Sale
                      </Button>
                    </Link>
                  }
                  className="border-0 rounded-none bg-transparent py-8"
                />
              ) : (
                <div className="divide-y divide-[#F1F3F6]">
                  {saleSummary.recentSales.slice(0, 5).map((sale) => (
                    <div
                      key={sale.id}
                      className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-[#F7F8FA] transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#F7F8FA] border border-[#E8ECF1] text-[#059669] flex items-center justify-center shrink-0">
                          <ShoppingCart className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-medium text-[#172033] truncate">
                              {sale.receiptNumber}
                            </span>
                            <Badge variant="neutral" size="xs">
                              {sale.paymentMethod.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-[#697586] mt-0.5 truncate m-0">
                            Cashier: {sale.cashierName} &bull; {sale.itemsCount}{' '}
                            {sale.itemsCount === 1 ? 'item' : 'items'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-3">
                        <span className="text-xs sm:text-sm font-semibold font-tabular text-[#172033] block">
                          {formatCurrency(Number(sale.total))}
                        </span>
                        <span className="text-[11px] text-[#697586] font-tabular">
                          {new Date(sale.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Summary */}
          {isFinancialAuthorized && summaryData && (
            <Card>
              <CardHeader
                title="Financial Summary"
                subtitle={`Performance metrics for ${summaryData.periodLabel || periodLabels[period]}`}
                action={
                  <Link
                    to="/reports"
                    className="text-xs font-semibold text-[#059669] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Full P&L Report</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                }
              />
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#FAFBFD] border border-[#E8ECF1]">
                    <span className="text-[#697586] text-[11px] font-medium block">
                      Net Sales
                    </span>
                    <span className="font-semibold text-sm font-tabular text-[#172033] block mt-1">
                      {formatCurrency(summaryData.metrics.netRevenue)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {summaryData.metrics.transactionCount} order(s)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAFBFD] border border-[#E8ECF1]">
                    <span className="text-[#697586] text-[11px] font-medium block">
                      Cost of Goods (COGS)
                    </span>
                    <span className="font-semibold text-sm font-tabular text-[#172033] block mt-1">
                      {formatCurrency(summaryData.metrics.cogs)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Product unit costs</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAFBFD] border border-[#E8ECF1]">
                    <span className="text-[#697586] text-[11px] font-medium block">
                      Gross Profit
                    </span>
                    <span className="font-semibold text-sm font-tabular text-[#059669] block mt-1">
                      {formatCurrency(summaryData.metrics.grossProfit)}
                    </span>
                    <span className="text-[10px] text-[#059669] font-medium block mt-0.5">
                      {summaryData.metrics.grossMarginPercent}% margin
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAFBFD] border border-[#E8ECF1]">
                    <span className="text-[#697586] text-[11px] font-medium block">
                      Store Overhead
                    </span>
                    <span className="font-semibold text-sm font-tabular text-[#D97706] block mt-1">
                      {formatCurrency(summaryData.metrics.operatingExpenses)}
                    </span>
                    <span className="text-[10px] text-[#D97706] font-medium block mt-0.5">
                      Operating expenses
                    </span>
                  </div>
                </div>

                {/* Net Operating Profit Banner */}
                <div
                  className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    summaryData.metrics.operatingProfit >= 0
                      ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950'
                      : 'bg-red-50/60 border-red-200/80 text-red-950'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        summaryData.metrics.operatingProfit >= 0
                          ? 'bg-emerald-100 text-[#059669]'
                          : 'bg-red-100 text-[#DC2626]'
                      }`}
                    >
                      {summaryData.metrics.operatingProfit >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-semibold block text-[#172033]">
                        Net Operating Profit · {summaryData.periodLabel || periodLabels[period]}
                      </span>
                      <span className="text-[11px] text-[#697586] block mt-0.5">
                        Gross Profit minus shop operating expenses.
                      </span>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <span
                      className={`text-lg sm:text-xl font-semibold font-tabular block ${
                        summaryData.metrics.operatingProfit >= 0
                          ? 'text-[#059669]'
                          : 'text-[#DC2626]'
                      }`}
                    >
                      {formatCurrency(summaryData.metrics.operatingProfit)}
                    </span>
                    <span className="text-[11px] font-medium text-[#697586]">
                      Operating Margin: {summaryData.metrics.operatingMarginPercent}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column (1 Col): Inventory Alerts & Top-Selling Products */}
        <div className="space-y-6">
          {/* Inventory Alerts */}
          <Card>
            <CardHeader
              title="Inventory Alerts"
              subtitle="Items at or below safety stock"
              action={
                <Link
                  to="/inventory"
                  className="text-xs font-semibold text-[#059669] hover:underline inline-flex items-center gap-1"
                >
                  <span>Inventory</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
            />
            <CardContent className="p-0">
              {lowStockItems.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#059669] flex items-center justify-center mx-auto mb-2 border border-emerald-100">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-semibold text-[#172033]">All Stock Levels Healthy</p>
                  <p className="text-[11px] text-[#697586] mt-0.5">
                    No products have breached their configured safety reorder thresholds.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#F1F3F6]">
                  {lowStockItems.slice(0, 5).map((item) => (
                    <div
                      key={item.productId}
                      className="p-3 sm:px-4 hover:bg-[#F7F8FA] transition flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 shrink-0">
                          <ProductImage
                            src={item.imageUrl}
                            alt={item.name}
                            containerClassName="w-9 h-9 rounded-lg bg-[#F7F8FA] border border-[#E8ECF1]"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-[#172033] block truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] font-mono text-[#697586] truncate block">
                            {item.sku}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-tabular font-semibold block ${
                            item.isOutOfStock ? 'text-[#DC2626]' : 'text-[#D97706]'
                          }`}
                        >
                          {item.currentQuantity} {item.unit}
                        </span>
                        <span className="text-[10px] text-[#697586] font-medium block mt-0.5">
                          Min: {item.minStockThreshold}
                        </span>
                      </div>
                    </div>
                  ))}

                  {lowStockItems.length > 5 && (
                    <div className="p-2.5 text-center bg-[#FAFBFD] border-t border-[#F1F3F6]">
                      <Link
                        to="/inventory"
                        className="text-xs font-semibold text-[#059669] hover:underline inline-flex items-center gap-1"
                      >
                        +{lowStockItems.length - 5} more items needing reorder
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top-Selling Products */}
          {isFinancialAuthorized && (
            <Card>
              <CardHeader
                title="Top-Selling Products"
                subtitle={`Ranked by revenue for ${periodLabels[period].toLowerCase()}`}
                action={
                  <Link
                    to="/reports"
                    className="text-xs font-semibold text-[#059669] hover:underline inline-flex items-center gap-1"
                  >
                    <span>All Products</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                }
              />
              <CardContent className="p-0">
                {topProducts.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <Package className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-[#172033]">
                      No product sales in this period
                    </p>
                    <p className="text-[11px] text-[#697586] mt-0.5">
                      Top performers will appear here once orders are processed.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#F1F3F6]">
                    {topProducts.slice(0, 5).map((prod) => (
                      <div
                        key={prod.productId}
                        className="p-3 sm:px-4 hover:bg-[#F7F8FA] transition flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 shrink-0">
                            <ProductImage
                              src={prod.imageUrl}
                              alt={prod.productName}
                              containerClassName="w-9 h-9 rounded-lg bg-[#F7F8FA] border border-[#E8ECF1]"
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-[#172033] block truncate">
                              {prod.productName}
                            </span>
                            <span className="text-[11px] text-[#697586] truncate block">
                              {prod.unitsSold} unit(s) sold
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-semibold font-tabular text-[#172033] block">
                            {formatCurrency(prod.netRevenue)}
                          </span>
                          <span className="text-[10px] text-[#059669] font-medium block mt-0.5">
                            {prod.grossMarginPercent}% margin
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
