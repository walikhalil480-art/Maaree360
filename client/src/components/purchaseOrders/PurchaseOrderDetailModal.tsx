import React, { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { ConfirmationDialog } from '../ui/ConfirmationDialog'
import { apiFetch } from '../../api/client'
import type { PurchaseOrder, PurchaseOrderStatus } from '../../types/purchaseOrder'
import {
  Truck,
  CheckCircle2,
  PackageCheck,
  Edit2,
  Send,
  Ban,
  Building2,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface PurchaseOrderDetailModalProps {
  isOpen: boolean
  onClose: () => void
  order: PurchaseOrder | null
  businessId: string
  currency?: string
  userRole?: string
  onEdit: (order: PurchaseOrder) => void
  onOrderUpdated: (updatedOrder: PurchaseOrder) => void
  onOpenReceiveModal: (order: PurchaseOrder) => void
}

export const PurchaseOrderDetailModal: React.FC<PurchaseOrderDetailModalProps> = ({
  isOpen,
  onClose,
  order,
  businessId,
  currency = 'KES',
  userRole,
  onEdit,
  onOrderUpdated,
  onOpenReceiveModal,
}) => {
  const [placingOrder, setPlacingOrder] = useState(false)
  const [cancellingOrder, setCancellingOrder] = useState(false)
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [receiptsExpanded, setReceiptsExpanded] = useState(true)

  if (!order) return null

  const isCashier = userRole === 'CASHIER'
  const canManage = userRole === 'OWNER' || userRole === 'MANAGER'
  const canReceive = !isCashier // Owners, Managers, Stock Clerks can receive deliveries

  // Helper for status badge
  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="neutral" dot>Draft</Badge>
      case 'ORDERED':
        return <Badge variant="info" dot>Ordered</Badge>
      case 'PARTIALLY_RECEIVED':
        return <Badge variant="warning" dot>Partially Received</Badge>
      case 'RECEIVED':
        return <Badge variant="success" dot>Received</Badge>
      case 'CANCELLED':
        return <Badge variant="danger" dot>Cancelled</Badge>
    }
  }

  // Handle Placing Order (DRAFT -> ORDERED)
  const handlePlaceOrder = async () => {
    setActionError(null)
    setPlacingOrder(true)
    try {
      const res = await apiFetch<{ success: boolean; purchaseOrder: PurchaseOrder }>(
        `/api/v1/businesses/${businessId}/purchase-orders/${order.id}/place`,
        {
          method: 'POST',
        }
      )
      onOrderUpdated(res.purchaseOrder)
    } catch (err: any) {
      setActionError(err?.message || 'Failed to place purchase order.')
    } finally {
      setPlacingOrder(false)
    }
  }

  // Handle Cancelling Order
  const handleCancelOrder = async () => {
    setActionError(null)
    setCancellingOrder(true)
    try {
      const res = await apiFetch<{ success: boolean; purchaseOrder: PurchaseOrder }>(
        `/api/v1/businesses/${businessId}/purchase-orders/${order.id}/cancel`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      )
      setIsCancelConfirmOpen(false)
      onOrderUpdated(res.purchaseOrder)
    } catch (err: any) {
      setActionError(err?.message || 'Failed to cancel purchase order.')
    } finally {
      setCancellingOrder(false)
    }
  }

  // Calculate overall fulfillment percentage
  const totalOrdered = order.items.reduce((acc, i) => acc + Number(i.quantityOrdered), 0)
  const totalReceived = order.items.reduce((acc, i) => acc + Number(i.quantityReceived), 0)
  const fulfillmentPercentage =
    totalOrdered > 0 ? Math.min(100, Math.round((totalReceived / totalOrdered) * 100)) : 0

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Purchase Order: ${order.orderNumber}`}
        description={`Created on ${new Date(order.createdAt).toLocaleDateString()}`}
        size="xl"
      >
        <div className="space-y-6">
          {actionError && (
            <div className="p-3 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200">
              {actionError}
            </div>
          )}

          {/* Top Header Card */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xl font-bold font-mono text-slate-900">
                  {order.orderNumber}
                </span>
                {getStatusBadge(order.status)}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                {order.orderDate && (
                  <span>
                    Ordered: <strong>{new Date(order.orderDate).toLocaleDateString()}</strong>
                  </span>
                )}
                {order.expectedDeliveryDate && (
                  <span>
                    Expected Delivery:{' '}
                    <strong>{new Date(order.expectedDeliveryDate).toLocaleDateString()}</strong>
                  </span>
                )}
                {order.createdBy && (
                  <span>
                    Created by: <strong>{order.createdBy.name}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions Header */}
            <div className="flex items-center gap-2">
              {order.status === 'DRAFT' && canManage && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose()
                      onEdit(order)
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-1.5" />
                    Edit Draft
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={placingOrder}
                    onClick={handlePlaceOrder}
                  >
                    <Send className="w-4 h-4 mr-1.5" />
                    Place Order
                  </Button>
                </>
              )}

              {(order.status === 'ORDERED' || order.status === 'PARTIALLY_RECEIVED') && canReceive && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose()
                    onOpenReceiveModal(order)
                  }}
                >
                  <PackageCheck className="w-4 h-4 mr-1.5" />
                  Receive Goods
                </Button>
              )}

              {(order.status === 'DRAFT' ||
                order.status === 'ORDERED' ||
                order.status === 'PARTIALLY_RECEIVED') &&
                canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:border-red-200"
                    onClick={() => setIsCancelConfirmOpen(true)}
                  >
                    <Ban className="w-4 h-4 mr-1.5" />
                    Cancel Order
                  </Button>
                )}
            </div>
          </div>

          {/* Supplier Info & Fulfillment Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Supplier Information
              </span>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{order.supplier.name}</h4>
                {order.supplier.contactPerson && (
                  <p className="text-xs text-slate-600 mt-0.5">
                    Attn: {order.supplier.contactPerson}
                  </p>
                )}
              </div>
              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <a
                  href={`tel:${order.supplier.phone}`}
                  className="text-emerald-700 hover:underline flex items-center gap-1 font-medium"
                >
                  <Phone className="w-3 h-3 text-emerald-600" />
                  {order.supplier.phone}
                </a>
                {order.supplier.email && (
                  <a
                    href={`mailto:${order.supplier.email}`}
                    className="text-slate-600 hover:text-blue-600 flex items-center gap-1"
                  >
                    <Mail className="w-3 h-3 text-slate-400" />
                    {order.supplier.email}
                  </a>
                )}
              </div>
            </div>

            {/* Delivery Fulfillment Progress */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-600" />
                Delivery Fulfillment
              </span>
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-slate-600">
                    Units Received: <strong>{totalReceived}</strong> of{' '}
                    <strong>{totalOrdered}</strong>
                  </span>
                  <span className="font-bold text-slate-900">{fulfillmentPercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      fulfillmentPercentage === 100
                        ? 'bg-emerald-500'
                        : fulfillmentPercentage > 0
                        ? 'bg-amber-500'
                        : 'bg-slate-300'
                    }`}
                    style={{ width: `${fulfillmentPercentage}%` }}
                  />
                </div>
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between pt-1">
                <span>
                  Status:{' '}
                  <strong className="text-slate-700">
                    {order.status === 'RECEIVED'
                      ? 'Fully Delivered'
                      : order.status === 'PARTIALLY_RECEIVED'
                      ? 'Incomplete Delivery'
                      : order.status === 'ORDERED'
                      ? 'Awaiting First Delivery'
                      : 'Not Dispatched (Draft)'}
                  </strong>
                </span>
                {order.receipts && order.receipts.length > 0 && (
                  <span>{order.receipts.length} delivery receipts recorded</span>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Ordered Line Items ({order.items.length})
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 text-center">Unit Cost</th>
                    <th className="py-2.5 px-3 text-center">Ordered</th>
                    <th className="py-2.5 px-3 text-center">Received</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item) => {
                    const ordered = Number(item.quantityOrdered)
                    const received = Number(item.quantityReceived)
                    const isComplete = received >= ordered

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-900 block">
                            {item.product.name}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {item.product.sku} • [{item.product.unit}]
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                          {currency} {Number(item.unitCost).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium text-slate-800">
                          {ordered}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`font-semibold inline-flex items-center gap-1 ${
                              isComplete
                                ? 'text-emerald-700'
                                : received > 0
                                ? 'text-amber-700'
                                : 'text-slate-400'
                            }`}
                          >
                            {received} / {ordered}
                            {isComplete && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">
                          {currency} {Number(item.subtotal).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Notes */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs">
              <span className="font-semibold text-slate-700 block mb-1">
                Delivery Notes / Instructions:
              </span>
              <p className="text-slate-600 whitespace-pre-wrap">
                {order.notes || <span className="italic text-slate-400">No notes recorded for this order.</span>}
              </p>
            </div>

            {/* Totals Summary */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-medium text-slate-900">
                  {currency} {Number(order.subtotal).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between items-center text-emerald-700">
                  <span>Vendor Discount:</span>
                  <span className="font-mono font-medium">
                    - {currency} {Number(order.discount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {Number(order.taxAmount) > 0 && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>VAT / Tax:</span>
                  <span className="font-mono font-medium text-slate-900">
                    + {currency} {Number(order.taxAmount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center font-bold text-sm text-slate-900">
                <span>Grand Total:</span>
                <span className="font-mono text-emerald-700 text-base">
                  {currency} {Number(order.total).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Receipts Audit History */}
          {order.receipts && order.receipts.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => setReceiptsExpanded(!receiptsExpanded)}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 text-left border-b border-slate-100 hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    Goods Received Receipts ({order.receipts.length})
                  </span>
                </div>
                {receiptsExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {receiptsExpanded && (
                <div className="divide-y divide-slate-100 p-3 space-y-3">
                  {order.receipts.map((rcv) => (
                    <div key={rcv.id} className="p-3 rounded-lg bg-slate-50/70 text-xs space-y-2">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-emerald-800">
                            {rcv.receiptNumber}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500">
                            {new Date(rcv.receivedAt).toLocaleString()}
                          </span>
                        </div>
                        {rcv.receivedBy && (
                          <span className="text-slate-600">
                            Received by: <strong>{rcv.receivedBy.name}</strong>
                          </span>
                        )}
                      </div>

                      {rcv.notes && (
                        <p className="text-[11px] text-slate-600 italic">
                          Note: {rcv.notes}
                        </p>
                      )}

                      {/* Items in this receipt batch */}
                      <div className="bg-white rounded border border-slate-200 p-2 space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                          Delivered in this batch:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          {rcv.items.map((ri) => (
                            <div key={ri.id} className="flex justify-between">
                              <span className="text-slate-700 truncate pr-2">
                                {ri.product.name} ({ri.product.sku}):
                              </span>
                              <span className="font-bold text-emerald-700 shrink-0">
                                +{Number(ri.quantityReceived)} {ri.product.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer Close */}
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Order Dialog */}
      <ConfirmationDialog
        isOpen={isCancelConfirmOpen}
        onCancel={() => setIsCancelConfirmOpen(false)}
        onConfirm={handleCancelOrder}
        title={`Cancel Purchase Order ${order.orderNumber}?`}
        message="Are you sure you want to cancel this order? Cancelled orders cannot be received. Any previously delivered batches remain recorded."
        confirmText="Yes, Cancel Order"
        variant="danger"
        isLoading={cancellingOrder}
      />
    </>
  )
}
