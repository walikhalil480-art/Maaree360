import { useState, useEffect, type FC, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { apiFetch } from '../../api/client'
import type { ShiftReconciliation, CloseShiftInput } from '../../types/shift'
import {
  AlertCircle,
  Banknote,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Layers,
} from 'lucide-react'

interface CloseShiftModalProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
  shiftId: string
  currency: string
  isManagerOverride?: boolean
  onCloseShift: (shiftId: string, data: CloseShiftInput) => Promise<void>
}

export const CloseShiftModal: FC<CloseShiftModalProps> = ({
  isOpen,
  onClose,
  businessId,
  shiftId,
  currency,
  isManagerOverride = false,
  onCloseShift,
}) => {
  const [reconciliation, setReconciliation] = useState<ShiftReconciliation | null>(null)
  const [loadingRec, setLoadingRec] = useState(false)
  const [actualCashStr, setActualCashStr] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && shiftId && businessId) {
      setLoadingRec(true)
      setError(null)
      apiFetch<{ success: boolean; data: ShiftReconciliation }>(
        `/api/v1/businesses/${businessId}/shifts/${shiftId}/reconcile`
      )
        .then((res) => {
          if (res.success && res.data) {
            setReconciliation(res.data)
            // Default actual cash to expected cash for user convenience or blank
            setActualCashStr(res.data.expectedCash.toString())
          }
        })
        .catch((err) => {
          setError(err?.message || 'Failed to load shift cash reconciliation')
        })
        .finally(() => setLoadingRec(false))
    }
  }, [isOpen, shiftId, businessId])

  const actualCashNum = parseFloat(actualCashStr)
  const hasValidInput = !isNaN(actualCashNum) && actualCashNum >= 0
  const expectedCash = reconciliation ? reconciliation.expectedCash : 0
  const variance = hasValidInput ? Number((actualCashNum - expectedCash).toFixed(2)) : 0

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!hasValidInput) {
      setError('Please enter a valid count of actual cash.')
      return
    }

    try {
      setSubmitting(true)
      await onCloseShift(shiftId, {
        actualCash: actualCashNum,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to close shift')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isManagerOverride ? 'Manager Override: Close Cashier Shift' : 'End Cashier Shift & Reconcile Drawer'}
      description="Count physical cash in the drawer to calculate end-of-shift cash balance and discrepancy."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {loadingRec ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-slate-500">
              Calculating cash breakdown from sales and returns...
            </span>
          </div>
        ) : reconciliation ? (
          <>
            {isManagerOverride && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Manager Override:</strong> You are closing the shift for cashier{' '}
                  <strong>{reconciliation.cashier.name}</strong> on register{' '}
                  <strong>{reconciliation.register.name}</strong>. This override will be recorded in the audit log.
                </span>
              </div>
            )}

            {/* Shift Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                  Opening Float
                </span>
                <span className="text-base font-bold text-slate-900">
                  {currency} {reconciliation.openingFloat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                  Cash Sales (+)
                </span>
                <span className="text-base font-bold text-emerald-600">
                  +{currency} {reconciliation.cashPayments.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 block">{reconciliation.salesCount} transactions</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                  Cash Refunds (-)
                </span>
                <span className="text-base font-bold text-red-600">
                  -{currency} {reconciliation.cashRefunds.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                  Expected In Drawer
                </span>
                <span className="text-base font-extrabold text-blue-700">
                  {currency} {reconciliation.expectedCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Non-Cash Information banner */}
            <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-100/70 px-4 py-2.5 rounded-lg border border-slate-200">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Non-Cash Collected (M-Pesa / Card):
              </span>
              <span className="font-semibold text-slate-900">
                {currency} {reconciliation.nonCashPayments.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                <span className="text-[10px] text-slate-500 font-normal ml-1">
                  (Excluded from physical drawer cash)
                </span>
              </span>
            </div>

            {/* Actual Cash Input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
                Actual Physical Cash Counted ({currency}) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Banknote className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-10 text-lg font-bold text-slate-900 py-2.5"
                  placeholder="0.00"
                  value={actualCashStr}
                  onChange={(e) => setActualCashStr(e.target.value)}
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Count all coins and notes in the till at the close of shift.
              </p>
            </div>

            {/* Live Variance Calculation Banner */}
            {hasValidInput && (
              <div
                className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                  variance === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : variance > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  {variance === 0 ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : variance > 0 ? (
                    <TrendingUp className="w-6 h-6 text-blue-600 shrink-0" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-red-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="text-sm font-bold">
                      {variance === 0
                        ? 'Drawer Perfectly Balanced'
                        : variance > 0
                        ? 'Cash Over / Surplus'
                        : 'Cash Shortage'}
                    </h4>
                    <p className="text-xs opacity-90 mt-0.5">
                      {variance === 0
                        ? 'Counted cash exactly matches expected sales and float.'
                        : variance > 0
                        ? 'Physical cash exceeds the expected register total.'
                        : 'Physical cash is lower than expected register total.'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold block uppercase tracking-wider opacity-80">
                    Variance
                  </span>
                  <span className="text-lg font-extrabold">
                    {variance > 0 ? '+' : ''}
                    {currency} {variance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {/* Shift Closing Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Closing Remarks / Variance Reason (Optional)
              </label>
              <Input
                placeholder={
                  variance !== 0
                    ? 'e.g. Discrepancy due to unrecorded change issue or customer tip'
                    : 'e.g. End of evening shift, all till change verified'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </>
        ) : null}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={submitting}
            disabled={!hasValidInput || loadingRec}
          >
            Reconcile & Close Shift
          </Button>
        </div>
      </form>
    </Modal>
  )
}
