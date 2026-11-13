import React, { useState } from 'react'
import type { Product } from '../../types/product'
import { ProductImage } from '../ui/ProductImage'
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react'

export interface CartItem {
  product: Product
  quantity: number
  unitPrice: number
  discount: number
  notes?: string
}

interface PosCartProps {
  cart: CartItem[]
  onUpdateQuantity: (productId: string, quantity: number) => void
  onUpdateDiscount: (productId: string, discount: number) => void
  onRemoveItem: (productId: string) => void
  onClearCart: () => void
  orderDiscount: number
  onUpdateOrderDiscount: (discount: number) => void
  currency: string
  canApplyDiscounts: boolean
  onProceedToCheckout: () => void
}

export const PosCart: React.FC<PosCartProps> = ({
  cart,
  onUpdateQuantity,
  onUpdateDiscount,
  onRemoveItem,
  onClearCart,
  orderDiscount,
  onUpdateOrderDiscount,
  currency,
  canApplyDiscounts,
  onProceedToCheckout,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showOrderDiscountInput, setShowOrderDiscountInput] = useState(false)

  // Financial calculations
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const lineDiscountsTotal = cart.reduce((sum, item) => sum + (item.discount || 0), 0)
  const totalDiscount = lineDiscountsTotal + (orderDiscount || 0)
  const grandTotal = Math.max(0, subtotal - totalDiscount)
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Kenya 16% VAT Included calculation
  const vatAmount = Math.max(0, grandTotal - grandTotal / 1.16)

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Cart Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200/80 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 text-[#0F172A] flex items-center justify-center font-bold shadow-2xs">
            <ShoppingCart className="w-4 h-4 text-[#059669]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] tracking-tight m-0">Current Register</h3>
            <span className="text-[11px] text-slate-500 font-tabular">
              {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in basket
            </span>
          </div>
        </div>

        {cart.length > 0 && (
          <div>
            {showClearConfirm ? (
              <div className="flex items-center gap-1.5 animate-in fade-in duration-100">
                <span className="text-xs text-rose-600 font-semibold">Clear?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClearCart()
                    setShowClearConfirm(false)
                  }}
                  className="px-2 py-0.5 text-xs bg-rose-600 text-white rounded-md font-semibold hover:bg-rose-700 transition"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 border border-slate-200 rounded-md hover:bg-white transition"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                title="Clear current cart"
                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 bg-white">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center mb-3 text-slate-300">
              <ShoppingCart className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h4 className="text-sm font-bold text-[#0F172A] m-0">Register is Empty</h4>
            <p className="text-xs text-slate-500 mt-1.5 max-w-xs m-0">
              Select products from the catalog or scan barcodes to begin a checkout transaction.
            </p>
          </div>
        ) : (
          cart.map((item) => {
            const currentStock = Number(item.product.stockLevel?.quantity ?? 0)
            const isAtMaxStock = item.quantity >= currentStock
            const lineSubtotal = item.unitPrice * item.quantity
            const lineTotal = Math.max(0, lineSubtotal - (item.discount || 0))

            return (
              <div key={item.product.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2.5">
                {/* Product Packshot Thumbnail, Title & Delete */}
                <div className="flex items-start gap-2.5">
                  {/* Square Packshot Thumbnail */}
                  <div className="w-12 h-12 shrink-0">
                    <ProductImage
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      aspectRatio="square"
                      containerClassName="p-1 rounded-lg bg-slate-50/50"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-xs font-semibold text-[#0F172A] leading-snug line-clamp-2 m-0">
                        {item.product.name}
                      </h5>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.product.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors shrink-0"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 font-mono">
                      <span>{item.product.sku}</span>
                      <span>&bull;</span>
                      <span className="font-tabular text-[#0F172A]">
                        {currency} {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quantity Controls & Line Total */}
                <div className="flex items-center justify-between pl-[3.25rem]">
                  {/* Quantity Stepper */}
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                      className="px-2 py-1 text-slate-600 hover:bg-slate-50 transition"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={currentStock}
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10)
                        if (!isNaN(val) && val >= 1) {
                          onUpdateQuantity(item.product.id, Math.min(val, currentStock))
                        }
                      }}
                      className="w-10 text-center text-xs font-bold font-tabular text-[#0F172A] bg-white border-x border-slate-200 py-1 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                      disabled={isAtMaxStock}
                      className={`px-2 py-1 transition ${
                        isAtMaxStock
                          ? 'text-slate-300 cursor-not-allowed bg-slate-50'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                      title={isAtMaxStock ? 'Maximum available stock reached' : 'Increase quantity'}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right">
                    <div className="text-xs font-bold text-[#0F172A] font-tabular">
                      {currency} {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {item.discount > 0 && (
                      <div className="text-[10px] text-[#059669] font-semibold font-tabular">
                        -{currency} {item.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })} off
                      </div>
                    )}
                  </div>
                </div>

                {/* Line Discount Control */}
                {canApplyDiscounts && (
                  <div className="flex items-center justify-between pl-[3.25rem] pt-1">
                    <span className="text-[11px] text-slate-500">Line Discount:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">{currency}</span>
                      <input
                        type="number"
                        min={0}
                        max={lineSubtotal}
                        step="any"
                        value={item.discount || ''}
                        placeholder="0.00"
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          onUpdateDiscount(item.product.id, Math.min(lineSubtotal, Math.max(0, val)))
                        }}
                        className="w-20 px-2 py-0.5 text-xs text-right border border-slate-200 rounded-md focus:outline-none focus:border-[#059669] font-tabular font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Cart Summary & Prominent Checkout Button */}
      {cart.length > 0 && (
        <div className="p-4 border-t border-slate-200/90 bg-slate-50/70 space-y-3">
          {/* Subtotal */}
          <div className="flex justify-between text-xs text-slate-600">
            <span>Subtotal</span>
            <span className="font-semibold text-[#0F172A] font-tabular">
              {currency} {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* 16% VAT Included info */}
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>VAT Included (16%)</span>
            <span className="font-medium font-tabular">
              {currency} {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Order-level Discount */}
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600">Order Discount</span>
              {canApplyDiscounts ? (
                <button
                  type="button"
                  onClick={() => setShowOrderDiscountInput(!showOrderDiscountInput)}
                  className="text-[11px] text-[#059669] hover:underline font-semibold"
                >
                  {showOrderDiscountInput ? 'Done' : orderDiscount > 0 ? 'Edit' : '+ Add'}
                </button>
              ) : (
                <span
                  title="Cashiers cannot apply discounts without manager approval"
                  className="text-[10px] text-slate-400 flex items-center gap-0.5"
                >
                  <ShieldAlert className="w-3 h-3 text-amber-600" />
                  Locked
                </span>
              )}
            </div>

            {showOrderDiscountInput && canApplyDiscounts ? (
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-400">{currency}</span>
                <input
                  type="number"
                  min={0}
                  max={subtotal - lineDiscountsTotal}
                  step="any"
                  value={orderDiscount || ''}
                  placeholder="0.00"
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    onUpdateOrderDiscount(Math.max(0, val))
                  }}
                  className="w-20 px-2 py-0.5 text-xs text-right border border-slate-200 rounded-md focus:outline-none focus:border-[#059669] font-tabular font-mono"
                  autoFocus
                />
              </div>
            ) : totalDiscount > 0 ? (
              <span className="font-semibold text-[#059669] font-tabular">
                -{currency} {totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            ) : (
              <span className="text-slate-400 font-tabular">{currency} 0.00</span>
            )}
          </div>

          {/* Final Grand Total Due */}
          <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
            <div>
              <span className="text-xs font-medium text-slate-600 block">
                Total Due
              </span>
              <span className="text-[10px] text-slate-400">VAT inclusive</span>
            </div>
            <div className="text-2xl font-semibold text-[#101A2D] font-tabular tracking-tight">
              {currency} {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Primary Action Button: Emerald Green */}
          <button
            type="button"
            onClick={onProceedToCheckout}
            disabled={cart.length === 0}
            className="w-full py-3.5 px-4 bg-[#059669] hover:bg-[#047857] text-white font-medium rounded-xl shadow-[0_2px_8px_rgba(5,150,105,0.25)] hover:shadow-[0_4px_12px_rgba(5,150,105,0.35)] transition-all flex items-center justify-between group active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center gap-2 text-xs sm:text-sm">
              <span>Charge Customer</span>
              <span className="bg-white/20 text-white px-2 py-0.5 rounded-md text-xs font-semibold font-tabular">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-semibold font-tabular">
                {currency} {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
