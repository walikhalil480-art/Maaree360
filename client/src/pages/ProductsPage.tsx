import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch, ApiError } from '../api/client'
import type { Product, Category, ProductListResponse, CategoryListResponse } from '../types/product'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { SearchInput } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, SortableTableHead } from '../components/ui/Table'
import { EmptyState } from '../components/ui/EmptyState'
import { TableRowSkeleton } from '../components/ui/LoadingSkeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { Toast, type ToastProps } from '../components/ui/Toast'
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog'
import { ProductFormModal } from '../components/products/ProductFormModal'
import { ProductDetailModal } from '../components/products/ProductDetailModal'
import { CategoryManagerModal } from '../components/products/CategoryManagerModal'
import { StockOperationModal } from '../components/inventory/StockOperationModal'
import { ProductImage } from '../components/ui/ProductImage'
import {
  Package,
  Plus,
  FolderTree,
  Eye,
  Edit2,
  Archive,
  RefreshCw,
  Barcode,
  Boxes,
  X,
  List,
  LayoutGrid,
} from 'lucide-react'

export const ProductsPage: React.FC = () => {
  const { activeBusiness } = useAuth()
  const businessId = activeBusiness?.id
  const currency = activeBusiness?.currency || 'KES'
  const navigate = useNavigate()

  // Data states
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters, Search, Pagination
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'true' | 'false'>('all')
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'sellingPrice' | 'costPrice'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [isStockModalOpen, setIsStockModalOpen] = useState(false)
  const [selectedStockProduct, setSelectedStockProduct] = useState<{
    id: string
    name: string
    sku: string
    unit: string
    currentStock: number
    minStockThreshold?: number
  } | null>(null)

  // Archive Confirmation
  const [statusChangeProduct, setStatusChangeProduct] = useState<Product | null>(null)
  const [statusChangeLoading, setStatusChangeLoading] = useState(false)

  // Toast notification state
  const [toast, setToast] = useState<Omit<ToastProps, 'onClose'> | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
  }

  // Fetch Categories
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

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
        isActive: statusFilter,
      })

      if (search.trim()) {
        params.set('search', search.trim())
      }
      if (selectedCategory) {
        params.set('categoryId', selectedCategory)
      }

      const res = await apiFetch<ProductListResponse>(
        `/api/v1/businesses/${businessId}/products?${params.toString()}`
      )

      if (res.success) {
        setProducts(res.products)
        setTotalPages(res.pagination.totalPages)
        setTotalCount(res.pagination.total)
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to fetch products'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [businessId, page, limit, search, selectedCategory, statusFilter, sortBy, sortOrder])

  // Initial loads and react to filter changes
  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Clear all filters
  const handleClearFilters = () => {
    setSearch('')
    setSelectedCategory('')
    setStatusFilter('all')
    setSortBy('createdAt')
    setSortOrder('desc')
    setPage(1)
  }

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key as any)
      setSortOrder('asc')
    }
  }

  const hasActiveFilters = Boolean(search || selectedCategory || statusFilter !== 'all')

  // Handle Create / Edit callbacks
  const handleProductSuccess = (savedProduct: Product, isEdit: boolean) => {
    showToast(
      isEdit
        ? `Product "${savedProduct.name}" updated successfully`
        : `Product "${savedProduct.name}" created successfully`,
      'success'
    )
    fetchProducts()
    fetchCategories() // refresh product counts
  }

  // Handle Archive / Reactivate
  const handleConfirmStatusChange = async () => {
    if (!statusChangeProduct || !businessId) return
    setStatusChangeLoading(true)
    const newStatus = !statusChangeProduct.isActive
    const endpoint = newStatus ? 'reactivate' : 'archive'

    try {
      await apiFetch(`/api/v1/businesses/${businessId}/products/${statusChangeProduct.id}/${endpoint}`, {
        method: 'PATCH',
      })
      showToast(
        `Product "${statusChangeProduct.name}" ${newStatus ? 'reactivated' : 'archived'}`,
        'success'
      )
      setStatusChangeProduct(null)
      fetchProducts()
      if (detailProduct && detailProduct.id === statusChangeProduct.id) {
        setDetailProduct((prev) => (prev ? { ...prev, isActive: newStatus } : null))
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Status update failed'
      showToast(msg, 'error')
    } finally {
      setStatusChangeLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title="Products"
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/scan')}
              className="flex items-center gap-1.5"
            >
              <Barcode className="w-4 h-4 text-emerald-600" />
              <span>Scan Barcode</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCategoryManagerOpen(true)}
              className="flex items-center gap-1.5"
            >
              <FolderTree className="w-4 h-4 text-emerald-600" />
              <span>Categories</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                {categories.length}
              </span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingProduct(null)
                setIsFormOpen(true)
              }}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </Button>
          </div>
        }
      />

      {/* Search and Filters Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="lg:col-span-6">
            <SearchInput
              placeholder="Search by product name, SKU, or brand..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              onClear={() => {
                setSearch('')
                setPage(1)
              }}
            />
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setPage(1)
              }}
              className="w-full rounded-lg border border-slate-200 bg-white text-slate-800 text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | 'true' | 'false')
                setPage(1)
              }}
              className="w-full rounded-lg border border-slate-200 bg-white text-slate-800 text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
            >
              <option value="all">All Statuses (Active & Archived)</option>
              <option value="true">Active Only</option>
              <option value="false">Archived Only</option>
            </select>
          </div>
        </div>

        {/* Active Filters & View Mode Switcher Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3 text-slate-500">
            <span>
              Catalog Total: <strong className="text-slate-800 font-tabular">{totalCount}</strong> products
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-medium text-[11px] border border-emerald-200/60">
                Filtered view
              </span>
            )}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 focus:outline-none transition ml-1"
              >
                <X className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>

          {/* Table / Grid Switcher */}
          <div className="inline-flex items-center rounded-lg border border-slate-200/90 bg-slate-100/80 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 select-none ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table view"
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 select-none ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Data Content */}
      {loading ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead numeric>Cost Price</TableHead>
              <TableHead numeric>Selling Price</TableHead>
              <TableHead numeric>Margin</TableHead>
              <TableHead numeric>Stock Level</TableHead>
              <TableHead className="text-center">Threshold</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} columns={11} />
            ))}
          </TableBody>
        </Table>
      ) : error ? (
        <ErrorState
          title="Failed to Load Products"
          message={error}
          onRetry={fetchProducts}
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8 text-slate-400" />}
          title={hasActiveFilters ? 'No Matching Products Found' : 'No Products in Catalog'}
          description={
            hasActiveFilters
              ? 'Try modifying your search or filter criteria to find the product you need.'
              : 'Add your first product to begin managing items, prices, and gross margins.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingProduct(null)
                  setIsFormOpen(true)
                }}
              >
                <Plus className="w-4 h-4 mr-1.5" /> Add First Product
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {products.map((p) => {
                const selling = Number(p.sellingPrice) || 0
                const currentQty =
                  p.stockLevel?.quantity != null ? Number(p.stockLevel.quantity) : 0
                const threshold = Number(p.minStockThreshold) || 0
                const isOutOfStock = currentQty <= 0
                const isLowStock = !isOutOfStock && threshold > 0 && currentQty <= threshold

                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
                  >
                    {/* Top / Image Area */}
                    <div className="p-3 bg-slate-50/70 relative border-b border-slate-100">
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 truncate max-w-[120px]">
                          {p.category?.name || 'Uncategorized'}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                              : isLowStock
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          }`}
                        >
                          {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDetailProduct(p)}
                        className="w-full aspect-square rounded-lg overflow-hidden bg-white border border-slate-200/80 p-2 flex items-center justify-center cursor-pointer group-hover:border-emerald-500/60 transition-all focus:outline-none"
                        title={`View details for ${p.name}`}
                      >
                        <ProductImage
                          src={p.imageUrl}
                          alt={p.name}
                          aspectRatio="square"
                          className="max-h-36 object-contain group-hover:scale-105 transition-transform duration-200"
                        />
                      </button>
                    </div>

                    {/* Content Details */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => setDetailProduct(p)}
                          className="text-xs sm:text-sm font-semibold text-slate-900 hover:text-emerald-700 text-left line-clamp-2 transition-colors focus:outline-none"
                          title={p.name}
                        >
                          {p.name}
                        </button>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200/60">
                            {p.sku}
                          </span>
                          {p.brand && <span className="truncate max-w-[90px] text-slate-400">{p.brand}</span>}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <div className="text-[10px] uppercase font-semibold text-slate-400">
                              Selling Price
                            </div>
                            <div className="text-sm font-bold text-slate-900 font-tabular">
                              {currency} {selling.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase font-semibold text-slate-400">
                              Available
                            </div>
                            <div className="text-xs font-semibold text-slate-800 font-tabular">
                              {currentQty} <span className="font-normal text-slate-400">{p.unit}</span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDetailProduct(p)}
                            className="px-1.5 py-1 text-xs justify-center"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingProduct(p)
                              setIsFormOpen(true)
                            }}
                            className="px-1.5 py-1 text-xs justify-center"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedStockProduct({
                                id: p.id,
                                name: p.name,
                                sku: p.sku,
                                unit: p.unit,
                                currentStock: currentQty,
                                minStockThreshold: p.minStockThreshold,
                              })
                              setIsStockModalOpen(true)
                            }}
                            className="px-1.5 py-1 text-xs justify-center"
                            title="Receive / Adjust Stock"
                          >
                            <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  sortKey="name"
                  currentSortKey={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                >
                  Product
                </SortableTableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <SortableTableHead
                  numeric
                  sortKey="costPrice"
                  currentSortKey={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                >
                  Cost Price
                </SortableTableHead>
                <SortableTableHead
                  numeric
                  sortKey="sellingPrice"
                  currentSortKey={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                >
                  Selling Price
                </SortableTableHead>
                <TableHead numeric>Margin</TableHead>
                <TableHead numeric>Stock Level</TableHead>
                <TableHead className="text-center">Threshold</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const cost = Number(p.costPrice) || 0
                const selling = Number(p.sellingPrice) || 0
                const margin = selling > 0 ? ((selling - cost) / selling) * 100 : 0

                return (
                  <TableRow key={p.id}>
                    {/* Name & Brand with Packshot (Clickable to open details) */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setDetailProduct(p)}
                          className="w-10 h-10 shrink-0 rounded-lg overflow-hidden border border-[#E2E8F0] bg-white p-0.5 shadow-2xs hover:border-[#059669] hover:scale-105 transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#059669]/30"
                          title={`View details for ${p.name}`}
                        >
                          <ProductImage
                            src={p.imageUrl}
                            alt={p.name}
                            aspectRatio="square"
                          />
                        </button>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setDetailProduct(p)}
                            className="font-semibold text-[#142B4A] hover:text-[#059669] hover:underline block truncate max-w-[200px] sm:max-w-[240px] text-left transition-colors focus:outline-none"
                            title={`View details for ${p.name}`}
                          >
                            {p.name}
                          </button>
                          <div className="flex items-center gap-2">
                            {p.brand && <span className="text-xs text-[#64748B] block truncate max-w-[140px]">{p.brand}</span>}
                            {p.imageUrl ? (
                              <span className="text-[10px] text-[#059669] font-medium bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/50">
                                Photo
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.2 rounded">
                                No photo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* SKU */}
                    <TableCell>
                      <div className="space-y-1">
                        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/60 inline-block">
                          {p.sku}
                        </span>
                        {p.codes && p.codes.length > 0 && (
                          <div
                            className="flex items-center gap-1 text-[11px] text-slate-500 font-mono"
                            title={`${p.codes.length} barcode/QR code(s) assigned`}
                          >
                            <Barcode className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{p.codes[0].code}</span>
                            {p.codes.length > 1 && (
                              <span className="text-[10px] text-slate-400">
                                +{p.codes.length - 1}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
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

                    {/* Unit */}
                    <TableCell className="capitalize text-slate-600 text-xs">{p.unit}</TableCell>

                    {/* Cost Price */}
                    <TableCell numeric className="font-tabular font-medium text-slate-600">
                      {currency} {cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>

                    {/* Selling Price */}
                    <TableCell numeric className="font-tabular font-bold text-slate-900">
                      {currency} {selling.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>

                    {/* Margin */}
                    <TableCell numeric>
                      <span
                        className={`inline-flex items-center font-tabular text-xs font-semibold px-2 py-0.5 rounded-md ${
                          margin >= 25
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                            : margin >= 10
                            ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                            : 'bg-rose-50 text-rose-800 border border-rose-200/60'
                        }`}
                      >
                        {margin.toFixed(1)}%
                      </span>
                    </TableCell>

                    {/* Stock Level */}
                    <TableCell numeric className="font-tabular text-xs font-semibold">
                      {p.stockLevel ? (
                        <span
                          className={
                            Number(p.stockLevel.quantity) <= 0
                              ? 'text-rose-700 font-bold'
                              : Number(p.stockLevel.quantity) <= p.minStockThreshold
                              ? 'text-amber-700 font-bold'
                              : 'text-slate-800'
                          }
                        >
                          {Number(p.stockLevel.quantity).toLocaleString()}{' '}
                          <span className="font-normal text-slate-400">{p.unit}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">0 {p.unit}</span>
                      )}
                    </TableCell>

                    {/* Min Threshold */}
                    <TableCell className="text-center font-tabular text-slate-600 text-xs">
                      {p.minStockThreshold > 0 ? p.minStockThreshold : '—'}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      <Badge variant={p.isActive ? 'success' : 'neutral'} dot size="sm">
                        {p.isActive ? 'Active' : 'Archived'}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStockProduct({
                              id: p.id,
                              name: p.name,
                              sku: p.sku,
                              unit: p.unit,
                              currentStock: p.stockLevel ? Number(p.stockLevel.quantity) : 0,
                              minStockThreshold: p.minStockThreshold,
                            })
                            setIsStockModalOpen(true)
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Manage Stock (Receive, Issue, Adjust)"
                        >
                          <Boxes className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailProduct(p)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(p)
                            setIsFormOpen(true)
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusChangeProduct(p)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            p.isActive
                              ? 'text-slate-400 hover:text-amber-700 hover:bg-amber-50'
                              : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={p.isActive ? 'Archive Product' : 'Reactivate Product'}
                        >
                          {p.isActive ? (
                            <Archive className="w-4 h-4" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          )}

          {/* Pagination Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl bg-white border border-slate-200/90 text-xs text-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-2">
              <span>
                Showing{' '}
                <strong className="text-slate-900 font-tabular">
                  {totalCount === 0 ? 0 : (page - 1) * limit + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-900 font-tabular">
                  {Math.min(page * limit, totalCount)}
                </strong>{' '}
                of <strong className="text-slate-900 font-tabular">{totalCount}</strong> products
              </span>
              <div className="ml-4 flex items-center gap-1.5">
                <span className="text-slate-400">Rows:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value))
                    setPage(1)
                  }}
                  className="rounded-lg border border-slate-200 bg-white py-1 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                Previous
              </Button>
              <span className="px-2 font-medium font-tabular text-slate-700">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Product Form Modal (Create / Edit) */}
      {businessId && (
        <ProductFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false)
            setEditingProduct(null)
          }}
          onSuccess={handleProductSuccess}
          product={editingProduct}
          categories={categories}
          businessId={businessId}
          currency={currency}
        />
      )}

      {/* Product Detail Modal */}
      {businessId && (
        <ProductDetailModal
          isOpen={Boolean(detailProduct)}
          onClose={() => setDetailProduct(null)}
          product={detailProduct}
          currency={currency}
          businessId={businessId}
          userRole={activeBusiness?.role || 'CASHIER'}
          onEdit={(p) => {
            setEditingProduct(p)
            setIsFormOpen(true)
          }}
          onToggleStatus={(p) => {
            setStatusChangeProduct(p)
          }}
          onProductUpdated={(updatedP) => {
            setProducts((prev) =>
              prev.map((item) => (item.id === updatedP.id ? { ...item, ...updatedP } : item))
            )
            setDetailProduct(updatedP)
          }}
        />
      )}

      {/* Category Manager Modal */}
      {businessId && (
        <CategoryManagerModal
          isOpen={isCategoryManagerOpen}
          onClose={() => setIsCategoryManagerOpen(false)}
          categories={categories}
          businessId={businessId}
          onCategoriesUpdated={fetchCategories}
          showToast={showToast}
        />
      )}

      {/* Stock Operation Modal */}
      {isStockModalOpen && selectedStockProduct && businessId && (
        <StockOperationModal
          isOpen={isStockModalOpen}
          onClose={() => {
            setIsStockModalOpen(false)
            setSelectedStockProduct(null)
          }}
          businessId={businessId}
          product={selectedStockProduct}
          initialOperation="RECEIVE"
          onSuccess={(_newQty, message) => {
            showToast(message, 'success')
            fetchProducts()
          }}
        />
      )}

      {/* Product Archive / Reactivate Confirmation Dialog */}
      {statusChangeProduct && (
        <ConfirmationDialog
          isOpen={Boolean(statusChangeProduct)}
          title={
            statusChangeProduct.isActive
              ? `Archive "${statusChangeProduct.name}"?`
              : `Reactivate "${statusChangeProduct.name}"?`
          }
          message={
            statusChangeProduct.isActive
              ? `Archiving this product will hide it from normal inventory workflows, but historical records will remain intact.`
              : `Reactivating this product will make it visible and active for inventory workflows.`
          }
          confirmText={statusChangeProduct.isActive ? 'Archive Product' : 'Reactivate Product'}
          variant={statusChangeProduct.isActive ? 'danger' : 'primary'}
          isLoading={statusChangeLoading}
          onConfirm={handleConfirmStatusChange}
          onCancel={() => setStatusChangeProduct(null)}
        />
      )}
    </div>
  )
}

export default ProductsPage
