import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  pairSerialPrinter,
  triggerCashDrawerViaSerial,
  checkHardwareSupport,
  ScannerEventGuard,
} from '../utils/hardware'
import { playScanSuccessBeep, playScanErrorBeep } from '../utils/audioFeedback'
import {
  Scan,
  Printer,
  DollarSign,
  Smartphone,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Usb,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'

export const HardwareSetupPage: React.FC = () => {
  const { activeBusiness } = useAuth()
  const [hardwareSupport, setHardwareSupport] = useState({ webSerialSupported: false, webUsbSupported: false })

  // Scanner Tester State
  const [scannerTestInput, setScannerTestInput] = useState('')
  const [scannerLogs, setScannerLogs] = useState<
    Array<{ id: string; code: string; timestamp: string; status: 'VALID' | 'BOUNCE_SUPPRESSED' }>
  >([])
  const scannerGuardRef = useRef(new ScannerEventGuard(180))

  // Printer & Drawer State
  const [serialStatus, setSerialStatus] = useState<string | null>(null)
  const [drawerStatus, setDrawerStatus] = useState<string | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)

  useEffect(() => {
    setHardwareSupport(checkHardwareSupport())
  }, [])

  const handleTestScanSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = scannerTestInput.trim()
    if (!clean) return

    const nowStr = new Date().toLocaleTimeString()
    if (!scannerGuardRef.current.shouldProcess(clean)) {
      setScannerLogs((prev) => [
        {
          id: Math.random().toString(),
          code: clean,
          timestamp: nowStr,
          status: 'BOUNCE_SUPPRESSED',
        },
        ...prev.slice(0, 9),
      ])
      return
    }

    playScanSuccessBeep()
    setScannerLogs((prev) => [
      {
        id: Math.random().toString(),
        code: clean,
        timestamp: nowStr,
        status: 'VALID',
      },
      ...prev.slice(0, 9),
    ])
    setScannerTestInput('')
  }

  const handlePairPrinter = async () => {
    setSerialStatus('Requesting device pairing...')
    const res = await pairSerialPrinter()
    setSerialStatus(res.message)
    setTimeout(() => setSerialStatus(null), 6000)
  }

  const handleTestDrawerKick = async () => {
    setDrawerLoading(true)
    setDrawerStatus('Sending ESC/POS pulse...')
    const res = await triggerCashDrawerViaSerial()
    setDrawerStatus(res.message)
    setDrawerLoading(false)
    setTimeout(() => setDrawerStatus(null), 6000)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#142B4A] mb-1">
            <Usb className="w-4 h-4" />
            <span>Retail Peripherals &amp; Payments</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#172033] tracking-tight m-0">
            Hardware &amp; Payment Integrations
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 m-0">
            Configure barcode scanners, thermal receipt printers, electronic cash drawers, and M-Pesa Daraja STK Push for {activeBusiness?.name || 'your store'}.
          </p>
        </div>

        {/* Browser Hardware Capabilities Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
              hardwareSupport.webSerialSupported
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                hardwareSupport.webSerialSupported ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>
              {hardwareSupport.webSerialSupported
                ? 'WebSerial Supported (Chrome/Edge)'
                : 'WebSerial Disabled (Standard Print Available)'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Barcode Scanners */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-3">
            <div className="w-10 h-10 rounded-xl bg-[#142B4A] text-white flex items-center justify-center">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#172033] m-0">
                Commercial Barcode Scanners
              </h2>
              <p className="text-xs text-[#64748B] m-0">
                USB &amp; Bluetooth 1D/2D Scanners (Honeywell, Zebra, Datalogic, Netum)
              </p>
            </div>
          </div>

          <div className="text-xs text-[#172033] space-y-2">
            <p className="m-0">
              MAAREE 360 supports <strong>keyboard-wedge barcode scanners</strong> out of the box. No specialized drivers or software installations are required.
            </p>
            <div className="bg-[#F5F7FA] p-3 rounded-xl border border-[#E2E8F0] space-y-1.5 text-[11px] text-[#64748B]">
              <div className="font-semibold text-[#142B4A]">Recommended Configuration:</div>
              <ul className="list-disc pl-4 space-y-1 m-0">
                <li>Set scanner mode to <strong>Keyboard Emulation (HID)</strong>.</li>
                <li>Enable the <strong>CR (Carriage Return / Enter)</strong> suffix so each scan triggers immediate cart addition.</li>
                <li>Built-in <strong>180ms bounce filter</strong> prevents duplicate entries from accidental trigger double-taps.</li>
              </ul>
            </div>
          </div>

          {/* Interactive Scanner Tester */}
          <div className="border border-[#E2E8F0] rounded-xl p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#172033]">Interactive Scanner Test Field</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={playScanSuccessBeep}
                  className="px-2 py-1 text-[11px] bg-[#F5F7FA] hover:bg-[#E2E8F0] text-[#142B4A] rounded-md font-semibold flex items-center gap-1 transition"
                  title="Test scan beep"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Success Beep</span>
                </button>
                <button
                  type="button"
                  onClick={playScanErrorBeep}
                  className="px-2 py-1 text-[11px] bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md font-semibold flex items-center gap-1 transition"
                  title="Test error beep"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Error Beep</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleTestScanSubmit} className="flex gap-2">
              <input
                type="text"
                value={scannerTestInput}
                onChange={(e) => setScannerTestInput(e.target.value)}
                placeholder="Scan any barcode here to test..."
                className="flex-1 px-3 py-2 text-xs font-mono bg-[#F5F7FA] border border-[#E2E8F0] rounded-xl focus:bg-white focus:outline-none focus:border-[#142B4A]"
              />
              <button
                type="submit"
                disabled={!scannerTestInput.trim()}
                className="px-3.5 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
              >
                Simulate Scan
              </button>
            </form>

            {/* Test Scan Logs */}
            {scannerLogs.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-[#E2E8F0]">
                <span className="text-[10px] font-bold text-[#64748B] uppercase">Scan Test Log</span>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {scannerLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between border ${
                        log.status === 'VALID'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {log.status === 'VALID' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        <span>{log.code}</span>
                      </div>
                      <span className="text-[10px] text-[#64748B]">{log.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Thermal Printers & Cash Drawer */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-3">
            <div className="w-10 h-10 rounded-xl bg-[#142B4A] text-white flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#172033] m-0">
                Thermal Receipt Printers &amp; Cash Drawer
              </h2>
              <p className="text-xs text-[#64748B] m-0">
                ESC/POS 80mm &amp; 58mm Thermal Printers + RJ11 Cash Drawers
              </p>
            </div>
          </div>

          <div className="text-xs text-[#172033] space-y-2">
            <p className="m-0">
              Receipts can be printed directly using the browser print dialogue or sent via the WebSerial API for automated paper cutting and drawer kick.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E2E8F0] space-y-1">
                <span className="font-bold text-xs text-[#142B4A] block">80mm Wide (Standard)</span>
                <span className="text-[11px] text-[#64748B] block">
                  Best for counter POS terminals, supermarkets, full item descriptions, and tax invoices.
                </span>
              </div>
              <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E2E8F0] space-y-1">
                <span className="font-bold text-xs text-[#142B4A] block">58mm Narrow (Compact)</span>
                <span className="text-[11px] text-[#64748B] block">
                  Ideal for mobile Bluetooth thermal printers, compact kiosks, and battery-operated registers.
                </span>
              </div>
            </div>
          </div>

          {/* Serial Pairing & Drawer Trigger */}
          <div className="border border-[#E2E8F0] rounded-xl p-4 bg-white space-y-3">
            <span className="text-xs font-bold text-[#172033] block">
              Direct WebSerial Device Actions
            </span>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePairPrinter}
                disabled={!hardwareSupport.webSerialSupported}
                className="px-3.5 py-2 bg-[#F5F7FA] hover:bg-white text-[#142B4A] text-xs font-bold rounded-xl border border-[#E2E8F0] transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>Pair Serial Receipt Printer</span>
              </button>

              <button
                type="button"
                onClick={handleTestDrawerKick}
                disabled={drawerLoading}
                className="px-3.5 py-2 bg-[#142B4A] hover:bg-[#0E2038] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>{drawerLoading ? 'Sending Pulse...' : 'Test Drawer Kick (ESC/POS)'}</span>
              </button>
            </div>

            {serialStatus && (
              <div className="text-xs p-2.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg text-[#172033]">
                {serialStatus}
              </div>
            )}

            {drawerStatus && (
              <div className="text-xs p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg">
                {drawerStatus}
              </div>
            )}

            <div className="text-[11px] text-[#64748B] space-y-1 border-t border-[#E2E8F0] pt-2">
              <div className="font-semibold text-[#142B4A]">Cash Drawer Wiring Note:</div>
              <div>
                Connect the RJ11/RJ12 cable from your cash drawer to the &quot;DK&quot; (Drawer Kick) port on the back of your receipt printer. Standard ESC/POS pulse command: <code className="bg-[#F5F7FA] px-1 py-0.5 rounded text-[10px] font-mono text-[#142B4A]">ESC p 0 25 250</code>.
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Safaricom Daraja M-Pesa Setup */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#172033] m-0">
                Safaricom Daraja M-Pesa STK Push
              </h2>
              <p className="text-xs text-[#64748B] m-0">
                Instant customer mobile prompt &amp; automated payment reconciliation
              </p>
            </div>
          </div>

          <div className="text-xs text-[#172033] space-y-3">
            <p className="m-0">
              MAAREE 360 connects directly to <strong>Safaricom Daraja API</strong> to dispatch instant STK push prompts (Lipa Na M-Pesa Online).
            </p>

            <div className="bg-[#F5F7FA] p-3.5 rounded-xl border border-[#E2E8F0] space-y-2 text-[11px] text-[#172033]">
              <span className="font-bold text-[#142B4A] block">Server Environment Configuration:</span>
              <p className="text-[#64748B] m-0">
                Configure the following server environment variables in your <code className="bg-white px-1 py-0.5 rounded border border-[#E2E8F0] font-mono text-[#142B4A]">.env</code> file:
              </p>
              <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0] font-mono text-[10px] text-[#172033] space-y-1">
                <div>MPESA_ENV=sandbox # or production</div>
                <div>MPESA_CONSUMER_KEY=your_daraja_consumer_key</div>
                <div>MPESA_CONSUMER_SECRET=your_daraja_consumer_secret</div>
                <div>MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd...</div>
                <div>MPESA_SHORTCODE=174379 # Business Till or Paybill</div>
                <div>MPESA_CALLBACK_URL=https://your-domain.com/api/v1/payments/mpesa/callback</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Webhook Signature &amp; Idempotency Verified</span>
              </div>
              <a
                href="https://developer.safaricom.co.ke"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-[#142B4A] hover:underline flex items-center gap-1"
              >
                <span>Daraja Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Section 4: Card Payments & Split Checkout */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-3">
            <div className="w-10 h-10 rounded-xl bg-[#142B4A] text-white flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#172033] m-0">
                Card Payments &amp; Split Checkout
              </h2>
              <p className="text-xs text-[#64748B] m-0">
                Bank POS Terminals, Payment Intents, and Multi-Tender Sales
              </p>
            </div>
          </div>

          <div className="text-xs text-[#172033] space-y-3">
            <p className="m-0">
              MAAREE 360 supports both standalone bank PDQ card terminals and payment intent workflows.
            </p>

            <div className="bg-[#F5F7FA] p-3.5 rounded-xl border border-[#E2E8F0] space-y-2 text-[11px] text-[#172033]">
              <span className="font-bold text-[#142B4A] block">Supported Checkout Workflows:</span>
              <ul className="list-disc pl-4 space-y-1 text-[#64748B] m-0">
                <li>
                  <strong className="text-[#172033]">Standalone PDQ Terminal:</strong> Process card on bank terminal (e.g. KCB, Equity, Stanbic) and record approval code on the checkout screen.
                </li>
                <li>
                  <strong className="text-[#172033]">Split Tender:</strong> Customers can pay partly with Cash and partly with M-Pesa or Card within a single transaction.
                </li>
                <li>
                  <strong className="text-[#172033]">Atomic Audit Ledger:</strong> Stock is deducted exactly once in an isolated database transaction regardless of payment method count.
                </li>
              </ul>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>PCI-DSS Compliant: Cardholder PAN and CVV data are never stored locally.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HardwareSetupPage
