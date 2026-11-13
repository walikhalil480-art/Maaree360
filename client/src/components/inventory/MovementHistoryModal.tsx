import React, { useState, useEffect } from 'react'
import { apiFetch } from '../../api/client'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table'
import { TableRowSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import type { StockMovement, ProductInventoryResponse } from '../../types/inventory'
import { History, ArrowUpRight, ArrowDownRight, RefreshCw, FileText } from 'lucide-react'

interface MovementHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
  productId: string
  productName: string
  productSku: string
  unit: string
}

export const MovementHistoryModal: React.FC<MovementHistoryModalProps> = ({
  isOpen,
  onClose,
  businessId,
  productId,
  productName,
  productSku,
  unit,
}) => {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentStock, setCurrentStock] = useState<number | null>(null)

  const fetchHistory = async () => {
    if (!businessId || !productId) return
    setLoading(true)
    setError(null)

    try {
      const res = await apiFetch<ProductInventoryResponse>(
        `/api/v1/businesses/${businessId}/inventory/products/${productId}`
      )
      if (res.success) {
        setMovements(res.recentMovements || [])
        setCurrentStock(res.stockLevel?.quantity != null ? Number(res.stockLevel.quantity) : 0)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inventory movement history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchHistory()
    }
  }, [isOpen, businessId, productId])

  const renderTypeBadge = (type: string) => {
    switch (type) {
      case 'STOCK_IN':
        return <Badge variant="success" size="sm">Stock In</Badge>
      case 'STOCK_OUT':
        return <Badge variant="neutral" size="sm">Stock Out</Badge>
      case 'ADJUSTMENT_IN':
      case 'ADJUSTMENT_OUT':
        return <Badge variant="warning" size="sm">Adjustment</Badge>
      case 'DAMAGE':
        return <Badge variant="danger" size="sm">Damage</Badge>
      case 'LOSS':
        return <Badge variant="danger" size="sm">Loss / Shrinkage</Badge>
      case 'RETURN':
        return <Badge variant="info" size="sm">Return</Badge>
      case 'OPENING_STOCK':
        return <Badge variant="warning" size="sm">Opening Stock</Badge>
      default:
        return <Badge variant="neutral" size="sm">{type}</Badge>
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stock Movement Ledger"
      description={`Audit trail and historical adjustments for ${productName}`}
      size="xl"
    >
      {/* Product Overview Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            Product Item
          </span>
          <h4 className="text-sm font-bold text-slate-900 m-0">{productName}</h4>
          <span className="font-mono text-xs text-slate-500">SKU: {productSku}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-slate-500 block">Current Balance</span>
            <span className="text-base font-bold text-slate-900">
              {currentStock != null ? currentStock : '—'} <span className="text-xs font-normal text-slate-500">{unit}</span>
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loading} leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Movement Type</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Reason / Notes</TableHead>
              <TableHead>Ref #</TableHead>
              <TableHead>Logged By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 4 }).map((_, i) => (
              <TableRowSkeleton key={i} columns={7} />
            ))}
          </TableBody>
        </Table>
      ) : error ? (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      ) : movements.length === 0 ? (
        <EmptyState
          icon={<History className="w-8 h-8 text-slate-400" />}
          title="No Movement Records"
          description="Stock movements will automatically log here when items are received, issued, counted, or written off."
          className="py-10 border border-slate-100 rounded-lg bg-slate-50/50"
        />
      ) : (
        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">Progression</TableHead>
                <TableHead>Reason / Notes</TableHead>
                <TableHead>Ref #</TableHead>
                <TableHead>Logged By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => {
                const delta = Number(m.quantityChange)
                const isPositive = delta > 0
                const isNegative = delta < 0

                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>{renderTypeBadge(m.type)}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">
                      <span
                        className={`inline-flex items-center gap-0.5 ${
                          isPositive
                            ? 'text-emerald-700'
                            : isNegative
                            ? 'text-rose-700'
                            : 'text-slate-600'
                        }`}
                      >
                        {isPositive && <ArrowUpRight className="w-3 h-3 text-emerald-600" />}
                        {isNegative && <ArrowDownRight className="w-3 h-3 text-rose-600" />}
                        {isPositive ? `+${delta}` : `${delta}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-slate-500 whitespace-nowrap">
                      {Number(m.previousQuantity)} &rarr;{' '}
                      <strong className="text-slate-900">{Number(m.resultingQuantity)}</strong>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 max-w-xs truncate" title={m.reason || undefined}>
                      {m.reason || '—'}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-500">
                      {m.reference ? (
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          <FileText className="w-2.5 h-2.5 text-slate-400" />
                          {m.reference}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {m.user?.name || 'System'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
        <span className="text-xs text-slate-400">
          Immutable ledger record. Historical entries cannot be modified.
        </span>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}
