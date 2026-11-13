import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api/client'
import type { Product, Category, ProductListResponse, CategoryListResponse, ResolveCodeResponse } from '../types/product'
import type { Sale } from '../types/sale'
import { PosProductCatalog } from '../components/pos/PosProductCatalog'
import { PosCart, type CartItem } from '../components/pos/PosCart'
import { CheckoutModal } from '../components/pos/CheckoutModal'
import { ReceiptModal } from '../components/pos/ReceiptModal'
import { Modal } from '../components/ui/Modal'
import { BarcodeScanner } from '../components/scanner/BarcodeScanner'
import { Toast, type ToastProps } from '../components/ui/Toast'
import {
  History,
  Store,
  ShieldAlert,
  Tag,
} from 'lucide-react'
import { playScanSuccessBeep, playScanErrorBeep } from '../utils/audioFeedback'

export const PosPage: React.FC = () => {
  const { user, activeBusiness } = useAuth()
  const businessId = activeBusiness?.id
  const currency = activeBusiness?.currency || 'KES'
  const role = activeBusiness?.role || 'CASHIER'
  const canApplyDiscounts = role === 'OWNER' || role === 'MANAGER'
  const isStockClerkOnly = role === 'STOCK_CLERK'

  // Data states
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  // Cart states
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderDiscount, setOrderDiscount] = useState<number>(0)

  // Modal states
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [completedSale, setCompletedSale] = useState<Sale | null>(null)

  // Toast
  const [toast, setToast] = useState<Omit<ToastProps, 'onClose'> | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
  }

  // Load products and categories
  const loadData = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      let prodUrl = `/api/v1/businesses/${businessId}/products?limit=300&isActive=true`
      if (searchQuery.trim()) {
        prodUrl += `&search=${encodeURIComponent(searchQuery.trim())}`
      }
      if (selectedCategoryId) {
        prodUrl += `&categoryId=${encodeURIComponent(selectedCategoryId)}`
      }

      const [prodRes, catRes] = await Promise.all([
        apiFetch<ProductListResponse>(prodUrl),
        apiFetch<CategoryListResponse>(`/api/v1/businesses/${businessId}/categories`),
      ])

      if (prodRes && prodRes.success) {
        setProducts(prodRes.products || [])
      }
      if (catRes && catRes.success) {
        setCategories(catRes.categories || [])
      }
    } catch (err) {
      console.error('Failed to load products for POS', err)
      showToast('Failed to load product catalog', 'error')
    } finally {
      setLoading(false)
    }
  }, [businessId, searchQuery, selectedCategoryId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Global F12 key shortcut to open checkout when cart has items
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault()
        if (cart.length > 0 && !isCheckoutOpen) {
          setIsCheckoutOpen(true)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cart.length, isCheckoutOpen])

  // Cart Quantities map for catalog badges
  const cartQuantities = cart.reduce((acc, item) => {
    acc[item.product.id] = item.quantity
    return acc
  }, {} as Record<string, number>)

  // Add product to cart
  const handleAddToCart = (product: Product): boolean => {
    const currentStock = Number(product.stockLevel?.quantity ?? 0)
    if (currentStock <= 0) {
      playScanErrorBeep()
      showToast(`${product.name} is out of stock!`, 'error')
      return false
    }

    let success = true

    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.product.id === product.id)
      if (existingIdx >= 0) {
        const item = prev[existingIdx]
        if (item.quantity >= currentStock) {
          playScanErrorBeep()
          showToast(`Cannot exceed available stock (${currentStock}) for ${product.name}`, 'info')
          success = false
          return prev
        }
        playScanSuccessBeep()
        const updated = [...prev]
        updated[existingIdx] = {
          ...item,
          quantity: item.quantity + 1,
        }
        return updated
      } else {
        playScanSuccessBeep()
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unitPrice: Number(product.sellingPrice),
            discount: 0,
          },
        ]
      }
    })

    return success
  }

  // Update item quantity
  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId)
      return
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    )
  }

  // Update line discount
  const handleUpdateDiscount = (productId: string, discount: number) => {
    if (!canApplyDiscounts) return
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, discount } : item
      )
    )
  }

  // Remove item
  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId))
  }

  // Clear cart
  const handleClearCart = () => {
    setCart([])
    setOrderDiscount(0)
  }

  // Manual code or scanner resolve
  const handleManualCodeSubmit = async (code: string): Promise<boolean> => {
    if (!businessId) return false
    try {
      const res = await apiFetch<ResolveCodeResponse>(
        `/api/v1/businesses/${businessId}/codes/resolve?code=${encodeURIComponent(code)}`
      )
      if (res && res.success && res.product) {
        const added = handleAddToCart(res.product)
        if (added) {
          showToast(`Added ${res.product.name} to cart`, 'success')
        }
        return added
      }
    } catch {
      // Check if product is in currently loaded list
      const matched = products.find(
        (p) =>
          p.sku.toLowerCase() === code.toLowerCase() ||
          p.codes?.some((c) => c.code.toLowerCase() === code.toLowerCase())
      )
      if (matched) {
        const added = handleAddToCart(matched)
        if (added) {
          showToast(`Added ${matched.name} to cart`, 'success')
        }
        return added
      }
    }

    playScanErrorBeep()
    return false
  }

  // Camera scan handler
  const handleScanDecoded = async (decodedText: string) => {
    const success = await handleManualCodeSubmit(decodedText)
    if (success) {
      setIsScannerOpen(false)
    } else {
      showToast(`No product found for scanned code: ${decodedText}`, 'error')
    }
  }

  // Sale completed handler
  const handleSaleCompleted = (sale: Sale) => {
    setCompletedSale(sale)
    handleClearCart()
    // Refresh products to reflect new stock counts
    loadData()
  }

  if (isStockClerkOnly) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-[#D97706] flex items-center justify-center mx-auto shadow-2xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#0F172A] tracking-tight m-0">Point of Sale Access Restricted</h2>
        <p className="text-sm text-slate-500 m-0 leading-relaxed">
          Your account role is assigned as <strong>Stock Clerk</strong>. Checkouts and cash register operations are reserved for Cashiers, Managers, and Owners.
        </p>
        <div className="pt-2">
          <Link
            to="/inventory"
            className="inline-flex items-center px-4 py-2 bg-[#0F172A] text-white font-semibold rounded-xl text-sm hover:bg-[#1E293B] transition"
          >
            Go to Inventory
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-[#F8FAFC] space-y-4 pb-6">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Clean, Streamlined POS Header Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Store className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-[#0F172A] tracking-tight m-0">
                Point of Sale Terminal
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-[#059669] border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live Register
              </span>
            </div>
            <p className="text-[11px] text-slate-500 m-0 mt-0.5">
              {activeBusiness?.name} &bull; Currency: <span className="font-semibold text-[#0F172A]">{currency}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-xs text-slate-500 hidden sm:block">
            Cashier: <span className="font-semibold text-[#0F172A]">{user?.name || 'Staff'}</span>
          </div>

          <Link
            to="/price-checker"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-[#0F172A] hover:bg-slate-50 border border-slate-200 rounded-lg transition"
          >
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden xs:inline">Price Checker</span>
          </Link>

          <Link
            to="/sales/history"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-slate-50 border border-slate-200 rounded-lg transition"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>History</span>
          </Link>
        </div>
      </div>

      {/* Main 2-Panel POS Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-12rem)] min-h-[620px]">
        {/* Left: Product Catalog (7 columns) */}
        <div className="lg:col-span-7 h-full">
          <PosProductCatalog
            products={products}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAddToCart={handleAddToCart}
            cartQuantities={cartQuantities}
            onScanClick={() => setIsScannerOpen(true)}
            onManualCodeSubmit={handleManualCodeSubmit}
            loading={loading}
            currency={currency}
          />
        </div>

        {/* Right: Current Sale Register (5 columns) */}
        <div className="lg:col-span-5 h-full">
          <PosCart
            cart={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onUpdateDiscount={handleUpdateDiscount}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            orderDiscount={orderDiscount}
            onUpdateOrderDiscount={setOrderDiscount}
            currency={currency}
            canApplyDiscounts={canApplyDiscounts}
            onProceedToCheckout={() => setIsCheckoutOpen(true)}
          />
        </div>
      </div>

      {/* Camera Barcode Scanner Modal */}
      <Modal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        title="Scan Barcode or QR Code"
        description="Position the barcode inside the camera viewport to scan"
        size="md"
      >
        <div className="p-4 space-y-4">
          <BarcodeScanner onScan={handleScanDecoded} />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsScannerOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg transition border border-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Checkout Modal */}
      {businessId && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          businessId={businessId}
          cart={cart}
          orderDiscount={orderDiscount}
          currency={currency}
          onSaleCompleted={handleSaleCompleted}
        />
      )}

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={!!completedSale}
        onClose={() => setCompletedSale(null)}
        sale={completedSale}
        onNewSale={() => setCompletedSale(null)}
      />
    </div>
  )
}
