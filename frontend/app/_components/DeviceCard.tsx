'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useDeviceStore } from '@/lib/store'
import { sendCommand, sendAICommand } from '@/lib/api'
import { useClapDetection, type ClapPhase } from '@/lib/useClapDetection'
import { useState, useCallback, useRef, useEffect } from 'react'

/* ── RSSI bars ────────────────────────────────────────────────── */
function RSSIBars({ rssi }: { rssi: number | null }) {
  const strength = rssi === null ? 0 : rssi >= -55 ? 4 : rssi >= -65 ? 3 : rssi >= -75 ? 2 : 1
  const heights = [4, 8, 12, 16]

  return (
    <div className="flex items-end gap-[3px]" aria-label={`Signal strength: ${strength}/4 bars`}>
      {heights.map((h, i) => {
        const active = i < strength
        return (
          <motion.div
            key={i}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: i * 0.06, type: 'spring', stiffness: 400, damping: 28 }}
            style={{ height: h, originY: 1 }}
            className={`w-[3px] rounded-full transition-colors duration-500 ${
              active ? 'bg-[var(--color-amber)]' : 'bg-[var(--color-fg-subtle)]'
            }`}
          />
        )
      })}
    </div>
  )
}

/* ── Status badge ──────────────────────────────────────────────── */
function StatusBadge({ online, power }: { online: boolean; power: boolean }) {
  const config = online
    ? power
      ? { label: 'ON', color: 'var(--color-amber)', glow: 'var(--color-amber-glow-strong)', dot: 'bg-[var(--color-amber)]' }
      : { label: 'STANDBY', color: 'var(--color-success)', glow: 'var(--color-success-glow)', dot: 'bg-[var(--color-success)]' }
    : { label: 'OFFLINE', color: 'var(--color-fg-subtle)', glow: 'transparent', dot: 'bg-[var(--color-danger)]' }

  return (
    <motion.div
      layout
      style={{ borderColor: config.color + '33', boxShadow: `0 0 12px ${config.glow}` }}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1"
    >
      <motion.div
        className={`h-1.5 w-1.5 rounded-full ${config.dot}`}
        animate={online ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        key={config.label}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ color: config.color }}
        className="font-mono text-[10px] font-semibold tracking-[0.12em]"
      >
        {config.label}
      </motion.span>
    </motion.div>
  )
}

/* ── Light orb ─────────────────────────────────────────────────── */
function LightOrb({ power, online, pending }: { power: boolean; online: boolean; pending: boolean }) {
  const isOn = online && power

  return (
    <div className="relative flex items-center justify-center">
      {/* Ambient glow layers */}
      <AnimatePresence>
        {isOn && (
          <>
            <motion.div
              key="glow-outer"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute rounded-full"
              style={{
                width: 280,
                height: 280,
                background: 'radial-gradient(circle, rgba(245,185,66,0.15) 0%, transparent 70%)',
                animation: 'ambientPulse 3s ease-in-out infinite',
              }}
            />
            <motion.div
              key="glow-mid"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="absolute rounded-full"
              style={{
                width: 180,
                height: 180,
                background: 'radial-gradient(circle, rgba(245,185,66,0.22) 0%, transparent 70%)',
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Main orb */}
      <motion.div
        animate={{
          scale: pending ? [1, 1.05, 1] : 1,
          boxShadow: isOn
            ? '0 0 60px rgba(245,185,66,0.4), 0 0 100px rgba(245,185,66,0.15), inset 0 1px 0 rgba(255,255,255,0.2)'
            : online
              ? '0 0 20px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)'
              : '0 0 0 rgba(0,0,0,0), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
        transition={
          pending
            ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }
        }
        className="relative flex h-28 w-28 items-center justify-center rounded-full"
        style={{
          background: isOn
            ? 'radial-gradient(circle at 35% 35%, #ffe066, #f5b942 60%, #c97d10)'
            : online
              ? 'radial-gradient(circle at 35% 35%, #2a2a2e, #1a1a1e)'
              : 'radial-gradient(circle at 35% 35%, #1a1a1e, #111115)',
          border: isOn ? '1px solid rgba(245,185,66,0.4)' : '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Bulb icon */}
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <motion.path
            d="M9 18h6M10 21h4M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26C17.81 13.47 19 11.38 19 9c0-3.87-3.13-7-7-7z"
            stroke={isOn ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.25)'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ stroke: isOn ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.25)' }}
            transition={{ duration: 0.3 }}
          />
        </svg>

        {/* Shine spot */}
        {isOn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute left-5 top-4 h-3 w-3 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.7), transparent)' }}
          />
        )}
      </motion.div>
    </div>
  )
}

/* ── Spinner component ────────────────────────────────── */
function Spinner({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      style={{ animationDuration: '0.8s' }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="40 70"
        opacity="0.25"
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="20 90"
        strokeDashoffset="8"
      />
    </svg>
  )
}

/* ── Toggle button ─────────────────────────────────────────────── */
function ToggleButton({
  power,
  online,
  pending,
  onToggle,
}: {
  power: boolean
  online: boolean
  pending: boolean
  onToggle: () => void
}) {
  return (
    <motion.button
      id="device-toggle"
      onClick={onToggle}
      disabled={!online || pending}
      whileTap={{ scale: 0.94 }}
      whileHover={{ scale: online && !pending ? 1.03 : 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="relative overflow-hidden rounded-2xl px-8 py-3.5 text-[15px] font-semibold transition-opacity disabled:opacity-40"
      style={{
        background: power && online
          ? 'linear-gradient(135deg, #f5b942, #e09520)'
          : 'rgba(255,255,255,0.07)',
        color: power && online ? '#000' : 'var(--color-fg)',
        border: power && online
          ? '1px solid rgba(245,185,66,0.5)'
          : '1px solid rgba(255,255,255,0.09)',
        boxShadow: power && online
          ? '0 4px 20px rgba(245,185,66,0.35), inset 0 1px 0 rgba(255,255,255,0.3)'
          : '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
      aria-label={power ? 'Turn off light' : 'Turn on light'}
    >
      {/* Shimmer on hover */}
      <motion.div
        className="absolute inset-0 -translate-x-full"
        animate={power && online ? { translateX: ['−100%', '100%'] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
        }}
      />

      <AnimatePresence mode="wait">
        {pending ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <Spinner size={14} color={power && online ? '#000' : 'var(--color-fg)'} />
            Applying…
          </motion.span>
        ) : (
          <motion.span
            key={power ? 'on' : 'off'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {power ? 'Turn Off' : 'Turn On'}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

/* ── Last seen ─────────────────────────────────────────────────── */
function useRelativeTime(ts: number | null): string {
  if (!ts) return '—'
  const diff = Date.now() - ts
  if (diff < 5_000) return 'just now'
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
}

/* ── Audio level bars (reusable) ─── */
function AudioBars({ level, barCount = 7, active = false, color = 'var(--color-amber)' }: { level: number; barCount?: number; active?: boolean; color?: string }) {
  const heights = Array.from({ length: barCount }, (_, i) => {
    // Center bars taller, edge bars shorter
    const center = barCount / 2
    const dist = Math.abs(i - center) / center
    const baseHeight = 1 - dist * 0.6
    // Add some controlled randomness based on level
    const randomness = Math.sin((i + 1) * 1.7 + Date.now() * 0.003) * 0.3 + 0.7
    return baseHeight * randomness
  })

  return (
    <div className="flex items-center gap-[2px]" style={{ height: 16 }}>
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full"
          animate={{
            height: active ? Math.max(3, h * level * 14) : 3,
            backgroundColor: active ? color : 'rgba(255,255,255,0.15)',
          }}
          transition={{ duration: 0.08, ease: 'easeOut' }}
          style={{ minHeight: 3 }}
        />
      ))}
    </div>
  )
}

/* ── Clap toggle with audio visualization ─── */
function ClapToggle({
  clapEnabled,
  clapPhase,
  listening,
  volume,
  onToggle,
}: {
  clapEnabled: boolean
  clapPhase: ClapPhase
  listening: boolean
  volume: number
  onToggle: () => void
}) {
  // Visual flash effect when clap is confirmed
  const [flashAlpha, setFlashAlpha] = useState(0)
  useEffect(() => {
    if (clapPhase === 'confirmed') {
      setFlashAlpha(1)
      setTimeout(() => setFlashAlpha(0), 600)
    } else if (clapPhase === 'first_hit') {
      setFlashAlpha(0.5)
    }
  }, [clapPhase])

  return (
    <div className="relative">
      {/* Confirmation flash overlay */}
      <AnimatePresence>
        {flashAlpha > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: flashAlpha * 0.15, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{ background: 'var(--color-amber)' }}
          />
        )}
      </AnimatePresence>

      <motion.button
        onClick={onToggle}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
        style={{
          background: clapEnabled
            ? 'rgba(245,185,66,0.12)'
            : 'rgba(255,255,255,0.04)',
          border: `1px solid ${clapEnabled ? 'rgba(245,185,66,0.35)' : 'rgba(255,255,255,0.08)'}`,
          color: clapEnabled ? 'var(--color-amber)' : 'var(--color-fg-subtle)',
          boxShadow: clapEnabled ? '0 0 20px rgba(245,185,66,0.08)' : 'none',
        }}
      >
        {/* Hand icon */}
        <motion.span
          className="text-lg"
          animate={{
            scale: clapPhase === 'confirmed' ? [1, 1.4, 1] : clapPhase === 'first_hit' ? [1, 1.15, 1] : 1,
            rotate: clapPhase === 'confirmed' ? [0, -8, 8, 0] : 0,
          }}
          transition={{ duration: clapPhase === 'confirmed' ? 0.4 : 0.2 }}
        >
          {clapEnabled ? '👏' : '🤚'}
        </motion.span>

        {/* Label */}
        <AnimatePresence mode="wait">
          <motion.span
            key={clapPhase === 'confirmed' ? 'clap!' : clapPhase === 'first_hit' ? '1st...' : clapEnabled ? 'on' : 'off'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {clapPhase === 'confirmed'
              ? '¡Palmada!'
              : clapPhase === 'first_hit'
                ? '1ra palmada...'
                : clapEnabled
                  ? listening ? '' : 'Palmadas ON'
                  : 'Palmadas'}
          </motion.span>
        </AnimatePresence>

        {/* Audio level bars (only visible when enabled) */}
        {clapEnabled && (
          <AudioBars
            level={volume}
            barCount={5}
            active={listening}
            color={clapPhase === 'confirmed' ? 'var(--color-success)' : 'var(--color-amber)'}
          />
        )}
      </motion.button>
    </div>
  )
}

/* ── AI Command Input with voice ────────────────────────────── */
function AIVoicePanel({ deviceId }: { deviceId: string }) {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [micLevel, setMicLevel] = useState(0)
  const recognitionRef = useRef<any>(null)
  const micAnalyserRef = useRef<{ analyser: AnalyserNode; ctx: AudioContext; stream: MediaStream } | null>(null)

  const handleAIText = useCallback(async () => {
    if (!text.trim()) return
    setLoading(true)
    setAiError(null)
    try {
      await sendAICommand(deviceId, text.trim())
      setText('')
    } catch (err: any) {
      setAiError(err.message || 'AI command failed')
    } finally {
      setLoading(false)
    }
  }, [text, deviceId])

  const stopMicMonitoring = useCallback(() => {
    if (micAnalyserRef.current) {
      micAnalyserRef.current.stream.getTracks().forEach((t) => t.stop())
      micAnalyserRef.current.ctx.close()
      micAnalyserRef.current = null
    }
    setMicLevel(0)
  }, [])

  const startMicMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.5
      source.connect(analyser)
      micAnalyserRef.current = { analyser, ctx, stream }

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const update = () => {
        if (!micAnalyserRef.current) return
        micAnalyserRef.current.analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
        const avg = sum / dataArray.length / 255
        setMicLevel(avg)
        requestAnimationFrame(update)
      }
      requestAnimationFrame(update)
    } catch {
      // Silently fail — mic monitoring is optional
    }
  }, [])

  const handleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setAiError('Speech recognition not supported in this browser')
      return
    }

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      stopMicMonitoring()
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'es-ES'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      if (event.results[0].isFinal) {
        setText(transcript)
        setListening(false)
        stopMicMonitoring()
        // Auto-send after voice transcription completes
        if (transcript.trim()) {
          setLoading(true)
          setAiError(null)
          sendAICommand(deviceId, transcript.trim())
            .then(() => setText(''))
            .catch((err: any) => setAiError(err.message || 'AI command failed'))
            .finally(() => setLoading(false))
        }
      } else {
        // Show interim results
        setText(transcript)
      }
    }

    recognition.onerror = () => {
      setListening(false)
      stopMicMonitoring()
      setAiError('Voice recognition error')
    }

    recognition.onend = () => {
      setListening(false)
      stopMicMonitoring()
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
    setAiError(null)
    startMicMonitoring()
  }, [listening, startMicMonitoring, stopMicMonitoring])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMicMonitoring()
    }
  }, [stopMicMonitoring])

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="flex items-center gap-2">
        {/* Text input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={text}
            onChange={(e) => { setText(e.target.value); setAiError(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleAIText() }}
            placeholder='Escribí "enciende", "parpadea", "apaga"...'
            disabled={loading}
            className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-4 py-2.5 pr-10 text-sm outline-none transition-all focus:border-[var(--color-amber)] focus:bg-[rgba(255,255,255,0.06)] focus:shadow-[0_0_0_3px_var(--color-amber-glow)] disabled:opacity-50"
            style={{ color: 'var(--color-fg)' }}
          />
          {/* Clear button */}
          <AnimatePresence>
            {text && !loading && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                onClick={() => { setText(''); setAiError(null) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-40 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-fg)' }}
              >
                ✕
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* AI Submit button */}
        <motion.button
          onClick={handleAIText}
          disabled={loading || !text.trim()}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: loading ? 1 : 1.02 }}
          className="relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            color: '#fff',
          }}
        >
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.span
                key="ai-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5"
              >
                <Spinner size={12} color="#fff" />
                Pensando
              </motion.span>
            ) : (
              <motion.span
                key="ai-send"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Enviar
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Mic button */}
        <motion.button
          onClick={handleVoice}
          whileTap={{ scale: 0.9 }}
          className="relative flex items-center justify-center rounded-xl px-3 py-2.5 transition-all"
          style={{
            background: listening
              ? 'rgba(239,68,68,0.15)'
              : 'rgba(255,255,255,0.04)',
            border: `1px solid ${listening ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: listening ? '0 0 16px rgba(239,68,68,0.12)' : 'none',
          }}
          title={listening ? 'Dejar de escuchar' : 'Usar micrófono'}
        >
          {/* Pulsing ring when listening */}
          {listening && (
            <motion.div
              className="absolute inset-0 rounded-xl"
              animate={{ opacity: [0.4, 0, 0.4], scale: [1, 1.15, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ border: '2px solid rgba(239,68,68,0.3)' }}
            />
          )}
          <AnimatePresence mode="wait">
            {listening ? (
              <motion.div
                key="mic-active"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5"
              >
                {/* Mic waveform bars */}
                <AudioBars
                  level={micLevel}
                  barCount={4}
                  active={true}
                  color="rgba(239,68,68,0.9)"
                />
              </motion.div>
            ) : (
              <motion.span
                key="mic-idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-lg"
              >
                🎤
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Listening indicator */}
      <AnimatePresence>
        {listening && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 overflow-hidden"
          >
            <motion.div
              className="h-2 w-2 rounded-full bg-red-500"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <span className="text-xs" style={{ color: 'var(--color-fg-subtle)' }}>
              Escuchando<VoiceDots />
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {aiError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="rounded-lg px-3 py-2 text-xs"
            style={{
              background: 'rgba(255,69,58,0.08)',
              border: '1px solid rgba(255,69,58,0.2)',
              color: 'var(--color-danger)',
            }}
          >
            {aiError}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Animate dots "..." for "Escuchando..." */
function VoiceDots() {
  const [dots, setDots] = useState(1)
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d % 3) + 1), 400)
    return () => clearInterval(id)
  }, [])
  return <>{'.'.repeat(dots)}</>
}

/* ── DeviceCard ─────────────────────────────────────────────────── */
export default function DeviceCard({ deviceId }: { deviceId: string }) {
  const { power, online, rssi, lastUpdate, pendingCommandId, clapEnabled, setPending, setPower, setClapEnabled } = useDeviceStore()
  const [error, setError] = useState<string | null>(null)
  const lastSeen = useRelativeTime(lastUpdate)

  // Clap detection hook
  const { listening, clapPhase, volume } = useClapDetection(clapEnabled, deviceId, power)

  const handleToggle = useCallback(async () => {
    if (pendingCommandId) return
    setError(null)
    try {
      const { command_id } = await sendCommand(deviceId, !power)
      setPending(command_id)
    } catch {
      setError('Command failed — check connection')
    }
  }, [power, pendingCommandId, deviceId, setPending])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[28px]"
      style={{
        background: 'rgba(13,13,16,0.8)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: online && power
          ? '0 32px 64px rgba(0,0,0,0.6), 0 0 80px rgba(245,185,66,0.12), 0 0 0 1px rgba(245,185,66,0.1)'
          : '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        transition: 'box-shadow 0.6s ease',
      }}
    >
      {/* Top noise/glass texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%)',
        }}
      />

      {/* Ambient light beam from top when on */}
      <AnimatePresence>
        {online && power && (
          <motion.div
            key="beam"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute left-0 right-0 top-0 pointer-events-none"
            style={{
              height: 300,
              background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,185,66,0.08) 0%, transparent 70%)',
            }}
          />
        )}
      </AnimatePresence>

      <div className="relative p-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <motion.p
              className="mb-1 text-xs font-medium tracking-[0.1em] uppercase"
              style={{ color: 'var(--color-fg-subtle)' }}
            >
              Smart Light
            </motion.p>
            <h2
              className="text-2xl font-semibold"
              style={{ letterSpacing: '-0.03em', color: 'var(--color-fg)' }}
            >
              {deviceId.replace(/-/g, ' ')}
            </h2>
          </div>

          <div className="flex flex-col items-end gap-2">
            <StatusBadge online={online} power={power} />
            {rssi !== null && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px]" style={{ color: 'var(--color-fg-subtle)' }}>
                  {rssi} dBm
                </span>
                <RSSIBars rssi={rssi} />
              </div>
            )}
          </div>
        </div>

        {/* Orb */}
        <div className="mb-8 flex justify-center">
          <LightOrb power={power} online={online} pending={!!pendingCommandId} />
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-4">
          <ToggleButton
            power={power}
            online={online}
            pending={!!pendingCommandId}
            onToggle={handleToggle}
          />

          {/* Clap detection toggle */}
          <ClapToggle
            clapEnabled={clapEnabled}
            clapPhase={clapPhase}
            listening={listening}
            volume={volume}
            onToggle={() => setClapEnabled(!clapEnabled)}
          />

          {/* AI / Voice panel */}
          <AIVoicePanel deviceId={deviceId} />

          {/* Last seen */}
          <AnimatePresence mode="wait">
            {error ? (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs"
                style={{ color: 'var(--color-danger)' }}
              >
                {error}
              </motion.p>
            ) : (
              <motion.p
                key="lastseen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs"
                style={{ color: 'var(--color-fg-subtle)' }}
              >
                Last update: {lastSeen}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom divider */}
        <div
          className="mt-8 border-t pt-6"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <dl className="flex justify-between">
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--color-fg-subtle)' }}>
                Device ID
              </dt>
              <dd className="mt-0.5 font-mono text-sm" style={{ color: 'var(--color-fg-muted)' }}>
                {deviceId}
              </dd>
            </div>
            <div className="text-right">
              <dt className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--color-fg-subtle)' }}>
                Protocol
              </dt>
              <dd className="mt-0.5 font-mono text-sm" style={{ color: 'var(--color-fg-muted)' }}>
                MQTT / WS
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </motion.div>
  )
}