import React from 'react'
import { Link } from 'react-router-dom'
import { MaareeLogo } from '../ui/MaareeLogo'
import {
  TrendingUp,
  Boxes,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react'

export interface AuthLayoutProps {
  children: React.ReactNode
  heading: string
  subheading: string
  badgeText?: string
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  heading,
  subheading,
  badgeText,
}) => {
  return (
    <div className="min-h-screen w-full flex bg-[#F5F7FA] text-[#172033] antialiased">
      {/* ============================================================ */}
      {/* LEFT PANEL — BRAND EXPERIENCE (45% desktop, hidden on mobile) */}
      {/* ============================================================ */}
      <aside className="hidden lg:flex lg:w-[45%] xl:w-[46%] bg-[#0B1425] text-white flex-col justify-between p-8 xl:p-12 relative overflow-hidden select-none border-r border-[#19243B]">
        {/* Subtle geometric ambient lighting & grid backdrop */}
        <div className="absolute inset-0 bg-radial-[at_20%_20%] from-emerald-500/12 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-radial-[at_80%_80%] from-indigo-500/8 via-transparent to-transparent pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />

        {/* Top: Official MAAREE 360 Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="inline-block focus:outline-none focus:ring-2 focus:ring-[#12A878]/50 rounded-lg">
            <MaareeLogo variant="full" theme="dark" size="sm" />
          </Link>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Retail Platform</span>
          </div>
        </div>

        {/* Center: Brand Message & Live Platform Micro-Preview */}
        <div className="relative z-10 my-auto py-8 xl:py-10 space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-[1.18] m-0">
              Run Your Business.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-emerald-300">
                Take Control.
              </span>
            </h1>
            <p className="text-sm xl:text-base text-slate-300 leading-relaxed max-w-md m-0 font-normal">
              One intelligent platform to manage sales, inventory, purchasing, finances, and business operations.
            </p>
          </div>

          {/* Refined Platform Micro-Preview Card (Crisp UI with realistic metrics) */}
          <div className="bg-[#101C35]/90 border border-white/[0.08] rounded-2xl p-4 xl:p-5 shadow-2xl backdrop-blur-md space-y-3.5 max-w-lg">
            {/* Terminal status bar */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 text-[11px]">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-[#12A878]" />
                <span className="font-semibold text-white">MAAREE 360 Terminal</span>
                <span className="text-slate-400">&bull;</span>
                <span className="text-slate-300">Live Ledger Sync</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                99.99% Uptime
              </span>
            </div>

            {/* Micro KPI blocks */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Gross Sales (MTD)</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-base xl:text-lg font-bold font-mono text-white tracking-tight">
                  KES 1,035,414
                </div>
                <div className="text-[10px] text-emerald-400 font-medium">
                  +14.2% vs prior month
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Tracked Inventory</span>
                  <Boxes className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-base xl:text-lg font-bold font-mono text-white tracking-tight">
                  221 Items
                </div>
                <div className="text-[10px] text-slate-300 font-medium">
                  98.6% in-stock rate
                </div>
              </div>
            </div>

            {/* Micro live sale row */}
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-slate-300 font-mono">REC-0002</span>
                <span className="text-slate-400 text-[10px]">Mobile Money (M-Pesa)</span>
              </div>
              <span className="font-mono font-semibold text-white">KES 340.00</span>
            </div>
          </div>

          {/* Three Compact Feature Highlights */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-3 text-xs text-slate-200">
              <div className="w-5 h-5 rounded-md bg-[#12A878]/15 border border-[#12A878]/30 flex items-center justify-center shrink-0 text-[#12A878]">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold text-white">Complete Sales Management:</span>{' '}
                <span className="text-slate-300">Fast checkout, barcode scan & thermal receipts</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-200">
              <div className="w-5 h-5 rounded-md bg-[#12A878]/15 border border-[#12A878]/30 flex items-center justify-center shrink-0 text-[#12A878]">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold text-white">Intelligent Inventory Control:</span>{' '}
                <span className="text-slate-300">Live deductions, reorder thresholds & audit trail</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-200">
              <div className="w-5 h-5 rounded-md bg-[#12A878]/15 border border-[#12A878]/30 flex items-center justify-center shrink-0 text-[#12A878]">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold text-white">Real-Time Business Insights:</span>{' '}
                <span className="text-slate-300">Automated ledgers, profit margins & analytics</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Quiet Security & Trust Standard */}
        <div className="relative z-10 pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Enterprise 256-Bit SSL Protection</span>
          </div>
          <span>&copy; {new Date().getFullYear()} MAAREE 360</span>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* RIGHT PANEL — AUTHENTICATION WORKSPACE (55% desktop, 100% mobile) */}
      {/* ============================================================ */}
      <main className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 overflow-y-auto">
        {/* Mobile top brand bar */}
        <div className="lg:hidden flex items-center justify-between mb-8 pb-4 border-b border-[#E8ECF1]">
          <Link to="/" className="inline-block focus:outline-none">
            <MaareeLogo variant="full" theme="light" size="sm" />
          </Link>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Retail POS
          </span>
        </div>

        {/* Center container for the authentication form */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-4 sm:py-6 space-y-6">
          {/* Header section */}
          <div className="space-y-2">
            <div className="hidden lg:flex items-center gap-2 mb-3">
              <MaareeLogo variant="symbol" theme="light" size="sm" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Enterprise Workspace
              </span>
            </div>

            {badgeText && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {badgeText}
              </span>
            )}

            <h2 className="text-2xl sm:text-[28px] font-bold text-[#172033] tracking-tight leading-snug m-0">
              {heading}
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed m-0">
              {subheading}
            </p>
          </div>

          {/* Form injection */}
          {children}
        </div>

        {/* Footer legal & help text */}
        <footer className="mt-8 pt-4 border-t border-[#E8ECF1] text-center text-xs text-slate-400 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span>MAAREE 360 Retail Management</span>
          <span>&bull;</span>
          <span className="flex items-center gap-1 text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            SOC-2 Compliant Architecture
          </span>
        </footer>
      </main>
    </div>
  )
}
export default AuthLayout
