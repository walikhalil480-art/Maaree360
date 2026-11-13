import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api/client'
import type { Customer, CustomerListResponse } from '../types/customer'
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
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog'
import { CustomerFormModal } from '../components/customers/CustomerFormModal'
import { CustomerDetailModal } from '../components/customers/CustomerDetailModal'
import {
  Users,
  UserPlus,
  Eye,
  Edit2,
  Archive,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react'

export const CustomersPage: React.FC = () => {
  const { activeBusiness } = useAuth()
  const businessId = activeBusiness?.id
  const currency = activeBusiness?.currency || 'KES'

  // State
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Search
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'true' | 'false'>('all')
  const [page, setPage] = useState(1)
  const limit = 10
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null)

  // Archive / Reactivate confirmation
  const [archiveCustomer, setArchiveCustomer] = useState<Customer | null>(null)
  const [archiveLoading, setArchiveLoading] = useState(false)

  // Toast
  const [toast, setToast] = useState<Omit<ToastProps, 'onClose'> | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
  }

  // Fetch Customers
  const fetchCustomers = useCallback(async () => {
    if (!businessId) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', limit.toString())

      if (search.trim()) {
        params.append('search', search.trim())
      }

      if (statusFilter !== 'all') {
        params.append('isActive', statusFilter)
      }

      const res = await apiFetch<CustomerListResponse>(
        `/api/v1/businesses/${businessId}/customers?${params.toString()}`
      )

      if (res && res.success) {
        setCustomers(res.customers || [])
        setTotalCount(res.pagination.total)
        setTotalPages(res.pagination.totalPages)
      }
    } catch (err: any) {
      console.error('Failed to load customers', err)
      setError(err?.message || 'Failed to fetch customer accounts. Please check your network.')
    } finally {
      setLoading(false)
    }
  }, [businessId, page, limit, search, statusFilter])

  // Reset state immediately upon store switch
  useEffect(() => {
    setCustomers([])
    setPage(1)
    setTotalCount(0)
  }, [businessId])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  // Reset to page 1 on filter changes
  const handleSearchChange = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  const handleStatusFilterChange = (status: 'all' | 'true' | 'false') => {
    setStatusFilter(status)
    setPage(1)
  }

  // Handle Archive Customer
  const handleConfirmArchive = async () => {
    if (!businessId || !archiveCustomer) return

    setArchiveLoading(true)
    try {
      await apiFetch(`/api/v1/businesses/${businessId}/customers/${archiveCustomer.id}`, {
        method: 'DELETE',
      })

      showToast(`Customer account for '${archiveCustomer.name}' updated successfully.`, 'success')
      setArchiveCustomer(null)
      fetchCustomers()
    } catch (err: any) {
      showToast(err?.message || 'Failed to update customer status.', 'error')
    } finally {
      setArchiveLoading(false)
    }
  }

  // Metrics
  const activeCount = customers.filter((c) => c.isActive).length
  const totalLifetimeSpend = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0)
  const totalLifetimeNet = customers.reduce((sum, c) => sum + (c.netSpend || 0), 0)

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
        title="Customers"
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => {
              setEditingCustomer(null)
              setIsFormOpen(true)
            }}
          >
            Add Customer
          </Button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Registered"
          value={totalCount}
          icon={<Users className="w-5 h-5 text-emerald-700" />}
          subtitle={`${activeCount} currently active`}
        />
        <MetricCard
          title="Active Accounts"
          value={activeCount}
          icon={<CheckCircle className="w-5 h-5 text-blue-600" />}
        />
        <MetricCard
          title="Gross Customer Spend"
          value={`${currency} ${totalLifetimeSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<ShoppingBag className="w-5 h-5 text-slate-700" />}
        />
        <MetricCard
          title="Net Customer Value"
          value={`${currency} ${totalLifetimeNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<TrendingUp className="w-5 h-5 text-emerald-700" />}
          subtitle="After deducting returns"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="w-full sm:w-80">
            <SearchInput
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name, phone, email, PIN..."
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex bg-slate-100/80 p-1 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => handleStatusFilterChange('all')}
                className={`px-3 py-1.5 rounded-md transition font-medium ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => handleStatusFilterChange('true')}
                className={`px-3 py-1.5 rounded-md transition font-medium ${
                  statusFilter === 'true'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => handleStatusFilterChange('false')}
                className={`px-3 py-1.5 rounded-md transition font-medium ${
                  statusFilter === 'false'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Archived
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchCustomers}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      {error ? (
        <ErrorState
          title="Error Loading Customers"
          message={error}
          onRetry={fetchCustomers}
        />
      ) : loading && customers.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-xl p-4">
          <table className="w-full">
            <tbody>
              <TableRowSkeleton columns={8} />
              <TableRowSkeleton columns={8} />
              <TableRowSkeleton columns={8} />
            </tbody>
          </table>
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          icon={<Users className="w-12 h-12 text-slate-300" />}
          title="No customer accounts found"
          description={
            search || statusFilter !== 'all'
              ? 'No customers match your search criteria. Try modifying your filters.'
              : 'Add your first customer to track buyer history, provide receipts, and issue returns.'
          }
          action={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => {
                setEditingCustomer(null)
                setIsFormOpen(true)
              }}
            >
              Add First Customer
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Tax PIN / Location</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead numeric>Total Spent</TableHead>
                <TableHead numeric>Net Value</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead numeric>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => {
                const initials = c.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()

                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60 flex items-center justify-center font-bold text-xs shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="font-medium text-xs text-slate-900">{c.name}</div>
                          {c.notes && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                              {c.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-0.5">
                        {c.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-mono font-tabular">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {c.phone}
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {c.email}
                          </div>
                        )}
                        {!c.phone && !c.email && (
                          <span className="text-slate-400 text-xs italic">No contact info</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-0.5">
                        {c.taxPin && (
                          <span className="font-mono text-[11px] uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70 text-slate-700 font-medium font-tabular">
                            {c.taxPin}
                          </span>
                        )}
                        {c.address && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[150px]">{c.address}</span>
                          </div>
                        )}
                        {!c.taxPin && !c.address && (
                          <span className="text-slate-400 text-xs italic">-</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-center font-tabular font-medium">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold font-tabular">
                        {c.totalPurchases || 0}
                      </span>
                    </TableCell>

                    <TableCell numeric className="font-tabular font-medium text-xs text-slate-900">
                      {currency}{' '}
                      {Number(c.totalSpent || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>

                    <TableCell numeric className="font-tabular font-bold text-xs text-emerald-800">
                      {currency}{' '}
                      {Number(c.netSpend || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant={c.isActive ? 'success' : 'neutral'} size="sm">
                        {c.isActive ? 'Active' : 'Archived'}
                      </Badge>
                    </TableCell>

                    <TableCell numeric>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetailCustomerId(c.id)}
                          title="View customer profile"
                          className="p-1.5 h-auto text-slate-500 hover:text-slate-900"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCustomer(c)
                            setIsFormOpen(true)
                          }}
                          title="Edit customer details"
                          className="p-1.5 h-auto text-slate-500 hover:text-slate-900"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setArchiveCustomer(c)}
                          title={c.isActive ? 'Archive customer' : 'Delete or Reactivate'}
                          className="p-1.5 h-auto text-slate-500 hover:text-amber-700 hover:bg-amber-50"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-xl px-4 py-3 shadow-xs text-xs text-slate-600 font-tabular">
              <div>
                Showing page <span className="font-bold text-slate-900">{page}</span> of{' '}
                <span className="font-bold text-slate-900">{totalPages}</span> ({totalCount} total customers)
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Customer Form Modal */}
      <CustomerFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingCustomer(null)
        }}
        customer={editingCustomer}
        businessId={businessId || ''}
        onSaved={() => {
          showToast(
            editingCustomer ? 'Customer profile updated successfully.' : 'New customer registered successfully.',
            'success'
          )
          fetchCustomers()
        }}
      />

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        isOpen={Boolean(detailCustomerId)}
        onClose={() => setDetailCustomerId(null)}
        customerId={detailCustomerId}
        businessId={businessId || ''}
        currency={currency}
        onEdit={(customerToEdit) => {
          setEditingCustomer(customerToEdit)
          setIsFormOpen(true)
        }}
      />

      {/* Archive / Delete Confirmation */}
      <ConfirmationDialog
        isOpen={Boolean(archiveCustomer)}
        onCancel={() => setArchiveCustomer(null)}
        onConfirm={handleConfirmArchive}
        title={archiveCustomer?.isActive ? 'Archive Customer' : 'Remove Customer'}
        message={
          archiveCustomer?.isActive
            ? `Are you sure you want to archive '${archiveCustomer?.name}'? Their purchase history will remain intact in reports.`
            : `Are you sure you want to remove '${archiveCustomer?.name}'?`
        }
        confirmText="Confirm"
        variant="danger"
        isLoading={archiveLoading}
      />
    </div>
  )
}
