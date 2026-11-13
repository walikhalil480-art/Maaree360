import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { apiFetch, ApiError } from '../../api/client'
import type { Sale } from '../../types/sale'
import type {
  SaleReturn,
  CreateReturnInput,
  ReturnRestockAction,
} from '../../types/return'
import {
  RotateCcw,
  AlertCircle,
  Banknote,
  Smartphone,
  CreditCard,
} from 'lucide-react'

interface CreateReturnModalProps {
  isOpen: boolean
  onClose: () => void
  sale: Sale | null
  businessId: string
  currency: string
  onReturnCreated: (returnRecord: SaleReturn) => void
}

interface ReturnRowState {
  saleItemId: string
  productName: string
  productSku: string
  unit: string
  originalQty: number
  alreadyReturnedQty: number
  remainingQty: number
  unitRefundPrice: number
  returnQty: number
  restockAction: ReturnRestockAction
  notes: string
}

export const CreateReturnModal: React.FC<CreateReturnModalProps> = ({
  isOpen,
  onClose,
  sale,
  businessId,
  currency,
  onReturnCreated,
}) => {
  const [rows, setRows] = useState<ReturnRowState[]>([])
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'MOBILE_MONEY' | 'CARD' | 'BANK_TRANSFER' | 'OTHER'>('CASH')
  const [refundReference, setRefundReference] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Initialize rows from sale items
  useEffect(() => {
    if (!isOpen || !sale) {
      setRows([])
      setErrorMessage(null)
      return
    }

    const itemsState: ReturnRowState[] = (sale.items || []).map((it) => {
      const originalQty = Number(it.quantity)
      const alreadyReturnedQty = Number(it.quantityReturned || 0)
      const remainingQty = Math.max(0, originalQty - alreadyReturnedQty)
      const unitRefundPrice = originalQty > 0 ? Number(it.lineTotal) / originalQty : Number(it.unitPrice)

      return {
        saleItemId: it.id,
        productName: it.productName,
        productSku: it.productSku,
        unit: it.unit || 'piece',
        originalQty,
        alreadyReturnedQty,
        remainingQty,
        unitRefundPrice,
        returnQty: 0,
        restockAction: 'RESTOCK',
        notes: '',
      }
    })

    setRows(itemsState)
    setRefundMethod('CASH')
    setRefundReference('')
    setReason('')
    setNotes('')
    setErrorMessage(null)
  }, [isOpen, sale])

  if (!isOpen || !sale) return null

  // Calculate total refund
  const totalRefundAmount = rows.reduce((sum, r) => {
    return sum + (r.returnQty > 0 ? r.returnQty * r.unitRefundPrice : 0)
  }, 0)

  const hasAnyItemsSelected = rows.some((r) => r.returnQty > 0)

  const handleQtyChange = (index: number, val: string) => {
    const num = parseFloat(val) || 0
    setRows((prev) => {
      const copy = [...prev]
      const row = { ...copy[index] }
      // Clamp between 0 and remainingQty
      row.returnQty = Math.max(0, Math.min(row.remainingQty, num))
      copy[index] = row
      return copy
    })
  }

  const handleRestockChange = (index: number, action: ReturnRestockAction) => {
    setRows((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], restockAction: action }
      return copy
    })
  }

  const handleSelectAllRemaining = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        returnQty: r.remainingQty,
      }))
    )
  }

  const handleClearSelection = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        returnQty: 0,
      }))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const activeRows = rows.filter((r) => r.returnQty > 0)
    if (activeRows.length === 0) {
      setErrorMessage('Please specify at least one item quantity to return.')
      return
    }

    setSubmitting(true)

    try {
      const payload: CreateReturnInput = {
        saleId: sale.id,
        refundMethod,
        refundReference: refundReference.trim() || undefined,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
        idempotencyKey: crypto.randomUUID(),
        items: activeRows.map((r) => ({
          saleItemId: r.saleItemId,
          quantity: r.returnQty,
          restockAction: r.restockAction,
          notes: r.notes.trim() || undefined,
        })),
      }

      const res = await apiFetch<{ success: boolean; returnRecord: SaleReturn }>(
        `/api/v1/businesses/${businessId}/returns`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      )

      if (res && res.success) {
        onReturnCreated(res.returnRecord)
        onClose()
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('Failed to process sales return. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Sales Return & Refund — ${sale.receiptNumber}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Sale Meta Summary */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-700">Receipt: </span>
            <span className="font-mono font-bold text-slate-900">{sale.receiptNumber}</span>
            <span className="text-slate-400 mx-2">•</span>
            <span className="text-slate-500">
              {new Date(sale.createdAt).toLocaleDateString()} at{' '}
              {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Customer: </span>
            <span className="font-medium text-slate-800">{sale.customerName || 'Walk-in Customer'}</span>
          </div>
        </div>

        {/* Action Header for Items */}
        <div className="flex items-center justify-between pt-1">
          <label className="text-xs font-bold text-slate-800">
            Select Items to Return & Restock
          </label>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleSelectAllRemaining}
              className="text-emerald-700 hover:text-emerald-800 font-medium"
            >
              Return All Remaining
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-slate-500 hover:text-slate-700"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Item Rows Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-2.5">Item & SKU</th>
                <th className="p-2.5 text-center">Purchased / Ret.</th>
                <th className="p-2.5 text-center w-28">Return Qty</th>
                <th className="p-2.5">Restock Policy</th>
                <th className="p-2.5 text-right">Refund Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row, idx) => {
                const isFullyReturned = row.remainingQty === 0
                const lineRefund = row.returnQty * row.unitRefundPrice

                return (
                  <tr
                    key={row.saleItemId}
                    className={`transition ${isFullyReturned ? 'bg-slate-50/60 opacity-60' : 'hover:bg-slate-50/40'}`}
                  >
                    <td className="p-2.5">
                      <div className="font-semibold text-slate-900">{row.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{row.productSku}</div>
                    </td>

                    <td className="p-2.5 text-center">
                      <span className="font-mono text-slate-700">{row.originalQty}</span>
                      {row.alreadyReturnedQty > 0 && (
                        <span className="text-[10px] text-amber-700 block font-medium">
                          ({row.alreadyReturnedQty} returned)
                        </span>
                      )}
                    </td>

                    <td className="p-2.5 text-center">
                      {isFullyReturned ? (
                        <span className="text-[10px] text-slate-400 italic">Fully Returned</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max={row.remainingQty}
                            step="any"
                            value={row.returnQty || ''}
                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                            placeholder="0"
                            className="w-16 px-2 py-1 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-[10px] text-slate-400">/ {row.remainingQty}</span>
                        </div>
                      )}
                    </td>

                    <td className="p-2.5">
                      <select
                        value={row.restockAction}
                        onChange={(e) => handleRestockChange(idx, e.target.value as ReturnRestockAction)}
                        disabled={row.returnQty <= 0}
                        className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                      >
                        <option value="RESTOCK">Restock (Add to stock ledger)</option>
                        <option value="WRITE_OFF">Write-off (Damaged/Discard)</option>
                      </select>
                    </td>

                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      {currency} {lineRefund.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Refund Method & Payout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Refund Payment Method
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { method: 'CASH', label: 'Cash', icon: Banknote },
                { method: 'MOBILE_MONEY', label: 'M-Pesa', icon: Smartphone },
                { method: 'CARD', label: 'Card', icon: CreditCard },
              ].map(({ method, label, icon: Icon }) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setRefundMethod(method as any)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs rounded-xl border font-medium transition ${
                    refundMethod === method
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Refund Reference (Optional)
            </label>
            <input
              type="text"
              value={refundReference}
              onChange={(e) => setRefundReference(e.target.value)}
              placeholder="e.g. M-Pesa reversal or receipt code"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>
        </div>

        {/* Reason and Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Return Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Defective seal, Customer change of mind"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Approved by Store Manager"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Total Refund Banner */}
        <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-emerald-900">Total Refund Due Customer:</span>
            <div className="text-[11px] text-emerald-700">
              Refunded via {refundMethod}
            </div>
          </div>
          <div className="text-lg font-extrabold font-mono text-emerald-900">
            {currency} {totalRefundAmount.toFixed(2)}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={submitting}
            disabled={!hasAnyItemsSelected || totalRefundAmount <= 0}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Process Return ({currency} {totalRefundAmount.toFixed(2)})
          </Button>
        </div>
      </form>
    </Modal>
  )
}
