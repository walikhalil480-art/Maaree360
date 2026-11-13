import React, { useState, useEffect, useRef } from 'react'
import type { Product, Category } from '../../types/product'
import { ProductImage } from '../ui/ProductImage'
import { ScannerEventGuard } from '../../utils/hardware'
import {
  Search,
  Scan,
  Package,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from 'lucide-react'

interface PosProductCatalogProps {
  products: Product[]
  categories: Category[]
  selectedCategoryId: string | null
  onSelectCategory: (categoryId: string | null) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  onAddToCart: (product: Product) => void
  cartQuantities: Record<string, number>
  onScanClick: () => void
  onManualCodeSubmit: (code: string) => Promise<boolean>
  loading: boolean
  currency: string
}

const ITEMS_PER_PAGE = 12

export const PosProductCatalog: React.FC<PosProductCatalogProps> = ({
  products,
  categories,
  selectedCategoryId,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onAddToCart,
  cartQuantities,
  onScanClick,
  onManualCodeSubmit,
  loading,
  currency,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('')
  const [resolvingCode, setResolvingCode] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const scannerGuardRef = useRef(new ScannerEventGuard(180))
  const keyBufferRef = useRef<{ buffer: string; lastTime: number }>({ buffer: '', lastTime: 0 })

  // Auto-focus barcode input on mount so USB scanner is immediately active
  useEffect(() => {
    barcodeInputRef.current?.focus()
  }, [])

  // Global Keyboard-Wedge Barcode Scanner Listener:
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA' || activeEl?.isContentEditable
      const isOurBarcodeInput = activeEl === barcodeInputRef.current

      if (isOurBarcodeInput) return

      const now = Date.now()
      const timeDiff = now - keyBufferRef.current.lastTime

      if (e.key === 'Enter') {
        if (keyBufferRef.current.buffer.length >= 3 && timeDiff < 100) {
          const scannedCode = keyBufferRef.current.buffer
          keyBufferRef.current = { buffer: '', lastTime: 0 }
          processBarcode(scannedCode)
        } else {
          keyBufferRef.current = { buffer: '', lastTime: 0 }
        }
        return
      }

      if (isInput) return

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (timeDiff > 120) {
          keyBufferRef.current.buffer = e.key
        } else {
          keyBufferRef.current.buffer += e.key
        }
        keyBufferRef.current.lastTime = now
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategoryId, products.length])

  const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, products.length)
  const visibleProducts = products.slice(startIndex, endIndex)

  const processBarcode = async (rawCode: string) => {
    const trimmed = rawCode.trim()
    if (!trimmed) return

    if (!scannerGuardRef.current.shouldProcess(trimmed)) {
      return
    }

    setResolvingCode(true)
    setCodeError(null)

    try {
      const found = await onManualCodeSubmit(trimmed)
      if (found) {
        setBarcodeInput('')
      } else {
        setCodeError(`No product found for code "${trimmed}"`)
        setTimeout(() => setCodeError(null), 3500)
      }
    } catch {
      setCodeError('Error resolving barcode or SKU')
      setTimeout(() => setCodeError(null), 3500)
    } finally {
      setResolvingCode(false)
      setTimeout(() => barcodeInputRef.current?.focus(), 50)
    }
  }

  const handleManualCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await processBarcode(barcodeInput)
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Search, Barcode & Category Bar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200/80 space-y-3 bg-white">
        {/* Top Controls: Search and Barcode Quick-Scan */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Search by Name/SKU */}
          <div className="relative sm:col-span-7">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products by name, brand, or SKU..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-[#0F172A] placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 shadow-2xs transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Barcode / SKU Quick Entry */}
          <form onSubmit={handleManualCodeSubmit} className="sm:col-span-5 flex gap-1.5">
            <div className="relative flex-1">
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan / Type barcode or SKU..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                disabled={resolvingCode}
                className="w-full pl-3 pr-8 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-[#0F172A] placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/15 font-mono shadow-2xs transition"
              />
              {resolvingCode && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-[#0F172A] border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <button
              type="button"
              onClick={onScanClick}
              title="Open Camera Scanner"
              className="px-3 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white border border-[#0F172A] rounded-xl font-medium text-xs flex items-center gap-1.5 transition shrink-0 shadow-2xs"
            >
              <Scan className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline font-semibold">Camera</span>
            </button>
          </form>
        </div>

        {/* Code Lookup Error Message */}
        {codeError && (
          <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{codeError}</span>
          </div>
        )}

        {/* Category Selector + Result Count Header */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
          {/* Category Chips Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-1 pr-2">
            <button
              type="button"
              onClick={() => onSelectCategory(null)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 select-none ${
                selectedCategoryId === null
                  ? 'bg-[#0F172A] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 border border-slate-200/80 hover:bg-white hover:border-slate-400'
              }`}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 select-none ${
                  selectedCategoryId === cat.id
                    ? 'bg-[#0F172A] text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 text-slate-700 border border-slate-200/80 hover:bg-white hover:border-slate-400'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Result Count Chip */}
          <div className="shrink-0 text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg font-tabular select-none">
            {products.length} {products.length === 1 ? 'item' : 'items'}
          </div>
        </div>
      </div>

      {/* Product Grid Area */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 bg-slate-50/50">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200/85 rounded-xl p-3 flex flex-col space-y-2.5 animate-pulse"
              >
                <div className="aspect-square bg-slate-100 rounded-lg" />
                <div className="space-y-1.5">
                  <div className="h-3.5 bg-slate-200 rounded w-4/5" />
                  <div className="h-3 bg-slate-200/70 rounded w-2/5" />
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-4 bg-slate-200/70 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center mb-3 text-slate-400">
              <Package className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h4 className="text-sm font-bold text-[#0F172A] m-0">No Products Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs m-0">
              {searchQuery || selectedCategoryId
                ? 'No products match your current search or category filter.'
                : 'No active products currently available in this catalog.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {visibleProducts.map((product) => {
              const currentStock = Number(product.stockLevel?.quantity ?? 0)
              const inCartQty = cartQuantities[product.id] || 0
              const isOutOfStock = currentStock <= 0
              const remainingStock = Math.max(0, currentStock - inCartQty)
              const isLowStock = currentStock > 0 && currentStock <= product.minStockThreshold

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onAddToCart(product)}
                  disabled={isOutOfStock || remainingStock <= 0}
                  className={`group relative text-left p-2.5 rounded-xl border transition-all flex flex-col justify-between bg-white select-none ${
                    isOutOfStock || remainingStock <= 0
                      ? 'border-slate-200 opacity-60 cursor-not-allowed bg-slate-50/70'
                      : inCartQty > 0
                      ? 'border-[#059669] ring-1 ring-[#059669]/30 shadow-2xs hover:border-[#059669]'
                      : 'border-slate-200/90 hover:border-slate-300 hover:shadow-xs active:scale-[0.98]'
                  }`}
                >
                  {/* Packshot Image Container */}
                  <div className="relative mb-2">
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      aspectRatio="square"
                      containerClassName="bg-slate-50/50 rounded-lg p-2"
                    />

                    {/* Quantity In Cart Badge */}
                    {inCartQty > 0 && (
                      <span className="absolute top-1.5 right-1.5 bg-[#059669] text-white text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-tabular shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                        {inCartQty}
                      </span>
                    )}

                    {/* Stock Alert Badge Overlay */}
                    {isOutOfStock ? (
                      <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-md shadow-2xs">
                        Out of stock
                      </span>
                    ) : isLowStock ? (
                      <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 text-[10px] font-semibold font-tabular bg-amber-50 text-amber-800 border border-amber-200 rounded-md shadow-2xs">
                        {currentStock} left
                      </span>
                    ) : null}
                  </div>

                  {/* Product Title and Brand */}
                  <div className="flex-1 min-h-[42px] flex flex-col justify-start">
                    <h4 className="text-xs font-semibold text-[#0F172A] line-clamp-2 leading-snug group-hover:text-[#059669] transition-colors m-0">
                      {product.name}
                    </h4>
                    {product.brand && (
                      <span className="text-[10px] text-slate-500 truncate mt-0.5">
                        {product.brand}
                      </span>
                    )}
                  </div>

                  {/* Price and Stock Status Footer */}
                  <div className="pt-2 mt-2 border-t border-slate-100 flex items-baseline justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#0F172A] font-tabular tracking-tight">
                        {currency} {Number(product.sellingPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        per {product.unit || 'unit'}
                      </div>
                    </div>

                    {!isOutOfStock && !isLowStock && (
                      <span className="text-[10px] text-slate-400 font-tabular">
                        {currentStock} in stock
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination Controls Footer */}
      {products.length > ITEMS_PER_PAGE && (
        <div className="p-3 border-t border-slate-200/80 bg-white flex items-center justify-between text-xs">
          <div className="text-slate-500 font-medium font-tabular">
            Showing <span className="font-semibold text-[#0F172A]">{startIndex + 1}</span>–<span className="font-semibold text-[#0F172A]">{endIndex}</span> of <span className="font-semibold text-[#0F172A]">{products.length}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-200 text-[#0F172A] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-semibold text-[#0F172A] font-tabular">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-[#0F172A] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
