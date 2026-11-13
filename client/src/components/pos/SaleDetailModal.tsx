import React from 'react'
import type { Sale } from '../../types/sale'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import {
  User,
  CreditCard,
  Printer,
  Package,
} from 'lucide-react'

interface SaleDetailModalProps {
  isOpen: boolean
  onClose: () => void
  sale: Sale | null
  onPrint?: (sale: Sale) => void
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  isOpen,
  onClose,
  sale,
  onPrint,
}) => {
  if (!sale) return null

  const currency = sale.currency || 'KES'

  const getStatusBadge = (status: Sale['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success" size="sm">Completed</Badge>
      case 'CANCELLED':
        return <Badge variant="danger" size="sm">Cancelled</Badge>
      case 'DRAFT':
        return <Badge variant="warning" size="sm">Draft</Badge>
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>
    }
  }

  const primaryPayment = sale.payments?.[0]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Sale Details — #${sale.receiptNumber}`}
      description={`Transaction recorded on ${new Date(sale.createdAt).toLocaleString()}`}
      size="lg"
    >
      <div className="p-6 space-y-6">
        {/* Top Status & Summary Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Status:
              </span>
              {getStatusBadge(sale.status)}
            </div>
            <div className="text-xs text-slate-600">
              Cashier: <span className="font-semibold text-slate-800">{sale.cashier?.name || 'Unknown'}</span>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Total Amount</span>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">
              {currency}{' '}
              {Number(sale.total).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>

        {/* Customer & Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Customer Information</span>
            </div>
            <div className="text-slate-600">
              Name: <span className="font-medium text-slate-900">{sale.customerName || 'Walk-in Customer'}</span>
            </div>
            {sale.customerPhone && (
              <div className="text-slate-600">
                Phone: <span className="font-mono text-slate-900">{sale.customerPhone}</span>
              </div>
            )}
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span>Payment Details</span>
            </div>
            {primaryPayment ? (
              <div className="space-y-0.5 text-slate-600">
                <div>
                  Method:{' '}
                  <span className="font-bold uppercase text-slate-800">
                    {primaryPayment.method.replace('_', ' ')}
                  </span>
                </div>
                {primaryPayment.reference && (
                  <div className="font-mono text-[11px]">
                    Ref: <span className="text-slate-900">{primaryPayment.reference}</span>
                  </div>
                )}
                {primaryPayment.changeDue != null && Number(primaryPayment.changeDue) > 0 && (
                  <div>
                    Change Due: {currency} {Number(primaryPayment.changeDue).toFixed(2)}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-slate-400">No payment records found.</span>
            )}
          </div>
        </div>

        {/* Purchased Items List (Snapshots) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 m-0">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span>Items Purchased ({sale.items?.length || 0})</span>
            </h4>
            <span className="text-[11px] text-slate-400">Immutable historical snapshot</span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Item & SKU</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Price</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Qty</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Discount</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items?.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{item.productName}</div>
                      <div className="text-[11px] font-mono text-slate-400">{item.productSku}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {currency}{' '}
                      {Number(item.unitPrice).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                      {item.quantity} {item.unit || 'unit'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-mono">
                      {Number(item.discount) > 0 ? `-${currency} ${Number(item.discount).toFixed(2)}` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">
                      {currency}{' '}
                      {Number(item.lineTotal).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800 font-mono">
                {currency}{' '}
                {Number(sale.subtotal).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            {Number(sale.discount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span className="font-semibold font-mono">
                  -{currency}{' '}
                  {Number(sale.discount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            {Number(sale.taxAmount) > 0 && (
              <div className="flex justify-between">
                <span>Tax:</span>
                <span className="font-mono">
                  {currency}{' '}
                  {Number(sale.taxAmount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-sm text-slate-900">
              <span>Grand Total:</span>
              <span className="font-mono">
                {currency}{' '}
                {Number(sale.total).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {onPrint ? (
            <button
              type="button"
              onClick={() => onPrint(sale)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-2 transition"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print / Reprint Receipt</span>
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
