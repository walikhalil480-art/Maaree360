import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { apiFetch } from '../../api/client'
import type { Customer } from '../../types/customer'
import {
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  RotateCcw,
} from 'lucide-react'

interface CustomerDetailModalProps {
  isOpen: boolean
  onClose: () => void
  customerId: string | null
  businessId: string
  currency: string
  onEdit?: (customer: Customer) => void
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customerId,
  businessId,
  currency,
  onEdit,
}) => {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'sales' | 'returns'>('sales')

  useEffect(() => {
    if (!isOpen || !customerId || !businessId) {
      setCustomer(null)
      return
    }

    const fetchCustomer = async () => {
      setLoading(true)
      try {
        const res = await apiFetch<{ success: boolean; customer: Customer }>(
          `/api/v1/businesses/${businessId}/customers/${customerId}`
        )
        if (res && res.success) {
          setCustomer(res.customer)
        }
      } catch (err) {
        console.error('Failed to load customer profile', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCustomer()
  }, [isOpen, customerId, businessId])

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customer Profile & Lifetime History" size="lg">
      {loading ? (
        <div className="py-12 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading customer account details...</p>
        </div>
      ) : !customer ? (
        <div className="py-8 text-center text-slate-500 text-xs">Customer not found.</div>
      ) : (
        <div className="space-y-5">
          {/* Header Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
                {customer.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{customer.name}</h3>
                  <Badge variant={customer.isActive ? 'success' : 'neutral'} size="sm">
                    {customer.isActive ? 'Active' : 'Archived'}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                  {customer.phone && (
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {customer.phone}
                    </span>
                  )}
                  {customer.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {customer.email}
                    </span>
                  )}
                  {customer.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {customer.address}
                    </span>
                  )}
                  {customer.taxPin && (
                    <span className="flex items-center gap-1 font-mono uppercase bg-slate-200/60 px-1.5 py-0.5 rounded text-[11px]">
                      PIN: {customer.taxPin}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose()
                  onEdit(customer)
                }}
              >
                Edit Account
              </Button>
            )}
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Spent</div>
              <div className="text-base font-extrabold font-mono text-slate-900 mt-0.5">
                {currency} {Number(customer.metrics?.totalSpent || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {customer.metrics?.totalPurchases || 0} Orders
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Refunded</div>
              <div className="text-base font-extrabold font-mono text-amber-700 mt-0.5">
                {currency} {Number(customer.metrics?.totalRefunded || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {customer.metrics?.totalReturns || 0} Returns
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Net Lifetime Value</div>
              <div className="text-base font-extrabold font-mono text-emerald-700 mt-0.5">
                {currency} {Number(customer.metrics?.netSpend || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">
                Gross Spend - Refunds
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Customer Since</div>
              <div className="text-xs font-semibold text-slate-800 mt-1">
                {new Date(customer.createdAt).toLocaleDateString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {new Date(customer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Notes callout if any */}
          {customer.notes && (
            <div className="text-xs bg-amber-50/70 border border-amber-200 text-amber-900 rounded-xl p-3">
              <span className="font-bold">Customer Notes:</span> {customer.notes}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className={`pb-2 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 ${
                activeTab === 'sales'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Purchase History ({customer.sales?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('returns')}
              className={`pb-2 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 ${
                activeTab === 'returns'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Returns & Refunds ({customer.returns?.length || 0})
            </button>
          </div>

          {/* Tab Content */}
          <div className="max-h-80 overflow-y-auto space-y-2">
            {activeTab === 'sales' ? (
              !customer.sales || customer.sales.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No purchase transactions found for this customer.
                </div>
              ) : (
                customer.sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{sale.receiptNumber}</span>
                        <Badge variant="success" size="sm">
                          {sale.status}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(sale.createdAt).toLocaleDateString()} at{' '}
                        {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                        {sale.items?.length || 0} line items
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-900">
                        {currency} {Number(sale.total).toFixed(2)}
                      </div>
                      {sale.returns && sale.returns.length > 0 && (
                        <div className="text-[10px] text-amber-700 font-medium">
                          {sale.returns.length} Return{sale.returns.length > 1 ? 's' : ''} recorded
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )
            ) : !customer.returns || customer.returns.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No returns or refund records for this customer.
              </div>
            ) : (
              customer.returns.map((ret) => (
                <div
                  key={ret.id}
                  className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{ret.returnNumber}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded">
                        Refund via {ret.refundMethod}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {new Date(ret.createdAt).toLocaleDateString()} • Ref for Sale{' '}
                      <span className="font-mono font-semibold">{ret.sale?.receiptNumber || 'POS'}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-amber-800">
                      -{currency} {Number(ret.refundAmount).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
