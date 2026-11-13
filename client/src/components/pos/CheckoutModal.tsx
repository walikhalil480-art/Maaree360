import React, { useState, useEffect, useRef } from 'react'
import type { PaymentMethod, Sale, CreateSaleInput, CreateSalePaymentInput } from '../../types/sale'
import type { CartItem } from './PosCart'
import { Modal } from '../ui/Modal'
import { apiFetch, ApiError } from '../../api/client'
import {
  Banknote,
  Smartphone,
  CreditCard,
  Building,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  User,
  Plus,
  Trash2,
  RefreshCw,
  Send,
  Check,
  Split,
  Layers,
} from 'lucide-react'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
  cart: CartItem[]
  orderDiscount: number
  currency: string
  onSaleCompleted: (sale: Sale) => void
}

interface SplitPaymentRow {
  id: string
  method: PaymentMethod
  amount: string
  amountTendered?: string
  reference?: string
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  businessId,
  cart,
  orderDiscount,
  currency,
  onSaleCompleted,
}) => {
  // Mode: Single Payment vs Split Payment
  const [isSplitMode, setIsSplitMode] = useState(false)

  // Single payment states
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [amountTendered, setAmountTendered] = useState<string>('')
  const [reference, setReference] = useState<string>('')

  // M-Pesa STK Push states
  const [mpesaTab, setMpesaTab] = useState<'STK' | 'MANUAL'>('STK')
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [stkLoading, setStkLoading] = useState(false)
  const [stkCheckoutId, setStkCheckoutId] = useState<string | null>(null)
  const [stkStatus, setStkStatus] = useState<'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED'>('IDLE')
  const [stkReceiptNumber, setStkReceiptNumber] = useState<string | null>(null)
  const [stkErrorMessage, setStkErrorMessage] = useState<string | null>(null)
  const [simulatingCallback, setSimulatingCallback] = useState(false)

  // Split payments state
  const [splitRows, setSplitRows] = useState<SplitPaymentRow[]>([])

  // Customer states
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone?: string | null }>>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [quickAddName, setQuickAddName] = useState('')
  const [quickAddPhone, setQuickAddPhone] = useState('')
  const [quickAddLoading, setQuickAddLoading] = useState(false)
  const [customerName, setCustomerName] = useState<string>('')
  const [customerPhone, setCustomerPhone] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Form submission
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState<string>('')

  // Polling ref for M-Pesa status
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Compute totals
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const lineDiscounts = cart.reduce((sum, item) => sum + (item.discount || 0), 0)
  const totalDiscount = lineDiscounts + (orderDiscount || 0)
  const totalDue = Math.max(0, subtotal - totalDiscount)

  // Fetch active customers when modal opens
  useEffect(() => {
    if (!isOpen || !businessId) {
      setCustomers([])
      return
    }

    setCustomers([])
    const loadCustomers = async () => {
      try {
        const res = await apiFetch<{ success: boolean; customers: any[] }>(
          `/api/v1/businesses/${businessId}/customers?limit=100&isActive=true`
        )
        if (res && res.success) {
          setCustomers(res.customers || [])
        }
      } catch (err) {
        console.warn('Failed to load customers for checkout', err)
      }
    }

    loadCustomers()
  }, [isOpen, businessId])

  // Reset or initialize modal
  useEffect(() => {
    if (isOpen) {
      setIdempotencyKey(crypto.randomUUID())
      setErrorMessage(null)
      setSubmitting(false)
      setIsSplitMode(false)
      setPaymentMethod('CASH')
      setAmountTendered(totalDue.toString())
      setReference('')
      setSelectedCustomerId('')
      setIsQuickAddOpen(false)
      setQuickAddName('')
      setQuickAddPhone('')
      setCustomerName('')
      setCustomerPhone('')
      setNotes('')

      // M-Pesa reset
      setMpesaTab('STK')
      setMpesaPhone('')
      setStkLoading(false)
      setStkCheckoutId(null)
      setStkStatus('IDLE')
      setStkReceiptNumber(null)
      setStkErrorMessage(null)

      // Initialize split rows with 2 splits: Cash & M-Pesa
      const half1 = Math.round(totalDue / 2)
      const half2 = totalDue - half1
      setSplitRows([
        { id: '1', method: 'CASH', amount: half1.toString(), amountTendered: half1.toString() },
        { id: '2', method: 'MOBILE_MONEY', amount: half2.toString(), reference: '' },
      ])
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [isOpen, totalDue])

  // Poll M-Pesa status when pending
  useEffect(() => {
    if (stkCheckoutId && stkStatus === 'PENDING') {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)

      pollTimerRef.current = setInterval(async () => {
        try {
          const res = await apiFetch<{
            success: boolean
            transaction: {
              status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED'
              resultCode?: number | null
              resultDesc?: string | null
              mpesaReceiptNumber?: string | null
            }
          }>(`/api/v1/payments/mpesa/status/${stkCheckoutId}`)

          if (res && res.success && res.transaction) {
            if (res.transaction.status === 'PAID') {
              if (pollTimerRef.current) clearInterval(pollTimerRef.current)
              setStkStatus('SUCCESS')
              const receipt = res.transaction.mpesaReceiptNumber || 'MPESA_PAID'
              setStkReceiptNumber(receipt)
              setReference(receipt)
            } else if (res.transaction.status === 'FAILED' || res.transaction.status === 'CANCELLED') {
              if (pollTimerRef.current) clearInterval(pollTimerRef.current)
              setStkStatus('FAILED')
              setStkErrorMessage(res.transaction.resultDesc || 'M-Pesa transaction was cancelled or failed.')
            }
          }
        } catch (err) {
          console.warn('Polling M-Pesa error', err)
        }
      }, 2500)

      return () => {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      }
    }
  }, [stkCheckoutId, stkStatus])

  // Single cash computations
  const numTendered = parseFloat(amountTendered) || 0
  const changeDue = Math.max(0, numTendered - totalDue)
  const isCash = paymentMethod === 'CASH'
  const isCashInsufficient = isCash && numTendered < totalDue

  // Split computations
  const totalSplitAllocated = splitRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
  const remainingSplitBalance = totalDue - totalSplitAllocated
  const isSplitAllocatedComplete = Math.abs(remainingSplitBalance) < 0.01

  // Helper for quick cash buttons
  const getQuickTenderOptions = (amount: number) => {
    const opts = new Set<number>()
    opts.add(amount) // exact
    if (amount % 100 !== 0) opts.add(Math.ceil(amount / 100) * 100)
    if (amount % 500 !== 0) opts.add(Math.ceil(amount / 500) * 500)
    if (amount % 1000 !== 0) opts.add(Math.ceil(amount / 1000) * 1000)
    return Array.from(opts).sort((a, b) => a - b).slice(0, 4)
  }

  // Send M-Pesa STK Push
  const handleSendStkPush = async () => {
    const phone = mpesaPhone.trim() || customerPhone.trim()
    if (!phone) {
      setStkErrorMessage('Please enter customer phone number (e.g. 0712345678 or 2547...)')
      return
    }

    setStkLoading(true)
    setStkErrorMessage(null)
    setStkStatus('PENDING')

    try {
      const res = await apiFetch<{
        success: boolean
        checkoutRequestId: string
        merchantRequestId: string
        responseDescription: string
      }>('/api/v1/payments/mpesa/stkpush', {
        method: 'POST',
        body: JSON.stringify({
          businessId,
          amount: totalDue,
          phoneNumber: phone,
          accountReference: 'TillPro',
          transactionDesc: `Order #${idempotencyKey.slice(0, 8)}`,
        }),
      })

      if (res && res.success && res.checkoutRequestId) {
        setStkCheckoutId(res.checkoutRequestId)
      } else {
        throw new Error('Failed to initiate M-Pesa STK Push')
      }
    } catch (err: any) {
      setStkStatus('FAILED')
      setStkErrorMessage(err?.message || 'Failed to dispatch M-Pesa prompt')
    } finally {
      setStkLoading(false)
    }
  }

  // Simulate Sandbox Approval for testing
  const handleSimulateApproval = async () => {
    if (!stkCheckoutId) return
    setSimulatingCallback(true)
    try {
      await apiFetch('/api/v1/payments/mpesa/simulate-callback', {
        method: 'POST',
        body: JSON.stringify({
          checkoutRequestId: stkCheckoutId,
          resultCode: 0,
          resultDesc: 'The service was accepted successfully.',
        }),
      })
    } catch (err: any) {
      console.warn('Simulation error', err)
    } finally {
      setSimulatingCallback(false)
    }
  }

  // Customer Management
  const handleQuickAddCustomer = async () => {
    if (!quickAddName.trim()) {
      setErrorMessage('Customer name is required for registration.')
      return
    }

    setQuickAddLoading(true)
    setErrorMessage(null)

    try {
      const res = await apiFetch<{ success: boolean; customer: any }>(
        `/api/v1/businesses/${businessId}/customers`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: quickAddName.trim(),
            phone: quickAddPhone.trim() || undefined,
          }),
        }
      )

      if (res && res.success) {
        setCustomers((prev) => [res.customer, ...prev])
        setSelectedCustomerId(res.customer.id)
        setCustomerName(res.customer.name)
        setCustomerPhone(res.customer.phone || '')
        if (res.customer.phone && !mpesaPhone) {
          setMpesaPhone(res.customer.phone)
        }
        setIsQuickAddOpen(false)
        setQuickAddName('')
        setQuickAddPhone('')
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create customer.')
    } finally {
      setQuickAddLoading(false)
    }
  }

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id)
    if (!id) {
      setCustomerName('')
      setCustomerPhone('')
      return
    }
    const found = customers.find((c) => c.id === id)
    if (found) {
      setCustomerName(found.name)
      setCustomerPhone(found.phone || '')
      if (found.phone && !mpesaPhone) {
        setMpesaPhone(found.phone)
      }
    }
  }

  // Split Rows Actions
  const handleAddSplitRow = () => {
    const remaining = Math.max(0, remainingSplitBalance)
    setSplitRows((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        method: 'CASH',
        amount: remaining > 0 ? remaining.toString() : '0',
      },
    ])
  }

  const handleRemoveSplitRow = (id: string) => {
    if (splitRows.length <= 1) return
    setSplitRows((prev) => prev.filter((r) => r.id !== id))
  }

  const handleUpdateSplitRow = (id: string, updates: Partial<SplitPaymentRow>) => {
    setSplitRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)))
  }

  // Main Submit Checkout
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isSplitMode && isCashInsufficient) {
      setErrorMessage(`Amount tendered is less than total due (${currency} ${totalDue.toFixed(2)})`)
      return
    }

    if (isSplitMode && !isSplitAllocatedComplete) {
      setErrorMessage(
        `Split payments must equal the total due. Currently off by ${currency} ${Math.abs(remainingSplitBalance).toFixed(2)}`
      )
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    // Build payload
    let paymentsPayload: CreateSalePaymentInput[] | undefined = undefined
    let singlePaymentPayload: CreateSalePaymentInput | undefined = undefined

    if (isSplitMode) {
      paymentsPayload = splitRows.map((r) => {
        const amt = parseFloat(r.amount) || 0
        const tendered = r.amountTendered ? parseFloat(r.amountTendered) : undefined
        return {
          method: r.method,
          amount: amt,
          amountTendered: r.method === 'CASH' ? tendered || amt : undefined,
          reference: r.reference?.trim() || undefined,
        }
      })
    } else {
      singlePaymentPayload = {
        method: paymentMethod,
        amount: totalDue,
        amountTendered: isCash ? numTendered : undefined,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      }
    }

    const payload: CreateSaleInput = {
      items: cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        discount: i.discount > 0 ? i.discount : undefined,
      })),
      discount: orderDiscount > 0 ? orderDiscount : undefined,
      payment: singlePaymentPayload,
      payments: paymentsPayload,
      customerId: selectedCustomerId || undefined,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      notes: notes.trim() || undefined,
      idempotencyKey,
    }

    try {
      const res = await apiFetch<{ success: boolean; sale: Sale }>(
        `/api/v1/businesses/${businessId}/sales`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      )

      if (res && res.success && res.sale) {
        onSaleCompleted(res.sale)
        onClose()
      } else {
        setErrorMessage('Failed to process sale. Please try again.')
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || 'Error completing checkout')
      } else {
        setErrorMessage('A network error occurred while recording the sale.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Sale Checkout"
      description="Record customer payment, initiate M-Pesa STK push, or split across methods"
      size="lg"
    >
      <form onSubmit={handleCheckout} className="p-6 space-y-5 bg-white">
        {/* Total Amount Due Banner (Deep Navy) */}
        <div className="bg-[#142B4A] text-white rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold">
              Total Amount Due
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white mt-0.5">
              {currency}{' '}
              {totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-right sm:text-right text-xs text-slate-300">
            <div>
              {cart.length} distinct {cart.length === 1 ? 'item' : 'items'} in basket
            </div>
            {totalDiscount > 0 && (
              <div className="text-emerald-300 font-medium pt-0.5">
                Includes {currency} {totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })} discount
              </div>
            )}
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Mode Toggle: Single Payment vs Split Payment */}
        <div className="flex items-center justify-between bg-[#F5F7FA] p-1.5 rounded-xl border border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => setIsSplitMode(false)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
              !isSplitMode
                ? 'bg-white text-[#142B4A] shadow-2xs border border-[#E2E8F0]'
                : 'text-[#64748B] hover:text-[#172033]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Standard (Single Payment)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsSplitMode(true)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
              isSplitMode
                ? 'bg-white text-[#142B4A] shadow-2xs border border-[#E2E8F0]'
                : 'text-[#64748B] hover:text-[#172033]'
            }`}
          >
            <Split className="w-4 h-4" />
            <span>Split Payment (Cash + M-Pesa / Card)</span>
          </button>
        </div>

        {/* Standard Single Payment View */}
        {!isSplitMode ? (
          <div className="space-y-4">
            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-[#172033] uppercase tracking-wider mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'CASH' as PaymentMethod, label: 'Cash', icon: Banknote },
                  { id: 'MOBILE_MONEY' as PaymentMethod, label: 'M-Pesa / Mobile', icon: Smartphone },
                  { id: 'CARD' as PaymentMethod, label: 'Card / POS', icon: CreditCard },
                  { id: 'BANK_TRANSFER' as PaymentMethod, label: 'Bank Transfer', icon: Building },
                  { id: 'OTHER' as PaymentMethod, label: 'Other', icon: HelpCircle },
                ].map((method) => {
                  const Icon = method.icon
                  const isSelected = paymentMethod === method.id

                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all ${
                        isSelected
                          ? 'bg-[#142B4A] border-[#142B4A] text-white shadow-2xs'
                          : 'bg-white border-[#E2E8F0] text-[#172033] hover:bg-[#F5F7FA] hover:border-[#64748B]'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-[#64748B]'}`} />
                      <span className="text-xs font-semibold leading-tight">{method.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Cash Tender & Change */}
            {paymentMethod === 'CASH' && (
              <div className="bg-[#F5F7FA] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#172033]">
                    Amount Received ({currency})
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {getQuickTenderOptions(totalDue).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAmountTendered(opt.toString())}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-[#E2E8F0] rounded-md text-[#172033] hover:border-[#142B4A] transition"
                      >
                        {opt === totalDue ? 'Exact' : opt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="number"
                  step="any"
                  min="0"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-lg font-bold font-mono px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[#172033] focus:outline-none focus:border-[#142B4A] focus:ring-1 focus:ring-[#142B4A] transition"
                  autoFocus
                />

                <div
                  className={`p-3 rounded-xl flex items-center justify-between font-mono text-sm border transition-colors ${
                    isCashInsufficient
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isCashInsufficient ? (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    <span className="font-semibold text-xs font-sans">
                      {isCashInsufficient ? 'Insufficient Tender:' : 'Change Due to Customer:'}
                    </span>
                  </div>
                  <div className="font-extrabold text-base">
                    {currency}{' '}
                    {isCashInsufficient
                      ? (totalDue - numTendered).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : changeDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )}

            {/* M-Pesa STK Push / Manual Entry */}
            {paymentMethod === 'MOBILE_MONEY' && (
              <div className="bg-[#F5F7FA] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                  <div className="text-xs font-bold text-[#172033]">M-Pesa Verification</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMpesaTab('STK')}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition ${
                        mpesaTab === 'STK'
                          ? 'bg-[#142B4A] text-white'
                          : 'bg-white text-[#64748B] border border-[#E2E8F0]'
                      }`}
                    >
                      Daraja STK Push
                    </button>
                    <button
                      type="button"
                      onClick={() => setMpesaTab('MANUAL')}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition ${
                        mpesaTab === 'MANUAL'
                          ? 'bg-[#142B4A] text-white'
                          : 'bg-white text-[#64748B] border border-[#E2E8F0]'
                      }`}
                    >
                      Manual Ref Code
                    </button>
                  </div>
                </div>

                {mpesaTab === 'STK' ? (
                  <div className="space-y-3">
                    {stkStatus === 'SUCCESS' ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-bold text-xs block">M-Pesa Payment Confirmed!</span>
                            <span className="text-[11px] font-mono text-emerald-700">
                              Receipt: {stkReceiptNumber}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          VERIFIED
                        </span>
                      </div>
                    ) : stkStatus === 'PENDING' ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 text-amber-900">
                        <div className="flex items-center gap-3">
                          <RefreshCw className="w-5 h-5 text-amber-600 animate-spin shrink-0" />
                          <div>
                            <div className="text-xs font-bold">Waiting for Customer PIN Entry...</div>
                            <div className="text-[11px] text-amber-700">
                              STK Prompt sent for {currency} {totalDue.toFixed(2)}.
                            </div>
                          </div>
                        </div>

                        {/* Sandbox Simulation button for dev & verification */}
                        <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between">
                          <span className="text-[10px] text-amber-700">Testing in sandbox?</span>
                          <button
                            type="button"
                            onClick={handleSimulateApproval}
                            disabled={simulatingCallback}
                            className="text-xs font-semibold px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition"
                          >
                            {simulatingCallback ? 'Simulating...' : 'Simulate Customer PIN Approval'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-[#172033]">
                          Customer Safaricom Mobile Number
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            value={mpesaPhone}
                            onChange={(e) => setMpesaPhone(e.target.value)}
                            placeholder="0712345678 or 2547..."
                            className="flex-1 px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#172033] font-mono focus:outline-none focus:border-[#142B4A]"
                          />
                          <button
                            type="button"
                            onClick={handleSendStkPush}
                            disabled={stkLoading || !mpesaPhone.trim()}
                            className="px-4 py-2 bg-[#142B4A] hover:bg-[#0E2038] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
                          >
                            {stkLoading ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            <span>Send Prompt</span>
                          </button>
                        </div>
                        {stkErrorMessage && (
                          <div className="text-xs text-rose-600 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{stkErrorMessage}</span>
                          </div>
                        )}
                        <p className="text-[11px] text-[#64748B] m-0">
                          Dispatches an instant Safaricom STK prompt to the customer&apos;s handset to authorize payment.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#172033]">
                      M-Pesa Transaction Code
                    </label>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="e.g. QJD789X123"
                      className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#172033] font-mono uppercase focus:outline-none focus:border-[#142B4A]"
                    />
                    <p className="text-[11px] text-[#64748B] m-0">
                      Enter the 10-character code from the customer&apos;s SMS confirmation.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Card & Other Reference */}
            {paymentMethod !== 'CASH' && paymentMethod !== 'MOBILE_MONEY' && (
              <div className="bg-[#F5F7FA] border border-[#E2E8F0] rounded-xl p-4 space-y-2">
                <label className="block text-xs font-bold text-[#172033]">
                  {paymentMethod === 'CARD'
                    ? 'Card Authorization Code / POS Terminal Slip Ref'
                    : 'Payment Reference Number'}
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={paymentMethod === 'CARD' ? 'e.g. AUTH-987654' : 'e.g. REF-12345'}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl text-[#172033] focus:outline-none focus:border-[#142B4A] font-mono transition"
                />
              </div>
            )}
          </div>
        ) : (
          /* Split Payments Multi-Row View */
          <div className="space-y-3 bg-[#F5F7FA] p-4 rounded-2xl border border-[#E2E8F0]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#172033] uppercase tracking-wider block">
                  Split Payment Breakdown
                </span>
                <span className="text-[11px] text-[#64748B]">
                  Allocate total due across cash, card, and M-Pesa
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddSplitRow}
                className="px-3 py-1.5 bg-white border border-[#E2E8F0] hover:border-[#142B4A] text-[#142B4A] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Payment Row</span>
              </button>
            </div>

            {/* Split Rows */}
            <div className="space-y-2">
              {splitRows.map((row, index) => (
                <div
                  key={row.id}
                  className="bg-white p-3 rounded-xl border border-[#E2E8F0] flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shadow-2xs"
                >
                  <span className="text-xs font-bold text-[#64748B] w-6 shrink-0">
                    #{index + 1}
                  </span>

                  {/* Method dropdown */}
                  <select
                    value={row.method}
                    onChange={(e) =>
                      handleUpdateSplitRow(row.id, { method: e.target.value as PaymentMethod })
                    }
                    className="px-2.5 py-1.5 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg text-[#172033] font-semibold focus:outline-none focus:border-[#142B4A]"
                  >
                    <option value="CASH">Cash</option>
                    <option value="MOBILE_MONEY">M-Pesa / Mobile</option>
                    <option value="CARD">Card / POS</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other</option>
                  </select>

                  {/* Amount allocated */}
                  <div className="flex-1 flex items-center gap-1.5 w-full sm:w-auto">
                    <span className="text-xs text-[#64748B] font-mono">{currency}</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={row.amount}
                      onChange={(e) => handleUpdateSplitRow(row.id, { amount: e.target.value })}
                      placeholder="Amount"
                      className="w-full sm:w-28 px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#172033] font-mono font-bold focus:outline-none focus:border-[#142B4A]"
                    />
                  </div>

                  {/* Reference input for non-cash or tendered for cash */}
                  {row.method === 'CASH' ? (
                    <div className="flex items-center gap-1 text-[11px] text-[#64748B]">
                      <span>Tendered:</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={row.amountTendered || ''}
                        onChange={(e) =>
                          handleUpdateSplitRow(row.id, { amountTendered: e.target.value })
                        }
                        placeholder={row.amount}
                        className="w-20 px-2 py-1 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-md font-mono"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={row.reference || ''}
                      onChange={(e) => handleUpdateSplitRow(row.id, { reference: e.target.value })}
                      placeholder="Ref / M-Pesa Code"
                      className="w-full sm:w-36 px-2.5 py-1.5 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg text-[#172033] font-mono focus:outline-none focus:border-[#142B4A]"
                    />
                  )}

                  {/* Delete row button */}
                  {splitRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSplitRow(row.id)}
                      className="p-1 text-[#64748B] hover:text-rose-600 transition self-end sm:self-center"
                      title="Remove Row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Split Balance Verification Bar */}
            <div
              className={`p-3 rounded-xl flex items-center justify-between text-xs font-mono border ${
                isSplitAllocatedComplete
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <div>
                <span className="font-sans font-bold">Allocated:</span> {currency}{' '}
                {totalSplitAllocated.toFixed(2)} / {currency} {totalDue.toFixed(2)}
              </div>
              <div className="font-bold">
                {isSplitAllocatedComplete ? (
                  <span className="flex items-center gap-1 text-[#059669]">
                    <Check className="w-4 h-4" /> Balanced & Ready
                  </span>
                ) : (
                  <span>
                    Remaining: {currency} {remainingSplitBalance.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Customer Account & Quick Add */}
        <div className="space-y-2 p-3.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-xl">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#172033] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#64748B]" />
              Customer Information
            </label>
            <button
              type="button"
              onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
              className="text-xs font-semibold text-[#142B4A] hover:underline transition"
            >
              {isQuickAddOpen ? 'Cancel Quick Add' : '+ Quick Register New'}
            </button>
          </div>

          {/* Quick Add Form */}
          {isQuickAddOpen ? (
            <div className="p-3 bg-white border border-[#E2E8F0] rounded-xl space-y-2">
              <div className="text-[11px] font-semibold text-[#142B4A]">
                Register Customer & Link to Sale
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={quickAddName}
                  onChange={(e) => setQuickAddName(e.target.value)}
                  placeholder="Customer Full Name *"
                  className="w-full px-3 py-1.5 text-xs bg-[#F5F7FA]/50 border border-[#E2E8F0] rounded-lg text-[#172033] focus:outline-none focus:border-[#142B4A]"
                />
                <input
                  type="text"
                  value={quickAddPhone}
                  onChange={(e) => setQuickAddPhone(e.target.value)}
                  placeholder="Phone (e.g. 0712345678)"
                  className="w-full px-3 py-1.5 text-xs bg-[#F5F7FA]/50 border border-[#E2E8F0] rounded-lg text-[#172033] focus:outline-none focus:border-[#142B4A] font-mono"
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleQuickAddCustomer}
                  disabled={quickAddLoading || !quickAddName.trim()}
                  className="px-3.5 py-1.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                >
                  {quickAddLoading ? 'Registering...' : 'Register & Select'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <select
                value={selectedCustomerId}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-xl text-[#172033] focus:outline-none focus:border-[#142B4A] font-medium"
              >
                <option value="">Walk-in Customer (Unregistered)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>

              {/* Walk-in custom details */}
              {!selectedCustomerId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in name (optional)"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#172033] focus:outline-none focus:border-[#142B4A]"
                  />
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Walk-in phone (optional)"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#172033] focus:outline-none focus:border-[#142B4A] font-mono"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-[#64748B] hover:text-[#172033] hover:bg-[#F5F7FA] rounded-xl transition border border-transparent"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              submitting ||
              (!isSplitMode && isCashInsufficient) ||
              (isSplitMode && !isSplitAllocatedComplete)
            }
            className="px-6 py-2.5 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-xl shadow-[0_2px_8px_rgba(5,150,105,0.25)] hover:shadow-[0_4px_12px_rgba(5,150,105,0.35)] transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing Sale...</span>
              </>
            ) : (
              <span>
                Complete Sale ({currency}{' '}
                {totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
