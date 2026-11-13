import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api/client'
import type {
  InventoryItem,
  LowStockItem,
  StockMovement,
  InventoryListResponse,
  LowStockResponse,
  MovementsListResponse,
} from '../types/inventory'
import type { Category, CategoryListResponse } from '../types/product'
import { PageHeader } from '../components/ui/PageHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { Button } from '../components/ui/Button'
import { SearchInput } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { EmptyState } from '../components/ui/EmptyState'
import { TableRowSkeleton } from '../components/ui/LoadingSkeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { Toast, type ToastProps } from '../components/ui/Toast'
import { StockOperationModal } from '../components/inventory/StockOperationModal'
import type { OperationType } from '../components/inventory/StockOperationModal'
import { MovementHistoryModal } from '../components/inventory/MovementHistoryModal'
import { ProductImage } from '../components/ui/ProductImage'
import {
  Boxes,
  AlertTriangle,
  PackagePlus,
  RefreshCw,
  History,
  AlertOctagon,
  CheckCircle2,
  FileText,
  X,
} from 'lucide-react'

export const InventoryPage: React.FC = () => {
  const { activeBusiness } = useAuth()
  const businessId = activeBusiness?.id

  // Tab State
  const [activeTab, setActiveTab] = useState<'balances' | 'alerts' | 'movements'>('balances')

  // Stock Balances Data
  const [items, setItems] = useState<InventoryItem[]>([])
  const [metrics, setMetrics] = useState({
    totalItems: 0,
    totalUnits: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Pagination for Balances
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'optimal' | 'low' | 'out'>('all')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Low Stock Tab Data
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(false)

  // Movement Ledger Tab Data
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loadingMovements, setLoadingMovements] = useState(false)
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('')
  const [movementsPage, setMovementsPage] = useState(1)
  const [movementsTotalPages, setMovementsTotalPages] = useState(1)

  // Modal States
  const [isOpModalOpen, setIsOpModalOpen] = useState(false)
  const [selectedProductForOp, setSelectedProductForOp] = useState<{
    id: string
    name: string
    sku: string
    unit: string
    currentStock: number
    minStockThreshold?: number
  } | null>(null)
  const [opInitialType, setOpInitialType] = useState<OperationType>('RECEIVE')

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<{
    id: string
    name: string
    sku: string
    unit: string
  } | null>(null)

  // Toast
  const [toast, setToast] = useState<Omit<ToastProps, 'onClose'> | null>(null)
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
  }

  // Load Categories
  const fetchCategories = useCallback(async () => {
    if (!businessId) return
    try {
      const res = await apiFetch<CategoryListResponse>(
        `/api/v1/businesses/${businessId}/categories`
      )
      if (res.success && res.categories) {
        setCategories(res.categories)
      }
    } catch (err) {
      console.error('Failed to load categories', err)
    }
  }, [businessId])

  // Fetch Inventory Balances
  const fetchInventory = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })

      if (search.trim()) params.set('search', search.trim())
      if (selectedCategory) params.set('categoryId', selectedCategory)
      if (stockStatusFilter === 'low') params.set('isLowStock', 'true')
      if (stockStatusFilter === 'out') params.set('isOutOfStock', 'true')

      const res = await apiFetch<InventoryListResponse>(
        `/api/v1/businesses/${businessId}/inventory?${params.toString()}`
      )

      if (res.success) {
        setItems(res.items || [])
        setTotalPages(res.pagination.totalPages)
        setTotalCount(res.pagination.total)
        if (res.metrics) {
          setMetrics(res.metrics)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory balances.')
    } finally {
      setLoading(false)
    }
  }, [businessId, page, limit, search, selectedCategory, stockStatusFilter])

  // Fetch Low Stock Alerts
  const fetchLowStockAlerts = useCallback(async () => {
    if (!businessId) return
    setLoadingAlerts(true)
    try {
      const res = await apiFetch<LowStockResponse>(
        `/api/v1/businesses/${businessId}/inventory/low-stock`
      )
      if (res.success) {
        setLowStockItems(res.items || [])
      }
    } catch (err) {
      console.error('Failed to load low stock alerts', err)
    } finally {
      setLoadingAlerts(false)
    }
  }, [businessId])

  // Fetch Movement Ledger
  const fetchMovements = useCallback(async () => {
    if (!businessId) return
    setLoadingMovements(true)
    try {
      const params = new URLSearchParams({
        page: String(movementsPage),
        limit: '15',
      })
      if (movementTypeFilter) params.set('type', movementTypeFilter)

      const res = await apiFetch<MovementsListResponse>(
        `/api/v1/businesses/${businessId}/inventory/movements?${params.toString()}`
      )
      if (res.success) {
        setMovements(res.movements || [])
        setMovementsTotalPages(res.pagination.totalPages)
      }
    } catch (err) {
      console.error('Failed to load movements ledger', err)
    } finally {
      setLoadingMovements(false)
    }
  }, [businessId, movementsPage, movementTypeFilter])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  useEffect(() => {
    if (activeTab === 'alerts') {
      fetchLowStockAlerts()
    } else if (activeTab === 'movements') {
      fetchMovements()
    }
  }, [activeTab, fetchLowStockAlerts, fetchMovements])

  // Open Operation Modal Helper
  const openOperation = (
    item: {
      id: string
      name: string
      sku: string
      unit: string
      currentStock: number
      minStockThreshold?: number
    },
    op: OperationType = 'RECEIVE'
  ) => {
    setSelectedProductForOp(item)
    setOpInitialType(op)
    setIsOpModalOpen(true)
  }

  // Open History Modal Helper
  const openHistory = (item: { id: string; name: string; sku: string; unit: string }) => {
    setSelectedProductForHistory(item)
    setIsHistoryModalOpen(true)
  }

  const handleOperationSuccess = (_newQuantity: number, message: string) => {
    showToast(message, 'success')
    fetchInventory()
    if (activeTab === 'alerts') fetchLowStockAlerts()
    if (activeTab === 'movements') fetchMovements()
  }

  const handleClearFilters = () => {
    setSearch('')
    setSelectedCategory('')
    setStockStatusFilter('all')
    setPage(1)
  }

  const hasActiveFilters = search || selectedCategory || stockStatusFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <PageHeader
        title="Inventory"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchInventory()
                if (activeTab === 'alerts') fetchLowStockAlerts()
                if (activeTab === 'movements') fetchMovements()
              }}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Tracked SKUs"
          value={metrics.totalItems.toLocaleString()}
          icon={<Boxes className="w-5 h-5 text-indigo-600" />}
          subtitle="Registered catalog items"
          statusBadge={{ text: 'Catalog Tracked', variant: 'neutral' }}
        />

        <MetricCard
          title="Total Stock Units"
          value={metrics.totalUnits.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          icon={<PackagePlus className="w-5 h-5 text-emerald-600" />}
          subtitle="Physical on-hand units"
          statusBadge={{ text: 'Aggregate Balance', variant: 'neutral' }}
        />

        <div
          onClick={() => {
            setActiveTab('alerts')
            fetchLowStockAlerts()
          }}
          className="cursor-pointer transition hover:scale-[1.01]"
        >
          <MetricCard
            title="Low-Stock Alerts"
            value={metrics.lowStockCount.toString()}
            icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
            subtitle="Items at or below safety point"
            statusBadge={{
              text: metrics.lowStockCount > 0 ? 'Requires Reorder' : 'All Safe',
              variant: metrics.lowStockCount > 0 ? 'warning' : 'success',
            }}
          />
        </div>

        <div
          onClick={() => {
            setStockStatusFilter('out')
            setActiveTab('balances')
          }}
          className="cursor-pointer transition hover:scale-[1.01]"
        >
          <MetricCard
            title="Out of Stock"
            value={metrics.outOfStockCount.toString()}
            icon={<AlertOctagon className="w-5 h-5 text-rose-600" />}
            subtitle="SKUs with zero balance"
            statusBadge={{
              text: metrics.outOfStockCount > 0 ? 'Urgent Reorder' : 'No Depletions',
              variant: metrics.outOfStockCount > 0 ? 'danger' : 'success',
            }}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200/90 gap-6">
        <button
          onClick={() => setActiveTab('balances')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'balances'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4 text-emerald-600" />
          <span>Stock Balances</span>
          <span className="text-[11px] bg-slate-100 text-slate-700 font-tabular font-medium px-2 py-0.5 rounded-full border border-slate-200/60">
            {metrics.totalItems}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('alerts')
            fetchLowStockAlerts()
          }}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'alerts'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className={`w-4 h-4 ${metrics.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
          <span>Low Stock Alerts</span>
          {metrics.lowStockCount > 0 && (
            <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200/70 font-tabular font-bold px-2 py-0.5 rounded-full">
              {metrics.lowStockCount}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('movements')
            fetchMovements()
          }}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'movements'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4 text-slate-500" />
          <span>Movement Audit Ledger</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STOCK BALANCES */}
      {/* ========================================================================= */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex flex-1 flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="w-full sm:w-72">
                <SearchInput
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  onClear={() => {
                    setSearch('')
                    setPage(1)
                  }}
                  placeholder="Search by product or SKU..."
                />
              </div>

              {/* Category Filter */}
              <div className="w-full sm:w-52">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value)
                    setPage(1)
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                >
                  <option value="">All Categories ({categories.length})</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock Status Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => {
                    setStockStatusFilter('all')
                    setPage(1)
                  }}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                    stockStatusFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStockStatusFilter('low')
                    setPage(1)
                  }}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                    stockStatusFilter === 'low'
                      ? 'bg-white text-amber-800 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Low Stock
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStockStatusFilter('out')
                    setPage(1)
                  }}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                    stockStatusFilter === 'out'
                      ? 'bg-white text-rose-800 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Out of Stock
                </button>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 focus:outline-none self-end md:self-center transition"
              >
                <X className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Min Threshold</TableHead>
                  <TableHead numeric>Current Stock</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Stock Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={7} />
                ))}
              </TableBody>
            </Table>
          ) : error ? (
            <ErrorState
              title="Failed to Load Inventory"
              message={error}
              onRetry={fetchInventory}
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Boxes className="w-8 h-8 text-slate-400" />}
              title={hasActiveFilters ? 'No Matching Products' : 'No Inventory Items'}
              description={
                hasActiveFilters
                  ? 'Try modifying your search or filter options.'
                  : 'Add products to your catalog to begin tracking stock levels.'
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Min Threshold</TableHead>
                    <TableHead numeric>Current Stock</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Stock Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const p = item.product
                    const qty = item.stockLevel.quantity
                    const isOut = qty <= 0
                    const isLow = !isOut && p.minStockThreshold > 0 && qty <= p.minStockThreshold

                    return (
                      <TableRow key={p.id}>
                        {/* Product Info with Packshot */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden border border-slate-200/90 bg-white p-0.5 shadow-2xs">
                              <ProductImage
                                src={p.imageUrl}
                                alt={p.name}
                                aspectRatio="square"
                              />
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 block truncate max-w-[200px] sm:max-w-[240px]">
                                {p.name}
                              </span>
                              {p.brand && <span className="text-xs text-slate-400 block truncate max-w-[200px]">{p.brand}</span>}
                            </div>
                          </div>
                        </TableCell>

                        {/* SKU */}
                        <TableCell>
                          <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/60 inline-block">
                            {p.sku}
                          </span>
                        </TableCell>

                        {/* Category */}
                        <TableCell>
                          {p.category ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                              {p.category.name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Uncategorized</span>
                          )}
                        </TableCell>

                        {/* Safety Threshold */}
                        <TableCell className="text-center font-tabular text-xs text-slate-600">
                          {p.minStockThreshold > 0 ? (
                            <span>
                              {p.minStockThreshold} <span className="text-[11px] text-slate-400">{p.unit}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </TableCell>

                        {/* Current Stock */}
                        <TableCell numeric className="font-tabular text-sm font-bold text-slate-900">
                          {qty.toLocaleString()}{' '}
                          <span className="text-xs font-normal text-slate-500">{p.unit}</span>
                        </TableCell>

                        {/* Health Status */}
                        <TableCell className="text-center">
                          {isOut ? (
                            <Badge variant="danger" size="sm">
                              Out of Stock
                            </Badge>
                          ) : isLow ? (
                            <Badge variant="warning" size="sm">
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm">
                              In Stock
                            </Badge>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openOperation(
                                  {
                                    id: p.id,
                                    name: p.name,
                                    sku: p.sku,
                                    unit: p.unit,
                                    currentStock: qty,
                                    minStockThreshold: p.minStockThreshold,
                                  },
                                  isOut || isLow ? 'RECEIVE' : 'ADJUST'
                                )
                              }
                              title="Perform stock operation"
                            >
                              Manage Stock
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                openHistory({
                                  id: p.id,
                                  name: p.name,
                                  sku: p.sku,
                                  unit: p.unit,
                                })
                              }
                              title="View movement history"
                            >
                              <History className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl bg-white border border-slate-200/90 text-xs text-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                  <span>
                    Showing <strong className="text-slate-900 font-tabular">{((page - 1) * limit) + 1}</strong> to{' '}
                    <strong className="text-slate-900 font-tabular">{Math.min(page * limit, totalCount)}</strong> of <strong className="text-slate-900 font-tabular">{totalCount}</strong> items
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="px-2 font-tabular font-medium text-slate-700">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LOW STOCK ALERTS */}
      {/* ========================================================================= */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200/60">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-amber-950 m-0">
                  {lowStockItems.length} Product{lowStockItems.length === 1 ? '' : 's'} Below Reorder Point
                </h4>
                <p className="text-xs text-amber-800/90 m-0 mt-0.5">
                  Items listed here have breached safety stock thresholds and require replenishment orders.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLowStockAlerts}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loadingAlerts ? 'animate-spin' : ''}`} />}
            >
              Check Now
            </Button>
          </div>

          {loadingAlerts ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead numeric>Current Stock</TableHead>
                  <TableHead className="text-center">Threshold</TableHead>
                  <TableHead numeric>Deficit Needed</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={7} />
                ))}
              </TableBody>
            </Table>
          ) : lowStockItems.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-8 h-8 text-emerald-500" />}
              title="All Stock Levels Healthy"
              description="No active catalog items are currently below their minimum safety thresholds."
              className="py-12 bg-white rounded-xl border border-slate-200/90"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead numeric>Current Stock</TableHead>
                  <TableHead className="text-center">Safety Point</TableHead>
                  <TableHead numeric>Replenishment Deficit</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden border border-slate-200/90 bg-white p-0.5 shadow-2xs">
                          <ProductImage
                            src={item.imageUrl}
                            alt={item.name}
                            aspectRatio="square"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 block truncate max-w-[200px] sm:max-w-[240px]">
                            {item.name}
                          </span>
                          {item.brand && <span className="text-xs text-slate-400 block truncate max-w-[200px]">{item.brand}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/60 inline-block">
                        {item.sku}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{item.category}</span>
                    </TableCell>
                    <TableCell numeric className="font-tabular text-xs font-bold text-rose-700">
                      {item.currentQuantity.toLocaleString()} {item.unit}
                    </TableCell>
                    <TableCell className="text-center font-tabular text-xs text-slate-600">
                      {item.minStockThreshold} {item.unit}
                    </TableCell>
                    <TableCell numeric className="font-tabular text-xs font-semibold text-amber-800">
                      +{item.deficit.toLocaleString()} {item.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          openOperation(
                            {
                              id: item.productId,
                              name: item.name,
                              sku: item.sku,
                              unit: item.unit,
                              currentStock: item.currentQuantity,
                              minStockThreshold: item.minStockThreshold,
                            },
                            'RECEIVE'
                          )
                        }
                        leftIcon={<PackagePlus className="w-3.5 h-3.5" />}
                      >
                        Receive Stock
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MOVEMENT AUDIT LEDGER */}
      {/* ========================================================================= */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          {/* Movement Type Filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Filter Type:</span>
              <select
                value={movementTypeFilter}
                onChange={(e) => {
                  setMovementTypeFilter(e.target.value)
                  setMovementsPage(1)
                }}
                className="rounded-lg border border-slate-200 bg-white py-1 px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">All Movement Types</option>
                <option value="STOCK_IN">Stock In (Deliveries)</option>
                <option value="STOCK_OUT">Stock Out (Issues)</option>
                <option value="ADJUSTMENT_IN">Adjustment In</option>
                <option value="ADJUSTMENT_OUT">Adjustment Out</option>
                <option value="DAMAGE">Damaged Goods</option>
                <option value="LOSS">Loss & Shrinkage</option>
                <option value="RETURN">Customer Returns</option>
                <option value="OPENING_STOCK">Opening Stock</option>
              </select>
            </div>
            <span className="text-[11px] text-slate-400">
              Immutable audit ledger. Protected against modification.
            </span>
          </div>

          {loadingMovements ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead numeric>Quantity Change</TableHead>
                  <TableHead numeric>Progression</TableHead>
                  <TableHead>Reason / Notes</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Recorded By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={8} />
                ))}
              </TableBody>
            </Table>
          ) : movements.length === 0 ? (
            <EmptyState
              icon={<History className="w-8 h-8 text-slate-400" />}
              title="No Movement Records Found"
              description="No inventory movement records match the selected filter."
              className="py-12 bg-white rounded-xl border border-slate-200/90"
            />
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead numeric>Change</TableHead>
                    <TableHead numeric>Progression</TableHead>
                    <TableHead>Reason / Notes</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Recorded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => {
                    const delta = Number(m.quantityChange)
                    const isPositive = delta > 0
                    const isNegative = delta < 0

                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-semibold text-xs text-slate-900 block">
                              {m.product?.name || 'Unknown Item'}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">
                              {m.product?.sku}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              m.type === 'STOCK_IN'
                                ? 'success'
                                : m.type === 'STOCK_OUT'
                                ? 'neutral'
                                : ['DAMAGE', 'LOSS'].includes(m.type)
                                ? 'danger'
                                : m.type === 'RETURN'
                                ? 'info'
                                : 'warning'
                            }
                            size="sm"
                          >
                            {m.type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell numeric className="font-tabular text-xs font-semibold">
                          <span
                            className={
                              isPositive
                                ? 'text-emerald-700'
                                : isNegative
                                ? 'text-rose-700'
                                : 'text-slate-600'
                            }
                          >
                            {isPositive ? `+${delta.toLocaleString()}` : delta.toLocaleString()} {m.product?.unit}
                          </span>
                        </TableCell>
                        <TableCell numeric className="font-tabular text-xs text-slate-500 whitespace-nowrap">
                          {Number(m.previousQuantity).toLocaleString()} &rarr;{' '}
                          <strong className="text-slate-900">{Number(m.resultingQuantity).toLocaleString()}</strong>
                        </TableCell>
                        <TableCell className="text-xs text-slate-700 max-w-xs truncate" title={m.reason || undefined}>
                          {m.reason || '—'}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-500">
                          {m.reference ? (
                            <span className="inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] border border-slate-200/60">
                              <FileText className="w-2.5 h-2.5 text-slate-400" />
                              {m.reference}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {m.user?.name || 'System'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Movements Pagination */}
              {movementsTotalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl bg-white border border-slate-200/90 text-xs text-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                  <span className="text-slate-500">
                    Audit page <strong className="text-slate-900 font-tabular">{movementsPage}</strong> of{' '}
                    <strong className="text-slate-900 font-tabular">{movementsTotalPages}</strong>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={movementsPage <= 1}
                      onClick={() => setMovementsPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="px-2 font-tabular font-medium text-slate-700">
                      Page {movementsPage} of {movementsTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={movementsPage >= movementsTotalPages}
                      onClick={() => setMovementsPage((p) => Math.min(movementsTotalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Operation Modal */}
      {selectedProductForOp && (
        <StockOperationModal
          isOpen={isOpModalOpen}
          onClose={() => {
            setIsOpModalOpen(false)
            setSelectedProductForOp(null)
          }}
          businessId={businessId!}
          product={selectedProductForOp}
          initialOperation={opInitialType}
          onSuccess={handleOperationSuccess}
        />
      )}

      {/* History Ledger Modal */}
      {selectedProductForHistory && (
        <MovementHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false)
            setSelectedProductForHistory(null)
          }}
          businessId={businessId!}
          productId={selectedProductForHistory.id}
          productName={selectedProductForHistory.name}
          productSku={selectedProductForHistory.sku}
          unit={selectedProductForHistory.unit}
        />
      )}
    </div>
  )
}

export default InventoryPage
