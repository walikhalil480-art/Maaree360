import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api/client'
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
  PurchaseOrderListResponse,
  PurchaseOrderSummaryResponse,
} from '../types/purchaseOrder'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { SearchInput } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { MetricCard } from '../components/ui/MetricCard'
import { EmptyState } from '../components/ui/EmptyState'
import { TableRowSkeleton } from '../components/ui/LoadingSkeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { Toast, type ToastProps } from '../components/ui/Toast'
import { PurchaseOrderFormModal } from '../components/purchaseOrders/PurchaseOrderFormModal'
import { PurchaseOrderDetailModal } from '../components/purchaseOrders/PurchaseOrderDetailModal'
import { ReceiveDeliveryModal } from '../components/purchaseOrders/ReceiveDeliveryModal'
import {
  Truck,
  Plus,
  Eye,
  Edit2,
  PackageCheck,
  Building2,
  DollarSign,
  CheckCircle2,
  FileText,
} from 'lucide-react'

export const PurchaseOrdersPage: React.FC = () => {
  const { activeBusiness } = useAuth()
  const businessId = activeBusiness?.id
  const currency = activeBusiness?.currency || 'KES'
  const userRole = activeBusiness?.role

  const isCashier = userRole === 'CASHIER'
  const canCreate = userRole === 'OWNER' || userRole === 'MANAGER'
  const canReceive = !isCashier // Owner, Manager, Stock Clerk can receive

  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [summary, setSummary] = useState<PurchaseOrderSummaryResponse['summary'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Search
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const limit = 10
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null)
  const [detailOrder, setDetailOrder] = useState<PurchaseOrder | null>(null)
  const [receiveOrder, setReceiveOrder] = useState<PurchaseOrder | null>(null)

  // Toast
  const [toast, setToast] = useState<Omit<ToastProps, 'onClose'> | null>(null)
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
  }

  // Check URL params for auto-open create modal with supplier preselected
  useEffect(() => {
    if (searchParams.get('create') === 'true' && canCreate) {
      setIsFormOpen(true)
      // clear param
      searchParams.delete('create')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, canCreate, setSearchParams])

  // Fetch summary metrics
  const fetchSummary = useCallback(async () => {
    if (!businessId) return
    try {
      const res = await apiFetch<PurchaseOrderSummaryResponse>(
        `/api/v1/businesses/${businessId}/purchase-orders/summary`
      )
      if (res.success) {
        setSummary(res.summary)
      }
    } catch (err: any) {
      console.error('Failed to load purchase orders summary', err)
    }
  }, [businessId])

  // Fetch Orders
  const fetchOrders = useCallback(async () => {
    if (!businessId) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (search.trim()) params.append('search', search.trim())
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      params.append('page', page.toString())
      params.append('limit', limit.toString())

      const res = await apiFetch<PurchaseOrderListResponse>(
        `/api/v1/businesses/${businessId}/purchase-orders?${params.toString()}`
      )

      if (res.success) {
        setOrders(res.purchaseOrders)
        setTotalPages(res.pagination.totalPages)
        setTotalCount(res.pagination.total)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load purchase orders.')
    } finally {
      setLoading(false)
    }
  }, [businessId, search, statusFilter, page, limit])

  useEffect(() => {
    fetchOrders()
    fetchSummary()
  }, [fetchOrders, fetchSummary])

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status)
    setPage(1)
  }

  // Status Badge Component
  const renderStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="neutral" dot size="sm">Draft</Badge>
      case 'ORDERED':
        return <Badge variant="info" dot size="sm">Ordered</Badge>
      case 'PARTIALLY_RECEIVED':
        return <Badge variant="warning" dot size="sm">Partially Received</Badge>
      case 'RECEIVED':
        return <Badge variant="success" dot size="sm">Received</Badge>
      case 'CANCELLED':
        return <Badge variant="danger" dot size="sm">Cancelled</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title="Purchase Orders"
        actions={
          canCreate ? (
            <Button
              variant="primary"
              onClick={() => {
                setEditingOrder(null)
                setIsFormOpen(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Purchase Order
            </Button>
          ) : undefined
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Orders"
          value={summary?.totalOrders ?? totalCount}
          icon={<FileText className="w-5 h-5 text-slate-700" />}
          subtitle="All purchasing records"
        />
        <MetricCard
          title="Pending Deliveries"
          value={
            summary
              ? summary.orderedOrders + summary.partiallyReceivedOrders
              : 0
          }
          icon={<Truck className="w-5 h-5 text-amber-700" />}
          subtitle="Awaiting goods arrival"
        />
        <MetricCard
          title="Fully Received"
          value={summary?.receivedOrders ?? 0}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-700" />}
          subtitle="Stock replenished"
        />
        <MetricCard
          title="Purchases Value"
          value={`${currency} ${(summary?.totalPurchasesValue ?? 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`}
          icon={<DollarSign className="w-5 h-5 text-slate-800" />}
          subtitle="Completed stock value"
        />
      </div>

      {/* Status Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100">
          {[
            { label: 'All Orders', value: 'ALL', count: summary?.totalOrders },
            { label: 'Drafts', value: 'DRAFT', count: summary?.draftOrders },
            { label: 'Ordered', value: 'ORDERED', count: summary?.orderedOrders },
            {
              label: 'Partially Received',
              value: 'PARTIALLY_RECEIVED',
              count: summary?.partiallyReceivedOrders,
            },
            { label: 'Received', value: 'RECEIVED', count: summary?.receivedOrders },
            { label: 'Cancelled', value: 'CANCELLED', count: summary?.cancelledOrders },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleStatusFilterChange(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === tab.value
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-tabular ${
                    statusFilter === tab.value
                      ? 'bg-slate-700 text-slate-100'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="w-full sm:w-96">
          <SearchInput
            placeholder="Search by order # (PO-0001) or supplier..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onClear={() => handleSearchChange('')}
          />
        </div>
      </div>

      {/* Error State */}
      {error && !loading && (
        <ErrorState
          title="Could not load purchase orders"
          message={error}
          onRetry={fetchOrders}
        />
      )}

      {/* Orders Table */}
      {!error && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead numeric>Items</TableHead>
                <TableHead numeric>Total ({currency})</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead numeric>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <>
                  <TableRowSkeleton columns={8} />
                  <TableRowSkeleton columns={8} />
                  <TableRowSkeleton columns={8} />
                  <TableRowSkeleton columns={8} />
                </>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <EmptyState
                      icon={<Truck className="w-10 h-10 text-slate-300" />}
                      title={search ? 'No orders match your criteria' : 'No purchase orders found'}
                      description={
                        search
                          ? 'Try adjusting your search terms or filter tabs.'
                          : 'Create your first purchase order to replenish products from suppliers.'
                      }
                      action={
                        !search && canCreate && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setEditingOrder(null)
                              setIsFormOpen(true)
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1.5" />
                            Create Purchase Order
                          </Button>
                        )
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((po) => {
                  const itemsList = po.items || []
                  const totalOrdered = itemsList.reduce(
                    (acc, i) => acc + Number(i.quantityOrdered),
                    0
                  )
                  const totalReceived = itemsList.reduce(
                    (acc, i) => acc + Number(i.quantityReceived),
                    0
                  )
                  const fulfillmentPct =
                    totalOrdered > 0
                      ? Math.min(100, Math.round((totalReceived / totalOrdered) * 100))
                      : 0

                  return (
                    <TableRow key={po.id}>
                      {/* Order Number */}
                      <TableCell>
                        <span className="font-mono font-bold text-slate-900 block text-xs font-tabular">
                          {po.orderNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 font-tabular">
                          {new Date(po.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>

                      {/* Supplier */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-800 text-xs truncate max-w-[160px]">
                            {po.supplier.name}
                          </span>
                        </div>
                      </TableCell>

                      {/* Dates */}
                      <TableCell>
                        <div className="text-[11px] text-slate-600 space-y-0.5 font-tabular">
                          {po.orderDate && (
                            <div>
                              Ordered: {new Date(po.orderDate).toLocaleDateString()}
                            </div>
                          )}
                          {po.expectedDeliveryDate && (
                            <div className="text-slate-400">
                              Exp: {new Date(po.expectedDeliveryDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Items */}
                      <TableCell numeric className="font-tabular">
                        <span className="text-xs text-slate-700 font-medium">
                          {itemsList.length} {itemsList.length === 1 ? 'line' : 'lines'}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-tabular">
                          ({totalOrdered} units)
                        </span>
                      </TableCell>

                      {/* Total */}
                      <TableCell numeric>
                        <span className="font-mono font-bold text-slate-900 text-xs font-tabular">
                          {Number(po.total).toLocaleString('en-KE', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>{renderStatusBadge(po.status)}</TableCell>

                      {/* Fulfillment */}
                      <TableCell>
                        <div className="w-28 space-y-1">
                          <div className="flex justify-between text-[10px] font-medium text-slate-600 font-tabular">
                            <span>
                              {totalReceived} / {totalOrdered}
                            </span>
                            <span>{fulfillmentPct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                fulfillmentPct === 100
                                  ? 'bg-emerald-600'
                                  : fulfillmentPct > 0
                                  ? 'bg-amber-500'
                                  : 'bg-slate-300'
                              }`}
                              style={{ width: `${fulfillmentPct}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell numeric>
                        <div className="flex items-center justify-end gap-1">
                          {/* View Details */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailOrder(po)}
                            className="p-1.5 h-auto text-slate-500 hover:text-slate-900"
                            title="View Order Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          {/* Quick Receive Goods (Ordered or Partially Received) */}
                          {(po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED') &&
                            canReceive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReceiveOrder(po)}
                                className="p-1.5 h-auto text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                                title="Receive Goods Delivery"
                              >
                                <PackageCheck className="w-3.5 h-3.5" />
                              </Button>
                            )}

                          {/* Quick Edit (Draft) */}
                          {po.status === 'DRAFT' && canCreate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingOrder(po)
                                setIsFormOpen(true)
                              }}
                              className="p-1.5 h-auto text-slate-500 hover:text-slate-900"
                              title="Edit Draft Order"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 text-xs text-slate-500 font-tabular">
              <span>
                Showing {(page - 1) * limit + 1} to{' '}
                {Math.min(page * limit, totalCount)} of {totalCount} orders
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
                <span className="px-2 font-medium text-slate-700 font-tabular">
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

      {/* Create / Edit PO Modal */}
      <PurchaseOrderFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingOrder(null)
        }}
        order={editingOrder}
        businessId={businessId || ''}
        currency={currency}
        initialSupplierId={searchParams.get('supplierId') || undefined}
        onSaved={(saved) => {
          showToast(
            editingOrder
              ? `Purchase order ${saved.orderNumber} updated successfully.`
              : `Draft purchase order ${saved.orderNumber} created successfully.`,
            'success'
          )
          fetchOrders()
          fetchSummary()
        }}
      />

      {/* PO Detail View Modal */}
      <PurchaseOrderDetailModal
        isOpen={Boolean(detailOrder)}
        onClose={() => setDetailOrder(null)}
        order={detailOrder}
        businessId={businessId || ''}
        currency={currency}
        userRole={userRole}
        onEdit={(ord) => {
          setDetailOrder(null)
          setEditingOrder(ord)
          setIsFormOpen(true)
        }}
        onOrderUpdated={(updated) => {
          setDetailOrder(updated)
          showToast(`Order ${updated.orderNumber} updated.`, 'info')
          fetchOrders()
          fetchSummary()
        }}
        onOpenReceiveModal={(ord) => {
          setReceiveOrder(ord)
        }}
      />

      {/* Receive Goods Delivery Modal */}
      <ReceiveDeliveryModal
        isOpen={Boolean(receiveOrder)}
        onClose={() => setReceiveOrder(null)}
        order={receiveOrder}
        businessId={businessId || ''}
        onReceived={(updated, receipt) => {
          showToast(
            `Delivery receipt ${receipt.receiptNumber} recorded and stock balances updated.`,
            'success'
          )
          // If detail modal was open with this order, update it too
          if (detailOrder?.id === updated.id) {
            setDetailOrder(updated)
          }
          fetchOrders()
          fetchSummary()
        }}
      />
    </div>
  )
}
