import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api/client'
import type { Sale, SaleListResponse, SaleSummaryResponse, PaymentMethod, SaleStatus } from '../types/sale'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { EmptyState } from '../components/ui/EmptyState'
import { MetricCard } from '../components/ui/MetricCard'
import { SaleDetailModal } from '../components/pos/SaleDetailModal'
import { ReceiptModal } from '../components/pos/ReceiptModal'
import { CreateReturnModal } from '../components/returns/CreateReturnModal'
import { ReturnReceiptModal } from '../components/returns/ReturnReceiptModal'
import type { SaleReturn } from '../types/return'
import {
  ShoppingCart,
  Search,
  Eye,
  Printer,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CreditCard,
  RotateCcw,
} from 'lucide-react'

export const SalesHistoryPage: React.FC = () => {
  const { activeBusiness } = useAuth()
  const businessId = activeBusiness?.id
  const currency = activeBusiness?.currency || 'KES'

  // Sales list & pagination
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 15

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Summary metrics
  const [summary, setSummary] = useState<SaleSummaryResponse['summary'] | null>(null)

  // Modals
  const [selectedSaleForDetail, setSelectedSaleForDetail] = useState<Sale | null>(null)
  const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<Sale | null>(null)
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<Sale | null>(null)
  const [createdReturnReceipt, setCreatedReturnReceipt] = useState<SaleReturn | null>(null)

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    if (!businessId) return
    try {
      const res = await apiFetch<SaleSummaryResponse>(
        `/api/v1/businesses/${businessId}/sales/summary`
      )
      if (res && res.success && res.summary) {
        setSummary(res.summary)
      }
    } catch (err) {
      console.warn('Failed to load sales summary', err)
    }
  }, [businessId])

  // Fetch sales list
  const fetchSales = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', limit.toString())

      if (searchQuery.trim()) params.append('search', searchQuery.trim())
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (paymentMethodFilter !== 'ALL') params.append('paymentMethod', paymentMethodFilter)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const res = await apiFetch<SaleListResponse>(
        `/api/v1/businesses/${businessId}/sales?${params.toString()}`
      )

      if (res && res.success) {
        setSales(res.sales || [])
        setTotalCount(res.pagination.total)
        setTotalPages(res.pagination.totalPages)
      }
    } catch (err) {
      console.error('Failed to fetch sales history', err)
    } finally {
      setLoading(false)
    }
  }, [businessId, page, limit, searchQuery, statusFilter, paymentMethodFilter, startDate, endDate])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  const handleResetFilters = () => {
    setSearchQuery('')
    setStatusFilter('ALL')
    setPaymentMethodFilter('ALL')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const getStatusBadge = (status: SaleStatus, paymentStatus?: string) => {
    if (status === 'COMPLETED') {
      if (paymentStatus === 'REFUNDED') {
        return <Badge variant="danger" size="sm">Refunded</Badge>
      }
      if (paymentStatus === 'PARTIALLY_REFUNDED') {
        return <Badge variant="warning" size="sm">Partially Refunded</Badge>
      }
      return <Badge variant="success" size="sm">Completed</Badge>
    }
    switch (status) {
      case 'CANCELLED':
        return <Badge variant="danger" size="sm">Cancelled</Badge>
      case 'DRAFT':
        return <Badge variant="warning" size="sm">Draft</Badge>
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>
    }
  }

  const formatPaymentMethod = (method?: PaymentMethod | string) => {
    if (!method) return 'N/A'
    switch (method) {
      case 'CASH':
        return 'Cash'
      case 'MOBILE_MONEY':
        return 'M-Pesa / Mobile'
      case 'CARD':
        return 'Card'
      case 'BANK_TRANSFER':
        return 'Bank Transfer'
      case 'OTHER':
        return 'Other'
      default:
        return method
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Sales Transactions"
        badge={
          <Badge variant="neutral" size="md">
            {totalCount} Total Transactions
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/sales">
              <Button size="sm" variant="primary" leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}>
                Open POS Register
              </Button>
            </Link>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Today's Sales Revenue"
          value={`${currency} ${(summary?.todaySalesValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          subtitle={`${summary?.todayTransactionsCount || 0} checkouts completed today`}
          statusBadge={{
            text: (summary?.todayTransactionsCount || 0) > 0 ? 'Active Sales' : 'No Sales Yet',
            variant: (summary?.todayTransactionsCount || 0) > 0 ? 'success' : 'neutral',
          }}
        />

        <MetricCard
          title="Average Ticket Value"
          value={`${currency} ${(summary?.averageTransactionValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<ShoppingCart className="w-5 h-5 text-indigo-600" />}
          subtitle="Revenue per completed transaction"
          statusBadge={{ text: 'Overall Avg', variant: 'neutral' }}
        />

        <MetricCard
          title="Total Completed Orders"
          value={(summary?.totalCompletedTransactions || 0).toLocaleString()}
          icon={<CreditCard className="w-5 h-5 text-emerald-600" />}
          subtitle="All historical sales"
          statusBadge={{ text: 'Lifetime', variant: 'neutral' }}
        />

        <MetricCard
          title="M-Pesa / Mobile Volume"
          value={
            summary?.paymentMethodBreakdown?.find((p) => p.method === 'MOBILE_MONEY')
              ? `${currency} ${(summary.paymentMethodBreakdown.find((p) => p.method === 'MOBILE_MONEY')?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              : `${currency} 0.00`
          }
          icon={<CreditCard className="w-5 h-5 text-teal-600" />}
          subtitle="Mobile money payments"
          statusBadge={{ text: 'Mobile Money', variant: 'neutral' }}
        />
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 sm:p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
          {/* Search by receipt # or customer */}
          <div className="relative sm:col-span-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search receipt #, customer..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono transition"
            />
          </div>

          {/* Payment Method filter */}
          <div className="sm:col-span-3">
            <select
              value={paymentMethodFilter}
              onChange={(e) => {
                setPaymentMethodFilter(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="CASH">Cash</option>
              <option value="MOBILE_MONEY">M-Pesa / Mobile Money</option>
              <option value="CARD">Card / POS</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="DRAFT">Draft</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Date range filters & Reset */}
          <div className="sm:col-span-3 flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPage(1)
              }}
              title="Start Date"
              className="w-1/2 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPage(1)
              }}
              title="End Date"
              className="w-1/2 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            {(searchQuery || statusFilter !== 'ALL' || paymentMethodFilter !== 'ALL' || startDate || endDate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset filters"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sales Transactions Table */}
      {loading ? (
        <div className="bg-white border border-slate-200/90 rounded-xl p-8 text-center text-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading sales transactions...</p>
        </div>
      ) : sales.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <EmptyState
            icon={<ShoppingCart className="w-8 h-8 text-slate-300" />}
            title="No sales transactions found"
            description={
              searchQuery || statusFilter !== 'ALL' || paymentMethodFilter !== 'ALL' || startDate || endDate
                ? 'No transactions match the selected filter criteria. Try resetting your search filters.'
                : 'No sales have been recorded yet. Launch the POS Terminal to start processing retail orders.'
            }
            action={
              <Link to="/sales">
                <Button size="sm" variant="primary" leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}>
                  Open POS Register
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead numeric>Total Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => {
                const primaryPayment = sale.payments?.[0]

                return (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60 inline-block">
                        {sale.receiptNumber}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs text-slate-700">
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs font-medium text-slate-800">
                        {sale.cashier?.name || 'Staff'}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs text-slate-700">
                        {sale.customerName || 'Walk-in'}
                      </div>
                      {sale.customerPhone && (
                        <div className="text-[10px] text-slate-400 font-mono font-tabular">
                          {sale.customerPhone}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold font-tabular">
                        {sale.items?.length || 0}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-medium text-slate-800">
                        {formatPaymentMethod(primaryPayment?.method)}
                      </div>
                      {primaryPayment?.reference && (
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                          Ref: {primaryPayment.reference}
                        </div>
                      )}
                    </TableCell>

                    <TableCell numeric>
                      <div className="text-xs font-semibold font-tabular text-[#172033]">
                        {sale.currency || currency}{' '}
                        {Number(sale.total).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      {Number(sale.discount) > 0 && (
                        <div className="text-[10px] text-emerald-700 font-medium font-tabular">
                          -{sale.currency || currency} {Number(sale.discount).toFixed(2)} off
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      {getStatusBadge(sale.status, sale.paymentStatus)}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedSaleForDetail(sale)}
                          title="View sale details"
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSaleForPrint(sale)}
                          title="Print / Reprint receipt"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {/* Return & Refund Button (Enabled for completed sales not fully refunded) */}
                        {sale.status === 'COMPLETED' && sale.paymentStatus !== 'REFUNDED' && (
                          <button
                            type="button"
                            onClick={() => setSelectedSaleForReturn(sale)}
                            title="Process Return / Refund"
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] text-xs text-slate-600">
              <div>
                Showing page <span className="font-bold font-tabular text-slate-900">{page}</span> of{' '}
                <span className="font-bold font-tabular text-slate-900">{totalPages}</span> (<span className="font-tabular">{totalCount}</span> total sales)
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sale Detail Modal */}
      <SaleDetailModal
        isOpen={!!selectedSaleForDetail}
        onClose={() => setSelectedSaleForDetail(null)}
        sale={selectedSaleForDetail}
        onPrint={(s) => {
          setSelectedSaleForDetail(null)
          setSelectedSaleForPrint(s)
        }}
      />

      {/* Receipt Reprint Modal */}
      <ReceiptModal
        isOpen={!!selectedSaleForPrint}
        onClose={() => setSelectedSaleForPrint(null)}
        sale={selectedSaleForPrint}
      />

      {/* Create Return Modal */}
      <CreateReturnModal
        isOpen={Boolean(selectedSaleForReturn)}
        onClose={() => setSelectedSaleForReturn(null)}
        sale={selectedSaleForReturn}
        businessId={businessId || ''}
        currency={currency}
        onReturnCreated={(returnRecord) => {
          setCreatedReturnReceipt(returnRecord)
          fetchSales()
          fetchSummary()
        }}
      />

      {/* Return Receipt / Credit Note Modal */}
      <ReturnReceiptModal
        isOpen={Boolean(createdReturnReceipt)}
        onClose={() => setCreatedReturnReceipt(null)}
        returnRecord={createdReturnReceipt}
        businessName={activeBusiness?.name}
        currency={currency}
      />
    </div>
  )
}
