import React, { useRef } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import type { SaleReturn } from '../../types/return'
import { Printer } from 'lucide-react'

interface ReturnReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  returnRecord: SaleReturn | null
  businessName?: string
  currency?: string
}

export const ReturnReceiptModal: React.FC<ReturnReceiptModalProps> = ({
  isOpen,
  onClose,
  returnRecord,
  businessName = 'TillPro Retail',
  currency = 'KES',
}) => {
  const printRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !returnRecord) return null

  const handlePrint = () => {
    window.print()
  }

  const items = returnRecord.items || []

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Return Receipt / Credit Note" size="md">
      <div className="space-y-4">
        {/* Printable Receipt Paper Container */}
        <div
          ref={printRef}
          className="print-container bg-white border border-slate-200 rounded-xl p-5 shadow-xs font-mono text-xs text-slate-800 space-y-4"
        >
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3">
            <h2 className="font-bold text-base tracking-tight uppercase text-slate-900 font-sans">
              {returnRecord.business?.name || businessName}
            </h2>
            <div className="text-[11px] text-slate-500 font-sans mt-0.5">
              Official Sales Return & Credit Note
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
            <div>
              <span className="text-slate-500">Credit Note #:</span>{' '}
              <span className="font-bold text-slate-900">{returnRecord.returnNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Date:</span>{' '}
              <span>{new Date(returnRecord.createdAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-slate-500">Orig. Sale:</span>{' '}
              <span className="font-bold text-slate-800">
                {returnRecord.sale?.receiptNumber || 'POS'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Time:</span>{' '}
              <span>
                {new Date(returnRecord.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Processed By:</span>{' '}
              <span>{returnRecord.processedBy?.name || 'Staff'}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Customer:</span>{' '}
              <span>{returnRecord.customer?.name || returnRecord.sale?.customerName || 'Walk-in'}</span>
            </div>
          </div>

          {/* Returned Items Table */}
          <div className="border-b border-dashed border-slate-300 pb-3">
            <div className="font-bold text-[10px] uppercase text-slate-400 mb-1.5 flex justify-between">
              <span>Item / Qty</span>
              <span>Refund Subtotal</span>
            </div>

            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.id} className="flex justify-between items-start text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{it.product?.name || 'Item'}</div>
                    <div className="text-[10px] text-slate-500">
                      {Number(it.quantityReturned)} x {currency} {Number(it.unitRefundPrice).toFixed(2)}{' '}
                      <span className="text-slate-400">
                        [{it.restockAction === 'RESTOCK' ? 'Restocked' : 'Write-off'}]
                      </span>
                    </div>
                  </div>
                  <div className="font-bold text-slate-900">
                    {currency} {Number(it.refundSubtotal).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Totals */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between font-bold text-sm text-slate-900 pt-1">
              <span>TOTAL REFUND:</span>
              <span className="font-mono">
                {currency} {Number(returnRecord.refundAmount).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-[11px] text-slate-600">
              <span>Refund Method:</span>
              <span className="font-bold uppercase">{returnRecord.refundMethod}</span>
            </div>

            {returnRecord.refundReference && (
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Ref / Auth:</span>
                <span className="font-mono">{returnRecord.refundReference}</span>
              </div>
            )}

            {returnRecord.reason && (
              <div className="text-[10px] text-slate-500 pt-1 italic">
                Reason: {returnRecord.reason}
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="text-center border-t border-dashed border-slate-300 pt-3 text-[10px] text-slate-400 font-sans">
            Inventory balance automatically adjusted in audit ledger.
            <br />
            Thank you for shopping with us!
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print Credit Note
          </Button>
        </div>
      </div>
    </Modal>
  )
}
