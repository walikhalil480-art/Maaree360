import React, { useState, useEffect, useRef, useCallback, useId } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import {
  Camera,
  CameraOff,
  AlertTriangle,
  RefreshCw,
  Zap,
  ZapOff,
  Info,
  CheckCircle,
} from 'lucide-react'
import { Button } from '../ui/Button'

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void
  isProcessing?: boolean
  className?: string
}

type ScannerStatus =
  | 'idle'
  | 'starting'
  | 'scanning'
  | 'permission_denied'
  | 'no_camera'
  | 'unsupported'
  | 'error'

interface DiagnosticsData {
  cameraLabel?: string
  resolution?: string
  viewportSize?: string
  facingMode?: string
  torchSupported?: boolean
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  isProcessing = false,
  className = '',
}) => {
  const [status, setStatus] = useState<ScannerStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [torchSupported, setTorchSupported] = useState<boolean>(false)
  const [torchOn, setTorchOn] = useState<boolean>(false)
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false)
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null)

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isStartingRef = useRef<boolean>(false)
  const isStoppingRef = useRef<boolean>(false)
  const lastScannedRef = useRef<{ text: string; time: number } | null>(null)

  // Stable unique DOM container ID for html5-qrcode
  const rawId = useId()
  const containerId = useRef(`tillpro-scanner-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`).current

  // Filter out IR and virtual cameras (e.g. Windows Hello IR camera, OBS Virtual Camera)
  const filterValidCameras = (devices: { id: string; label: string }[]) => {
    const isIrOrVirtual = (label: string) => {
      const lower = label.toLowerCase()
      return (
        lower.includes('ir ') ||
        lower.includes('infrared') ||
        lower.includes('virtual') ||
        lower.includes('obs') ||
        lower.includes('windows hello')
      )
    }

    const regular = devices.filter((d) => !isIrOrVirtual(d.label))
    return regular.length > 0 ? regular : devices
  }

  // Safely stop any running camera stream and clear the viewfinder
  const stopScanner = useCallback(async () => {
    if (isStoppingRef.current) return
    isStoppingRef.current = true

    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          if (import.meta.env.DEV) {
            console.log('[TillPro Scanner] Stopping active scan...')
          }
          await scannerRef.current.stop()
        }
        scannerRef.current.clear()
      } catch (err) {
        console.warn('[TillPro Scanner] Error while stopping scanner:', err)
      } finally {
        scannerRef.current = null
      }
    }

    setTorchOn(false)
    setTorchSupported(false)
    setStatus('idle')
    isStoppingRef.current = false
  }, [])

  // Cleanup camera streams when component unmounts
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {})
          }
          scannerRef.current.clear()
        } catch {
          // ignore cleanup errors on unmount
        }
      }
    }
  }, [])

  // Start Camera function with robust fallback and viewport inspection
  const startScanner = async (requestedCameraId?: string) => {
    if (isStartingRef.current || isStoppingRef.current) return
    isStartingRef.current = true

    setStatus('starting')
    setErrorMessage(null)
    setDiagnostics(null)

    // Check secure context requirement (HTTPS or localhost)
    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1'

    if (window.isSecureContext === false && !isLocal) {
      setStatus('unsupported')
      setErrorMessage(
        'Camera access requires a secure context (HTTPS) or localhost. Please open TillPro over HTTPS.'
      )
      isStartingRef.current = false
      return
    }

    // Ensure navigator.mediaDevices is present
    if (!navigator?.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      setErrorMessage(
        'Your browser does not support mediaDevices.getUserMedia. Please use a modern browser or manual code entry.'
      )
      isStartingRef.current = false
      return
    }

    try {
      // 1. If an existing scanner is active, stop it cleanly first
      if (scannerRef.current) {
        await stopScanner()
      }

      // 2. Discover available cameras (deprioritizing IR/OBS virtual cameras)
      let cameras: { id: string; label: string }[] = []
      try {
        const devices = await Html5Qrcode.getCameras()
        if (devices && devices.length > 0) {
          const mapped = devices.map((d, index) => ({
            id: d.id,
            label: d.label || `Camera ${index + 1}`,
          }))
          cameras = filterValidCameras(mapped)
          setAvailableCameras(cameras)
        }
      } catch (camErr) {
        if (import.meta.env.DEV) {
          console.warn('[TillPro Scanner] Could not pre-enumerate cameras:', camErr)
        }
      }

      // 3. Ensure the container element is ready in the DOM with non-zero dimensions
      const containerEl = document.getElementById(containerId)
      if (!containerEl) {
        throw new Error(`Viewport container element #${containerId} not found in DOM`)
      }

      if (import.meta.env.DEV) {
        console.log('[TillPro Scanner] Viewport client dimensions:', {
          width: containerEl.clientWidth,
          height: containerEl.clientHeight,
        })
      }

      // 4. Initialize Html5Qrcode with supported retail barcode & QR formats
      const html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
        ],
        verbose: false,
        useBarCodeDetectorIfSupported: true,
      })
      scannerRef.current = html5QrCode

      // 5. Responsive qrbox sizing callback (never overflows viewfinder)
      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const width = Math.min(Math.floor(viewfinderWidth * 0.8), 340)
          const height = Math.min(Math.floor(viewfinderHeight * 0.65), 240)
          return {
            width: Math.max(width, 180),
            height: Math.max(height, 120),
          }
        },
        aspectRatio: 1.333333,
      }

      const onScanSuccess = (decodedText: string) => {
        const now = Date.now()
        // Throttle identical scans within 2.5 seconds to avoid accidental rapid triggers
        if (
          lastScannedRef.current &&
          lastScannedRef.current.text === decodedText &&
          now - lastScannedRef.current.time < 2500
        ) {
          return
        }

        lastScannedRef.current = { text: decodedText, time: now }
        if (import.meta.env.DEV) {
          console.log('[TillPro Scanner] Successfully decoded:', decodedText)
        }
        onScan(decodedText)
      }

      const onScanFailure = () => {
        // Ignored: frame did not contain a recognized barcode
      }

      // 6. Camera selection with automatic desktop/mobile fallback
      // Priority:
      // a) Explicit camera ID if requested by user
      // b) Default { facingMode: 'environment' } (back camera on mobile)
      // c) Fallback to specific non-IR device ID or { facingMode: 'user' } if environment fails
      let cameraTarget: any
      if (requestedCameraId) {
        cameraTarget = requestedCameraId
      } else if (cameras.length === 1) {
        cameraTarget = cameras[0].id
      } else {
        cameraTarget = { facingMode: 'environment' }
      }

      try {
        if (import.meta.env.DEV) {
          console.log('[TillPro Scanner] Starting with target:', cameraTarget)
        }
        await html5QrCode.start(cameraTarget, config, onScanSuccess, onScanFailure)
      } catch (startErr: any) {
        const errMsg = String(startErr?.message || startErr)
        if (
          (errMsg.includes('OverconstrainedError') ||
            errMsg.includes('Constraints') ||
            errMsg.includes('NotFoundError')) &&
          cameraTarget !== undefined &&
          typeof cameraTarget === 'object' &&
          cameraTarget.facingMode === 'environment'
        ) {
          // Environment camera not supported (e.g. desktop webcam without environment mode). Fall back!
          if (import.meta.env.DEV) {
            console.warn(
              '[TillPro Scanner] facingMode: environment failed, falling back to user/default camera...',
              errMsg
            )
          }
          const fallbackTarget = cameras.length > 0 ? cameras[0].id : { facingMode: 'user' }
          await html5QrCode.start(fallbackTarget, config, onScanSuccess, onScanFailure)
        } else {
          throw startErr
        }
      }

      // 7. Verify video element state and ensure playback
      const videoEl = containerEl.querySelector('video') as HTMLVideoElement | null
      if (videoEl) {
        videoEl.playsInline = true
        videoEl.autoplay = true
        videoEl.muted = true
        videoEl.setAttribute('playsinline', 'true')
        videoEl.setAttribute('autoplay', 'true')
        videoEl.setAttribute('muted', 'true')

        if (videoEl.paused) {
          await videoEl.play().catch((playErr) => {
            console.warn('[TillPro Scanner] video.play() deferred:', playErr)
          })
        }
      }

      // 8. Refresh camera list with resolved labels now that permissions are granted
      try {
        const freshDevices = await Html5Qrcode.getCameras()
        if (freshDevices && freshDevices.length > 0) {
          const freshMapped = freshDevices.map((d, index) => ({
            id: d.id,
            label: d.label || `Camera ${index + 1}`,
          }))
          const filtered = filterValidCameras(freshMapped)
          setAvailableCameras(filtered)
        }
      } catch {
        // ignore device re-enumeration issues
      }

      // 9. Inspect capabilities (torch, track settings) for diagnostics and controls
      let activeTrackLabel = ''
      let activeResolution = ''
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities() as any
        const settings = html5QrCode.getRunningTrackSettings() as any

        if (capabilities?.torch) {
          setTorchSupported(true)
        }

        activeTrackLabel = settings?.deviceId || 'Active Webcam'
        if (videoEl) {
          activeResolution = `${videoEl.videoWidth} x ${videoEl.videoHeight}px`
        }

        setDiagnostics({
          cameraLabel: activeTrackLabel,
          resolution: activeResolution,
          viewportSize: `${containerEl.clientWidth} x ${containerEl.clientHeight}px`,
          facingMode: settings?.facingMode || (requestedCameraId ? 'device-id' : 'environment'),
          torchSupported: !!capabilities?.torch,
        })
      } catch {
        // capabilities check not critical
      }

      if (import.meta.env.DEV) {
        console.log('[TillPro Scanner] Active camera started successfully:', {
          label: activeTrackLabel,
          resolution: activeResolution,
        })
      }

      setStatus('scanning')
    } catch (err: any) {
      console.error('[TillPro Scanner] Start error:', err)
      const errStr = String(err?.message || err)

      if (
        errStr.includes('NotAllowedError') ||
        errStr.includes('Permission') ||
        errStr.includes('denied')
      ) {
        setStatus('permission_denied')
        setErrorMessage(
          'Camera access was denied. Please allow camera permissions in your browser address bar and retry, or use manual code lookup.'
        )
      } else if (
        errStr.includes('NotFoundError') ||
        errStr.includes('DevicesNotFoundError') ||
        errStr.includes('No device')
      ) {
        setStatus('no_camera')
        setErrorMessage(
          'No compatible camera was detected on this device. You can type barcodes or QR codes manually below.'
        )
      } else if (errStr.includes('NotReadableError') || errStr.includes('TrackStartError')) {
        setStatus('error')
        setErrorMessage(
          'The camera is currently in use by another application or locked by your operating system. Please close other camera apps and retry.'
        )
      } else {
        setStatus('error')
        setErrorMessage(
          'Could not start camera preview. Please check browser permissions or use manual code lookup.'
        )
      }
    } finally {
      isStartingRef.current = false
    }
  }

  // Toggle flashlight / torch if supported
  const toggleTorch = async () => {
    if (!scannerRef.current || !torchSupported) return
    try {
      const nextState = !torchOn
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as any],
      })
      setTorchOn(nextState)
    } catch (err) {
      console.warn('[TillPro Scanner] Failed to toggle torch:', err)
    }
  }

  // Handle switching cameras via dropdown
  const handleCameraChange = async (newCameraId: string) => {
    setSelectedCameraId(newCameraId)
    if (status === 'scanning' || status === 'starting') {
      await stopScanner()
      await startScanner(newCameraId)
    }
  }

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all ${className}`}
    >
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              status === 'scanning'
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 m-0">Live Camera Scanner</h3>
              {status === 'scanning' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Live Preview
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 m-0">
              {status === 'scanning'
                ? 'Align barcode or QR code steadily within the green targeting frame'
                : 'Supports EAN-13, UPC-A, Code 128, Code 39, and TillPro QR codes'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {torchSupported && status === 'scanning' && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTorch}
              className={`text-xs ${
                torchOn ? 'bg-amber-50 text-amber-600 border-amber-300' : 'text-slate-600'
              }`}
              title={torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
            >
              {torchOn ? <ZapOff className="w-4 h-4 mr-1" /> : <Zap className="w-4 h-4 mr-1" />}
              {torchOn ? 'Flash Off' : 'Flash'}
            </Button>
          )}

          {status === 'scanning' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={stopScanner}
              className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
            >
              <CameraOff className="w-4 h-4 mr-1.5" /> Stop Camera
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => startScanner(selectedCameraId)}
              isLoading={status === 'starting'}
              className="text-xs"
            >
              <Camera className="w-4 h-4 mr-1.5" /> Start Camera
            </Button>
          )}
        </div>
      </div>

      {/* Camera Selection Dropdown (when multiple cameras are present) */}
      {availableCameras.length > 1 && (
        <div className="pt-3 pb-1 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Camera Source:</span>
            <select
              value={selectedCameraId}
              onChange={(e) => handleCameraChange(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white py-1 px-2.5 text-xs text-slate-700 shadow-2xs focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Default (Rear / Primary Camera)</option>
              {availableCameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {import.meta.env.DEV && diagnostics && (
            <button
              type="button"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              <Info className="w-3.5 h-3.5" />
              {showDiagnostics ? 'Hide Diagnostics' : 'Diagnostics'}
            </button>
          )}
        </div>
      )}

      {/* Development Diagnostic Information Banner */}
      {import.meta.env.DEV && showDiagnostics && diagnostics && (
        <div className="my-2 p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-600 space-y-1">
          <div className="font-semibold text-slate-800">Scanner Diagnostics:</div>
          <div className="grid grid-cols-2 gap-1">
            <div>Resolution: {diagnostics.resolution || 'N/A'}</div>
            <div>Viewport: {diagnostics.viewportSize || 'N/A'}</div>
            <div>Facing: {diagnostics.facingMode || 'N/A'}</div>
            <div>Torch: {diagnostics.torchSupported ? 'Supported' : 'No'}</div>
          </div>
        </div>
      )}

      {/* Main Viewport Container */}
      <div className="tillpro-camera-container mt-4 min-h-[300px] sm:min-h-[340px]">
        {/* html5-qrcode mounts <video> inside this element */}
        <div id={containerId} className="tillpro-camera-viewport w-full h-full" />

        {/* Viewfinder Overlay Frame (rendered above video during active scanning) */}
        {status === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4 z-20">
            {/* Center target rectangle with laser scanline */}
            <div className="relative w-64 h-48 sm:w-72 sm:h-52 border-2 border-emerald-400/90 rounded-2xl shadow-sm">
              {/* Corner targeting brackets */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

              {/* Animated laser guide bar */}
              <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-pulse mt-24" />
            </div>

            {/* Status Feedback Badge */}
            <div className="mt-4 text-center z-10">
              <span className="inline-flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-xs text-white text-xs px-3.5 py-1.5 rounded-full font-medium border border-slate-700/60 shadow-lg">
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    Resolving scanned code...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    Hold code steady inside frame
                  </>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Idle State Prompt Overlay */}
        {status === 'idle' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950/95">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-700 shadow-inner">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white m-0">Camera is ready</p>
              <p className="text-xs text-slate-400 mt-1.5 max-w-xs m-0 mx-auto leading-relaxed">
                Click &quot;Start Camera&quot; to scan manufacturer retail barcodes (EAN/UPC) or
                TillPro shelf QR codes.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => startScanner(selectedCameraId)}
              className="mt-2 text-xs"
            >
              <Camera className="w-4 h-4 mr-1.5" /> Start Camera
            </Button>
          </div>
        )}

        {/* Starting / Requesting State Overlay */}
        {status === 'starting' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950/90 backdrop-blur-2xs">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
            <div>
              <p className="text-sm font-medium text-white m-0">Connecting to camera...</p>
              <p className="text-xs text-slate-400 mt-1 m-0">
                Please grant camera permission if prompted by your browser
              </p>
            </div>
          </div>
        )}

        {/* Permission Denied / Error State Overlay */}
        {(status === 'permission_denied' ||
          status === 'no_camera' ||
          status === 'unsupported' ||
          status === 'error') && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center space-y-3 max-w-md mx-auto bg-slate-950/95">
            <div className="mx-auto w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/40">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white m-0">
                {status === 'permission_denied'
                  ? 'Camera Permission Required'
                  : status === 'no_camera'
                  ? 'No Camera Found'
                  : status === 'unsupported'
                  ? 'Unsupported Environment'
                  : 'Camera Connection Notice'}
              </p>
              <p className="text-xs text-slate-300 mt-1.5 m-0 leading-relaxed max-w-sm">
                {errorMessage}
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => startScanner(selectedCameraId)}
                className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry Camera
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Safety & Protocol Footer Notice */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
        <span>Format support: EAN-13, UPC-A, Code 128, Code 39, QR</span>
        <span>Local client-side decoding (zero image upload)</span>
      </div>
    </div>
  )
}
