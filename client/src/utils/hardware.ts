/**
 * SmartStock Retail Hardware Utilities.
 * Supports ESC/POS receipt formatting, cash drawer triggering, and keyboard-wedge scanner event filtering.
 */

export interface HardwareStatus {
  webSerialSupported: boolean
  webUsbSupported: boolean
}

export function checkHardwareSupport(): HardwareStatus {
  return {
    webSerialSupported: typeof navigator !== 'undefined' && 'serial' in navigator,
    webUsbSupported: typeof navigator !== 'undefined' && 'usb' in navigator,
  }
}

/**
 * Standard ESC/POS pulse command to open a cash drawer connected via RJ11/RJ12 to the receipt printer.
 * Command: ESC p m t1 t2
 * m = 0 (Pin 2), t1 = 25 (50ms pulse ON), t2 = 250 (500ms pulse OFF)
 */
export const ESC_POS_DRAWER_KICK = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA])

/**
 * Standard ESC/POS paper cut command.
 * Command: GS V 66 0
 */
export const ESC_POS_PAPER_CUT = new Uint8Array([0x1D, 0x56, 0x42, 0x00])

/**
 * Sends a cash drawer kick pulse to a paired WebSerial receipt printer.
 */
export async function triggerCashDrawerViaSerial(): Promise<{ success: boolean; message: string }> {
  if (typeof navigator === 'undefined' || !('serial' in navigator)) {
    return {
      success: false,
      message: 'Web Serial API is not supported in this browser. Configure your printer driver to auto-kick drawer on print.',
    }
  }

  try {
    const nav = navigator as any
    const ports = await nav.serial.getPorts()
    if (ports.length === 0) {
      return {
        success: false,
        message: 'No paired USB/Serial printer found. Configure cash drawer in printer driver or pair via WebSerial in Hardware Setup.',
      }
    }

    const port = ports[0]
    await port.open({ baudRate: 9600 })
    const writer = port.writable.getWriter()
    await writer.write(ESC_POS_DRAWER_KICK)
    writer.releaseLock()
    await port.close()

    return {
      success: true,
      message: 'Cash drawer trigger pulse dispatched via WebSerial.',
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Error transmitting cash drawer kick command.',
    }
  }
}

/**
 * Requests the user to select and pair a WebSerial receipt printer.
 */
export async function pairSerialPrinter(): Promise<{ success: boolean; message: string; port?: any }> {
  if (typeof navigator === 'undefined' || !('serial' in navigator)) {
    return {
      success: false,
      message: 'Web Serial API is not supported in this browser. Please use Google Chrome or Microsoft Edge.',
    }
  }

  try {
    const nav = navigator as any
    const port = await nav.serial.requestPort()
    return {
      success: true,
      message: 'Serial device selected and paired successfully.',
      port,
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Device selection cancelled.',
    }
  }
}

/**
 * Scanner event guard to distinguish between:
 * 1. Accidental hardware double-events / bounces (< 150ms): Suppressed to prevent duplicate item insertion.
 * 2. Intentional consecutive scans (> 200ms): Allowed to increment item quantity in POS.
 */
export class ScannerEventGuard {
  private lastCode: string = ''
  private lastTimestamp: number = 0
  private debounceWindowMs: number

  constructor(debounceWindowMs: number = 180) {
    this.debounceWindowMs = debounceWindowMs
  }

  /**
   * Returns true if the scan event should be accepted, or false if it is a duplicate bounce.
   */
  shouldProcess(code: string): boolean {
    const clean = code.trim()
    const now = Date.now()
    const timeSinceLast = now - this.lastTimestamp

    if (clean === this.lastCode && timeSinceLast < this.debounceWindowMs) {
      // Suppress duplicate bounce
      return false
    }

    this.lastCode = clean
    this.lastTimestamp = now
    return true
  }

  reset(): void {
    this.lastCode = ''
    this.lastTimestamp = 0
  }
}
