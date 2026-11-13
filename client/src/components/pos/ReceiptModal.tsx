import React, { useState } from 'react'
import type { Sale } from '../../types/sale'
import { Modal } from '../ui/Modal'
import { Printer, CheckCircle2, ArrowRight, DollarSign, Settings2, Info } from 'lucide-react'
import { triggerCashDrawerViaSerial } from '../../utils/hardware'
import { MaareeLogo } from '../ui/MaareeLogo'

interface ReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  sale: Sale | null
  onNewSale?: () => void
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  onNewSale,
}) => {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm')
  const [drawerStatus, setDrawerStatus] = useState<string | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)

  if (!sale) return null

  const handlePrint = () => {
    window.print()
  }

  const handleOpenDrawer = async () => {
    setDrawerLoading(true)
    setDrawerStatus(null)
    const res = await triggerCashDrawerViaSerial()
    setDrawerStatus(res.message)
    setDrawerLoading(false)
    setTimeout(() => setDrawerStatus(null), 5000)
  }

  const payments = sale.payments || []
  const hasCashPayment = payments.some((p) => p.method === 'CASH')
  const currency = sale.currency || 'KES'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sale Completed Successfully"
      description={`Receipt #${sale.receiptNumber} generated`}
      size="md"
    >
      <div className="p-6 space-y-5">
        {/* Success header notice (hidden during print) */}
        <div className="print:hidden flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Transaction Recorded & Stock Deducted.</span>
              <span className="block text-emerald-700">
                Receipt #{sale.receiptNumber} logged to business ledger.
              </span>
            </div>
          </div>
          {hasCashPayment && (
            <button
              type="button"
              onClick={handleOpenDrawer}
              disabled={drawerLoading}
              className="px-2.5 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-2xs shrink-0"
              title="Send ESC/POS Drawer Kick Pulse"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>{drawerLoading ? 'Opening...' : 'Open Drawer'}</span>
            </button>
          )}
        </div>

        {/* Cash Drawer Status Toast */}
        {drawerStatus && (
          <div className="print:hidden p-2.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg text-xs text-[#172033] flex items-center gap-2">
            <Info className="w-4 h-4 text-[#142B4A] shrink-0" />
            <span>{drawerStatus}</span>
          </div>
        )}

        {/* Paper Format Selector (hidden during print) */}
        <div className="print:hidden flex items-center justify-between bg-[#F5F7FA] p-2 rounded-xl border border-[#E2E8F0] text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-[#172033]">
            <Settings2 className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Thermal Roll Format:</span>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setPaperWidth('80mm')}
              className={`px-3 py-1 rounded-lg font-bold transition text-xs ${
                paperWidth === '80mm'
                  ? 'bg-[#142B4A] text-white shadow-2xs'
                  : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:text-[#172033]'
              }`}
            >
              80mm (Standard POS)
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth('58mm')}
              className={`px-3 py-1 rounded-lg font-bold transition text-xs ${
                paperWidth === '58mm'
                  ? 'bg-[#142B4A] text-white shadow-2xs'
                  : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:text-[#172033]'
              }`}
            >
              58mm (Mobile POS)
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="flex justify-center">
          <div
            id="printable-receipt"
            style={{ width: paperWidth === '58mm' ? '58mm' : '80mm' }}
            className={`bg-white border border-slate-200 rounded-xl p-5 shadow-xs font-mono text-[11px] text-slate-800 space-y-3.5 print:border-none print:shadow-none print:p-0 transition-all ${
              paperWidth === '58mm' ? 'text-[10px] leading-tight' : 'text-xs'
            }`}
          >
            {/* Receipt Top Header */}
            <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
              <div className="flex justify-center mb-1">
                <MaareeLogo variant="receipt" size="xs" showSubtitle={false} theme="mono" />
              </div>
              <h3 className="font-sans font-extrabold text-sm sm:text-base text-slate-900 tracking-tight uppercase m-0">
                {sale.business?.name || 'MAAREE 360 Retail'}
              </h3>
              {sale.business?.address && (
                <p className="text-[10px] text-slate-500 m-0">{sale.business.address}</p>
              )}
              {sale.business?.phone && (
                <p className="text-[10px] text-slate-500 m-0">Tel: {sale.business.phone}</p>
              )}
              {sale.business?.taxPin && (
                <p className="text-[10px] text-slate-600 font-bold m-0">
                  KRA PIN: {sale.business.taxPin}
                </p>
              )}
              <div className="text-[10px] text-slate-600 pt-1">
                Receipt: <span className="font-bold">{sale.receiptNumber}</span>
              </div>
              <div className="text-[9px] text-slate-400">
                {new Date(sale.createdAt).toLocaleString()}
              </div>
            </div>

            {/* Cashier & Customer Info */}
            <div className="grid grid-cols-2 gap-2 text-[10px] border-b border-dashed border-slate-300 pb-2.5">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">Cashier</span>
                <span className="font-semibold text-slate-700">
                  {sale.cashier?.name || 'Staff Member'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[9px] uppercase">Customer</span>
                <span className="font-semibold text-slate-700">
                  {sale.customerName || 'Walk-in'}
                </span>
                {sale.customerPhone && (
                  <span className="block text-[9px] text-slate-400 font-mono">
                    {sale.customerPhone}
                  </span>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2.5">
              <div className="flex justify-between font-bold text-[9px] text-slate-400 uppercase tracking-wider pb-0.5">
                <span>Item</span>
                <span>Total ({currency})</span>
              </div>
              {sale.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-medium text-slate-900">
                    <span className="truncate pr-1">{item.productName}</span>
                    <span className="font-bold shrink-0">
                      {Number(item.lineTotal).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500 font-sans">
                    <span>
                      {item.quantity} {item.unit || 'pc'} &times; {Number(item.unitPrice).toFixed(2)}
                    </span>
                    {Number(item.discount) > 0 && (
                      <span className="text-emerald-600 font-medium">
                        -{Number(item.discount).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Breakdown */}
            <div className="space-y-1 border-b border-dashed border-slate-300 pb-2.5 text-[10px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{currency} {Number(sale.subtotal).toFixed(2)}</span>
              </div>
              {Number(sale.discount) > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount</span>
                  <span>-{currency} {Number(sale.discount).toFixed(2)}</span>
                </div>
              )}
              {Number(sale.taxAmount) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>VAT / Tax</span>
                  <span>{currency} {Number(sale.taxAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-black text-slate-900 pt-1 border-t border-slate-200">
                <span>TOTAL PAID</span>
                <span>{currency} {Number(sale.total).toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Details (Single or Multi-Split) */}
            <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2.5 text-[10px]">
              <div className="font-bold text-[9px] text-slate-400 uppercase">
                Payment Breakdown
              </div>
              {payments.map((p, pIdx) => (
                <div key={p.id || pIdx} className="space-y-0.5">
                  <div className="flex justify-between text-slate-700 font-semibold">
                    <span>{p.method.replace('_', ' ')}:</span>
                    <span>{currency} {Number(p.amount).toFixed(2)}</span>
                  </div>
                  {p.method === 'CASH' && p.amountTendered != null && (
                    <div className="flex justify-between text-slate-500 text-[9px]">
                      <span>Cash Tendered:</span>
                      <span>{currency} {Number(p.amountTendered).toFixed(2)}</span>
                    </div>
                  )}
                  {p.method === 'CASH' && p.changeDue != null && Number(p.changeDue) > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold text-[9px]">
                      <span>Change Returned:</span>
                      <span>{currency} {Number(p.changeDue).toFixed(2)}</span>
                    </div>
                  )}
                  {p.reference && (
                    <div className="flex justify-between text-slate-500 font-mono text-[9px]">
                      <span>Ref / Receipt:</span>
                      <span className="font-bold">{p.reference}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Receipt Footer Message */}
            <div className="text-center pt-1 text-[9px] text-slate-500 space-y-1 font-sans">
              <p className="font-semibold text-slate-700 m-0">
                {sale.business?.receiptFooter || 'Thank you for your business!'}
              </p>
              <p className="text-[8px] text-slate-400 m-0">
                Returns accepted within 7 days with original receipt
              </p>
              <p className="text-[8px] text-slate-400 font-mono m-0">
                MAAREE 360 Retail Management System
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions (hidden during print) */}
        <div className="print:hidden flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#142B4A] hover:bg-[#0E2038] text-white font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-2xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print {paperWidth}</span>
            </button>

            {hasCashPayment && (
              <button
                type="button"
                onClick={handleOpenDrawer}
                disabled={drawerLoading}
                className="px-3 py-2 bg-[#F5F7FA] hover:bg-white text-[#172033] border border-[#E2E8F0] font-semibold rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kick Drawer</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#E2E8F0] hover:bg-[#F5F7FA] text-[#64748B] font-semibold rounded-xl text-xs transition"
            >
              Close
            </button>
            {onNewSale && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onNewSale()
                }}
                className="px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-2xs"
              >
                <span>New Sale</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
