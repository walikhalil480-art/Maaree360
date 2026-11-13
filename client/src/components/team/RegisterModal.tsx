import { useState, useEffect, type FC, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import type { Register } from '../../types/shift'
import { AlertCircle } from 'lucide-react'

interface RegisterModalProps {
  isOpen: boolean
  onClose: () => void
  register?: Register | null
  onSave: (data: { name: string; code: string; description?: string }) => Promise<void>
}

export const RegisterModal: FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  register,
  onSave,
}) => {
  const [name, setName] = useState(register?.name || '')
  const [code, setCode] = useState(register?.code || '')
  const [description, setDescription] = useState(register?.description || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (register) {
      setName(register.name)
      setCode(register.code)
      setDescription(register.description || '')
    } else {
      setName('')
      setCode('')
      setDescription('')
    }
    setError(null)
  }, [register, isOpen])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please provide a register name (e.g. Front Counter).')
      return
    }
    if (!code.trim()) {
      setError('Please provide a short register code (e.g. REG-01).')
      return
    }

    try {
      setLoading(true)
      await onSave({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to save register')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={register ? 'Edit Register' : 'Add Cash Register / POS Station'}
      description="Configure physical or virtual cash checkout counters in your store."
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Register Name <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="e.g. Front Counter, Express Lane, Back Counter"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Register Code <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="e.g. REG-01"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Unique identifier for reports and cashier shifts.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Description (Optional)
          </label>
          <Input
            placeholder="e.g. Terminal located by main shop entrance"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            {register ? 'Update Register' : 'Create Register'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
