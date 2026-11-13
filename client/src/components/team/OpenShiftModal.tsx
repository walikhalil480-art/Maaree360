import { useState, useEffect, type FC, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import type { Register, OpenShiftInput } from '../../types/shift'
import { AlertCircle, Banknote } from 'lucide-react'

interface OpenShiftModalProps {
  isOpen: boolean
  onClose: () => void
  registers: Register[]
  currency: string
  onOpenShift: (data: OpenShiftInput) => Promise<void>
}

export const OpenShiftModal: FC<OpenShiftModalProps> = ({
  isOpen,
  onClose,
  registers,
  currency,
  onOpenShift,
}) => {
  const activeRegisters = registers.filter((r) => r.isActive && !r.activeShift)
  const [registerId, setRegisterId] = useState(activeRegisters[0]?.id || '')
  const [openingFloat, setOpeningFloat] = useState<string>('1000')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (activeRegisters.length > 0 && !activeRegisters.some((r) => r.id === registerId)) {
      setRegisterId(activeRegisters[0].id)
    }
  }, [registers, registerId])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!registerId) {
      setError('Please select an available register.')
      return
    }

    const floatNum = parseFloat(openingFloat)
    if (isNaN(floatNum) || floatNum < 0) {
      setError('Opening float must be a non-negative number.')
      return
    }

    try {
      setLoading(true)
      await onOpenShift({
        registerId,
        openingFloat: floatNum,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to start shift')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start Cashier Shift"
      description="Select your register and count the starting cash float in the drawer."
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {activeRegisters.length === 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            <p className="font-semibold mb-1">No Available Registers</p>
            <p className="text-xs">
              All active registers currently have an ongoing open shift, or no active registers exist.
              Please close an ongoing shift first or add a new register.
            </p>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Select Register <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                value={registerId}
                onChange={(e) => setRegisterId(e.target.value)}
                required
              >
                {activeRegisters.map((reg) => (
                  <option key={reg.id} value={reg.id}>
                    {reg.name} ({reg.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Opening Float ({currency}) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Banknote className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-9"
                  placeholder="0.00"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Amount of physical cash placed in the cash drawer at start of shift.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Shift Notes (Optional)
              </label>
              <Input
                placeholder="e.g. Morning shift, 100 bob coins, small change"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            disabled={activeRegisters.length === 0}
          >
            Start Shift
          </Button>
        </div>
      </form>
    </Modal>
  )
}
