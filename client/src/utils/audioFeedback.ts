/**
 * Web Audio API scanner sound feedback.
 * Provides supermarket-style audio chimes for USB and camera barcode scans.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/**
 * Supermarket POS success beep: Crisp 1760Hz tone (70ms) with clean envelope.
 */
export function playScanSuccessBeep(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(1760, ctx.currentTime) // A6 crisp retail scan tone

    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.08)
  } catch (err) {
    // Graceful fallback if audio is blocked by browser policy
  }
}

/**
 * Supermarket POS error beep: Double low buzz (330Hz) for unrecognized code or out-of-stock item.
 */
export function playScanErrorBeep(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // First low tone
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(320, now)
    gain1.gain.setValueAtTime(0.2, now)
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.09)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.09)

    // Second low tone
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(260, now + 0.11)
    gain2.gain.setValueAtTime(0.2, now + 0.11)
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.22)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.11)
    osc2.stop(now + 0.22)
  } catch (err) {
    // Graceful fallback
  }
}
