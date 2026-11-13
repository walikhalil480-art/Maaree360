import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api/client'
import type { Supplier, SupplierListResponse } from '../types/supplier'
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
import { SupplierFormModal } from '../components/suppliers/SupplierFormModal'
import { SupplierDetailModal } from '../components/suppliers/SupplierDetailModal'
import {
  Users2,
  Plus,
  Eye,
  Edit2,
  Archive,
  RefreshCw,
  Phone,
  Mail,
  CheckCircle,
} from 'lucide-react'

export const SuppliersPage: React.FC = () => {
  const { activeBusiness } = useAuth()
  const businessId = activeBusiness?.id
  const navigate = useNavigate()

  // State
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
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
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null)

  // Archive / Reactivate confirmation
  const [statusChangeSupplier, setStatusChangeSupplier] = useState<Supplier | null>(null)
  const [statusChangeLoading, setStatusChangeLoading] = useState(false)

  // Toast
  const [toast, setToast] = useState<Omit<ToastProps, 'onClose'> | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
  }

  // Fetch Suppliers
  const fetchSuppliers = useCallback(async () => {
    if (!businessId) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (search.trim()) params.append('search', search.trim())
      if (statusFilter !== 'all') params.append('isActive', statusFilter)
      params.append('page', page.toString())
      params.append('limit', limit.toString())

      const res = await apiFetch<SupplierListResponse>(
        `/api/v1/businesses/${businessId}/suppliers?${params.toString()}`
      )

      if (res.success) {
        setSuppliers(res.suppliers)
        setTotalPages(res.pagination.totalPages)
        setTotalCount(res.pagination.total)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }, [businessId, search, statusFilter, page, limit])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  // Reset page when search or filter changes
  const handleSearchChange = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  const handleStatusFilterChange = (status: 'all' | 'true' | 'false') => {
    setStatusFilter(status)
    setPage(1)
  }

  // Handle Archive / Reactivate Toggle
  const handleToggleStatusConfirm = async () => {
    if (!statusChangeSupplier || !businessId) return

    setStatusChangeLoading(true)
    try {
      if (statusChangeSupplier.isActive) {
        // Archive
        await apiFetch(`/api/v1/businesses/${businessId}/suppliers/${statusChangeSupplier.id}`, {
          method: 'DELETE',
        })
        showToast(`Supplier "${statusChangeSupplier.name}" archived successfully.`, 'info')
      } else {
        // Reactivate
        await apiFetch(
          `/api/v1/businesses/${businessId}/suppliers/${statusChangeSupplier.id}/reactivate`,
          {
            method: 'PATCH',
          }
        )
        showToast(`Supplier "${statusChangeSupplier.name}" reactivated successfully.`, 'success')
      }

      setStatusChangeSupplier(null)
      fetchSuppliers()
    } catch (err: any) {
      showToast(err?.message || 'Failed to update supplier status', 'error')
    } finally {
      setStatusChangeLoading(false)
    }
  }

  // Compute Metrics from current listing
  const activeCount = suppliers.filter((s) => s.isActive).length
  const archivedCount = suppliers.filter((s) => !s.isActive).length

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
        title="Suppliers"
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setEditingSupplier(null)
              setIsFormOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total Vendors"
          value={totalCount}
          icon={<Users2 className="w-5 h-5 text-emerald-700" />}
          subtitle="Registered suppliers"
        />
        <MetricCard
          title="Active Suppliers"
          value={statusFilter === 'all' ? activeCount : statusFilter === 'true' ? totalCount : 0}
          icon={<CheckCircle className="w-5 h-5 text-blue-600" />}
          subtitle="Ready for purchasing"
        />
        <MetricCard
          title="Archived Suppliers"
          value={statusFilter === 'all' ? archivedCount : statusFilter === 'false' ? totalCount : 0}
          icon={<Archive className="w-5 h-5 text-slate-500" />}
          subtitle="Inactive records"
        />
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="w-full sm:w-80">
          <SearchInput
            placeholder="Search by vendor name, contact or phone..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onClear={() => handleSearchChange('')}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Status:</span>
          <div className="inline-flex rounded-lg border border-slate-200/80 p-0.5 bg-slate-100/80">
            <button
              onClick={() => handleStatusFilterChange('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleStatusFilterChange('true')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'true'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => handleStatusFilterChange('false')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'false'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Archived
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && !loading && (
        <ErrorState
          title="Could not load suppliers"
          message={error}
          onRetry={fetchSuppliers}
        />
      )}

      {/* Table Content */}
      {!error && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Phone / Email</TableHead>
                <TableHead>KRA PIN / Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead numeric>Orders</TableHead>
                <TableHead numeric>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <>
                  <TableRowSkeleton columns={7} />
                  <TableRowSkeleton columns={7} />
                  <TableRowSkeleton columns={7} />
                  <TableRowSkeleton columns={7} />
                </>
              ) : suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <EmptyState
                      icon={<Users2 className="w-10 h-10 text-slate-300" />}
                      title={search ? 'No suppliers match your search' : 'No suppliers added yet'}
                      description={
                        search
                          ? 'Try adjusting your search terms or filters.'
                          : 'Register your suppliers to generate purchase orders and receive stock.'
                      }
                      action={
                        !search && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setEditingSupplier(null)
                              setIsFormOpen(true)
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1.5" />
                            Add First Supplier
                          </Button>
                        )
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((sup) => (
                  <TableRow key={sup.id}>
                    {/* Supplier Name */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 font-semibold text-xs border border-emerald-100">
                          {sup.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block">{sup.name}</span>
                          {sup.notes && (
                            <span className="text-[11px] text-slate-400 line-clamp-1">
                              {sup.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact Person */}
                    <TableCell>
                      {sup.contactPerson ? (
                        <span className="text-sm text-slate-700 font-medium">
                          {sup.contactPerson}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">—</span>
                      )}
                    </TableCell>

                    {/* Phone / Email */}
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <a
                          href={`tel:${sup.phone}`}
                          className="font-medium text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-emerald-500" />
                          {sup.phone}
                        </a>
                        {sup.email && (
                          <a
                            href={`mailto:${sup.email}`}
                            className="text-slate-500 hover:text-blue-600 truncate max-w-[180px] flex items-center gap-1 mt-0.5"
                          >
                            <Mail className="w-3 h-3 text-slate-400" />
                            {sup.email}
                          </a>
                        )}
                      </div>
                    </TableCell>

                    {/* Tax PIN / Location */}
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        {sup.taxPin ? (
                          <span className="font-mono font-medium text-slate-700">
                            {sup.taxPin}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No PIN</span>
                        )}
                        {sup.physicalAddress && (
                          <span className="text-[11px] text-slate-500 truncate max-w-[150px] mt-0.5">
                            {sup.physicalAddress}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant={sup.isActive ? 'success' : 'neutral'} dot size="sm">
                        {sup.isActive ? 'Active' : 'Archived'}
                      </Badge>
                    </TableCell>

                    {/* Orders count */}
                    <TableCell numeric className="font-tabular font-medium text-xs text-slate-700">
                      {sup._count?.purchaseOrders ?? 0}
                    </TableCell>

                    {/* Actions */}
                    <TableCell numeric>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetailSupplier(sup)}
                          className="p-1.5 h-auto text-slate-500 hover:text-slate-900"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingSupplier(sup)
                            setIsFormOpen(true)
                          }}
                          className="p-1.5 h-auto text-slate-500 hover:text-slate-900"
                          title="Edit Supplier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setStatusChangeSupplier(sup)}
                          className={`p-1.5 h-auto ${
                            sup.isActive
                              ? 'text-slate-500 hover:text-amber-700 hover:bg-amber-50'
                              : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50'
                          }`}
                          title={sup.isActive ? 'Archive Supplier' : 'Reactivate Supplier'}
                        >
                          {sup.isActive ? (
                            <Archive className="w-3.5 h-3.5" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 text-xs text-slate-500 font-tabular">
              <span>
                Showing {(page - 1) * limit + 1} to{' '}
                {Math.min(page * limit, totalCount)} of {totalCount} suppliers
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

      {/* Modals */}
      <SupplierFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingSupplier(null)
        }}
        supplier={editingSupplier}
        businessId={businessId || ''}
        onSaved={(saved) => {
          showToast(
            editingSupplier
              ? `Supplier "${saved.name}" updated successfully.`
              : `Supplier "${saved.name}" created successfully.`,
            'success'
          )
          fetchSuppliers()
        }}
      />

      <SupplierDetailModal
        isOpen={Boolean(detailSupplier)}
        onClose={() => setDetailSupplier(null)}
        supplier={detailSupplier}
        onEdit={(sup) => {
          setEditingSupplier(sup)
          setIsFormOpen(true)
        }}
        onToggleStatus={(sup) => {
          setStatusChangeSupplier(sup)
        }}
        onCreatePO={(sup) => {
          // Navigate to purchase orders page with supplier preselected
          navigate(`/purchases?supplierId=${sup.id}&create=true`)
        }}
      />

      {/* Confirmation Dialog for Archiving / Reactivating */}
      <ConfirmationDialog
        isOpen={Boolean(statusChangeSupplier)}
        onCancel={() => setStatusChangeSupplier(null)}
        onConfirm={handleToggleStatusConfirm}
        title={
          statusChangeSupplier?.isActive
            ? `Archive Supplier: ${statusChangeSupplier?.name}?`
            : `Reactivate Supplier: ${statusChangeSupplier?.name}?`
        }
        message={
          statusChangeSupplier?.isActive
            ? 'Archiving this supplier will hide them from new purchase order creation. Existing purchase orders and historical stock receipts remain preserved.'
            : 'Reactivating this supplier will make them available again for purchase orders.'
        }
        confirmText={statusChangeSupplier?.isActive ? 'Archive Supplier' : 'Reactivate'}
        variant={statusChangeSupplier?.isActive ? 'danger' : 'primary'}
        isLoading={statusChangeLoading}
      />
    </div>
  )
}
