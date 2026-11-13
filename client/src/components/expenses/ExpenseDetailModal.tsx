import React from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import type { Expense } from '../../types/expense'
import { EXPENSE_CATEGORIES } from '../../types/expense'
import {
  Tag,
  Calendar,
  Hash,
  FileText,
  User,
  Clock,
  Edit2,
  Trash2,
} from 'lucide-react'

interface ExpenseDetailModalProps {
  isOpen: boolean
  onClose: () => void
  expense: Expense | null
  currency?: string
  canEdit?: boolean
  canDelete?: boolean
  onEdit?: (expense: Expense) => void
  onDelete?: (expense: Expense) => void
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  isOpen,
  onClose,
  expense,
  currency = 'KES',
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
}) => {
  if (!expense) return null

  const categoryConfig = EXPENSE_CATEGORIES.find((c) => c.value === expense.category)
  const categoryLabel = categoryConfig?.label || expense.category
  const badgeVariant = categoryConfig?.badgeVariant || 'neutral'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Expense Record Details"
      description={`Reference: ${expense.referenceNumber || 'Internal Store Expense'}`}
      size="md"
    >
      <div className="p-6 space-y-5">
        {/* Header Hero Amount Card */}
        <div className="rounded-2xl bg-slate-900 p-5 text-white flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-400 font-medium block">Total Amount Paid</span>
            <span className="text-2xl font-bold font-mono tracking-tight text-white block mt-0.5">
              {currency} {Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Incurred on {new Date(expense.expenseDate).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          <div className="text-right">
            <Badge variant={badgeVariant} size="md">
              {categoryLabel}
            </Badge>
          </div>
        </div>

        {/* Expense Properties Grid */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 divide-y divide-slate-100 text-xs">
          <div className="pb-3">
            <span className="text-slate-500 font-medium block mb-1">Description</span>
            <span className="text-sm font-semibold text-slate-800 block">{expense.description}</span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>Category</span>
            </span>
            <span className="font-medium text-slate-800">{categoryLabel}</span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Expense Date</span>
            </span>
            <span className="font-medium text-slate-800">
              {new Date(expense.expenseDate).toLocaleDateString()}
            </span>
          </div>

          {expense.referenceNumber && (
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>Reference / Receipt</span>
              </span>
              <span className="font-mono font-medium text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                {expense.referenceNumber}
              </span>
            </div>
          )}

          {expense.createdBy && (
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Recorded By</span>
              </span>
              <span className="font-medium text-slate-800">{expense.createdBy.name}</span>
            </div>
          )}

          <div className="pt-2.5 flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Created Timestamp</span>
            </span>
            <span className="text-slate-600">
              {new Date(expense.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Notes */}
        {expense.notes && (
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs">
            <span className="text-slate-500 font-semibold block mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Notes & Payee Info</span>
            </span>
            <p className="text-slate-700 m-0 leading-relaxed whitespace-pre-wrap">{expense.notes}</p>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div>
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose()
                  if (onDelete) onDelete(expense)
                }}
                className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
            {canEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose()
                  if (onEdit) onEdit(expense)
                }}
                className="text-xs"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit Expense
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
