import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Input'
import { apiFetch, ApiError } from '../../api/client'
import type {
  PurchaseOrder,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
} from '../../types/purchaseOrder'
import type { Supplier, SupplierListResponse } from '../../types/supplier'
import type { Product, ProductListResponse } from '../../types/product'
import { Plus, Trash2, AlertCircle } from 'lucide-react'

interface PurchaseOrderFormModalProps {
  isOpen: boolean
  onClose: () => void
  order?: PurchaseOrder | null
  businessId: string
  currency?: string
  initialSupplierId?: string
  onSaved: (savedOrder: PurchaseOrder) => void
}

interface OrderLineItemState {
  productId: string
  quantityOrdered: number | string
  unitCost: number | string
  notes?: string
}

export const PurchaseOrderFormModal: React.FC<PurchaseOrderFormModalProps> = ({
  isOpen,
  onClose,
  order,
  businessId,
  currency = 'KES',
  initialSupplierId,
  onSaved,
}) => {
  const isEditing = Boolean(order)

  // Suppliers & Products for selection
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingData, setLoadingData] = useState(false)

  // Form states
  const [supplierId, setSupplierId] = useState('')
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [items, setItems] = useState<OrderLineItemState[]>([])
  const [discount, setDiscount] = useState<number | string>(0)
  const [taxAmount, setTaxAmount] = useState<number | string>(0)
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load suppliers and products when modal opens
  useEffect(() => {
    if (!isOpen || !businessId) return

    async function loadDropdowns() {
      setLoadingData(true)
      try {
        const [supRes, prodRes] = await Promise.all([
          apiFetch<SupplierListResponse>(
            `/api/v1/businesses/${businessId}/suppliers?isActive=true&limit=100`
          ),
          apiFetch<ProductListResponse>(
            `/api/v1/businesses/${businessId}/products?isActive=true&limit=200`
          ),
        ])

        if (supRes.success) {
          setSuppliers(supRes.suppliers)
        }
        if (prodRes.success) {
          setProducts(prodRes.products)
        }
      } catch (err: any) {
        console.error('Failed to load form dropdown data', err)
      } finally {
        setLoadingData(false)
      }
    }

    loadDropdowns()
  }, [isOpen, businessId])

  // Reset or populate fields
  useEffect(() => {
    if (order) {
      setSupplierId(order.supplierId)
      setExpectedDeliveryDate(
        order.expectedDeliveryDate
          ? new Date(order.expectedDeliveryDate).toISOString().split('T')[0]
          : ''
      )
      setDiscount(order.discount || 0)
      setTaxAmount(order.taxAmount || 0)
      setNotes(order.notes || '')
      setItems(
        order.items.map((i) => ({
          productId: i.productId,
          quantityOrdered: Number(i.quantityOrdered),
          unitCost: Number(i.unitCost),
          notes: i.notes || '',
        }))
      )
    } else {
      setSupplierId(initialSupplierId || '')
      setExpectedDeliveryDate('')
      setDiscount(0)
      setTaxAmount(0)
      setNotes('')
      // Default with one empty item row
      setItems([
        {
          productId: '',
          quantityOrdered: 1,
          unitCost: 0,
          notes: '',
        },
      ])
    }
    setError(null)
  }, [order, initialSupplierId, isOpen])

  // Handle line item change
  const handleItemProductChange = (index: number, selectedProductId: string) => {
    const prod = products.find((p) => p.id === selectedProductId)
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      productId: selectedProductId,
      unitCost: prod ? Number(prod.costPrice) || 0 : 0,
    }
    setItems(newItems)
  }

  const handleItemQuantityChange = (index: number, val: string) => {
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      quantityOrdered: val,
    }
    setItems(newItems)
  }

  const handleItemUnitCostChange = (index: number, val: string) => {
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      unitCost: val,
    }
    setItems(newItems)
  }

  const addItemRow = () => {
    setItems([
      ...items,
      {
        productId: '',
        quantityOrdered: 1,
        unitCost: 0,
        notes: '',
      },
    ])
  }

  const removeItemRow = (index: number) => {
    if (items.length <= 1) {
      // Clear row instead of deleting last row
      setItems([{ productId: '', quantityOrdered: 1, unitCost: 0, notes: '' }])
      return
    }
    const newItems = items.filter((_, i) => i !== index)
    setItems(newItems)
  }

  // Calculate Subtotals and Total live
  const calculateSubtotal = () => {
    return items.reduce((acc, it) => {
      const q = parseFloat(String(it.quantityOrdered)) || 0
      const c = parseFloat(String(it.unitCost)) || 0
      return acc + q * c
    }, 0)
  }

  const subtotal = calculateSubtotal()
  const discountVal = parseFloat(String(discount)) || 0
  const taxVal = parseFloat(String(taxAmount)) || 0
  const calculatedGrandTotal = Math.max(0, subtotal - discountVal + taxVal)

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!supplierId) {
      setError('Please select a supplier.')
      return
    }

    if (items.length === 0 || !items.some((i) => i.productId)) {
      setError('At least one product item is required for a purchase order.')
      return
    }

    // Validate item rows
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.productId) {
        setError(`Line item #${i + 1} has no product selected.`)
        return
      }
      const q = parseFloat(String(it.quantityOrdered))
      if (isNaN(q) || q <= 0) {
        setError(`Line item #${i + 1} quantity must be greater than zero.`)
        return
      }
      const c = parseFloat(String(it.unitCost))
      if (isNaN(c) || c < 0) {
        setError(`Line item #${i + 1} unit cost cannot be negative.`)
        return
      }
    }

    if (discountVal < 0 || taxVal < 0) {
      setError('Discount and tax amounts cannot be negative.')
      return
    }

    if (subtotal - discountVal + taxVal < 0) {
      setError('Total cannot be negative after discount.')
      return
    }

    setSubmitting(true)

    try {
      const cleanItems = items.map((it) => ({
        productId: it.productId,
        quantityOrdered: parseFloat(String(it.quantityOrdered)),
        unitCost: parseFloat(String(it.unitCost)),
        notes: it.notes?.trim() || undefined,
      }))

      if (isEditing && order) {
        const payload: UpdatePurchaseOrderInput = {
          supplierId,
          expectedDeliveryDate: expectedDeliveryDate || null,
          discount: discountVal,
          taxAmount: taxVal,
          notes: notes.trim() || undefined,
          items: cleanItems,
        }

        const res = await apiFetch<{ success: boolean; purchaseOrder: PurchaseOrder }>(
          `/api/v1/businesses/${businessId}/purchase-orders/${order.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          }
        )

        onSaved(res.purchaseOrder)
        onClose()
      } else {
        const payload: CreatePurchaseOrderInput = {
          supplierId,
          expectedDeliveryDate: expectedDeliveryDate || undefined,
          discount: discountVal,
          taxAmount: taxVal,
          notes: notes.trim() || undefined,
          items: cleanItems,
        }

        const res = await apiFetch<{ success: boolean; purchaseOrder: PurchaseOrder }>(
          `/api/v1/businesses/${businessId}/purchase-orders`,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        )

        onSaved(res.purchaseOrder)
        onClose()
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(err?.message || 'Failed to save purchase order.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Draft PO: ${order?.orderNumber}` : 'New Purchase Order'}
      description="Create a replenishment order with negotiated vendor costs. Order begins in DRAFT."
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Top Controls: Supplier & Delivery Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          {/* Supplier Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Supplier *
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            >
              <option value="">-- Choose a vendor --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.phone})
                </option>
              ))}
            </select>
            {suppliers.length === 0 && !loadingData && (
              <span className="text-[11px] text-amber-600 mt-1 block">
                No active suppliers found. Please register a supplier first.
              </span>
            )}
          </div>

          {/* Expected Delivery Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Expected Delivery Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Order Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">Order Line Items</h4>
            <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Product Line
            </Button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="py-2.5 px-3 w-[40%]">Product</th>
                  <th className="py-2.5 px-3 w-[18%]">Quantity</th>
                  <th className="py-2.5 px-3 w-[22%]">Unit Cost ({currency})</th>
                  <th className="py-2.5 px-3 w-[15%] text-right">Line Subtotal</th>
                  <th className="py-2.5 px-3 w-[5%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const lineTotal =
                    (parseFloat(String(item.quantityOrdered)) || 0) *
                    (parseFloat(String(item.unitCost)) || 0)

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      {/* Product Selector */}
                      <td className="py-2 px-3">
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemProductChange(idx, e.target.value)}
                          className="w-full h-9 px-2 text-xs rounded-md border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          required
                        >
                          <option value="">-- Choose Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku}) — [{p.unit}]
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Quantity */}
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          placeholder="Qty"
                          value={item.quantityOrdered}
                          onChange={(e) => handleItemQuantityChange(idx, e.target.value)}
                          className="w-full h-9 px-2 text-xs rounded-md border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          required
                        />
                      </td>

                      {/* Unit Cost */}
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Cost"
                          value={item.unitCost}
                          onChange={(e) => handleItemUnitCostChange(idx, e.target.value)}
                          className="w-full h-9 px-2 text-xs rounded-md border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          required
                        />
                      </td>

                      {/* Subtotal */}
                      <td className="py-2 px-3 text-right font-mono font-medium text-slate-800">
                        {currency} {lineTotal.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Remove Button */}
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Financials & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Notes */}
          <div>
            <Textarea
              label="Delivery Instructions / Internal Notes"
              placeholder="e.g. Deliver to rear loading bay before 10 AM, invoice on delivery"
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          {/* Totals Summary Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span>Items Subtotal:</span>
              <span className="font-mono font-medium text-slate-900">
                {currency} {subtotal.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Discount */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">Supplier Discount ({currency}):</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-28 h-8 px-2 text-right text-xs rounded border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Tax */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">VAT / Tax Amount ({currency}):</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                className="w-28 h-8 px-2 text-right text-xs rounded border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold text-sm text-slate-900">
              <span>Grand Total:</span>
              <span className="font-mono text-emerald-700 text-base">
                {currency} {calculatedGrandTotal.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={submitting}>
            {isEditing ? 'Save Changes' : 'Create Draft Order'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
