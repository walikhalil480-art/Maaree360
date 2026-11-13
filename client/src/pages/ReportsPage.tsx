import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api/client'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { ProductImage } from '../components/ui/ProductImage'
import { Toast, type ToastProps } from '../components/ui/Toast'
import type {
  ReportPeriod,
  FinancialSummaryData,
  RevenueTrendsData,
  ProductProfitabilityData,
  InventoryIntelligenceData,
  InventoryClassification,
} from '../types/report'
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Download,
  FileText,
  RefreshCw,
  BarChart3,
  PieChart,
  ShoppingBag,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Layers,
  Search,
  HelpCircle,
  PackageX,
  Zap,
} from 'lucide-react'

export const ReportsPage: React.FC = () => {
  const { activeBusiness } = useAuth()
  const businessId = activeBusiness?.id
  const userRole = activeBusiness?.role || 'CASHIER'
  const isAuthorized = userRole === 'OWNER' || userRole === 'MANAGER'

  // Tab State
  const [activeTab, setActiveTab] = useState<
    'summary' | 'revenue' | 'profitability' | 'inventory' | 'exports'
  >('summary')

  // Date Range State
  const [period, setPeriod] = useState<ReportPeriod>('this_month')
  const [customStart, setCustomStart] = useState<string>('')
  const [customEnd, setCustomEnd] = useState<string>('')
  const [appliedCustomStart, setAppliedCustomStart] = useState<string>('')
  const [appliedCustomEnd, setAppliedCustomEnd] = useState<string>('')

  // Data States
  const [summaryData, setSummaryData] = useState<FinancialSummaryData | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueTrendsData | null>(null)
  const [profitabilityData, setProfitabilityData] = useState<ProductProfitabilityData | null>(null)
  const [inventoryData, setInventoryData] = useState<InventoryIntelligenceData | null>(null)

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true)
  const [exporting, setExporting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Sub-filters for Profitability Tab
  const [profitSearch, setProfitSearch] = useState('')
  const [profitSortBy, setProfitSortBy] = useState<
    'grossProfit' | 'grossMarginPercent' | 'netRevenue' | 'unitsSold'
  >('grossProfit')
  const [profitSortOrder, setProfitSortOrder] = useState<'asc' | 'desc'>('desc')
  const [profitPage, setProfitPage] = useState(1)

  // Sub-filters for Inventory Tab
  const [inventoryClassification, setInventoryClassification] =
    useState<InventoryClassification>('ALL')
  const [inventoryLookbackDays, setInventoryLookbackDays] = useState<number>(60)
  const [inventorySearch, setInventorySearch] = useState('')
  const [inventoryPage, setInventoryPage] = useState(1)

  // Toast State
  const [toast, setToast] = useState<Omit<ToastProps, 'onClose'> | null>(null)
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
  }

  // Format Currency KES
  const formatKES = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return 'KES 0.00'
    return `KES ${val.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Build query string helper
  const getPeriodQueryString = useCallback(() => {
    const params = new URLSearchParams()
    params.set('period', period)
    if (period === 'custom') {
      if (appliedCustomStart) params.set('startDate', appliedCustomStart)
      if (appliedCustomEnd) params.set('endDate', appliedCustomEnd)
    }
    return params.toString()
  }, [period, appliedCustomStart, appliedCustomEnd])

  // Load Financial Summary
  const loadSummary = useCallback(async () => {
    if (!businessId || !isAuthorized) return
    try {
      const q = getPeriodQueryString()
      const res = await apiFetch<{ success: boolean; data: FinancialSummaryData }>(
        `/api/v1/businesses/${businessId}/reports/summary?${q}`
      )
      if (res.success) {
        setSummaryData(res.data)
      }
    } catch (err: any) {
      console.error('Failed to load financial summary:', err)
      setError(err.message || 'Failed to load report data')
    }
  }, [businessId, isAuthorized, getPeriodQueryString])

  // Load Revenue Trends
  const loadRevenueTrends = useCallback(async () => {
    if (!businessId || !isAuthorized) return
    try {
      const q = getPeriodQueryString()
      const res = await apiFetch<{ success: boolean; data: RevenueTrendsData }>(
        `/api/v1/businesses/${businessId}/reports/revenue-trends?${q}`
      )
      if (res.success) {
        setRevenueData(res.data)
      }
    } catch (err: any) {
      console.error('Failed to load revenue trends:', err)
    }
  }, [businessId, isAuthorized, getPeriodQueryString])

  // Load Profitability
  const loadProfitability = useCallback(async () => {
    if (!businessId || !isAuthorized) return
    try {
      const params = new URLSearchParams()
      params.set('period', period)
      if (period === 'custom') {
        if (appliedCustomStart) params.set('startDate', appliedCustomStart)
        if (appliedCustomEnd) params.set('endDate', appliedCustomEnd)
      }
      params.set('sortBy', profitSortBy)
      params.set('sortOrder', profitSortOrder)
      params.set('page', profitPage.toString())
      params.set('limit', '15')
      if (profitSearch.trim()) params.set('search', profitSearch.trim())

      const res = await apiFetch<{ success: boolean; data: ProductProfitabilityData }>(
        `/api/v1/businesses/${businessId}/reports/profitability?${params.toString()}`
      )
      if (res.success) {
        setProfitabilityData(res.data)
      }
    } catch (err: any) {
      console.error('Failed to load profitability:', err)
    }
  }, [
    businessId,
    isAuthorized,
    period,
    appliedCustomStart,
    appliedCustomEnd,
    profitSortBy,
    profitSortOrder,
    profitPage,
    profitSearch,
  ])

  // Load Inventory Intelligence
  const loadInventory = useCallback(async () => {
    if (!businessId || !isAuthorized) return
    try {
      const params = new URLSearchParams()
      params.set('lookbackDays', inventoryLookbackDays.toString())
      params.set('classification', inventoryClassification)
      params.set('page', inventoryPage.toString())
      params.set('limit', '15')
      if (inventorySearch.trim()) params.set('search', inventorySearch.trim())

      const res = await apiFetch<{ success: boolean; data: InventoryIntelligenceData }>(
        `/api/v1/businesses/${businessId}/reports/inventory-intelligence?${params.toString()}`
      )
      if (res.success) {
        setInventoryData(res.data)
      }
    } catch (err: any) {
      console.error('Failed to load inventory intelligence:', err)
    }
  }, [
    businessId,
    isAuthorized,
    inventoryLookbackDays,
    inventoryClassification,
    inventoryPage,
    inventorySearch,
  ])

  // Load everything
  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    await Promise.all([loadSummary(), loadRevenueTrends(), loadProfitability(), loadInventory()])
    setLoading(false)
  }, [loadSummary, loadRevenueTrends, loadProfitability, loadInventory])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Handle Custom Period Apply
  const handleApplyCustomRange = () => {
    if (!customStart || !customEnd) {
      showToast('Please specify both start and end dates', 'error')
      return
    }
    if (new Date(customStart) > new Date(customEnd)) {
      showToast('Start date cannot be after end date', 'error')
      return
    }
    setAppliedCustomStart(customStart)
    setAppliedCustomEnd(customEnd)
    showToast(`Applied custom date filter: ${customStart} to ${customEnd}`, 'info')
  }

  // File Download Handler
  const handleDownloadFile = async (
    url: string,
    defaultFilename: string,
    successMessage: string
  ) => {
    try {
      setExporting(true)
      const response = await fetch(url, { credentials: 'include' })
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson.message || 'Download failed')
      }
      const blob = await response.blob()
      let filename = defaultFilename
      const contentDisposition = response.headers.get('content-disposition')
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match && match[1]) filename = match[1]
      }

      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(blobUrl)

      showToast(successMessage, 'success')
    } catch (err: any) {
      console.error('Download error:', err)
      showToast(err.message || 'Failed to download report', 'error')
    } finally {
      setExporting(false)
    }
  }

  // Export CSV Action
  const handleExportCsv = (
    type: 'summary' | 'revenue' | 'profitability' | 'inventory' | 'dead_stock' | 'expenses'
  ) => {
    if (!businessId) return
    const q = getPeriodQueryString()
    const url = `/api/v1/businesses/${businessId}/reports/export/csv?type=${type}&${q}&lookbackDays=${inventoryLookbackDays}`
    handleDownloadFile(
      url,
      `maaree360-${type}-${period}.csv`,
      `Downloaded ${type.replace(/_/g, ' ')} CSV report`
    )
  }

  // Export PDF Action
  const handleExportPdf = () => {
    if (!businessId) return
    const q = getPeriodQueryString()
    const url = `/api/v1/businesses/${businessId}/reports/export/pdf?${q}`
    handleDownloadFile(
      url,
      `maaree360-financial-report-${period}.pdf`,
      'Downloaded Management Financial PDF Report'
    )
  }

  // Render change indicator pill
  const renderDeltaPill = (delta: number, percent: number, isGoodWhenPositive = true) => {
    const isPositive = delta > 0
    const isZero = delta === 0
    let bg = 'bg-slate-100 text-slate-700'

    if (!isZero) {
      const isFavorable = isGoodWhenPositive ? isPositive : !isPositive
      bg = isFavorable ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
    }

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${bg}`}
      >
        {isPositive ? (
          <ArrowUpRight className="w-3.5 h-3.5" />
        ) : isZero ? (
          <span className="text-xs">−</span>
        ) : (
          <ArrowDownRight className="w-3.5 h-3.5" />
        )}
        {percent > 0 ? `+${percent}%` : `${percent}%`}
      </span>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="p-8">
        <EmptyState
          title="Access Restricted"
          description="Reports and business intelligence analytics are reserved for Store Owners and Managers."
          icon={<AlertTriangle className="w-8 h-8 text-amber-500" />}
        />
      </div>
    )
  }

  const metrics = summaryData?.metrics
  const comparisons = summaryData?.comparisons

  return (
    <div className="space-y-6 pb-12">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Reports"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAll}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('exports')}
            className="flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-slate-600" />
            Export Data
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportPdf}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            <FileText className="w-4 h-4" />
            {exporting ? 'Generating...' : 'Management PDF'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Date Range Selector Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Period:
            </span>

            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this_week', label: 'This Week' },
              { id: 'last_week', label: 'Last Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'this_year', label: 'This Year' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as ReportPeriod)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  period === p.id
                    ? 'bg-emerald-700 text-white shadow-xs font-semibold'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Timezone: Africa/Nairobi (EAT, UTC+3)</span>
          </div>
        </div>

        {/* Custom Range Inputs */}
        {period === 'custom' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <label className="text-slate-600 font-medium">From:</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs text-slate-800 bg-white"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <label className="text-slate-600 font-medium">To:</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs text-slate-800 bg-white"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleApplyCustomRange}
              className="text-xs py-1 h-8"
            >
              Apply Dates
            </Button>
          </div>
        )}

        {/* Comparison period info */}
        {summaryData && (
          <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
            <span>
              Active reporting window: <strong>{summaryData.periodLabel}</strong> (
              {summaryData.periodDays} days)
            </span>
            <span className="text-slate-400 hidden sm:inline">
              Prior comparison: {summaryData.precedingStartDate.split('T')[0]} to{' '}
              {summaryData.precedingEndDate.split('T')[0]}
            </span>
          </div>
        )}
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Sales */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Gross Sales
            </span>
            <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200/60">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-semibold font-tabular text-[#172033] tracking-tight">
            {formatKES(metrics?.grossSales)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 font-tabular">
            <span>Prior: {formatKES(comparisons?.grossSales.previous)}</span>
            {comparisons &&
              renderDeltaPill(
                comparisons.grossSales.delta,
                comparisons.grossSales.percent,
                true
              )}
          </div>
        </div>

        {/* Net Revenue */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Net Sales Revenue
            </span>
            <span className="p-1.5 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200/60">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-semibold font-tabular text-[#172033] tracking-tight">
            {formatKES(metrics?.netRevenue)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 font-tabular">
            <span>Discounts: {formatKES(metrics?.discounts)}</span>
            {comparisons &&
              renderDeltaPill(
                comparisons.netRevenue.delta,
                comparisons.netRevenue.percent,
                true
              )}
          </div>
        </div>

        {/* COGS & Gross Profit */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Est. Gross Profit
            </span>
            <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg border border-purple-200/60">
              <PieChart className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-semibold font-tabular text-[#172033] tracking-tight">
            {formatKES(metrics?.grossProfit)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 font-tabular">
            <span className="font-semibold text-purple-800">
              Margin: {metrics?.grossMarginPercent ?? 0}%
            </span>
            {comparisons &&
              renderDeltaPill(
                comparisons.grossProfit.delta,
                comparisons.grossProfit.percent,
                true
              )}
          </div>
        </div>

        {/* Operating Profit */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Est. Operating Profit
            </span>
            <span
              className={`p-1.5 rounded-lg border ${
                (metrics?.operatingProfit ?? 0) >= 0
                  ? 'bg-teal-50 text-teal-700 border-teal-200/60'
                  : 'bg-rose-50 text-rose-700 border-rose-200/60'
              }`}
            >
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <div
            className={`text-xl sm:text-2xl font-semibold font-tabular tracking-tight ${
              (metrics?.operatingProfit ?? 0) >= 0 ? 'text-[#172033]' : 'text-rose-700'
            }`}
          >
            {formatKES(metrics?.operatingProfit)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 font-tabular">
            <span>Expenses: {formatKES(metrics?.operatingExpenses)}</span>
            <span className="font-semibold text-slate-700">
              Op. Margin: {metrics?.operatingMarginPercent ?? 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-slate-200/90 overflow-x-auto gap-6 scrollbar-thin">
        {[
          { id: 'summary', label: 'Executive Summary', icon: BarChart3 },
          { id: 'revenue', label: 'Revenue & Trends', icon: TrendingUp },
          { id: 'profitability', label: 'Product Margins', icon: ShoppingBag },
          { id: 'inventory', label: 'Inventory Turnover', icon: Layers },
          { id: 'exports', label: 'Export Center', icon: Download },
        ].map((t) => {
          const Icon = t.icon
          const isSel = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 inline-flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                isSel
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSel ? 'text-emerald-700' : 'text-slate-400'}`} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* TAB 1: EXECUTIVE SUMMARY */}
      {activeTab === 'summary' && summaryData && (
        <div className="space-y-6">
          {/* Comparative Accounting Metrics Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Management Performance & Period Comparison
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed comparison against preceding equivalent duration
                </p>
              </div>
              <Badge variant="neutral" className="text-xs">
                {summaryData.periodLabel}
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Financial Metric</th>
                    <th className="py-3 px-4 text-right">Current Period (KES)</th>
                    <th className="py-3 px-4 text-right">Prior Period (KES)</th>
                    <th className="py-3 px-4 text-right">Change (KES)</th>
                    <th className="py-3 px-4 text-right">Change (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-900">Gross Sales Revenue</td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {formatKES(metrics?.grossSales)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {formatKES(comparisons?.grossSales.previous)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatKES(comparisons?.grossSales.delta)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {comparisons &&
                        renderDeltaPill(
                          comparisons.grossSales.delta,
                          comparisons.grossSales.percent
                        )}
                    </td>
                  </tr>

                  <tr className="bg-slate-50/50">
                    <td className="py-2.5 px-4 text-slate-600 pl-8">
                      Less: Sales Discounts Allowed
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600">
                      -{formatKES(metrics?.discounts)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">-</td>
                  </tr>

                  <tr className="bg-slate-50/50">
                    <td className="py-2.5 px-4 text-slate-600 pl-8">
                      Less: Sales Returns & Refunds
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600">
                      -{formatKES(metrics?.refunds)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">-</td>
                  </tr>

                  <tr className="bg-emerald-50/40">
                    <td className="py-3 px-4 font-bold text-emerald-950">Net Sales Revenue</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {formatKES(metrics?.netRevenue)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {formatKES(comparisons?.netRevenue.previous)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatKES(comparisons?.netRevenue.delta)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {comparisons &&
                        renderDeltaPill(
                          comparisons.netRevenue.delta,
                          comparisons.netRevenue.percent
                        )}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-700 pl-8">
                      Less: Cost of Goods Sold (COGS)
                      {metrics?.hasEstimatedCosts && (
                        <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-normal">
                          Includes estimated costs
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 font-semibold">
                      -{formatKES(metrics?.cogs)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">-</td>
                    <td className="py-3 px-4 text-right text-slate-400">-</td>
                    <td className="py-3 px-4 text-right text-slate-400">-</td>
                  </tr>

                  <tr className="bg-purple-50/40">
                    <td className="py-3 px-4 font-bold text-purple-950">
                      Estimated Gross Profit ({metrics?.grossMarginPercent}% margin)
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-purple-700">
                      {formatKES(metrics?.grossProfit)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {formatKES(comparisons?.grossProfit.previous)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatKES(comparisons?.grossProfit.delta)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {comparisons &&
                        renderDeltaPill(
                          comparisons.grossProfit.delta,
                          comparisons.grossProfit.percent
                        )}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-700 pl-8">
                      Less: Operating Expenses (Rent, Power, Wages...)
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 font-semibold">
                      -{formatKES(metrics?.operatingExpenses)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {formatKES(comparisons?.operatingExpenses.previous)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatKES(comparisons?.operatingExpenses.delta)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {comparisons &&
                        renderDeltaPill(
                          comparisons.operatingExpenses.delta,
                          comparisons.operatingExpenses.percent,
                          false
                        )}
                    </td>
                  </tr>

                  <tr className="bg-slate-100 font-bold">
                    <td className="py-3 px-4 text-slate-900">
                      Estimated Operating Profit ({metrics?.operatingMarginPercent}% margin)
                    </td>
                    <td
                      className={`py-3 px-4 text-right ${
                        (metrics?.operatingProfit ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {formatKES(metrics?.operatingProfit)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {formatKES(comparisons?.operatingProfit.previous)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatKES(comparisons?.operatingProfit.delta)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {comparisons &&
                        renderDeltaPill(
                          comparisons.operatingProfit.delta,
                          comparisons.operatingProfit.percent
                        )}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 text-slate-600">Total Completed Sales Transactions</td>
                    <td className="py-3 px-4 text-right font-medium">
                      {metrics?.transactionCount}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {comparisons?.transactionCount.previous}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {comparisons?.transactionCount.delta}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {comparisons &&
                        renderDeltaPill(
                          comparisons.transactionCount.delta,
                          comparisons.transactionCount.percent
                        )}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 text-slate-600">Average Sale Value (Ticket Size)</td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatKES(metrics?.averageSaleValue)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {formatKES(comparisons?.averageSaleValue.previous)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatKES(comparisons?.averageSaleValue.delta)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {comparisons &&
                        renderDeltaPill(
                          comparisons.averageSaleValue.delta,
                          comparisons.averageSaleValue.percent
                        )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Legal / Management Disclaimer */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 flex items-start gap-3">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-800">
                Management Accounting & Analytics Disclaimer
              </p>
              <p className="mt-0.5 text-slate-500">
                This report is compiled for internal retail store decision-making, stock control,
                and performance tracking. It is not an official Kenya Revenue Authority (KRA) tax
                declaration or certified fiscal return.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REVENUE & SALES TRENDS */}
      {activeTab === 'revenue' && revenueData && (
        <div className="space-y-6">
          {/* Payment Methods Breakdown Cards */}
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-3">
              Sales Breakdown by Payment Method
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {revenueData.paymentMethods.map((pm) => (
                <div
                  key={pm.method}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">
                      {pm.method === 'MOBILE_MONEY'
                        ? 'M-Pesa / Mobile Money'
                        : pm.method === 'BANK_TRANSFER'
                          ? 'Bank Transfer'
                          : pm.method}
                    </span>
                    <Badge variant="neutral" className="text-xs">
                      {pm.percentage}%
                    </Badge>
                  </div>
                  <div className="text-xl font-bold text-slate-900">
                    {formatKES(pm.totalAmount)}
                  </div>
                  <div className="text-xs text-slate-500">{pm.count} transactions completed</div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, pm.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time Series Table & Chart Representation */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Periodic Revenue Timeline</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Interval: <strong>{revenueData.interval}</strong> ({revenueData.timeSeries.length}{' '}
                  data intervals)
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportCsv('revenue')}
                className="text-xs flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Download CSV
              </Button>
            </div>

            {/* Simple Responsive Visual Bar Chart */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="text-xs text-slate-500 mb-2 font-medium">
                Revenue Flow per Interval
              </div>
              <div className="h-32 flex items-end gap-1.5 sm:gap-3 overflow-x-auto pb-2">
                {revenueData.timeSeries.map((t, idx) => {
                  const maxNet = Math.max(
                    ...revenueData.timeSeries.map((x) => x.netRevenue),
                    100
                  )
                  const heightPct = Math.round((t.netRevenue / maxNet) * 100)
                  return (
                    <div
                      key={idx}
                      className="flex-1 min-w-[36px] flex flex-col items-center gap-1 group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-slate-800 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20 shadow-md">
                        {t.label}: {formatKES(t.netRevenue)} ({t.transactionCount} sales)
                      </div>
                      <div
                        className="w-full bg-emerald-600 hover:bg-emerald-700 transition-all rounded-t-sm"
                        style={{ height: `${Math.max(4, heightPct)}%` }}
                      />
                      <span className="text-[10px] text-slate-500 truncate max-w-full">
                        {t.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Interval</th>
                    <th className="py-3 px-4 text-right">Gross Sales</th>
                    <th className="py-3 px-4 text-right">Discounts</th>
                    <th className="py-3 px-4 text-right">Refunds</th>
                    <th className="py-3 px-4 text-right">Net Revenue</th>
                    <th className="py-3 px-4 text-right">COGS</th>
                    <th className="py-3 px-4 text-right">Gross Profit</th>
                    <th className="py-3 px-4 text-right">Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {revenueData.timeSeries.map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-4 font-medium text-slate-900">{t.label}</td>
                      <td className="py-2.5 px-4 text-right">{formatKES(t.grossSales)}</td>
                      <td className="py-2.5 px-4 text-right text-slate-500">
                        {formatKES(t.discounts)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-500">
                        {formatKES(t.refunds)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-emerald-700">
                        {formatKES(t.netRevenue)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-600">{formatKES(t.cogs)}</td>
                      <td className="py-2.5 px-4 text-right font-medium text-purple-700">
                        {formatKES(t.grossProfit)}
                      </td>
                      <td className="py-2.5 px-4 text-right">{t.transactionCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCT PROFITABILITY & MARGINS */}
      {activeTab === 'profitability' && profitabilityData && (
        <div className="space-y-4">
          {/* Filters & Sorting Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 relative max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by product name or SKU..."
                value={profitSearch}
                onChange={(e) => {
                  setProfitSearch(e.target.value)
                  setProfitPage(1)
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Sort by:</span>
                <select
                  value={profitSortBy}
                  onChange={(e) => setProfitSortBy(e.target.value as any)}
                  className="px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-800"
                >
                  <option value="grossProfit">Gross Profit (KES)</option>
                  <option value="grossMarginPercent">Gross Margin (%)</option>
                  <option value="netRevenue">Net Revenue (KES)</option>
                  <option value="unitsSold">Units Sold</option>
                </select>
                <button
                  onClick={() => setProfitSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
                  className="p-1.5 border border-slate-300 rounded-md bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold"
                >
                  {profitSortOrder.toUpperCase()}
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportCsv('profitability')}
                className="text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Product / SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Units Sold</th>
                    <th className="py-3 px-4 text-right">Net Revenue</th>
                    <th className="py-3 px-4 text-right">Snap Unit Cost</th>
                    <th className="py-3 px-4 text-right">COGS</th>
                    <th className="py-3 px-4 text-right">Gross Profit</th>
                    <th className="py-3 px-4 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {profitabilityData.items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                        No product sales recorded in this period matching your filter.
                      </td>
                    </tr>
                  ) : (
                    profitabilityData.items.map((item) => (
                      <tr key={item.productId} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 shrink-0 rounded-lg overflow-hidden border border-[#E2E8F0] bg-white p-0.5 shadow-2xs">
                              <ProductImage
                                src={item.imageUrl}
                                alt={item.productName}
                                aspectRatio="square"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-[#172033] truncate max-w-[200px]">{item.productName}</div>
                              <div className="text-xs text-[#64748B]">{item.sku}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">{item.categoryName}</td>
                        <td className="py-3 px-4 text-right font-medium">
                          {item.netUnitsSold}
                          {item.unitsReturned > 0 && (
                            <span className="text-xs text-rose-500 ml-1">
                              (-{item.unitsReturned})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {formatKES(item.netRevenue)}
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-slate-500">
                          {formatKES(item.snapshotUnitCost)}
                          {item.hasEstimatedCost && (
                            <span
                              title="Historical snapshot was missing; estimated using current catalog cost"
                              className="ml-1 text-amber-500"
                            >
                              *
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600">
                          {formatKES(item.cogs)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-bold ${
                            item.grossProfit >= 0 ? 'text-purple-700' : 'text-rose-600'
                          }`}
                        >
                          {formatKES(item.grossProfit)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                              item.grossMarginPercent >= 30
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.grossMarginPercent >= 15
                                  ? 'bg-blue-50 text-blue-700'
                                  : item.grossMarginPercent >= 0
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {item.grossMarginPercent}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {profitabilityData.pagination.totalPages > 1 && (
              <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing page {profitabilityData.pagination.page} of{' '}
                  {profitabilityData.pagination.totalPages} ({profitabilityData.pagination.totalCount}{' '}
                  items)
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={profitabilityData.pagination.page <= 1}
                    onClick={() => setProfitPage((p) => Math.max(1, p - 1))}
                    className="text-xs py-1"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      profitabilityData.pagination.page >=
                      profitabilityData.pagination.totalPages
                    }
                    onClick={() => setProfitPage((p) => p + 1)}
                    className="text-xs py-1"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: INVENTORY TURNOVER & DEAD STOCK */}
      {activeTab === 'inventory' && inventoryData && (
        <div className="space-y-6">
          {/* Summary Health Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Stock Valuation
              </span>
              <div className="text-2xl font-bold text-slate-900">
                {formatKES(inventoryData.summary.totalStockValuation)}
              </div>
              <div className="text-xs text-slate-500">
                {inventoryData.summary.totalUnitsInStock.toLocaleString()} total units on shelves
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs space-y-1 bg-rose-50/20">
              <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Dead Stock Tied Capital
              </span>
              <div className="text-2xl font-bold text-rose-700">
                {formatKES(inventoryData.summary.deadStockValuation)}
              </div>
              <div className="text-xs text-rose-600 font-medium">
                {inventoryData.summary.deadStockCount} SKUs unsold in{' '}
                {inventoryData.lookbackDays} days
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Fast vs Slow Moving
              </span>
              <div className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span className="text-emerald-700">
                  {inventoryData.summary.fastMovingCount} fast
                </span>
                <span className="text-slate-300">/</span>
                <span className="text-amber-700">
                  {inventoryData.summary.slowMovingCount} slow
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {inventoryData.summary.outOfStockCount} out of stock SKUs
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Annualized Turnover Ratio
              </span>
              <div className="text-2xl font-bold text-teal-700">
                {inventoryData.summary.annualizedTurnoverRatio}x
              </div>
              <div className="text-xs text-slate-500">Annual cycles inventory sells out</div>
            </div>
          </div>

          {/* Classification Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'ALL', label: 'All Stock' },
                { id: 'FAST_MOVING', label: 'Fast Moving' },
                { id: 'SLOW_MOVING', label: 'Slow Moving' },
                { id: 'POTENTIALLY_DEAD_STOCK', label: 'Potentially Dead Stock' },
                { id: 'OUT_OF_STOCK', label: 'Out of Stock' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setInventoryClassification(c.id as InventoryClassification)
                    setInventoryPage(1)
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    inventoryClassification === c.id
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter SKU or name..."
                  value={inventorySearch}
                  onChange={(e) => {
                    setInventorySearch(e.target.value)
                    setInventoryPage(1)
                  }}
                  className="pl-8 pr-3 py-1 text-xs border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Lookback:</span>
                <select
                  value={inventoryLookbackDays}
                  onChange={(e) => setInventoryLookbackDays(parseInt(e.target.value, 10))}
                  className="px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800"
                >
                  <option value={30}>30 Days</option>
                  <option value={60}>60 Days (Default)</option>
                  <option value={90}>90 Days</option>
                  <option value={180}>180 Days</option>
                </select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleExportCsv(
                    inventoryClassification === 'POTENTIALLY_DEAD_STOCK'
                      ? 'dead_stock'
                      : 'inventory'
                  )
                }
                className="text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Product / SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Current Stock</th>
                    <th className="py-3 px-4 text-right">Valuation (KES)</th>
                    <th className="py-3 px-4 text-right">Sold ({inventoryData.lookbackDays}d)</th>
                    <th className="py-3 px-4 text-right">Velocity</th>
                    <th className="py-3 px-4 text-right">Last Sale</th>
                    <th className="py-3 px-4 text-right">Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {inventoryData.items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                        No inventory records match the selected classification.
                      </td>
                    </tr>
                  ) : (
                    inventoryData.items.map((item) => (
                      <tr key={item.productId} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 shrink-0 rounded-lg overflow-hidden border border-[#E2E8F0] bg-white p-0.5 shadow-2xs">
                              <ProductImage
                                src={item.imageUrl}
                                alt={item.productName}
                                aspectRatio="square"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-[#172033] truncate max-w-[200px]">{item.productName}</div>
                              <div className="text-xs text-[#64748B]">{item.sku}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">{item.categoryName}</td>
                        <td className="py-3 px-4 text-right font-medium">
                          {item.currentStock} {item.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {formatKES(item.stockValuation)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {item.unitsSoldInPeriod}
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-slate-600">
                          {item.salesVelocity} /day
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-slate-500">
                          {item.lastSaleDate ? (
                            <div>
                              <div>{item.lastSaleDate.split('T')[0]}</div>
                              <div className="text-[10px] text-slate-400">
                                {item.daysSinceLastSale}d ago
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Never sold</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Badge
                            variant={
                              item.classification === 'FAST_MOVING'
                                ? 'success'
                                : item.classification === 'POTENTIALLY_DEAD_STOCK'
                                  ? 'danger'
                                  : item.classification === 'OUT_OF_STOCK'
                                    ? 'neutral'
                                    : 'warning'
                            }
                            className="text-xs"
                          >
                            {item.classification.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {inventoryData.pagination.totalPages > 1 && (
              <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing page {inventoryData.pagination.page} of{' '}
                  {inventoryData.pagination.totalPages} ({inventoryData.pagination.totalCount}{' '}
                  products)
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={inventoryData.pagination.page <= 1}
                    onClick={() => setInventoryPage((p) => Math.max(1, p - 1))}
                    className="text-xs py-1"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      inventoryData.pagination.page >= inventoryData.pagination.totalPages
                    }
                    onClick={() => setInventoryPage((p) => p + 1)}
                    className="text-xs py-1"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: EXPORT CENTER */}
      {activeTab === 'exports' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              One-Click Accounting & Business Exports
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              All CSV exports include UTF-8 Byte Order Marks (BOM) for compatibility with Microsoft
              Excel, Google Sheets, and LibreOffice, along with active formula injection defense.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Export Card 1: Official Management PDF */}
              <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-lg w-fit mb-3">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm">Management Financial PDF</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Multi-page executive report with financial tables, margins, payment channels,
                    and inventory valuation.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExportPdf}
                  disabled={exporting}
                  className="mt-4 bg-emerald-700 hover:bg-emerald-800 text-white w-full flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
              </div>

              {/* Export Card 2: Executive Summary CSV */}
              <div className="p-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex flex-col justify-between">
                <div>
                  <div className="p-2.5 bg-blue-100 text-blue-800 rounded-lg w-fit mb-3">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm">Financial Summary CSV</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Gross sales, discounts, refunds, COGS, gross profit, operating expenses, and
                    prior period deltas.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCsv('summary')}
                  disabled={exporting}
                  className="mt-4 w-full flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Download CSV
                </Button>
              </div>

              {/* Export Card 3: Revenue & Payment Trends CSV */}
              <div className="p-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex flex-col justify-between">
                <div>
                  <div className="p-2.5 bg-purple-100 text-purple-800 rounded-lg w-fit mb-3">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm">Revenue Trends CSV</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Periodic daily/weekly intervals with revenue, discounts, returns, and payment
                    method shares.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCsv('revenue')}
                  disabled={exporting}
                  className="mt-4 w-full flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Download CSV
                </Button>
              </div>

              {/* Export Card 4: Product Profitability CSV */}
              <div className="p-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex flex-col justify-between">
                <div>
                  <div className="p-2.5 bg-amber-100 text-amber-800 rounded-lg w-fit mb-3">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm">Product Profitability CSV</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    SKU-level units sold, realized snapshot costs, COGS, gross profits, and gross
                    margin percentages.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCsv('profitability')}
                  disabled={exporting}
                  className="mt-4 w-full flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Download CSV
                </Button>
              </div>

              {/* Export Card 5: Inventory Valuation & Turnover CSV */}
              <div className="p-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex flex-col justify-between">
                <div>
                  <div className="p-2.5 bg-teal-100 text-teal-800 rounded-lg w-fit mb-3">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm">Inventory Turnover CSV</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    All catalog products, shelf stock, stock valuation, daily velocity, and days on
                    hand.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCsv('inventory')}
                  disabled={exporting}
                  className="mt-4 w-full flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Download CSV
                </Button>
              </div>

              {/* Export Card 6: Potentially Dead Stock CSV */}
              <div className="p-5 rounded-xl border border-rose-200 bg-rose-50/20 hover:bg-rose-50/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="p-2.5 bg-rose-100 text-rose-800 rounded-lg w-fit mb-3">
                    <PackageX className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-rose-950 text-sm">Dead Stock Audit CSV</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Products with capital tied up on shelves that have recorded zero sales in the
                    last {inventoryLookbackDays} days.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCsv('dead_stock')}
                  disabled={exporting}
                  className="mt-4 w-full border-rose-300 text-rose-800 hover:bg-rose-100 flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Download Dead Stock CSV
                </Button>
              </div>

              {/* Export Card 7: Operating Expenses CSV */}
              <div className="p-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex flex-col justify-between">
                <div>
                  <div className="p-2.5 bg-indigo-100 text-indigo-800 rounded-lg w-fit mb-3">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm">Operating Expenses CSV</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Detailed ledger of operating expenses (rent, utilities, casual wages, supplies)
                    for the selected period.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCsv('expenses')}
                  disabled={exporting}
                  className="mt-4 w-full flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Download Expenses CSV
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
