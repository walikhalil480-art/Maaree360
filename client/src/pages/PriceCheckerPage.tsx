import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api/client'
import { ProductImage } from '../components/ui/ProductImage'
import { MaareeLogo } from '../components/ui/MaareeLogo'
import { BarcodeScanner } from '../components/scanner/BarcodeScanner'
import { Modal } from '../components/ui/Modal'
import { playScanSuccessBeep, playScanErrorBeep } from '../utils/audioFeedback'
import { ScannerEventGuard } from '../utils/hardware'
import {
  Scan,
  Search,
  AlertCircle,
  Store,
  ArrowRight,
  ShieldCheck,
  Tag,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Camera,
} from 'lucide-react'

export interface PriceCheckProduct {
  id: string
  name: string
  sku: string
  barcode?: string | null
  brand: string | null
  categoryName: string | null
  imageUrl: string | null
  unit: string
  sellingPrice: number
  currency: string
  inStock: boolean
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  businessName: string
}

interface PriceCheckerPageProps {
  isKiosk?: boolean
}

export const PriceCheckerPage: React.FC<PriceCheckerPageProps> = ({ isKiosk: isKioskProp }) => {
  const { businessId: paramBusinessId } = useParams<{ businessId?: string }>()
  const { activeBusiness, user } = useAuth()

  // In standalone kiosk mode if explicitly requested, if route param is present, or if user is unauthenticated
  const isKiosk = isKioskProp || Boolean(paramBusinessId) || !user
  const businessId = paramBusinessId || activeBusiness?.id
  const storeName = activeBusiness?.name || 'MAAREE 360 Retail'

  const [barcodeInput, setBarcodeInput] = useState('')
  const [lastSearched, setLastSearched] = useState('')
  const [loading, setLoading] = useState(false)
  const [scannedProduct, setScannedProduct] = useState<PriceCheckProduct | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [countdown, setCountdown] = useState<number>(10)
  const [isPaused, setIsPaused] = useState(false)

  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const scannerGuardRef = useRef(new ScannerEventGuard(180))
  const keyBufferRef = useRef<{ buffer: string; lastTime: number }>({ buffer: '', lastTime: 0 })
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-focus search input
  useEffect(() => {
    barcodeInputRef.current?.focus()
  }, [scannedProduct, notFound])

  // Inactivity Auto-Reset in Kiosk Mode: return to ready state after 10s if not paused
  useEffect(() => {
    if (isKiosk && scannedProduct && !isPaused) {
      setCountdown(10)
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)

      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current!)
            setScannedProduct(null)
            setNotFound(false)
            setBarcodeInput('')
            setTimeout(() => barcodeInputRef.current?.focus(), 50)
            return 10
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      }
    }
  }, [isKiosk, scannedProduct, isPaused])

  // Global Keyboard-Wedge Scanner Listener (USB / Bluetooth barcode guns)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null
      const isOurInput = activeEl === barcodeInputRef.current

      // If user is actively typing in the text field, let standard form submission handle Enter
      if (isOurInput) return

      const now = Date.now()
      const timeDiff = now - keyBufferRef.current.lastTime

      if (e.key === 'Enter') {
        if (keyBufferRef.current.buffer.length >= 2 && timeDiff < 100) {
          const code = keyBufferRef.current.buffer
          keyBufferRef.current = { buffer: '', lastTime: 0 }
          handleLookupCode(code)
        } else {
          keyBufferRef.current = { buffer: '', lastTime: 0 }
        }
        return
      }

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
  }, [businessId])

  const handleLookupCode = async (rawCode: string) => {
    const trimmed = rawCode.trim()
    if (!trimmed) return
    if (!businessId) {
      setErrorMessage('Store identifier is required. Please open through a registered store terminal.')
      return
    }

    if (!scannerGuardRef.current.shouldProcess(trimmed)) {
      return
    }

    setLoading(true)
    setErrorMessage(null)
    setNotFound(false)
    setLastSearched(trimmed)

    try {
      const res = await apiFetch<{ success: boolean; product: PriceCheckProduct }>(
        `/api/v1/price-checker/${businessId}/lookup?code=${encodeURIComponent(trimmed)}`
      )

      if (res && res.success && res.product) {
        playScanSuccessBeep()
        setScannedProduct(res.product)
        setBarcodeInput('')
      } else {
        throw new Error('Product not found')
      }
    } catch (err: any) {
      playScanErrorBeep()
      setScannedProduct(null)
      setNotFound(true)
      setErrorMessage(
        err?.message || `We couldn't find any product matching "${trimmed}".`
      )
    } finally {
      setLoading(false)
      setTimeout(() => barcodeInputRef.current?.focus(), 50)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleLookupCode(barcodeInput)
  }

  const handleCameraScan = (decodedText: string) => {
    setIsCameraOpen(false)
    handleLookupCode(decodedText)
  }

  const handleClear = () => {
    setScannedProduct(null)
    setNotFound(false)
    setErrorMessage(null)
    setBarcodeInput('')
    setLastSearched('')
    setTimeout(() => barcodeInputRef.current?.focus(), 50)
  }

  // Stock status badge configuration
  const renderStockBadge = (product: PriceCheckProduct) => {
    const status = product.stockStatus || (product.inStock ? 'IN_STOCK' : 'OUT_OF_STOCK')

    if (status === 'IN_STOCK') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>In Stock</span>
        </span>
      )
    }

    if (status === 'LOW_STOCK') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>Low Stock</span>
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        <span>Out of Stock</span>
      </span>
    )
  }

  // Reusable Search Form Component
  const searchForm = (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full max-w-lg">
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
        <input
          ref={barcodeInputRef}
          type="text"
          placeholder="Scan barcode, enter SKU or product name..."
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          disabled={loading}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#172033] placeholder-[#64748B] focus:outline-none focus:border-[#142B4A] focus:ring-2 focus:ring-[#142B4A]/15 shadow-2xs transition"
          autoFocus
        />
      </div>

      <button
        type="submit"
        disabled={loading || !barcodeInput.trim()}
        className="px-4 py-2.5 bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold rounded-xl transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
      >
        <span>{loading ? 'Checking...' : 'Check Price'}</span>
      </button>

      <button
        type="button"
        onClick={() => setIsCameraOpen(true)}
        title="Open Camera Scanner"
        className="p-2.5 bg-white hover:bg-[#F5F7FA] text-[#142B4A] border border-[#E2E8F0] rounded-xl transition shadow-2xs shrink-0 flex items-center justify-center"
      >
        <Camera className="w-4 h-4" />
      </button>
    </form>
  )

  // Main Card Area: Empty State, Found Product, or Not Found
  const mainCard = (
    <div className="w-full max-w-4xl mx-auto">
      {/* State 1: Product Found */}
      {scannedProduct && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-6 animate-fadeIn">
          {/* Top meta row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]/80">
            <div className="flex items-center gap-2">
              {renderStockBadge(scannedProduct)}
              <div className="hidden sm:flex items-center gap-1 text-xs text-[#64748B] bg-[#F5F7FA] px-2.5 py-1 rounded-full border border-[#E2E8F0]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#142B4A]" />
                <span>Verified Retail Price</span>
              </div>
            </div>

            {isKiosk && (
              <div className="flex items-center gap-2 text-xs text-[#64748B]">
                <span>Resetting screen in:</span>
                <span className="font-bold text-[#142B4A] font-tabular bg-[#F5F7FA] px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                  {countdown}s
                </span>
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  className="text-[11px] underline text-[#64748B] hover:text-[#142B4A]"
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Product Packshot */}
            <div className="md:col-span-5 flex justify-center">
              <div className="w-56 sm:w-64 aspect-square rounded-2xl overflow-hidden border border-[#E2E8F0] bg-[#F5F7FA] p-3 shadow-2xs flex items-center justify-center">
                <ProductImage
                  src={scannedProduct.imageUrl}
                  alt={scannedProduct.name}
                  aspectRatio="square"
                  containerClassName="p-2 border-0 bg-transparent"
                  fallbackIconClassName="w-16 h-16 text-[#142B4A]/60 stroke-[1.4]"
                />
              </div>
            </div>

            {/* Product Details & Price */}
            <div className="md:col-span-7 space-y-5 text-center md:text-left">
              {/* Category & Brand Pills */}
              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                {scannedProduct.brand && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 bg-[#F5F7FA] text-[#142B4A] rounded-full border border-[#E2E8F0]">
                    {scannedProduct.brand}
                  </span>
                )}
                {scannedProduct.categoryName && (
                  <span className="text-xs font-medium px-2.5 py-0.5 bg-[#F5F7FA] text-[#64748B] rounded-full border border-[#E2E8F0]">
                    {scannedProduct.categoryName}
                  </span>
                )}
              </div>

              {/* Product Name */}
              <h2 className="text-2xl sm:text-3xl font-semibold text-[#172033] tracking-tight leading-snug m-0">
                {scannedProduct.name}
              </h2>

              {/* Selling Price Display */}
              <div className="bg-[#F5F7FA] rounded-2xl p-4 sm:p-5 border border-[#E2E8F0]/90">
                <span className="text-xs font-medium text-[#697586] block mb-1">
                  Selling Price (VAT Inclusive)
                </span>
                <div className="text-4xl sm:text-5xl font-semibold text-[#101A2D] font-tabular tracking-tight">
                  {scannedProduct.currency}{' '}
                  {scannedProduct.sellingPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="text-xs text-[#64748B] mt-1.5 font-medium">
                  Retail price per {scannedProduct.unit || 'unit'}
                </div>
              </div>

              {/* Product Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[10px] uppercase font-semibold">SKU</span>
                  <span className="font-mono font-medium text-[#172033] truncate block mt-0.5">
                    {scannedProduct.sku}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[10px] uppercase font-semibold">Barcode</span>
                  <span className="font-mono font-medium text-[#172033] truncate block mt-0.5">
                    {scannedProduct.barcode || 'N/A'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[10px] uppercase font-semibold">Unit</span>
                  <span className="font-medium text-[#172033] capitalize block mt-0.5">
                    {scannedProduct.unit}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[10px] uppercase font-semibold">Status</span>
                  <span className="font-semibold text-emerald-700 block mt-0.5">
                    {scannedProduct.inStock ? 'Available' : 'Out of Stock'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white font-semibold rounded-xl shadow-2xs transition flex items-center gap-2 active:scale-95 text-sm"
                >
                  <Scan className="w-4 h-4" />
                  <span>Check Another Product</span>
                </button>

                {!isKiosk && activeBusiness && (
                  <Link
                    to="/sales"
                    className="px-4 py-2.5 bg-white hover:bg-[#F5F7FA] text-[#142B4A] font-semibold rounded-xl border border-[#E2E8F0] shadow-2xs transition flex items-center gap-1.5 text-sm"
                  >
                    <span>Open in POS</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* State 2: Not Found State */}
      {notFound && !scannedProduct && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8 text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
            <AlertCircle className="w-8 h-8 stroke-[1.8]" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-[#172033] tracking-tight m-0">
              No Product Found
            </h3>
            <p className="text-sm text-[#64748B] max-w-md mx-auto m-0">
              We couldn't find any active product matching{' '}
              <span className="font-mono font-semibold text-[#172033]">"{lastSearched}"</span>.
            </p>
          </div>

          <div className="bg-[#F5F7FA] rounded-xl p-4 max-w-md mx-auto text-left border border-[#E2E8F0] space-y-2 text-xs text-[#64748B]">
            <span className="font-semibold text-[#172033] block">Suggested troubleshooting:</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>Check the product barcode numbers or SKU and try again.</li>
              <li>Search by brand or product name instead of barcode.</li>
              <li>Verify the product is marked as Active in your inventory catalog.</li>
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleClear}
              className="px-5 py-2.5 bg-[#142B4A] hover:bg-[#0E1F36] text-white text-sm font-semibold rounded-xl transition shadow-2xs flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Try Another Search</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="px-4 py-2.5 bg-white hover:bg-[#F5F7FA] text-[#142B4A] text-sm font-semibold rounded-xl border border-[#E2E8F0] transition shadow-2xs flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Use Camera Scanner</span>
            </button>
          </div>
        </div>
      )}

      {/* State 3: Ready / Empty Initial State */}
      {!scannedProduct && !notFound && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8 sm:p-12 text-center space-y-6">
          {/* Centered TillPro Brand Scanner Icon */}
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-[#142B4A] text-white flex items-center justify-center shadow-[0_4px_16px_rgba(20,43,74,0.18)]">
              <Scan className="w-10 h-10 stroke-[1.8] text-[#059669]" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-semibold text-[#172033] tracking-tight m-0">
              Scan or Search Any Item
            </h2>
            <p className="text-sm text-[#64748B] max-w-md mx-auto m-0">
              Point your barcode scanner at an item, use the camera, or type a product name, SKU, or barcode above to instantly check prices.
            </p>
          </div>

          {/* Quick Camera Action */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="px-6 py-3 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-xl shadow-2xs transition flex items-center gap-2 text-sm active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Open Camera Scanner</span>
            </button>
          </div>

          {/* Status and Capability Badges */}
          <div className="pt-6 border-t border-[#E2E8F0]/80 flex flex-wrap items-center justify-center gap-6 text-xs text-[#64748B]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Hardware Scanner Listener Active</span>
            </div>
            <div className="flex items-center gap-2">
              <Barcode className="w-4 h-4 text-[#142B4A]" />
              <span>Supports 1D Barcode & 2D QR</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#142B4A]" />
              <span>Real-Time Retail Prices</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Render Mode A: Inside AppShell (Standard App Layout)
  if (!isKiosk) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header with Title, Subtitle, and Compact Search Field */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2 border-b border-[#E2E8F0]/70">
          <div>
            <h1 className="text-2xl font-bold text-[#172033] tracking-tight m-0">
              Price Checker
            </h1>
            <p className="text-sm text-[#64748B] mt-1 m-0">
              Quickly look up product prices and availability.
            </p>
          </div>

          {/* Compact search in header */}
          <div className="w-full lg:w-auto">
            {searchForm}
          </div>
        </div>

        {/* Error message banner if any */}
        {errorMessage && !notFound && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Card View */}
        <div className="py-4">
          {mainCard}
        </div>

        {/* Camera Barcode Scanner Modal */}
        <Modal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          title="Scan Barcode with Camera"
          description="Position the product barcode within the camera viewfinder"
          size="md"
        >
          <div className="p-4 space-y-4">
            <BarcodeScanner onScan={handleCameraScan} />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsCameraOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:bg-[#F5F7FA] rounded-xl border border-[#E2E8F0] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  // Render Mode B: Standalone Customer-Facing Kiosk
  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033] flex flex-col justify-between selection:bg-[#142B4A] selection:text-white">
      {/* Top Kiosk Header */}
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-4 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#142B4A] text-white flex items-center justify-center shadow-2xs">
            <Store className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#172033] tracking-tight m-0">
              {scannedProduct?.businessName || storeName}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <Tag className="w-3.5 h-3.5 text-[#142B4A]" />
              <span>Price Verification Terminal</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <MaareeLogo variant="full" theme="light" size="sm" showSubtitle={false} />
          {user && (
            <Link
              to="/dashboard"
              className="text-xs font-semibold text-[#64748B] hover:text-[#142B4A] px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F5F7FA] transition"
            >
              Staff Portal
            </Link>
          )}
        </div>
      </header>

      {/* Main Kiosk Viewport */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center space-y-6">
        {/* Kiosk Search and Utility Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#172033] tracking-tight m-0">Price Checker</h2>
            <p className="text-xs text-[#64748B] mt-0.5 m-0">Quickly look up product prices and availability.</p>
          </div>
          {searchForm}
        </div>

        {/* Main Content Area */}
        {mainCard}
      </main>

      {/* Kiosk Footer */}
      <footer className="text-center py-4 text-xs text-[#64748B]">
        MAAREE 360 Kiosk Terminal &bull; Prices verified against current store catalog
      </footer>

      {/* Camera Barcode Scanner Modal */}
      <Modal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        title="Scan Barcode with Camera"
        description="Position the product barcode within the camera viewfinder"
        size="md"
      >
        <div className="p-4 space-y-4">
          <BarcodeScanner onScan={handleCameraScan} />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsCameraOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:bg-[#F5F7FA] rounded-xl border border-[#E2E8F0] transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
