import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { apiFetch, ApiError } from '../../api/client'
import type { PurchaseOrder, ReceiveDeliveryInput } from '../../types/purchaseOrder'
import { Truck, CheckCircle2, PackageCheck, AlertCircle } from 'lucide-react'

interface ReceiveDeliveryModalProps {
  isOpen: boolean
  onClose: () => void
  order: PurchaseOrder | null
  businessId: string
  onReceived: (updatedOrder: PurchaseOrder, receipt: any) => void
}

export const ReceiveDeliveryModal: React.FC<ReceiveDeliveryModalProps> = ({
  isOpen,
  onClose,
  order,
  businessId,
  onReceived,
}) => {
  const [receiptReference, setReceiptReference] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number | string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize or reset quantities
  useEffect(() => {
    if (order) {
      setReceiptReference('')
      setDeliveryNotes('')
      // Pre-fill quantities with 0 or outstanding
      const initialQtys: Record<string, number | string> = {}
      order.items.forEach((item) => {
        initialQtys[item.id] = 0 // default to 0 so clerk explicitly inputs or clicks "Receive All"
      })
      setReceivedQuantities(initialQtys)
    }
    setError(null)
  }, [order, isOpen])

  if (!order) return null

  // Helper: fill all items with full remaining outstanding balance
  const handleFillAllRemaining = () => {
    const updated: Record<string, number | string> = {}
    order.items.forEach((item) => {
      const outstanding = Math.max(0, Number(item.quantityOrdered) - Number(item.quantityReceived))
      updated[item.id] = outstanding
    })
    setReceivedQuantities(updated)
    setError(null)
  }

  const handleQuantityChange = (itemId: string, val: string) => {
    setReceivedQuantities((prev) => ({
      ...prev,
      [itemId]: val,
    }))
  }

  // Calculate items being delivered
  const itemsToSubmit = order.items
    .map((item) => {
      const qty = parseFloat(String(receivedQuantities[item.id] || 0))
      return {
        purchaseOrderItemId: item.id,
        quantityReceived: qty,
        poItem: item,
      }
    })
    .filter((i) => i.quantityReceived > 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (itemsToSubmit.length === 0) {
      setError('Please enter a received quantity greater than zero for at least one item.')
      return
    }

    // Over-receipt check
    for (const item of itemsToSubmit) {
      const outstanding = Number(item.poItem.quantityOrdered) - Number(item.poItem.quantityReceived)
      if (item.quantityReceived > outstanding) {
        setError(
          `Over-receipt not allowed for ${item.poItem.product.name}. Entering ${item.quantityReceived}, but only ${outstanding} is outstanding.`
        )
        return
      }
      if (item.quantityReceived < 0) {
        setError(`Received quantity cannot be negative for ${item.poItem.product.name}.`)
        return
      }
    }

    setSubmitting(true)

    // Generate random idempotency key
    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `rcv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    try {
      const payload: ReceiveDeliveryInput = {
        receiptReference: receiptReference.trim() || undefined,
        notes: deliveryNotes.trim() || undefined,
        idempotencyKey,
        items: itemsToSubmit.map((i) => ({
          purchaseOrderItemId: i.purchaseOrderItemId,
          quantityReceived: i.quantityReceived,
        })),
      }

      const res = await apiFetch<{
        success: boolean
        purchaseOrder: PurchaseOrder
        receipt: any
      }>(`/api/v1/businesses/${businessId}/purchase-orders/${order.id}/receive`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (res.success) {
        onReceived(res.purchaseOrder, res.receipt)
        onClose()
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(err?.message || 'Failed to process goods receipt. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Receive Goods: ${order.orderNumber}`}
      description="Inspect delivery, record delivered quantities, and update stock ledger atomically."
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Order Header Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 block">Vendor / Supplier:</span>
            <span className="font-semibold text-slate-900 text-sm">{order.supplier.name}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Current Status:</span>
            <span className="font-semibold text-emerald-700 capitalize">
              {order.status.toLowerCase().replace('_', ' ')}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Total Order Items:</span>
            <span className="font-semibold text-slate-900">{order.items.length} product lines</span>
          </div>
        </div>

        {/* Delivery Reference Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Input
              label="Supplier Delivery Note / Reference (Optional)"
              placeholder="e.g., DN-88349 or INVOICE-442"
              value={receiptReference}
              onChange={(e) => setReceiptReference(e.target.value)}
              autoFocus
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Vendor reference printed on the delivery note or packaging
            </span>
          </div>

          <div>
            <Input
              label="Delivery / Inspection Remarks (Optional)"
              placeholder="e.g., All boxes sealed, verified batch condition"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Line Items Receiving Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Delivery Line Items</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter the exact quantity counted in this physical delivery batch.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFillAllRemaining}
            >
              <PackageCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
              Receive All Outstanding
            </Button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="py-2.5 px-3 w-[36%]">Product & SKU</th>
                  <th className="py-2.5 px-3 w-[16%] text-center">Ordered</th>
                  <th className="py-2.5 px-3 w-[16%] text-center">Prev. Received</th>
                  <th className="py-2.5 px-3 w-[16%] text-center font-semibold text-slate-800">
                    Outstanding
                  </th>
                  <th className="py-2.5 px-3 w-[16%] text-right font-semibold text-emerald-700">
                    Delivering Now
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item) => {
                  const ordered = Number(item.quantityOrdered)
                  const prevReceived = Number(item.quantityReceived)
                  const outstanding = Math.max(0, ordered - prevReceived)
                  const isFullyReceived = outstanding === 0
                  const currentVal = receivedQuantities[item.id] ?? 0
                  const currentNum = parseFloat(String(currentVal)) || 0
                  const isOver = currentNum > outstanding

                  return (
                    <tr
                      key={item.id}
                      className={isFullyReceived ? 'bg-slate-50/70 text-slate-400' : 'hover:bg-slate-50/50'}
                    >
                      {/* Product Name & SKU */}
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900 block">
                          {item.product.name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {item.product.sku} • [{item.product.unit}]
                        </span>
                      </td>

                      {/* Ordered */}
                      <td className="py-2.5 px-3 text-center font-medium text-slate-700">
                        {ordered}
                      </td>

                      {/* Previously Received */}
                      <td className="py-2.5 px-3 text-center font-medium text-slate-600">
                        {prevReceived}
                      </td>

                      {/* Outstanding */}
                      <td className="py-2.5 px-3 text-center">
                        {isFullyReceived ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Complete
                          </span>
                        ) : (
                          <span className="font-bold text-slate-900 text-xs">
                            {outstanding}
                          </span>
                        )}
                      </td>

                      {/* Delivering Now Input */}
                      <td className="py-2.5 px-3 text-right">
                        {isFullyReceived ? (
                          <span className="text-xs text-slate-400 italic">0</span>
                        ) : (
                          <div className="flex flex-col items-end">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max={outstanding}
                              value={currentVal}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              className={`w-24 h-8 px-2 text-right text-xs rounded border font-semibold focus:outline-none focus:ring-1 ${
                                isOver
                                  ? 'border-red-500 bg-red-50 text-red-700 focus:ring-red-500'
                                  : 'border-slate-300 bg-white text-emerald-700 focus:ring-emerald-500'
                              }`}
                            />
                            {isOver && (
                              <span className="text-[10px] text-red-600 mt-0.5">
                                Exceeds {outstanding}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            Delivering{' '}
            <strong className="text-slate-800">{itemsToSubmit.length}</strong> product lines
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={submitting}
              disabled={itemsToSubmit.length === 0}
            >
              <Truck className="w-4 h-4 mr-1.5" />
              Confirm Goods Receipt
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
