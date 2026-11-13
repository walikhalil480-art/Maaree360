import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { apiFetch, ApiError } from '../../api/client'
import type { Expense, ExpenseCategory } from '../../types/expense'
import { EXPENSE_CATEGORIES } from '../../types/expense'
import { Tag, DollarSign, Calendar, Hash, FileText, AlertCircle } from 'lucide-react'

interface ExpenseFormModalProps {
  isOpen: boolean
  onClose: () => void
  expense?: Expense | null
  businessId: string
  currency?: string
  onSaved: (expense: Expense) => void
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  expense,
  businessId,
  currency = 'KES',
  onSaved,
}) => {
  const isEditing = Boolean(expense)

  const [category, setCategory] = useState<ExpenseCategory>('RENT')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState<string>('')
  const [expenseDate, setExpenseDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (expense) {
      setCategory(expense.category)
      setDescription(expense.description || '')
      setAmount(expense.amount ? String(expense.amount) : '')
      setExpenseDate(
        expense.expenseDate ? new Date(expense.expenseDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
      )
      setReferenceNumber(expense.referenceNumber || '')
      setNotes(expense.notes || '')
    } else {
      setCategory('RENT')
      setDescription('')
      setAmount('')
      setExpenseDate(new Date().toISOString().slice(0, 10))
      setReferenceNumber('')
      setNotes('')
    }
    setError(null)
  }, [expense, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount greater than 0.')
      return
    }

    if (!description.trim()) {
      setError('Expense description is required.')
      return
    }

    if (!expenseDate) {
      setError('Please select a valid expense date.')
      return
    }

    setLoading(true)

    try {
      const payload = {
        category,
        description: description.trim(),
        amount: parsedAmount,
        expenseDate,
        referenceNumber: referenceNumber.trim() || null,
        notes: notes.trim() || null,
      }

      let res: { success: boolean; expense: Expense }

      if (isEditing && expense) {
        res = await apiFetch<{ success: boolean; expense: Expense }>(
          `/api/v1/businesses/${businessId}/expenses/${expense.id}`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          }
        )
      } else {
        res = await apiFetch<{ success: boolean; expense: Expense }>(
          `/api/v1/businesses/${businessId}/expenses`,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        )
      }

      if (res.success && res.expense) {
        onSaved(res.expense)
        onClose()
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to save expense. Please check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Expense Record' : 'Record New Operating Expense'}
      description={
        isEditing
          ? 'Update expense details, amount, category, or reference'
          : `Record store overhead, utility bill, wage payment, or supplies in ${currency}`
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 p-3.5 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Category & Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>Category *</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-none"
              required
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              <span>Amount ({currency}) *</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 3500.00"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-none font-mono"
              required
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Description *</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. KPLC Pre-paid tokens for Store Meter #142857"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-none"
            required
            maxLength={255}
          />
        </div>

        {/* Expense Date & Reference Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Expense Date *</span>
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span>Reference / Receipt #</span>
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. REC-9921 or M-Pesa Ref"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-none font-mono"
              maxLength={100}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Notes / Vendor Details (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any extra context or supplier/payee notes..."
            rows={2}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-none resize-none"
            maxLength={1000}
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={loading}>
            {isEditing ? 'Save Changes' : 'Record Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
