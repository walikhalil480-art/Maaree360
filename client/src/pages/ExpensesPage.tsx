import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch, ApiError } from '../api/client'
import { PageHeader } from '../components/ui/PageHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { Toast, type ToastProps } from '../components/ui/Toast'
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog'
import { ExpenseFormModal } from '../components/expenses/ExpenseFormModal'
import { ExpenseDetailModal } from '../components/expenses/ExpenseDetailModal'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/Table'
import type {
  Expense,
  ExpenseListResponse,
  ProfitSummary,
  ProfitSummaryResponse,
} from '../types/expense'
import { EXPENSE_CATEGORIES } from '../types/expense'
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Plus,
  Search,
  Calendar,
  Filter,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  PieChart,
  TrendingDown,
  Layers,
  Sparkles,
} from 'lucide-react'

export const ExpensesPage: React.FC = () => {
  const { activeBusiness } = useAuth()
  const businessId = activeBusiness?.id
  const currency = activeBusiness?.currency || 'KES'
  const userRole = activeBusiness?.role || 'CASHIER'
  const canManage = userRole === 'OWNER' || userRole === 'MANAGER'

  // Data state
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [expenseTotal, setExpenseTotal] = useState<number>(0)
  const [profitSummary, setProfitSummary] = useState<ProfitSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters state
  const [periodPreset, setPeriodPreset] = useState<'today' | 'week' | 'month' | 'year' | 'all' | 'custom'>('month')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)

  // UI state
  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(false)

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Toast state
  const [toast, setToast] = useState<Omit<ToastProps, 'onClose'> | null>(null)
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
  }

  // Load Expenses List
  const loadExpenses = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy: 'expenseDate',
        sortOrder: 'desc',
      })

      if (selectedCategory !== 'all') {
        queryParams.set('category', selectedCategory)
      }
      if (searchQuery.trim()) {
        queryParams.set('search', searchQuery.trim())
      }
      if (startDate) {
        queryParams.set('startDate', startDate)
      }
      if (endDate) {
        queryParams.set('endDate', endDate)
      }

      const res = await apiFetch<ExpenseListResponse>(
        `/api/v1/businesses/${businessId}/expenses?${queryParams.toString()}`
      )

      if (res.success) {
        setExpenses(res.expenses || [])
        setPagination(res.pagination)
        setExpenseTotal(res.summary?.totalAmount || 0)
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load expenses'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [businessId, page, selectedCategory, searchQuery, startDate, endDate])

  // Load Profit & Financial Summary (Owner/Manager role)
  const loadProfitSummary = useCallback(async () => {
    if (!businessId || !canManage) return

    try {
      const queryParams = new URLSearchParams()
      if (periodPreset === 'custom') {
        queryParams.set('period', 'custom')
        if (startDate) queryParams.set('startDate', startDate)
        if (endDate) queryParams.set('endDate', endDate)
      } else {
        queryParams.set('period', periodPreset)
      }

      const res = await apiFetch<ProfitSummaryResponse>(
        `/api/v1/businesses/${businessId}/expenses/profit-summary?${queryParams.toString()}`
      )

      if (res.success && res.summary) {
        setProfitSummary(res.summary)
      }
    } catch (err) {
      console.warn('Could not load profit summary:', err)
    }
  }, [businessId, canManage, periodPreset, startDate, endDate])

  // Trigger data loads
  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  useEffect(() => {
    loadProfitSummary()
  }, [loadProfitSummary])

  // Handle Preset Period Change
  const handlePresetChange = (preset: 'today' | 'week' | 'month' | 'year' | 'all' | 'custom') => {
    setPeriodPreset(preset)
    setPage(1)

    const now = new Date()
    if (preset === 'today') {
      const todayStr = now.toISOString().slice(0, 10)
      setStartDate(todayStr)
      setEndDate(todayStr)
    } else if (preset === 'week') {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(now.setDate(diff))
      setStartDate(monday.toISOString().slice(0, 10))
      setEndDate(new Date().toISOString().slice(0, 10))
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      setStartDate(firstDay.toISOString().slice(0, 10))
      setEndDate(lastDay.toISOString().slice(0, 10))
    } else if (preset === 'year') {
      const firstDay = new Date(now.getFullYear(), 0, 1)
      const lastDay = new Date(now.getFullYear(), 11, 31)
      setStartDate(firstDay.toISOString().slice(0, 10))
      setEndDate(lastDay.toISOString().slice(0, 10))
    } else if (preset === 'all') {
      setStartDate('')
      setEndDate('')
    }
  }

  // Handle Delete Expense Confirmation
  const handleDeleteConfirm = async () => {
    if (!businessId || !expenseToDelete) return
    setIsDeleting(true)

    try {
      await apiFetch(`/api/v1/businesses/${businessId}/expenses/${expenseToDelete.id}`, {
        method: 'DELETE',
      })

      showToast('Expense record deleted successfully', 'success')
      setExpenseToDelete(null)
      loadExpenses()
      loadProfitSummary()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete expense'
      showToast(msg, 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  // Find top expense category from profit summary
  const topCategory = profitSummary?.expenses.categoryBreakdown?.[0]

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Page Header */}
      <PageHeader
        title="Expenses"
        badge={
          <Badge variant="success" size="md">
            {userRole}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadExpenses()
                loadProfitSummary()
              }}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingExpense(null)
                setIsFormOpen(true)
              }}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </Button>
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* 4 CORE KPI METRIC CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Net Sales Revenue */}
        <MetricCard
          title="Net Sales Revenue"
          value={
            profitSummary
              ? `${currency} ${profitSummary.sales.netRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : `${currency} 0.00`
          }
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
          subtitle={
            profitSummary
              ? `${profitSummary.sales.completedTransactionsCount} sales (- ${currency} ${profitSummary.sales.totalRefunds.toLocaleString()} refunds)`
              : 'Completed transactions'
          }
          statusBadge={{
            text: (profitSummary?.sales.netRevenue || 0) > 0 ? 'Revenue Active' : 'No Sales',
            variant: (profitSummary?.sales.netRevenue || 0) > 0 ? 'success' : 'neutral',
          }}
        />

        {/* Card 2: Cost of Goods Sold (COGS) */}
        <MetricCard
          title="Cost of Goods Sold (COGS)"
          value={
            profitSummary
              ? `${currency} ${profitSummary.cogs.totalCostOfGoodsSold.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : `${currency} 0.00`
          }
          icon={<Layers className="w-5 h-5 text-blue-600" />}
          subtitle={
            profitSummary
              ? `Gross Profit: ${currency} ${profitSummary.grossProfit.amount.toLocaleString()} (${profitSummary.grossProfit.marginPercentage}%)`
              : 'Product cost of sold items'
          }
          statusBadge={{
            text: `Gross: ${profitSummary?.grossProfit.marginPercentage || 0}%`,
            variant: (profitSummary?.grossProfit.amount || 0) >= 0 ? 'info' : 'danger',
          }}
        />

        {/* Card 3: Total Operating Expenses */}
        <MetricCard
          title="Operating Expenses"
          value={`${currency} ${expenseTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<Receipt className="w-5 h-5 text-amber-600" />}
          subtitle={
            topCategory && topCategory.totalAmount > 0
              ? `Top: ${topCategory.label} (${topCategory.percentage}%)`
              : `${pagination.total} expenses recorded`
          }
          statusBadge={{
            text: `${pagination.total} Records`,
            variant: 'warning',
          }}
        />

        {/* Card 4: Estimated Operating Profit */}
        <MetricCard
          title="Estimated Operating Profit"
          value={
            profitSummary
              ? `${currency} ${profitSummary.operatingProfit.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : `${currency} 0.00`
          }
          icon={
            profitSummary && profitSummary.operatingProfit.amount >= 0 ? (
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )
          }
          subtitle={
            profitSummary
              ? `Net Operating Margin: ${profitSummary.operatingProfit.marginPercentage}%`
              : 'Gross Profit minus Expenses'
          }
          statusBadge={{
            text:
              profitSummary?.operatingProfit.status === 'PROFITABLE'
                ? 'Profitable'
                : 'Operating Loss',
            variant:
              profitSummary?.operatingProfit.status === 'PROFITABLE'
                ? 'success'
                : 'danger',
          }}
        />
      </div>

      {/* ========================================================================= */}
      {/* OPERATING PROFIT EQUATION BANNER */}
      {/* ========================================================================= */}
      {profitSummary && canManage && (
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 m-0">Operating Profit Calculation Breakdown</h3>
                <p className="text-xs text-slate-500 m-0">
                  Realized figures for {periodPreset === 'all' ? 'all time' : `period: ${periodPreset}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCategoryBreakdown(!showCategoryBreakdown)}
                className="text-xs flex items-center gap-1.5"
              >
                <PieChart className="w-3.5 h-3.5" />
                <span>{showCategoryBreakdown ? 'Hide Breakdown' : 'Category Breakdown'}</span>
              </Button>
            </div>
          </div>

          {/* Equation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
            {/* Step 1: Net Revenue */}
            <div className="rounded-xl bg-slate-50/80 border border-slate-200/70 p-3.5">
              <span className="text-xs text-slate-600 font-medium block">
                Net Sales Revenue
              </span>
              <span className="text-base font-semibold font-tabular text-slate-900 block mt-1">
                {currency} {profitSummary.sales.netRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Completed sales minus refunds
              </span>
            </div>

            {/* Step 2: Minus COGS */}
            <div className="rounded-xl bg-slate-50/80 border border-slate-200/70 p-3.5">
              <span className="text-xs text-rose-700 font-medium block">
                — Realized COGS
              </span>
              <span className="text-base font-semibold font-tabular text-rose-700 block mt-1">
                {currency} {profitSummary.cogs.totalCostOfGoodsSold.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Product acquisition costs
              </span>
            </div>

            {/* Step 3: Equals Gross Profit */}
            <div className="rounded-xl bg-blue-50/60 border border-blue-200/70 p-3.5">
              <span className="text-xs text-blue-800 font-medium block">
                = Gross Profit
              </span>
              <span className="text-base font-semibold font-tabular text-blue-900 block mt-1">
                {currency} {profitSummary.grossProfit.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-blue-700 font-medium block mt-0.5">
                Gross Margin: {profitSummary.grossProfit.marginPercentage}%
              </span>
            </div>

            {/* Step 4: Minus Operating Expenses */}
            <div className="rounded-xl bg-slate-50/80 border border-slate-200/70 p-3.5">
              <span className="text-xs text-amber-700 font-medium block">
                — Operating Expenses
              </span>
              <span className="text-base font-semibold font-tabular text-amber-800 block mt-1">
                {currency} {profitSummary.expenses.totalOperatingExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Store overhead, rent, wages
              </span>
            </div>

            {/* Step 5: Equals Operating Profit */}
            <div
              className={`rounded-xl border p-3.5 ${
                profitSummary.operatingProfit.amount >= 0
                  ? 'bg-emerald-50/80 border-emerald-200/80'
                  : 'bg-rose-50/80 border-rose-200/80'
              }`}
            >
              <span
                className={`text-xs font-medium block ${
                  profitSummary.operatingProfit.amount >= 0 ? 'text-emerald-800' : 'text-rose-800'
                }`}
              >
                = Operating Profit
              </span>
              <span
                className={`text-base font-semibold font-tabular block mt-1 ${
                  profitSummary.operatingProfit.amount >= 0 ? 'text-emerald-900' : 'text-rose-900'
                }`}
              >
                {currency} {profitSummary.operatingProfit.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`text-[10px] font-medium block mt-0.5 ${
                  profitSummary.operatingProfit.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                Net Margin: {profitSummary.operatingProfit.marginPercentage}%
              </span>
            </div>
          </div>

          {/* Collapsible Expense Category Distribution */}
          {showCategoryBreakdown && (
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-semibold text-slate-800 m-0">
                Operating Overhead Breakdown by Category ({profitSummary.expenses.expenseCount} entries)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {profitSummary.expenses.categoryBreakdown
                  .filter((cat) => cat.totalAmount > 0)
                  .map((cat) => (
                    <div
                      key={cat.category}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{cat.label}</span>
                        <span className="font-tabular font-semibold text-slate-900">
                          {currency} {cat.totalAmount.toLocaleString()}
                        </span>
                      </div>
                      {/* Visual progress bar */}
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-1.5 rounded-full"
                          style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{cat.count} recorded</span>
                        <span>{cat.percentage}% of overhead</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* FILTER & SEARCH BAR */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
        {/* Row 1: Period Presets & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Period Preset Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Period:
            </span>
            {(['month', 'today', 'week', 'year', 'all', 'custom'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetChange(preset)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  periodPreset === preset
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {preset === 'month'
                  ? 'This Month'
                  : preset === 'today'
                  ? 'Today'
                  : preset === 'week'
                  ? 'This Week'
                  : preset === 'year'
                  ? 'This Year'
                  : preset === 'all'
                  ? 'All Time'
                  : 'Custom'}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search description or reference..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 shadow-2xs focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Row 2: Category Filter & Custom Date Range Pickers */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Category:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setPage(1)
              }}
              className="rounded-lg border border-slate-200 bg-white py-1 px-2.5 text-xs text-slate-700 shadow-2xs focus:border-emerald-600 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Range Pickers */}
          {periodPreset === 'custom' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setPage(1)
                }}
                className="rounded-lg border border-slate-200 bg-white py-1 px-2 text-xs text-slate-700 shadow-2xs focus:border-emerald-600 focus:outline-none font-tabular"
              />
              <span className="text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setPage(1)
                }}
                className="rounded-lg border border-slate-200 bg-white py-1 px-2 text-xs text-slate-700 shadow-2xs focus:border-emerald-600 focus:outline-none font-tabular"
              />
            </div>
          )}

          {(selectedCategory !== 'all' || searchQuery || startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all')
                setSearchQuery('')
                handlePresetChange('month')
              }}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-medium ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXPENSES TABLE & LIST */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-xl border border-slate-200/90 bg-white p-12 text-center text-slate-500 shadow-xs">
            <div className="w-7 h-7 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-medium">Loading operating expenses...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-8 text-center text-red-600 space-y-2">
            <p className="text-sm font-semibold">{error}</p>
            <Button variant="outline" size="sm" onClick={loadExpenses}>
              Try Again
            </Button>
          </div>
        ) : expenses.length === 0 ? (
          <div className="rounded-xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <EmptyState
              icon={<Receipt className="w-8 h-8 text-slate-400" />}
              title="No expenses found"
              description={
                searchQuery || selectedCategory !== 'all'
                  ? 'No expenses matched your filter criteria.'
                  : 'No operating expenses have been recorded yet.'
              }
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingExpense(null)
                    setIsFormOpen(true)
                  }}
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Record First Expense
                </Button>
              }
            />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <Table className="border-0 shadow-none rounded-none">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead numeric>Amount ({currency})</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead numeric>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((exp) => {
                  const catConfig = EXPENSE_CATEGORIES.find((c) => c.value === exp.category)
                  const catLabel = catConfig?.label || exp.category
                  const badgeVariant = catConfig?.badgeVariant || 'neutral'

                  return (
                    <TableRow
                      key={exp.id}
                      isClickable
                      onClick={() => setSelectedExpense(exp)}
                    >
                      {/* Date */}
                      <TableCell className="font-medium text-slate-700 whitespace-nowrap font-tabular">
                        {new Date(exp.expenseDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>

                      {/* Category Badge */}
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={badgeVariant} size="sm">
                          {catLabel}
                        </Badge>
                      </TableCell>

                      {/* Description */}
                      <TableCell className="max-w-xs">
                        <span className="font-medium text-slate-900 block truncate">
                          {exp.description}
                        </span>
                        {exp.notes && (
                          <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                            {exp.notes}
                          </span>
                        )}
                      </TableCell>

                      {/* Reference Number */}
                      <TableCell className="whitespace-nowrap">
                        {exp.referenceNumber ? (
                          <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/80">
                            {exp.referenceNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </TableCell>

                      {/* Amount */}
                      <TableCell numeric className="font-semibold text-[#172033] whitespace-nowrap text-sm font-tabular">
                        {Number(exp.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>

                      {/* Recorded By */}
                      <TableCell className="text-slate-600 whitespace-nowrap">
                        {exp.createdBy?.name || 'System User'}
                      </TableCell>

                      {/* Action Buttons */}
                      <TableCell numeric onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedExpense(exp)}
                            className="p-1.5 h-auto text-slate-500 hover:text-slate-900"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          {canManage && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingExpense(exp)
                                  setIsFormOpen(true)
                                }}
                                className="p-1.5 h-auto text-slate-500 hover:text-slate-900"
                                title="Edit Expense"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpenseToDelete(exp)}
                                className="p-1.5 h-auto text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                title="Delete Expense"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {/* Pagination Bar */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs bg-slate-50/50">
                <span className="text-slate-500 font-tabular">
                  Showing page <strong className="text-slate-700">{pagination.page}</strong> of{' '}
                  <strong className="text-slate-700">{pagination.totalPages}</strong> ({pagination.total} total)
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={pagination.page <= 1}
                    className="text-xs"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Add / Edit Expense Form Modal */}
      {businessId && (
        <ExpenseFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false)
            setEditingExpense(null)
          }}
          expense={editingExpense}
          businessId={businessId}
          currency={currency}
          onSaved={() => {
            showToast(
              editingExpense ? 'Expense updated successfully' : 'Expense recorded successfully',
              'success'
            )
            loadExpenses()
            loadProfitSummary()
          }}
        />
      )}

      {/* Expense Details Modal */}
      <ExpenseDetailModal
        isOpen={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
        currency={currency}
        canEdit={canManage}
        canDelete={canManage}
        onEdit={(exp) => {
          setSelectedExpense(null)
          setEditingExpense(exp)
          setIsFormOpen(true)
        }}
        onDelete={(exp) => {
          setSelectedExpense(null)
          setExpenseToDelete(exp)
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(expenseToDelete)}
        title="Delete Expense Record"
        message={`Are you sure you want to delete this expense record: "${expenseToDelete?.description}" for ${currency} ${Number(expenseToDelete?.amount || 0).toLocaleString()}? This action cannot be undone.`}
        confirmText="Delete Expense"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setExpenseToDelete(null)}
      />
    </div>
  )
}

export default ExpensesPage
