import React from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import type { Supplier } from '../../types/supplier'
import {
  Users2,
  Phone,
  Mail,
  MapPin,
  Hash,
  FileText,
  ShoppingCart,
  Edit2,
  Archive,
  RefreshCw,
  Plus,
} from 'lucide-react'

interface SupplierDetailModalProps {
  isOpen: boolean
  onClose: () => void
  supplier: Supplier | null
  onEdit: (supplier: Supplier) => void
  onToggleStatus: (supplier: Supplier) => void
  onCreatePO?: (supplier: Supplier) => void
}

export const SupplierDetailModal: React.FC<SupplierDetailModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onEdit,
  onToggleStatus,
  onCreatePO,
}) => {
  if (!supplier) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplier.name}
      description="Supplier details and contact information"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Users2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 text-base">{supplier.name}</h3>
                <Badge variant={supplier.isActive ? 'success' : 'neutral'} dot>
                  {supplier.isActive ? 'Active' : 'Archived'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {supplier.contactPerson
                  ? `Contact Person: ${supplier.contactPerson}`
                  : 'No specific contact person recorded'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose()
                onEdit(supplier)
              }}
            >
              <Edit2 className="w-4 h-4 mr-1.5" />
              Edit
            </Button>
            <Button
              variant={supplier.isActive ? 'outline' : 'secondary'}
              size="sm"
              onClick={() => onToggleStatus(supplier)}
            >
              {supplier.isActive ? (
                <>
                  <Archive className="w-4 h-4 mr-1.5 text-slate-500" />
                  Archive
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Reactivate
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Detailed Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Phone */}
          <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              Phone Number
            </span>
            <a
              href={`tel:${supplier.phone}`}
              className="text-sm font-semibold text-emerald-700 hover:underline mt-1 block"
            >
              {supplier.phone}
            </a>
          </div>

          {/* Email */}
          <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              Email Address
            </span>
            {supplier.email ? (
              <a
                href={`mailto:${supplier.email}`}
                className="text-sm font-semibold text-blue-600 hover:underline mt-1 block truncate"
              >
                {supplier.email}
              </a>
            ) : (
              <span className="text-sm text-slate-400 mt-1 block italic">Not provided</span>
            )}
          </div>

          {/* KRA PIN */}
          <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-slate-600" />
              KRA PIN / Tax ID
            </span>
            <span className="text-sm font-mono font-medium text-slate-800 mt-1 block">
              {supplier.taxPin || <span className="text-slate-400 italic font-sans">None</span>}
            </span>
          </div>

          {/* PO Count */}
          <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5 text-amber-600" />
              Purchase Orders Placed
            </span>
            <span className="text-sm font-semibold text-slate-800 mt-1 block">
              {supplier._count?.purchaseOrders ?? 0} orders
            </span>
          </div>

          {/* Physical Address */}
          <div className="sm:col-span-2 p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-600" />
              Physical Address / Location
            </span>
            <span className="text-sm text-slate-700 mt-1 block">
              {supplier.physicalAddress || (
                <span className="text-slate-400 italic">No physical address recorded</span>
              )}
            </span>
          </div>

          {/* Notes */}
          {supplier.notes && (
            <div className="sm:col-span-2 p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Notes & Terms
              </span>
              <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{supplier.notes}</p>
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100">
          <span>Added: {new Date(supplier.createdAt).toLocaleDateString()}</span>
          <span>Last updated: {new Date(supplier.updatedAt).toLocaleDateString()}</span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          {onCreatePO && supplier.isActive && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose()
                onCreatePO(supplier)
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create Purchase Order
            </Button>
          )}
          <div className="ml-auto">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
