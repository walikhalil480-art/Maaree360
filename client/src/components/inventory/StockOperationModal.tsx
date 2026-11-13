import React, { useState } from 'react'
import { apiFetch, ApiError } from '../../api/client'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import {
  PackagePlus,
  PackageMinus,
  ClipboardCheck,
  AlertOctagon,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'

export type OperationType =
  | 'RECEIVE'
  | 'ISSUE'
  | 'ADJUST'
  | 'LOSS_DAMAGE'
  | 'RETURN'
  | 'OPENING_STOCK'

interface StockOperationModalProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
  product: {
    id: string
    name: string
    sku: string
    unit: string
    currentStock: number
    minStockThreshold?: number
  }
  initialOperation?: OperationType
  onSuccess: (updatedQuantity: number, message: string) => void
}

export const StockOperationModal: React.FC<StockOperationModalProps> = ({
  isOpen,
  onClose,
  businessId,
  product,
  initialOperation = 'RECEIVE',
  onSuccess,
}) => {
  const [operation, setOperation] = useState<OperationType>(initialOperation)
  const [quantity, setQuantity] = useState<string>('')
  const [adjustMode, setAdjustMode] = useState<'COUNT' | 'DIFF'>('COUNT')
  const [lossDamageType, setLossDamageType] = useState<'DAMAGE' | 'LOSS'>('DAMAGE')
  const [reason, setReason] = useState<string>('')
  const [reference, setReference] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset error when switching operations
  const handleOperationChange = (op: OperationType) => {
    setOperation(op)
    setError(null)
    setQuantity('')
    setReason('')
    setReference('')
  }

  // Calculate projected new balance
  const currentQty = Number(product.currentStock) || 0
  const inputQty = parseFloat(quantity) || 0

  let projectedQty = currentQty
  let qtyDelta = 0
  let isNegative = false

  switch (operation) {
    case 'RECEIVE':
    case 'RETURN':
      qtyDelta = inputQty
      projectedQty = currentQty + inputQty
      break
    case 'ISSUE':
    case 'LOSS_DAMAGE':
      qtyDelta = -inputQty
      projectedQty = currentQty - inputQty
      if (projectedQty < 0) isNegative = true
      break
    case 'OPENING_STOCK':
      projectedQty = inputQty
      qtyDelta = inputQty - currentQty
      break
    case 'ADJUST':
      if (adjustMode === 'COUNT') {
        projectedQty = inputQty
        qtyDelta = inputQty - currentQty
      } else {
        projectedQty = currentQty + inputQty
        qtyDelta = inputQty
      }
      if (projectedQty < 0) isNegative = true
      break
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || !product.id) return
    setError(null)

    if (isNaN(inputQty) || (operation !== 'ADJUST' && inputQty <= 0)) {
      setError('Please provide a valid quantity greater than zero.')
      return
    }

    if (isNegative) {
      setError(`Cannot reduce stock below zero. Current stock is ${currentQty} ${product.unit}.`)
      return
    }

    // Require reason for adjustments and loss/damage/return
    if (['ADJUST', 'LOSS_DAMAGE', 'RETURN'].includes(operation) && (!reason || reason.trim().length < 3)) {
      setError('A descriptive reason of at least 3 characters is required for this operation.')
      return
    }

    setLoading(true)

    // Generate unique idempotency key for network resilience
    const idempotencyKey = `op_${operation.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    try {
      let endpoint = ''
      let payload: any = {}
      let successMsg = ''

      switch (operation) {
        case 'RECEIVE':
          endpoint = `/api/v1/businesses/${businessId}/inventory/products/${product.id}/receive`
          payload = {
            quantity: inputQty,
            reason: reason.trim() || undefined,
            reference: reference.trim() || undefined,
            idempotencyKey,
          }
          successMsg = `Received ${inputQty} ${product.unit} of ${product.name}`
          break

        case 'ISSUE':
          endpoint = `/api/v1/businesses/${businessId}/inventory/products/${product.id}/issue`
          payload = {
            quantity: inputQty,
            reason: reason.trim() || undefined,
            reference: reference.trim() || undefined,
            idempotencyKey,
          }
          successMsg = `Issued ${inputQty} ${product.unit} of ${product.name}`
          break

        case 'ADJUST':
          endpoint = `/api/v1/businesses/${businessId}/inventory/products/${product.id}/adjust`
          payload = {
            mode: adjustMode,
            countedQuantity: adjustMode === 'COUNT' ? inputQty : undefined,
            quantityChange: adjustMode === 'DIFF' ? inputQty : undefined,
            reason: reason.trim(),
            reference: reference.trim() || undefined,
            idempotencyKey,
          }
          successMsg = `Stock count adjusted to ${projectedQty} ${product.unit}`
          break

        case 'LOSS_DAMAGE':
          endpoint = `/api/v1/businesses/${businessId}/inventory/products/${product.id}/loss-damage`
          payload = {
            quantity: inputQty,
            type: lossDamageType,
            reason: reason.trim(),
            reference: reference.trim() || undefined,
            idempotencyKey,
          }
          successMsg = `Recorded ${lossDamageType.toLowerCase()} of ${inputQty} ${product.unit}`
          break

        case 'RETURN':
          endpoint = `/api/v1/businesses/${businessId}/inventory/products/${product.id}/return`
          payload = {
            quantity: inputQty,
            reason: reason.trim(),
            reference: reference.trim() || undefined,
            idempotencyKey,
          }
          successMsg = `Recorded return of ${inputQty} ${product.unit}`
          break

        case 'OPENING_STOCK':
          endpoint = `/api/v1/businesses/${businessId}/inventory/products/${product.id}/opening-stock`
          payload = {
            quantity: inputQty,
            reason: reason.trim() || undefined,
          }
          successMsg = `Set opening stock to ${inputQty} ${product.unit}`
          break
      }

      const res = await apiFetch<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const newQty = res?.stockLevel?.quantity != null ? Number(res.stockLevel.quantity) : projectedQty
      onSuccess(newQty, successMsg)
      onClose()
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(err.message || 'Stock operation failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const opTabs = [
    { id: 'RECEIVE', label: 'Receive Goods', icon: PackagePlus, color: 'text-emerald-600' },
    { id: 'ISSUE', label: 'Issue / Dispense', icon: PackageMinus, color: 'text-blue-600' },
    { id: 'ADJUST', label: 'Physical Count', icon: ClipboardCheck, color: 'text-purple-600' },
    { id: 'LOSS_DAMAGE', label: 'Loss & Damage', icon: AlertOctagon, color: 'text-rose-600' },
    { id: 'RETURN', label: 'Customer Return', icon: RotateCcw, color: 'text-teal-600' },
    { id: 'OPENING_STOCK', label: 'Initial Stock', icon: Sparkles, color: 'text-amber-600' },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stock Control & Movement"
      description={`Record inventory transactions for ${product.name}`}
      size="lg"
    >
      {/* Product Summary Header Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            Product Item
          </span>
          <h4 className="text-sm font-bold text-slate-900 m-0">{product.name}</h4>
          <span className="font-mono text-xs text-slate-500">SKU: {product.sku}</span>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 block">Current Stock</span>
          <div className="flex items-center gap-2 justify-end">
            <span className="text-lg font-bold text-slate-900">
              {currentQty}{' '}
              <span className="text-xs font-normal text-slate-500">{product.unit}</span>
            </span>
            {currentQty <= (product.minStockThreshold || 0) && (
              <Badge variant="warning" size="sm">
                Low Stock
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Operation Selection Navigation */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 bg-slate-100 p-1 rounded-lg mb-5">
        {opTabs.map((t) => {
          const Icon = t.icon
          const isActive = operation === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleOperationChange(t.id as OperationType)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-xs font-medium transition ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Icon className={`w-4 h-4 mb-1 ${isActive ? t.color : 'text-slate-400'}`} />
              <span className="text-[11px] leading-tight text-center">{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-800 text-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Operation Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Special fields for Loss/Damage */}
        {operation === 'LOSS_DAMAGE' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Movement Reason Category <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="lossDamageType"
                  value="DAMAGE"
                  checked={lossDamageType === 'DAMAGE'}
                  onChange={() => setLossDamageType('DAMAGE')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                Damaged Goods (Breakage / Expired)
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="lossDamageType"
                  value="LOSS"
                  checked={lossDamageType === 'LOSS'}
                  onChange={() => setLossDamageType('LOSS')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                Inventory Loss / Shrinkage / Theft
              </label>
            </div>
          </div>
        )}

        {/* Special fields for Adjust Mode */}
        {operation === 'ADJUST' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Adjustment Method <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="adjustMode"
                  value="COUNT"
                  checked={adjustMode === 'COUNT'}
                  onChange={() => setAdjustMode('COUNT')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                Physical Counted Quantity (Direct Set)
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="adjustMode"
                  value="DIFF"
                  checked={adjustMode === 'DIFF'}
                  onChange={() => setAdjustMode('DIFF')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                Relative Delta (+/- Offset)
              </label>
            </div>
          </div>
        )}

        {/* Quantity Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {operation === 'RECEIVE' && 'Quantity Received'}
            {operation === 'ISSUE' && 'Quantity to Issue'}
            {operation === 'ADJUST' && (adjustMode === 'COUNT' ? 'Physical Stock Count' : 'Delta Quantity (+/-)')}
            {operation === 'LOSS_DAMAGE' && 'Quantity Damaged or Lost'}
            {operation === 'RETURN' && 'Quantity Returned'}
            {operation === 'OPENING_STOCK' && 'Initial Stock Quantity'}
            {' '}
            <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min={operation === 'ADJUST' && adjustMode === 'DIFF' ? undefined : '0'}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
              required
              className="w-full rounded-md border border-slate-300 py-2 pl-3 pr-14 text-sm font-mono text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs text-slate-400 font-medium">
              {product.unit}
            </div>
          </div>
        </div>

        {/* Reason / Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Reason / Audit Note{' '}
            {['ADJUST', 'LOSS_DAMAGE', 'RETURN'].includes(operation) ? (
              <span className="text-rose-500">*</span>
            ) : (
              <span className="text-slate-400 font-normal">(Optional)</span>
            )}
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              operation === 'RECEIVE'
                ? 'e.g. Regular replenishment from distributor'
                : operation === 'ISSUE'
                ? 'e.g. Transferred to bakery kitchen'
                : operation === 'ADJUST'
                ? 'e.g. Month-end physical stock audit count'
                : operation === 'LOSS_DAMAGE'
                ? 'e.g. Dropped in store aisle / expiry reached'
                : operation === 'RETURN'
                ? 'e.g. Customer returned unopened goods with receipt'
                : 'e.g. Opening balance recorded upon system onboarding'
            }
            className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        {/* Reference / Invoice / Document */}
        {operation !== 'OPENING_STOCK' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              External Reference / Document # <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. PO-8921, INV-4402, RCP-0199"
              className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        )}

        {/* Real-time Projected Balance Banner */}
        <div
          className={`p-3 rounded-lg border flex items-center justify-between text-xs transition ${
            isNegative
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50/70 border-emerald-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>Current: <strong>{currentQty}</strong></span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Change: <strong className={qtyDelta > 0 ? 'text-emerald-700' : qtyDelta < 0 ? 'text-rose-700' : ''}>
                {qtyDelta > 0 ? `+${qtyDelta}` : qtyDelta}
              </strong>
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Projected Balance: <strong className="font-mono text-sm">{projectedQty} {product.unit}</strong>
            </span>
          </div>
          {isNegative && (
            <Badge variant="danger" size="sm">
              Invalid: Negative Stock
            </Badge>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={loading}
            disabled={loading || isNegative || inputQty <= 0 && operation !== 'ADJUST'}
          >
            Confirm & Update Stock
          </Button>
        </div>
      </form>
    </Modal>
  )
}
