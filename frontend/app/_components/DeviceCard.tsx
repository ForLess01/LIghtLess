'use client'

import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import { useDeviceStore } from '@/lib/store'
import { sendCommand } from '@/lib/api'
import { useState, useCallback } from 'react'

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
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent"
            />
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

/* ── DeviceCard ─────────────────────────────────────────────────── */
export default function DeviceCard({ deviceId }: { deviceId: string }) {
  const { power, online, rssi, lastUpdate, pendingCommandId, setPending } = useDeviceStore()
  const [error, setError] = useState<string | null>(null)
  const lastSeen = useRelativeTime(lastUpdate)

  const handleToggle = useCallback(async () => {
    if (pendingCommandId) return
    setError(null)
    try {
      const { command_id } = await sendCommand(deviceId, !power)
      setPending(command_id)
    } catch {
      setError('Command failed — check connection')
    }
  }, [deviceId, power, pendingCommandId, setPending])

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

        {/* Toggle */}
        <div className="flex flex-col items-center gap-4">
          <ToggleButton
            power={power}
            online={online}
            pending={!!pendingCommandId}
            onToggle={handleToggle}
          />

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
