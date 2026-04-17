'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { fetchEvents } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { useDeviceStore } from '@/lib/store'
import { useWebSocket } from '@/lib/useWebSocket'
import { isDemoMode, generateMockEvents, DEMO_DEVICE_STATE, exitDemoMode } from '@/lib/demo'
import DeviceCard from '../_components/DeviceCard'
import EventFeed from '../_components/EventFeed'

const DEVICE_ID = process.env.NEXT_PUBLIC_DEVICE_ID ?? 'foco-sala'

/* ── Connection pill ─── */
function ConnectionPill({ status }: { status: 'connecting' | 'open' | 'closed' }) {
  const cfg = {
    connecting: { label: 'Connecting…', dot: 'bg-yellow-400', color: 'rgba(250,204,21,0.8)' },
    open: { label: 'Live', dot: 'bg-[var(--color-success)]', color: 'var(--color-success)' },
    closed: { label: 'Reconnecting…', dot: 'bg-[var(--color-danger)]', color: 'var(--color-danger)' },
  }[status]

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--color-border)',
      }}
    >
      <motion.div
        className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="font-mono text-[10px]" style={{ color: cfg.color }}>
        {cfg.label}
      </span>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [demo, setDemo] = useState(false)
  const wsStatus = useWebSocket()
  const hydrateFromHistory = useDeviceStore((s) => s.hydrateFromHistory)
  const { setPower, setOnline, setRSSI, setLastUpdate } = useDeviceStore()

  useEffect(() => {
    /**
     * TODO: Remove demo mode branch when backend is deployed.
     */
    if (isDemoMode()) {
      setDemo(true)
      // Seed store with mock data
      setPower(DEMO_DEVICE_STATE.power)
      setOnline(DEMO_DEVICE_STATE.online)
      setRSSI(DEMO_DEVICE_STATE.rssi)
      setLastUpdate(DEMO_DEVICE_STATE.lastUpdate)
      hydrateFromHistory(generateMockEvents(20))
      return
    }

    if (!getToken()) {
      router.replace('/login')
      return
    }

    fetchEvents(DEVICE_ID, 30)
      .then(hydrateFromHistory)
      .catch(() => router.replace('/login'))
  }, [hydrateFromHistory, router, setPower, setOnline, setRSSI, setLastUpdate])

  const handleExitDemo = () => {
    exitDemoMode()
    router.replace('/login')
  }

  return (
    <div className="min-h-full px-6 py-8 lg:px-10 lg:py-10 xl:px-16">
      {/* TODO: Remove demo banner when backend is deployed */}
      {demo && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between rounded-2xl px-5 py-3"
          style={{
            background: 'rgba(245,185,66,0.08)',
            border: '1px solid rgba(245,185,66,0.2)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">🎭</span>
            <span className="text-[13px] font-medium" style={{ color: 'var(--color-amber)' }}>
              Demo Mode
            </span>
            <span className="text-[12px]" style={{ color: 'var(--color-fg-subtle)' }}>
              — Simulated data · No backend connected
            </span>
          </div>
          <button
            onClick={handleExitDemo}
            className="rounded-lg px-3 py-1 text-[11px] font-medium transition-colors hover:bg-white/5"
            style={{ color: 'var(--color-fg-subtle)', border: '1px solid var(--color-border)' }}
          >
            Exit
          </button>
        </motion.div>
      )}

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="mb-10 flex items-center justify-between"
      >
        <div>
          <h1
            className="text-3xl font-semibold"
            style={{ letterSpacing: '-0.04em', color: 'var(--color-fg)' }}
          >
            Dashboard
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-fg-subtle)' }}>
            {demo ? 'Exploring with simulated data' : 'Real-time device control'}
          </p>
        </div>
        {!demo && <ConnectionPill status={wsStatus} />}
        {demo && (
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ background: 'rgba(245,185,66,0.08)', border: '1px solid rgba(245,185,66,0.2)' }}
          >
            <span className="font-mono text-[10px]" style={{ color: 'var(--color-amber)' }}>DEMO</span>
          </div>
        )}
      </motion.div>

      {/* Layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
        {/* Left: Device Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-start justify-center lg:justify-start"
        >
          <div className="w-full max-w-md">
            <DeviceCard deviceId={DEVICE_ID} />
          </div>
        </motion.div>

        {/* Right: Event feed */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-4"
        >
          <StatsRow />
          <EventFeed />
        </motion.div>
      </div>
    </div>
  )
}

/* ── Quick stats ─── */
function StatsRow() {
  const { online, power, rssi, events } = useDeviceStore()

  const stats = [
    {
      label: 'Status',
      value: !online ? 'Offline' : power ? 'On' : 'Standby',
      color: !online ? 'var(--color-fg-subtle)' : power ? 'var(--color-amber)' : 'var(--color-success)',
    },
    {
      label: 'Signal',
      value: rssi !== null ? `${rssi} dBm` : '—',
      color: rssi !== null && rssi >= -65 ? 'var(--color-success)' : 'var(--color-fg-muted)',
    },
    {
      label: 'Events',
      value: events.length.toString(),
      color: 'var(--color-fg)',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 + i * 0.06 }}
          className="rounded-2xl px-4 py-3"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--color-fg-subtle)' }}>
            {s.label}
          </p>
          <motion.p
            key={s.value}
            initial={{ opacity: 0.5, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 text-base font-semibold"
            style={{ color: s.color, letterSpacing: '-0.02em' }}
          >
            {s.value}
          </motion.p>
        </motion.div>
      ))}
    </div>
  )
}
