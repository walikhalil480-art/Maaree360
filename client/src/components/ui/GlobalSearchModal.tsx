import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../api/client'
import {
  Search,
  ShoppingCart,
  Package,
  Boxes,
  QrCode,
  Receipt,
  Users,
  Settings,
  ArrowRight,
  Sparkles,
  Command,
  X,
  BarChart3,
  Tag,
} from 'lucide-react'

interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SearchItem {
  id: string
  title: string
  subtitle?: string
  category: 'Navigation' | 'Actions' | 'Products'
  icon: React.ComponentType<{ className?: string }>
  action: () => void
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const { activeBusiness } = useAuth()
  const businessId = activeBusiness?.id
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [productResults, setProductResults] = useState<any[]>([])
  const [searchingProducts, setSearchingProducts] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setProductResults([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Static navigation and quick actions
  const defaultItems: SearchItem[] = [
    {
      id: 'nav-pos',
      title: 'Point of Sale (POS)',
      subtitle: 'Checkout customers and scan items',
      category: 'Actions',
      icon: ShoppingCart,
      action: () => {
        navigate('/sales')
        onClose()
      },
    },
    {
      id: 'nav-price-checker',
      title: 'Price Checker',
      subtitle: 'Verify product prices and stock availability',
      category: 'Actions',
      icon: Tag,
      action: () => {
        navigate('/price-checker')
        onClose()
      },
    },
    {
      id: 'nav-scan',
      title: 'Barcode & QR Scanner',
      subtitle: 'Scan product codes and barcodes',
      category: 'Actions',
      icon: QrCode,
      action: () => {
        navigate('/barcodes')
        onClose()
      },
    },
    {
      id: 'nav-products',
      title: 'Products Catalog',
      subtitle: 'Manage inventory items, pricing, and packshots',
      category: 'Navigation',
      icon: Package,
      action: () => {
        navigate('/products')
        onClose()
      },
    },
    {
      id: 'nav-inventory',
      title: 'Stock Movements',
      subtitle: 'Track audit logs and inventory adjustments',
      category: 'Navigation',
      icon: Boxes,
      action: () => {
        navigate('/inventory')
        onClose()
      },
    },
    {
      id: 'nav-sales-history',
      title: 'Sales & Receipts',
      subtitle: 'View historical transactions and print receipts',
      category: 'Navigation',
      icon: Receipt,
      action: () => {
        navigate('/sales/history')
        onClose()
      },
    },
    {
      id: 'nav-reports',
      title: 'Financial Reports',
      subtitle: 'Review revenue trends and profit margins',
      category: 'Navigation',
      icon: BarChart3,
      action: () => {
        navigate('/reports')
        onClose()
      },
    },
    {
      id: 'nav-ai',
      title: 'AI Business Assistant',
      subtitle: 'Get intelligent insights and demand forecasts',
      category: 'Navigation',
      icon: Sparkles,
      action: () => {
        navigate('/assistant')
        onClose()
      },
    },
    {
      id: 'nav-team',
      title: 'Staff & Permissions',
      subtitle: 'Manage team roles and user access',
      category: 'Navigation',
      icon: Users,
      action: () => {
        navigate('/team')
        onClose()
      },
    },
    {
      id: 'nav-settings',
      title: 'Store Settings',
      subtitle: 'Receipt branding, tax rates, and peripherals',
      category: 'Navigation',
      icon: Settings,
      action: () => {
        navigate('/settings')
        onClose()
      },
    },
  ]

  // Live product search when query is >= 2 characters
  useEffect(() => {
    if (!businessId || query.trim().length < 2) {
      setProductResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearchingProducts(true)
      try {
        const res = await apiFetch<any>(
          `/api/v1/businesses/${businessId}/products?search=${encodeURIComponent(
            query.trim()
          )}&limit=5&isActive=true`
        )
        if (res && res.success && res.products) {
          setProductResults(res.products)
        }
      } catch (err) {
        console.error('Failed to search products in command palette', err)
      } finally {
        setSearchingProducts(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [businessId, query])

  // Filter items based on query
  const filteredStaticItems = query.trim()
    ? defaultItems.filter(
        (i) =>
          i.title.toLowerCase().includes(query.toLowerCase()) ||
          i.subtitle?.toLowerCase().includes(query.toLowerCase())
      )
    : defaultItems

  // Product items mapped to SearchItem
  const productItems: SearchItem[] = productResults.map((p) => ({
    id: `prod-${p.id}`,
    title: p.name,
    subtitle: `SKU: ${p.sku} • ${activeBusiness?.currency || 'KES'} ${Number(
      p.sellingPrice
    ).toLocaleString()} • ${Number(p.stockLevel?.quantity ?? 0)} in stock`,
    category: 'Products',
    icon: Package,
    action: () => {
      navigate('/products')
      onClose()
    },
  }))

  const allItems = [...productItems, ...filteredStaticItems]

  // Keyboard navigation (ArrowDown, ArrowUp, Enter, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, allItems.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + allItems.length) % Math.max(1, allItems.length))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (allItems[selectedIndex]) {
          allItems[selectedIndex].action()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, allItems, selectedIndex, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-100"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="flex min-h-full items-start justify-center p-4 sm:p-6 pt-16 sm:pt-24">
        <div className="relative w-full max-w-xl transform overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200/90 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
          {/* Search Input Bar */}
          <div className="relative flex items-center px-4 py-3 bg-white">
            <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              placeholder="Search pages, actions, or products..."
              className="w-full bg-transparent text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono text-slate-400 bg-slate-100 border border-slate-200">
                ESC
              </span>
            )}
          </div>

          {/* Results List */}
          <div className="max-h-96 overflow-y-auto p-2 space-y-1">
            {searchingProducts && (
              <div className="px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>Searching catalog...</span>
              </div>
            )}

            {allItems.length === 0 && !searchingProducts ? (
              <div className="px-4 py-8 text-center text-slate-500 text-xs">
                No matching results found for <span className="font-semibold text-slate-800">"{query}"</span>
              </div>
            ) : (
              allItems.map((item, idx) => {
                const Icon = item.icon
                const isSelected = idx === selectedIndex

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition select-none ${
                      isSelected
                        ? 'bg-slate-100 text-[#0F172A]'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-[#0F172A] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs sm:text-sm font-semibold truncate text-[#0F172A]">
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider hidden sm:inline">
                        {item.category}
                      </span>
                      {isSelected && <ArrowRight className="w-3.5 h-3.5 text-[#059669]" />}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer Guide */}
          <div className="px-4 py-2.5 bg-slate-50 text-[11px] text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>Use <kbd className="px-1 rounded bg-white border border-slate-200 text-slate-600">↑</kbd> <kbd className="px-1 rounded bg-white border border-slate-200 text-slate-600">↓</kbd> to navigate</span>
              <span><kbd className="px-1 rounded bg-white border border-slate-200 text-slate-600">↵</kbd> to select</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 font-mono text-[10px]">
              <Command className="w-3 h-3 text-slate-400" />
              <span>Till Pro Quick Nav</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
