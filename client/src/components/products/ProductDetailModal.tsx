import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { apiFetch, ApiError } from '../../api/client'
import type { Product, ProductCodeType, ProductCode } from '../../types/product'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ProductImage } from '../ui/ProductImage'
import {
  X,
  Edit2,
  Archive,
  RefreshCw,
  Tag,
  Layers,
  Calendar,
  AlertCircle,
  TrendingUp,
  Barcode,
  QrCode,
  Plus,
  Trash2,
  Download,
  AlertTriangle,
  Boxes,
  Receipt,
  Truck,
  CheckCircle2,
  Upload,
  Clock,
} from 'lucide-react'

interface ProductDetailModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  currency?: string
  businessId: string
  userRole?: string
  onEdit: (product: Product) => void
  onToggleStatus: (product: Product) => void
  onProductUpdated?: (updatedProduct: Product) => void
}

const CODE_TYPES: { label: string; value: ProductCodeType }[] = [
  { label: 'EAN-13 (13 Digits)', value: 'EAN_13' },
  { label: 'UPC-A (12 Digits)', value: 'UPC_A' },
  { label: 'EAN-8 (8 Digits)', value: 'EAN_8' },
  { label: 'Code 128 (Alphanumeric)', value: 'CODE_128' },
  { label: 'QR Code', value: 'QR' },
  { label: 'Other', value: 'OTHER' },
]

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  currency = 'KES',
  businessId,
  userRole = 'CASHIER',
  onEdit,
  onToggleStatus,
  onProductUpdated,
}) => {
  const navigate = useNavigate()
  const isManager = userRole === 'OWNER' || userRole === 'MANAGER'

  // Detailed product state with live supplier/stock details
  const [detailedProduct, setDetailedProduct] = useState<(Product & { supplier?: { id: string; name: string } | null }) | null>(product)
  const [activeCodes, setActiveCodes] = useState<ProductCode[]>([])
  const [newCodeValue, setNewCodeValue] = useState('')
  const [newCodeType, setNewCodeType] = useState<ProductCodeType>('CODE_128')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)

  // Direct image update state
  const [isUpdatingImage, setIsUpdatingImage] = useState(false)
  const [imageUpdateError, setImageUpdateError] = useState<string | null>(null)
  const [imageSuccessMsg, setImageSuccessMsg] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  // QR Code generator state
  const [showQrModal, setShowQrModal] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Fetch full live product record on modal open
  useEffect(() => {
    if (product && isOpen) {
      setDetailedProduct(product)
      setActiveCodes(product.codes || [])
      setNewCodeValue('')
      setNewCodeType('CODE_128')
      setCodeError(null)
      setImageUpdateError(null)
      setImageSuccessMsg(null)
      setShowQrModal(false)

      // Fetch fresh database details (includes supplier, stock, etc.)
      apiFetch<{ success: boolean; product: Product & { supplier?: { id: string; name: string } | null } }>(
        `/api/v1/businesses/${businessId}/products/${product.id}`
      )
        .then((res) => {
          if (res.success && res.product) {
            setDetailedProduct(res.product)
            setActiveCodes(res.product.codes || [])
          }
        })
        .catch((err) => {
          console.warn('Failed to load fresh product details', err)
        })
    }
  }, [product, isOpen, businessId])

  // Render QR Canvas when showQrModal is true
  useEffect(() => {
    if (showQrModal && detailedProduct && qrCanvasRef.current) {
      const qrPayload = `tillpro:product:${detailedProduct.id}`
      QRCode.toCanvas(
        qrCanvasRef.current,
        qrPayload,
        {
          width: 200,
          margin: 2,
          color: {
            dark: '#142B4A',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('Error generating QR canvas', error)
        }
      )
    }
  }, [showQrModal, detailedProduct])

  if (!isOpen || !detailedProduct) return null

  // Calculations
  const cost = Number(detailedProduct.costPrice) || 0
  const selling = Number(detailedProduct.sellingPrice) || 0
  const profit = selling - cost
  const marginPercent = selling > 0 ? (profit / selling) * 100 : 0

  const currentQty =
    detailedProduct.stockLevel?.quantity != null
      ? Number(detailedProduct.stockLevel.quantity)
      : 0
  const threshold = Number(detailedProduct.minStockThreshold) || 0
  const isOutOfStock = currentQty <= 0
  const isLowStock = !isOutOfStock && threshold > 0 && currentQty <= threshold

  const formatCurrency = (val: number) => {
    return `${currency} ${val.toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  // Quick Image Update Handler
  const handleQuickImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageUpdateError(null)
    setImageSuccessMsg(null)

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (!validTypes.includes(file.type)) {
      setImageUpdateError('Please select a JPG, PNG, or WebP image.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageUpdateError('Image must be under 5 MB.')
      return
    }

    setIsUpdatingImage(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await apiFetch<{
        success: boolean
        product: Product
        imageUrl: string
      }>(
        `/api/v1/businesses/${businessId}/products/${detailedProduct.id}/image`,
        {
          method: 'PATCH',
          body: formData,
        }
      )

      if (res.success && res.product) {
        setDetailedProduct((prev) => (prev ? { ...prev, imageUrl: res.imageUrl } : null))
        setImageSuccessMsg('Image updated successfully!')
        if (onProductUpdated) {
          onProductUpdated(res.product)
        }
      }
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update image'
      setImageUpdateError(msg)
    } finally {
      setIsUpdatingImage(false)
      if (imageInputRef.current) {
        imageInputRef.current.value = ''
      }
    }
  }

  // Add Code handler
  const handleAddCode = async () => {
    const trimmed = newCodeValue.trim()
    if (!trimmed) {
      setCodeError('Enter a barcode or QR code value')
      return
    }

    if (newCodeType === 'EAN_13' && !/^\d{13}$/.test(trimmed)) {
      setCodeError('EAN-13 barcodes must be exactly 13 numeric digits')
      return
    }
    if (newCodeType === 'UPC_A' && !/^\d{12}$/.test(trimmed)) {
      setCodeError('UPC-A barcodes must be exactly 12 numeric digits')
      return
    }
    if (newCodeType === 'EAN_8' && !/^\d{8}$/.test(trimmed)) {
      setCodeError('EAN-8 barcodes must be exactly 8 numeric digits')
      return
    }

    setCodeLoading(true)
    setCodeError(null)

    try {
      const res = await apiFetch<{ success: boolean; code: ProductCode }>(
        `/api/v1/businesses/${businessId}/products/${detailedProduct.id}/codes`,
        {
          method: 'POST',
          body: JSON.stringify({ code: trimmed, type: newCodeType }),
        }
      )
      const updatedList = [res.code, ...activeCodes]
      setActiveCodes(updatedList)
      setNewCodeValue('')
      const updated = { ...detailedProduct, codes: updatedList }
      setDetailedProduct(updated)
      if (onProductUpdated) {
        onProductUpdated(updated)
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to register barcode'
      setCodeError(msg)
    } finally {
      setCodeLoading(false)
    }
  }

  // Remove Code handler
  const handleRemoveCode = async (codeId: string) => {
    try {
      await apiFetch(
        `/api/v1/businesses/${businessId}/products/${detailedProduct.id}/codes/${codeId}`,
        { method: 'DELETE' }
      )
      const updatedList = activeCodes.filter((c) => c.id !== codeId)
      setActiveCodes(updatedList)
      const updated = { ...detailedProduct, codes: updatedList }
      setDetailedProduct(updated)
      if (onProductUpdated) {
        onProductUpdated(updated)
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not remove code'
      alert(msg)
    }
  }

  // Download QR handler
  const handleDownloadQr = () => {
    if (!qrCanvasRef.current) return
    const url = qrCanvasRef.current.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `TillPro-QR-${detailedProduct.sku}.png`
    link.href = url
    link.click()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
        <div className="relative w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-slate-200/90">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200/90 px-6 py-4 bg-slate-50/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                  {detailedProduct.category?.name || 'Uncategorized'}
                </span>
                <Badge variant={detailedProduct.isActive ? 'success' : 'neutral'} dot>
                  {detailedProduct.isActive ? 'Active' : 'Archived'}
                </Badge>
                {detailedProduct.brand && (
                  <span className="text-xs text-slate-500 font-medium">
                    Brand: <strong className="text-slate-900">{detailedProduct.brand}</strong>
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight m-0">
                {detailedProduct.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Two-Column Body */}
          <div className="p-6 max-h-[75vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Left Column: Product Image & Quick Status */}
              <div className="md:col-span-5 space-y-4">
                {/* Product Photograph */}
                <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 flex flex-col items-center justify-center relative shadow-xs group">
                  <div className="w-full aspect-square max-h-72 rounded-xl overflow-hidden bg-white border border-slate-200/90 p-3 flex items-center justify-center">
                    <ProductImage
                      src={detailedProduct.imageUrl}
                      alt={detailedProduct.name}
                      aspectRatio="square"
                      className="max-h-64 object-contain"
                    />
                  </div>

                  {/* Image Update Actions */}
                  {isManager && (
                    <div className="w-full mt-3 pt-3 border-t border-slate-200/80">
                      <input
                        type="file"
                        ref={imageInputRef}
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        className="hidden"
                        onChange={handleQuickImageUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        isLoading={isUpdatingImage}
                        onClick={() => imageInputRef.current?.click()}
                        className="w-full justify-center text-xs py-1.5"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                        {detailedProduct.imageUrl ? 'Change Photograph' : 'Upload Photograph'}
                      </Button>
                    </div>
                  )}

                  {imageUpdateError && (
                    <p className="text-xs text-rose-600 font-medium mt-2 mb-0 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {imageUpdateError}
                    </p>
                  )}

                  {imageSuccessMsg && (
                    <p className="text-xs text-emerald-700 font-medium mt-2 mb-0 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      {imageSuccessMsg}
                    </p>
                  )}
                </div>

                {/* Stock Health Card */}
                <div
                  className={`p-4 rounded-xl border ${
                    isOutOfStock
                      ? 'bg-rose-50/70 border-rose-200'
                      : isLowStock
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-emerald-50/70 border-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Stock Status
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isOutOfStock
                          ? 'bg-rose-100 text-rose-800'
                          : isLowStock
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isOutOfStock ? (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Out of Stock
                        </>
                      ) : isLowStock ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Low Stock
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> In Stock
                        </>
                      )}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-bold font-tabular text-slate-900">
                        {currentQty.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 ml-1.5">
                        {detailedProduct.unit}(s) available
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Reorder level: <strong className="font-tabular text-slate-800">{threshold}</strong>
                    </span>
                  </div>
                </div>

                {/* Operational Quick Links */}
                <div className="rounded-xl border border-slate-200/90 p-3 space-y-2 bg-slate-50/50">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Product Shortcuts
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onClose()
                        navigate(`/inventory?search=${encodeURIComponent(detailedProduct.sku)}`)
                      }}
                      className="justify-center text-xs py-1.5"
                    >
                      <Boxes className="w-3.5 h-3.5 mr-1 text-slate-700" /> Stock Movements
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onClose()
                        navigate(`/sales/history?search=${encodeURIComponent(detailedProduct.sku)}`)
                      }}
                      className="justify-center text-xs py-1.5"
                    >
                      <Receipt className="w-3.5 h-3.5 mr-1 text-slate-700" /> Sales History
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column: Pricing, Inventory Status, and Product Info */}
              <div className="md:col-span-7 space-y-6">
                {/* 1. Section: Pricing & Profitability */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 m-0">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      Pricing & Profitability
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Per-unit commercial margins
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Selling Price
                      </div>
                      <div className="text-sm sm:text-base font-bold text-slate-900 font-tabular mt-1 truncate">
                        {formatCurrency(selling)}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Purchase Cost
                      </div>
                      <div className="text-sm sm:text-base font-bold text-slate-600 font-tabular mt-1 truncate">
                        {formatCurrency(cost)}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Profit / Unit
                      </div>
                      <div
                        className={`text-sm sm:text-base font-bold font-tabular mt-1 truncate ${
                          profit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {formatCurrency(profit)}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Gross Margin
                      </div>
                      <div
                        className={`text-sm sm:text-base font-bold font-tabular mt-1 truncate ${
                          marginPercent >= 0 ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {marginPercent.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Section: Inventory Status */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 m-0">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Inventory Status
                  </h3>

                  <div className="rounded-xl border border-slate-200/90 bg-white divide-y divide-slate-100 text-xs">
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500">Available Quantity</span>
                      <span className="font-bold font-tabular text-slate-900">
                        {currentQty} {detailedProduct.unit}(s)
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500">Reorder Level (Threshold)</span>
                      <span className="font-semibold font-tabular text-slate-900">
                        {threshold} {detailedProduct.unit}(s)
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500">Unit of Measurement</span>
                      <span className="font-semibold text-slate-900 capitalize">
                        {detailedProduct.unit}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-slate-400" />
                        Recent Supplier
                      </span>
                      <span className="font-medium text-slate-900">
                        {detailedProduct.supplier?.name || (
                          <span className="text-slate-400 italic">Not specified</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Section: Product Information & Identifiers */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 m-0">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    Product Information
                  </h3>

                  <div className="rounded-xl border border-slate-200/90 bg-white divide-y divide-slate-100 text-xs">
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500">SKU / Product Code</span>
                      <span className="font-mono font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                        {detailedProduct.sku}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500">Category</span>
                      <span className="font-medium text-slate-900">
                        {detailedProduct.category?.name || 'Uncategorized'}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500">Brand</span>
                      <span className="font-medium text-slate-900">
                        {detailedProduct.brand || (
                          <span className="text-slate-400 italic">Not specified</span>
                        )}
                      </span>
                    </div>

                    {detailedProduct.description && (
                      <div className="p-3 space-y-1">
                        <span className="text-slate-500 block">Description</span>
                        <p className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 leading-relaxed m-0">
                          {detailedProduct.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Barcodes & QR Codes */}
                <div className="rounded-xl border border-slate-200/90 p-4 space-y-3 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Barcode className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        Barcodes & QR Codes ({activeCodes.length})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQrModal(!showQrModal)}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 focus:outline-none"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      {showQrModal ? 'Hide TillPro QR' : 'TillPro QR'}
                    </button>
                  </div>

                  {/* QR Code generator box */}
                  {showQrModal && (
                    <div className="p-4 rounded-xl bg-white border border-emerald-200/80 flex flex-col items-center space-y-3 shadow-xs">
                      <canvas ref={qrCanvasRef} className="rounded-lg shadow-xs" />
                      <div className="text-center space-y-1">
                        <span className="font-mono text-xs text-slate-900 font-semibold block">
                          tillpro:product:{detailedProduct.id.slice(0, 8)}...
                        </span>
                        <p className="text-[11px] text-slate-500 m-0 max-w-xs leading-normal">
                          TillPro internal retail QR reference. Scannable at point-of-sale and price checker terminals.
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleDownloadQr} className="text-xs">
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Download QR Image
                      </Button>
                    </div>
                  )}

                  {/* Codes list */}
                  {activeCodes.length > 0 ? (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {activeCodes.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/90 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {c.type === 'QR' ? (
                              <QrCode className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <Barcode className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span className="font-mono font-semibold text-slate-900">{c.code}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium uppercase">
                              {c.type.replace('_', '-')}
                            </span>
                          </div>
                          {isManager && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCode(c.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete barcode"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic m-0">
                      No barcodes registered for this product yet.
                    </p>
                  )}

                  {/* Add code input */}
                  {isManager && (
                    <div className="pt-2 border-t border-slate-200/80 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-6">
                          <input
                            type="text"
                            placeholder="Add barcode value..."
                            value={newCodeValue}
                            onChange={(e) => {
                              setNewCodeValue(e.target.value)
                              setCodeError(null)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddCode()
                              }
                            }}
                            className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 text-xs py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <select
                            value={newCodeType}
                            onChange={(e) => setNewCodeType(e.target.value as ProductCodeType)}
                            className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 text-xs py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                          >
                            {CODE_TYPES.map((ct) => (
                              <option key={ct.value} value={ct.value}>
                                {ct.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            isLoading={codeLoading}
                            onClick={handleAddCode}
                            className="w-full justify-center text-xs py-1.5"
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add
                          </Button>
                        </div>
                      </div>

                      {codeError && (
                        <p className="text-xs text-rose-600 font-medium m-0 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          {codeError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 5. Metadata & Timestamps */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Created: {new Date(detailedProduct.createdAt).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Updated: {new Date(detailedProduct.updatedAt).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-slate-200/90 p-4 px-6 bg-slate-50/80">
            {isManager ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleStatus(detailedProduct)}
                className={
                  detailedProduct.isActive
                    ? 'text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200'
                    : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                }
              >
                {detailedProduct.isActive ? (
                  <>
                    <Archive className="w-3.5 h-3.5 mr-1.5" /> Archive Product
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reactivate Product
                  </>
                )}
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              {isManager && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose()
                    onEdit(detailedProduct)
                  }}
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit Product
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
