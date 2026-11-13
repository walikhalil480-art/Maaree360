import React, { useState, useEffect, useRef } from 'react'
import { apiFetch, ApiError } from '../../api/client'
import type { Product, Category, ProductCodeType } from '../../types/product'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import {
  X,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Barcode,
  Plus,
  Trash2,
  QrCode,
  Upload,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react'

interface ProductFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (product: Product, isEdit: boolean) => void
  product?: Product | null
  initialCode?: { code: string; type: ProductCodeType } | null
  categories: Category[]
  businessId: string
  currency?: string
}

const COMMON_UNITS = [
  'piece',
  'kg',
  'g',
  'litre',
  'ml',
  'box',
  'pack',
  'carton',
  'bottle',
  'can',
  'bag',
  'bundle',
  'pair',
  'roll',
  'metre',
]

const CODE_TYPES: { label: string; value: ProductCodeType }[] = [
  { label: 'EAN-13 (Standard Retail Barcode - 13 Digits)', value: 'EAN_13' },
  { label: 'UPC-A (Standard Retail Barcode - 12 Digits)', value: 'UPC_A' },
  { label: 'EAN-8 (Compact Retail Barcode - 8 Digits)', value: 'EAN_8' },
  { label: 'Code 128 (Alphanumeric Barcode)', value: 'CODE_128' },
  { label: 'QR Code (Matrix Barcode)', value: 'QR' },
  { label: 'Other Format', value: 'OTHER' },
]

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  product,
  initialCode,
  categories,
  businessId,
  currency = 'KES',
}) => {
  const isEdit = Boolean(product)

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [brand, setBrand] = useState('')
  const [unit, setUnit] = useState('piece')
  const [customUnit, setCustomUnit] = useState('')
  const [costPrice, setCostPrice] = useState<string>('')
  const [sellingPrice, setSellingPrice] = useState<string>('')
  const [minStockThreshold, setMinStockThreshold] = useState<string>('5')
  const [description, setDescription] = useState('')

  // Barcode / QR Codes state
  const [codes, setCodes] = useState<Array<{ id?: string; code: string; type: ProductCodeType }>>([])
  const [newCodeValue, setNewCodeValue] = useState('')
  const [newCodeType, setNewCodeType] = useState<ProductCodeType>('CODE_128')
  const [codeError, setCodeError] = useState<string | null>(null)

  // Product Image Upload state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (product) {
      setName(product.name || '')
      setSku(product.sku || '')
      setCategoryId(product.categoryId || '')
      setBrand(product.brand || '')
      if (COMMON_UNITS.includes(product.unit)) {
        setUnit(product.unit)
        setCustomUnit('')
      } else {
        setUnit('other')
        setCustomUnit(product.unit || '')
      }
      setCostPrice(product.costPrice != null ? String(product.costPrice) : '')
      setSellingPrice(product.sellingPrice != null ? String(product.sellingPrice) : '')
      setMinStockThreshold(
        product.minStockThreshold != null ? String(product.minStockThreshold) : '5'
      )
      setDescription(product.description || '')
      setImagePreview(product.imageUrl || null)
      setImageFile(null)
      setImageRemoved(false)
      setImageError(null)
      if (product.codes && product.codes.length > 0) {
        setCodes(product.codes.map((c) => ({ id: c.id, code: c.code, type: c.type })))
      } else {
        setCodes([])
      }
    } else {
      setName('')
      setSku('')
      setCategoryId('')
      setBrand('')
      setUnit('piece')
      setCustomUnit('')
      setCostPrice('')
      setSellingPrice('')
      setMinStockThreshold('5')
      setDescription('')
      setImagePreview(null)
      setImageFile(null)
      setImageRemoved(false)
      setImageError(null)
      if (initialCode) {
        setCodes([{ code: initialCode.code, type: initialCode.type }])
      } else {
        setCodes([])
      }
    }
    setNewCodeValue('')
    setNewCodeType('CODE_128')
    setCodeError(null)
    setServerError(null)
    setErrors({})
  }, [product, initialCode, isOpen])

  if (!isOpen) return null

  // Image Selection Handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null)
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (!validTypes.includes(file.type)) {
      setImageError('Unsupported file type. Please upload a JPG, PNG, or WebP image.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError('File size exceeds 5 MB limit. Please select an image under 5 MB.')
      return
    }

    setImageFile(file)
    setImageRemoved(false)
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
  }

  // Remove Image Handler
  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setImageRemoved(true)
    setImageError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Trigger file selection dialog
  const handleTriggerFileInput = () => {
    fileInputRef.current?.click()
  }

  // Auto-detect code type when entering code
  const handleCodeInputChange = (val: string) => {
    setNewCodeValue(val)
    setCodeError(null)
    const trimmed = val.trim()
    if (/^\d{13}$/.test(trimmed)) {
      setNewCodeType('EAN_13')
    } else if (/^\d{12}$/.test(trimmed)) {
      setNewCodeType('UPC_A')
    } else if (/^\d{8}$/.test(trimmed)) {
      setNewCodeType('EAN_8')
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('tillpro:') || trimmed.startsWith('smartstock:')) {
      setNewCodeType('QR')
    }
  }

  // Add Code locally
  const handleAddCode = () => {
    const trimmed = newCodeValue.trim()
    if (!trimmed) {
      setCodeError('Enter a barcode or QR code value')
      return
    }

    if (codes.some((c) => c.code.toLowerCase() === trimmed.toLowerCase())) {
      setCodeError('This code is already in the list above')
      return
    }

    // Format validation
    if (newCodeType === 'EAN_13' && !/^\d{13}$/.test(trimmed)) {
      setCodeError('EAN-13 barcodes must be exactly 13 digits')
      return
    }
    if (newCodeType === 'UPC_A' && !/^\d{12}$/.test(trimmed)) {
      setCodeError('UPC-A barcodes must be exactly 12 digits')
      return
    }
    if (newCodeType === 'EAN_8' && !/^\d{8}$/.test(trimmed)) {
      setCodeError('EAN-8 barcodes must be exactly 8 digits')
      return
    }

    setCodes((prev) => [...prev, { code: trimmed, type: newCodeType }])
    setNewCodeValue('')
    setCodeError(null)
  }

  // Remove Code locally (or also delete from server if editing and code has id)
  const handleRemoveCode = async (index: number) => {
    const target = codes[index]
    if (isEdit && product && target.id) {
      try {
        await apiFetch(`/api/v1/businesses/${businessId}/products/${product.id}/codes/${target.id}`, {
          method: 'DELETE',
        })
      } catch (err) {
        console.error('Failed to remove code from server', err)
      }
    }
    setCodes((prev) => prev.filter((_, i) => i !== index))
  }

  // Auto-generate SKU helper
  const handleGenerateSku = () => {
    if (!name.trim()) {
      setErrors((prev) => ({ ...prev, sku: 'Enter product name first to generate a SKU' }))
      return
    }
    const cleanPrefix = name
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 4)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    setSku(`${cleanPrefix}-${randomSuffix}`)
    setErrors((prev) => {
      const next = { ...prev }
      delete next.sku
      return next
    })
  }

  // Margin calculation
  const parsedCost = parseFloat(costPrice) || 0
  const parsedSelling = parseFloat(sellingPrice) || 0
  const profit = parsedSelling - parsedCost
  const marginPercent = parsedSelling > 0 ? (profit / parsedSelling) * 100 : 0
  const markupPercent = parsedCost > 0 ? (profit / parsedCost) * 100 : 0

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'Product name is required'
    if (!sku.trim()) newErrors.sku = 'SKU is required'
    if (costPrice === '' || isNaN(Number(costPrice)) || Number(costPrice) < 0) {
      newErrors.costPrice = 'Valid non-negative cost price is required'
    }
    if (sellingPrice === '' || isNaN(Number(sellingPrice)) || Number(sellingPrice) < 0) {
      newErrors.sellingPrice = 'Valid non-negative selling price is required'
    }
    if (
      minStockThreshold === '' ||
      isNaN(Number(minStockThreshold)) ||
      Number(minStockThreshold) < 0
    ) {
      newErrors.minStockThreshold = 'Valid non-negative threshold is required'
    }
    if (unit === 'other' && !customUnit.trim()) {
      newErrors.customUnit = 'Specify custom unit of measurement'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setServerError(null)

    let finalImageUrl: string | null | undefined = undefined

    if (imageFile) {
      setUploadingImage(true)
      try {
        const formData = new FormData()
        formData.append('image', imageFile)
        const uploadRes = await apiFetch<{ success: boolean; imageUrl: string }>(
          `/api/v1/businesses/${businessId}/products/upload-image`,
          {
            method: 'POST',
            body: formData,
          }
        )
        finalImageUrl = uploadRes.imageUrl
      } catch (err: any) {
        const msg = err instanceof ApiError ? err.message : 'Failed to upload product image'
        setImageError(msg)
        setLoading(false)
        setUploadingImage(false)
        return
      } finally {
        setUploadingImage(false)
      }
    } else if (imageRemoved) {
      finalImageUrl = null
    } else if (isEdit) {
      finalImageUrl = product?.imageUrl || null
    }

    const finalUnit = unit === 'other' ? customUnit.trim() : unit

    const payload: any = {
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      categoryId: categoryId ? categoryId : null,
      brand: brand.trim() || null,
      unit: finalUnit,
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      minStockThreshold: Math.floor(Number(minStockThreshold)),
      description: description.trim() || null,
    }

    if (finalImageUrl !== undefined) {
      payload.imageUrl = finalImageUrl
    }

    // In create mode, pass newly added codes
    if (!isEdit) {
      payload.codes = codes.map((c) => ({
        code: c.code,
        type: c.type,
      }))
    }

    try {
      let savedProduct: Product
      if (isEdit && product) {
        const res = await apiFetch<{ success: boolean; product: Product }>(
          `/api/v1/businesses/${businessId}/products/${product.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          }
        )
        savedProduct = res.product

        // Add any newly added codes that don't have an ID yet
        const newCodesToCreate = codes.filter((c) => !c.id)
        for (const nc of newCodesToCreate) {
          try {
            await apiFetch(`/api/v1/businesses/${businessId}/products/${product.id}/codes`, {
              method: 'POST',
              body: JSON.stringify({ code: nc.code, type: nc.type }),
            })
          } catch (codeErr) {
            console.error('Error adding code to product', codeErr)
          }
        }
        onSuccess(savedProduct, true)
      } else {
        const res = await apiFetch<{ success: boolean; product: Product }>(
          `/api/v1/businesses/${businessId}/products`,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        )
        savedProduct = res.product
        onSuccess(savedProduct, false)
      }
      onClose()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'SKU_EXISTS') {
          setErrors((prev) => ({ ...prev, sku: err.message }))
        } else if (err.code === 'CODE_EXISTS') {
          setCodeError(err.message)
          setServerError(err.message)
        } else {
          setServerError(err.message)
        }
      } else {
        setServerError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all border border-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 m-0">
                {isEdit ? 'Edit Product' : 'Add New Product'}
              </h2>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                {isEdit
                  ? 'Update product details, pricing, barcodes, and category'
                  : 'Register a product in your catalog with SKU, barcodes, and pricing'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {serverError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Dedicated Product Image Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#142B4A] uppercase tracking-wider">
                  Product Image <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                {imagePreview && (
                  <span className="text-[11px] font-medium text-[#059669] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                    Image selected
                  </span>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
                onChange={handleImageSelect}
              />

              {/* Image Upload Area */}
              <div className="rounded-xl border-2 border-dashed border-[#E2E8F0] p-4 bg-[#F5F7FA]/70 hover:bg-[#F5F7FA] transition-colors">
                {imagePreview ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Preview Area */}
                    <div className="relative w-32 h-32 shrink-0 rounded-xl overflow-hidden border border-[#E2E8F0] bg-white p-2 shadow-2xs flex items-center justify-center">
                      <img
                        src={imagePreview}
                        alt="Product Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Preview details and actions */}
                    <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#172033] truncate">
                        {imageFile ? imageFile.name : (product?.name || 'Selected product photograph')}
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        {imageFile
                          ? `${(imageFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to save`
                          : 'Current photograph on file'}
                      </div>
                      <div className="flex items-center gap-2 justify-center sm:justify-start pt-1 flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleTriggerFileInput}
                          className="text-xs py-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1 text-[#142B4A]" /> Change Image
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveImage}
                          className="text-xs py-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={handleTriggerFileInput}
                    className="flex flex-col items-center justify-center py-5 px-4 text-center cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-[#142B4A] shadow-2xs group-hover:border-[#059669] group-hover:text-[#059669] transition-colors mb-2.5">
                      <Upload className="w-5 h-5 stroke-[1.75]" />
                    </div>
                    <p className="text-xs font-semibold text-[#172033] mb-0.5">
                      Click to upload product photograph
                    </p>
                    <p className="text-[11px] text-[#64748B] max-w-sm mb-2.5">
                      Supports JPG, PNG, and WebP up to 5 MB. Sourced photos appear across POS, price checker, and inventory.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTriggerFileInput()
                      }}
                      className="text-xs font-medium border-[#142B4A]/20 text-[#142B4A] hover:bg-white"
                    >
                      <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-[#059669]" />
                      Upload Image
                    </Button>
                  </div>
                )}
              </div>

              {imageError && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium pt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{imageError}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Name */}
              <div className="sm:col-span-2">
                <Input
                  label="Product Name *"
                  placeholder="e.g. Daawat Basmati Rice 2kg"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (errors.name) {
                      setErrors((prev) => {
                        const next = { ...prev }
                        delete next.name
                        return next
                      })
                    }
                  }}
                  error={errors.name}
                  required
                />
              </div>

              {/* SKU */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    SKU (Stock Keeping Unit) *
                  </label>
                  {!isEdit && (
                    <button
                      type="button"
                      onClick={handleGenerateSku}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 focus:outline-none"
                    >
                      <Sparkles className="w-3 h-3" /> Auto-generate
                    </button>
                  )}
                </div>
                <Input
                  placeholder="e.g. RICE-BAS-2KG"
                  value={sku}
                  onChange={(e) => {
                    setSku(e.target.value.toUpperCase())
                    if (errors.sku) {
                      setErrors((prev) => {
                        const next = { ...prev }
                        delete next.sku
                        return next
                      })
                    }
                  }}
                  error={errors.sku}
                  required
                />
              </div>

              {/* Brand */}
              <div>
                <Input
                  label="Brand (Optional)"
                  placeholder="e.g. Daawat"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  <option value="">No Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit of Measurement */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Unit of Measure *
                </label>
                <div className="flex gap-2">
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u.charAt(0).toUpperCase() + u.slice(1)}
                      </option>
                    ))}
                    <option value="other">Other (Custom)</option>
                  </select>
                  {unit === 'other' && (
                    <Input
                      placeholder="e.g. tray"
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      error={errors.customUnit}
                      className="w-32"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Barcodes & QR Codes Section */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Barcode className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 m-0">
                    Product Barcodes & QR Codes (Optional)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500">
                  {codes.length} {codes.length === 1 ? 'code' : 'codes'} assigned
                </span>
              </div>

              {/* List of current codes */}
              {codes.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {codes.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {item.type === 'QR' ? (
                          <QrCode className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <Barcode className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span className="font-mono font-semibold text-slate-800">{item.code}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 uppercase font-medium">
                          {item.type.replace('_', '-')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCode(idx)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded"
                        title="Remove code"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline input to add a code */}
              <div className="space-y-2 pt-1 border-t border-slate-200/60">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      placeholder="Enter barcode or QR value..."
                      value={newCodeValue}
                      onChange={(e) => handleCodeInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddCode()
                        }
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <select
                      value={newCodeType}
                      onChange={(e) => setNewCodeType(e.target.value as ProductCodeType)}
                      className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 text-xs py-2 px-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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
                      onClick={handleAddCode}
                      className="w-full justify-center text-xs py-2"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>

                {codeError && (
                  <p className="text-xs text-red-600 font-medium m-0 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    {codeError}
                  </p>
                )}
              </div>
            </div>

            {/* Pricing Section */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 m-0">
                  Pricing & Profit Margin ({currency})
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Input
                    label={`Cost Price (${currency}) *`}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={costPrice}
                    onChange={(e) => {
                      setCostPrice(e.target.value)
                      if (errors.costPrice) {
                        setErrors((prev) => {
                          const next = { ...prev }
                          delete next.costPrice
                          return next
                        })
                      }
                    }}
                    error={errors.costPrice}
                    required
                  />
                </div>

                <div>
                  <Input
                    label={`Selling Price (${currency}) *`}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={sellingPrice}
                    onChange={(e) => {
                      setSellingPrice(e.target.value)
                      if (errors.sellingPrice) {
                        setErrors((prev) => {
                          const next = { ...prev }
                          delete next.sellingPrice
                          return next
                        })
                      }
                    }}
                    error={errors.sellingPrice}
                    required
                  />
                </div>

                <div>
                  <Input
                    label="Min Stock Threshold"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="5"
                    helperText="Alert level for low-stock"
                    value={minStockThreshold}
                    onChange={(e) => setMinStockThreshold(e.target.value)}
                    error={errors.minStockThreshold}
                  />
                </div>
              </div>

              {/* Real-time Profit Margin Indicator */}
              {(parsedCost > 0 || parsedSelling > 0) && (
                <div
                  className={`p-3 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-3 ${
                    profit < 0
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : profit === 0
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {profit < 0 ? (
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <div>
                      <span className="font-semibold">
                        {profit < 0
                          ? 'Loss Alert: '
                          : profit === 0
                          ? 'Break Even: '
                          : 'Gross Margin: '}
                      </span>
                      <span>
                        Unit Profit: {currency} {profit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 font-medium">
                    <span>Margin: {marginPercent.toFixed(1)}%</span>
                    <span>Markup: {markupPercent.toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Product specifications, packaging details, or notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={loading || uploadingImage}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={loading || uploadingImage}
              >
                {uploadingImage
                  ? 'Uploading Image...'
                  : isEdit
                  ? 'Save Changes'
                  : 'Create Product'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
