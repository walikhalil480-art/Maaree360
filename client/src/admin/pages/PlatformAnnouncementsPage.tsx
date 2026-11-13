import React, { useState, useEffect } from 'react'
import { apiFetch } from '../../api/client'
import {
  Plus,
  Trash2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
  Clock,
  Send,
} from 'lucide-react'

interface Announcement {
  id: string
  title: string
  content: string
  targetType: string
  priority: string
  publishedAt: string
  expiresAt?: string | null
}

export default function PlatformAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'INFO',
    targetType: 'ALL',
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      const res = await apiFetch<{ success: boolean; announcements: Announcement[] }>(
        '/api/v1/platform/announcements'
      )
      if (res.success) {
        setAnnouncements(res.announcements)
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      const res = await apiFetch<{ success: boolean; announcement: Announcement }>(
        '/api/v1/platform/announcements',
        {
          method: 'POST',
          body: JSON.stringify(formData),
        }
      )
      if (res.success) {
        setShowModal(false)
        setFormData({ title: '', content: '', priority: 'INFO', targetType: 'ALL' })
        fetchAnnouncements()
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to publish announcement')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this announcement?')) return
    try {
      const res = await apiFetch<{ success: boolean }>(`/api/v1/platform/announcements/${id}`, {
        method: 'DELETE',
      })
      if (res.success) {
        fetchAnnouncements()
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to delete announcement')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101C35] tracking-tight">Platform Announcements</h1>
          <p className="text-sm text-slate-500 mt-1">
            Publish system-wide service bulletins, maintenance alerts, and release notices to business tenants.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#12A878] text-white text-xs font-semibold rounded-xl hover:bg-[#0E8A62] transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          Broadcast Announcement
        </button>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  ann.priority === 'CRITICAL'
                    ? 'bg-rose-50 text-rose-600'
                    : ann.priority === 'WARNING'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-blue-50 text-blue-600'
                }`}
              >
                {ann.priority === 'CRITICAL' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : ann.priority === 'WARNING' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[#101C35] text-sm">{ann.title}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                    Target: {ann.targetType}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 whitespace-pre-wrap">{ann.content}</p>
                <span className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Published: {new Date(ann.publishedAt).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleDelete(ann.id)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete bulletin"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {announcements.length === 0 && !loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
            No active platform announcements or bulletins published.
          </div>
        )}
      </div>

      {/* Broadcast Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#101C35]">Broadcast Announcement</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bulletin Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Scheduled Network Maintenance on Sunday"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Message Content *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Detail the announcement, maintenance window, or upgrade instructions..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority Level</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="INFO">Informational (Blue)</option>
                    <option value="WARNING">Warning (Amber)</option>
                    <option value="CRITICAL">Critical Notice (Red)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Audience</label>
                  <select
                    value={formData.targetType}
                    onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="ALL">All Businesses</option>
                    <option value="PRO_TIERS">Pro / Enterprise Only</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-200 bg-white text-slate-700 font-semibold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-[#12A878] text-white font-semibold rounded-xl text-xs hover:bg-[#0E8A62] flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'Broadcasting...' : 'Broadcast Bulletin'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
