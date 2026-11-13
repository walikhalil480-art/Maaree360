import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch, ApiError } from '../api/client'
import type { Product, Category, ResolveCodeResponse, ProductCodeType } from '../types/product'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Toast, type ToastProps } from '../components/ui/Toast'
import { BarcodeScanner } from '../components/scanner/BarcodeScanner'
import { ProductImage } from '../components/ui/ProductImage'
import { ProductDetailModal } from '../components/products/ProductDetailModal'
import { ProductFormModal } from '../components/products/ProductFormModal'
import {
  Search,
  CheckCircle,
  AlertTriangle,
  Plus,
  Package,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'

export const ScanPage: React.FC = () => {
  const { activeBusiness } = useAuth()
  const businessId = activeBusiness?.id
  const currency = activeBusiness?.currency || 'KES'
  const location = useLocation()
  const navigate = useNavigate()

  // Manual code input
  const [manualCode, setManualCode] = useState('')
  const [isResolving, setIsResolving] = useState(false)

  // Resolution result
  const [resolvedResult, setResolvedResult] = useState<ResolveCodeResponse | null>(null)
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null)

  // Modals state
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [newProductInitialCode, setNewProductInitialCode] = useState<{
    code: string
    type: ProductCodeType
  } | null>(null)

  // Toast state
  const [toast, setToast] = useState<Omit<ToastProps, 'onClose'> | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
  }

  // Fetch categories for product creation
  useEffect(() => {
    if (!businessId) return
    apiFetch<{ success: boolean; categories: Category[] }>(
      `/api/v1/businesses/${businessId}/categories`
    )
      .then((res) => {
        if (res.success && res.categories) setCategories(res.categories)
      })
      .catch((err) => console.error('Failed to load categories', err))
  }, [businessId])

  // Check URL query parameters (e.g. ?code=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const codeParam = params.get('code')
    if (codeParam && businessId) {
      handleResolveCode(codeParam)
    }
  }, [location.search, businessId])

  // Core code resolution logic
  const handleResolveCode = async (codeToLookup: string) => {
    const clean = codeToLookup.trim()
    if (!clean || !businessId) return

    setIsResolving(true)
    setNotFoundCode(null)

    try {
      const res = await apiFetch<ResolveCodeResponse>(
        `/api/v1/businesses/${businessId}/codes/resolve?code=${encodeURIComponent(clean)}`
      )

      if (res.success && res.product) {
        setResolvedResult(res)
        showToast(`Recognized "${res.product.name}"`, 'success')
      }
    } catch (err) {
      setResolvedResult(null)
      if (err instanceof ApiError && err.code === 'CODE_NOT_FOUND') {
        setNotFoundCode(clean)
      } else {
        const msg = err instanceof ApiError ? err.message : 'Failed to resolve code'
        showToast(msg, 'error')
      }
    } finally {
      setIsResolving(false)
    }
  }

  // Handle camera scan trigger
  const handleCameraScan = (scannedText: string) => {
    handleResolveCode(scannedText)
  }

  // Handle manual form submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      handleResolveCode(manualCode)
    }
  }

  // Clear current result
  const handleClearResult = () => {
    setResolvedResult(null)
    setNotFoundCode(null)
    setManualCode('')
  }

  // Open creation modal with scanned code
  const handleCreateWithCode = (codeValue: string) => {
    let detectedType: ProductCodeType = 'CODE_128'
    if (/^\d{13}$/.test(codeValue)) detectedType = 'EAN_13'
    else if (/^\d{12}$/.test(codeValue)) detectedType = 'UPC_A'
    else if (/^\d{8}$/.test(codeValue)) detectedType = 'EAN_8'
    else if (
      codeValue.startsWith('http') ||
      codeValue.startsWith('maaree360:') ||
      codeValue.startsWith('tillpro:') ||
      codeValue.startsWith('smartstock:')
    )
      detectedType = 'QR'

    setNewProductInitialCode({ code: codeValue, type: detectedType })
    setIsFormOpen(true)
  }

  const handleProductCreated = (product: Product) => {
    showToast(`Product "${product.name}" created with code`, 'success')
    setResolvedResult({
      success: true,
      matchedBy: 'BARCODE',
      code: newProductInitialCode?.code || product.sku,
      product,
    })
    setNotFoundCode(null)
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Page Header */}
      <PageHeader
        title="Barcode Scanner"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/products')}
            className="flex items-center gap-1.5"
          >
            <Package className="w-4 h-4 text-slate-500" />
            <span>Product Catalog</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Camera Scanner */}
        <div className="lg:col-span-7 space-y-6">
          <BarcodeScanner
            onScan={handleCameraScan}
            isProcessing={isResolving}
          />
        </div>

        {/* Right Column: Manual Code Entry & Resolution Display */}
        <div className="lg:col-span-5 space-y-6">
          {/* Manual Code Lookup Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 m-0">Manual Code Lookup</h3>
            </div>
            <p className="text-xs text-slate-500 m-0">
              Type or paste any barcode number, QR code reference, or product SKU.
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 6161101234567 or RICE-BAS-2KG"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isResolving}
                  disabled={!manualCode.trim()}
                  className="shrink-0"
                >
                  <Search className="w-4 h-4 mr-1" /> Lookup
                </Button>
              </div>

              {/* Supported formats hint */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                <span className="font-medium">Supported:</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">EAN-13</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">UPC-A</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">EAN-8</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">Code 128</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">QR Code</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">SKU</span>
              </div>
            </form>
          </div>

          {/* Result Card: Product Recognized */}
          {resolvedResult && (
            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-xs space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Product Recognized
                  </span>
                </div>
                <Badge variant="success" size="sm">
                  {resolvedResult.matchedBy === 'QR_REFERENCE'
                    ? 'MAAREE 360 QR'
                    : resolvedResult.matchedBy}
                </Badge>
              </div>

              {/* Archived Warning Banner */}
              {!resolvedResult.product.isActive && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Archived Product</span>
                    This item is archived. It remains in historical catalog records but is inactive.
                  </div>
                </div>
              )}

              {/* Product Info with Packshot */}
              <div className="flex items-start gap-3.5">
                <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden border border-[#E2E8F0] bg-white p-0.5 shadow-2xs">
                  <ProductImage
                    src={resolvedResult.product.imageUrl}
                    alt={resolvedResult.product.name}
                    aspectRatio="square"
                  />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <h4 className="text-base font-bold text-[#172033] m-0 truncate">
                    {resolvedResult.product.name}
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-[#64748B]">
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[#172033]">
                      SKU: {resolvedResult.product.sku}
                    </span>
                    {resolvedResult.product.brand && (
                      <span>Brand: {resolvedResult.product.brand}</span>
                    )}
                    {resolvedResult.product.category && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-medium border border-emerald-200">
                        {resolvedResult.product.category.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Prices Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Selling Price
                  </span>
                  <span className="text-base font-bold text-slate-900">
                    {currency}{' '}
                    {Number(resolvedResult.product.sellingPrice).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Cost Price
                  </span>
                  <span className="text-base font-bold text-slate-700">
                    {currency}{' '}
                    {Number(resolvedResult.product.costPrice).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClearResult}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  Clear Result
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setDetailProduct(resolvedResult.product)}
                  className="text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View Details
                </Button>
              </div>
            </div>
          )}

          {/* Result Card: Code Not Found */}
          {notFoundCode && (
            <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-xs space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Code Not Found
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800 m-0">
                  No product registered for code:
                </p>
                <p className="font-mono text-xs bg-slate-100 p-2 rounded-lg text-slate-800 break-all m-0 border border-slate-200">
                  {notFoundCode}
                </p>
                <p className="text-xs text-slate-500 m-0 pt-1">
                  This barcode or QR code is not currently assigned to any product in your catalog.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearResult}
                  className="w-full text-xs"
                >
                  Retry Scan
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleCreateWithCode(notFoundCode)}
                  className="w-full text-xs whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Create Product
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      {detailProduct && (
        <ProductDetailModal
          isOpen={Boolean(detailProduct)}
          onClose={() => setDetailProduct(null)}
          product={detailProduct}
          currency={currency}
          businessId={businessId!}
          onEdit={() => {
            setDetailProduct(null)
            navigate('/products')
          }}
          onToggleStatus={(p) => {
            setResolvedResult((prev) =>
              prev ? { ...prev, product: { ...prev.product, isActive: !p.isActive } } : null
            )
            setDetailProduct((prev) => (prev ? { ...prev, isActive: !p.isActive } : null))
          }}
        />
      )}

      {/* Product Form Modal (for creating from unregistered scanned code) */}
      {businessId && (
        <ProductFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false)
            setNewProductInitialCode(null)
          }}
          onSuccess={handleProductCreated}
          initialCode={newProductInitialCode}
          categories={categories}
          businessId={businessId}
          currency={currency}
        />
      )}
    </div>
  )
}

export default ScanPage
