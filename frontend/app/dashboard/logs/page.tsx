'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchEvents } from '@/lib/api'
import { getToken } from '@/lib/auth'
import type { DeviceEvent } from '@/lib/api'

const DEVICE_ID = process.env.NEXT_PUBLIC_DEVICE_ID ?? 'foco-sala'
const LIMIT = 50

/* ── Event type config ─── */
const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  state_changed: {
    label: 'STATE',
    color: 'var(--color-amber)',
    bg: 'rgba(245,185,66,0.08)',
  },
  command_sent: {
    label: 'COMMAND',
    color: 'rgba(255,255,255,0.5)',
    bg: 'rgba(255,255,255,0.04)',
  },
  device_online: {
    label: 'ONLINE',
    color: 'var(--color-success)',
    bg: 'rgba(48,209,88,0.08)',
  },
  device_offline: {
    label: 'OFFLINE',
    color: 'var(--color-danger)',
    bg: 'rgba(255,69,58,0.08)',
  },
  telemetry: {
    label: 'TELEMETRY',
    color: 'rgb(96,165,250)',
    bg: 'rgba(96,165,250,0.08)',
  },
}

function formatPayload(payload: string): string {
  try {
    return JSON.stringify(JSON.parse(payload), null, 0)
      .replace(/[{}"]/g, '')
      .replace(/,/g, ' · ')
      .slice(0, 80)
  } catch {
    return payload.slice(0, 80)
  }
}

function formatDate(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
  }
}

/* ── Row ─── */
function EventRow({ event, index }: { event: DeviceEvent; index: number }) {
  const cfg = TYPE_CONFIG[event.event_type] ?? TYPE_CONFIG.command_sent
  const { date, time } = formatDate(event.created_at)

  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02, duration: 0.25 }}
      className="group"
    >
      {/* Timestamp */}
      <td
        className="whitespace-nowrap py-3 pl-5 pr-4 font-mono text-[11px]"
        style={{ color: 'var(--color-fg-subtle)', width: 160 }}
      >
        <span style={{ color: 'var(--color-fg-muted)' }}>{time}</span>
        <span className="ml-1.5" style={{ color: 'var(--color-fg-subtle)', fontSize: 10 }}>
          {date}
        </span>
      </td>

      {/* Type badge */}
      <td className="py-3 pr-4" style={{ width: 120 }}>
        <span
          className="inline-block rounded-lg px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.06em]"
          style={{ color: cfg.color, background: cfg.bg }}
        >
          {cfg.label}
        </span>
      </td>

      {/* Device */}
      <td
        className="py-3 pr-4 font-mono text-[11px]"
        style={{ color: 'var(--color-fg-subtle)', width: 120 }}
      >
        {event.device_id}
      </td>

      {/* Payload */}
      <td
        className="py-3 pr-5 font-mono text-[11px]"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        {formatPayload(event.payload)}
      </td>
    </motion.tr>
  )
}

/* ── Logs page ─── */
export default function LogsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<DeviceEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await fetchEvents(DEVICE_ID, LIMIT)
      setEvents(data)
      setLastRefresh(new Date())
      setError(null)
    } catch {
      setError('Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    load()
    const interval = setInterval(load, 10_000)
    return () => clearInterval(interval)
  }, [load, router])

  return (
    <div className="min-h-full px-6 py-8 lg:px-10 lg:py-10 xl:px-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-end justify-between"
      >
        <div>
          <h1
            className="text-3xl font-semibold"
            style={{ letterSpacing: '-0.04em' }}
          >
            Event Logs
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-fg-subtle)' }}>
            Last {LIMIT} events · auto-refreshes every 10s
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="font-mono text-[11px]" style={{ color: 'var(--color-fg-subtle)' }}>
              Updated {lastRefresh.toLocaleTimeString('en-US', { hour12: false })}
            </span>
          )}
          <motion.button
            id="refresh-logs-btn"
            onClick={load}
            disabled={loading}
            whileTap={{ scale: 0.94 }}
            whileHover={{ background: 'rgba(255,255,255,0.1)' }}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-fg)',
            }}
          >
            <motion.svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={loading ? { rotate: 360 } : { rotate: 0 }}
              transition={loading ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
            >
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </motion.svg>
            Refresh
          </motion.button>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="overflow-hidden rounded-2xl"
        style={{
          background: 'rgba(13,13,16,0.7)',
          border: '1px solid var(--color-border)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* Table header */}
        <div
          className="border-b"
          style={{ borderColor: 'var(--color-border)', background: 'rgba(255,255,255,0.02)' }}
        >
          <table className="w-full table-fixed">
            <thead>
              <tr>
                {['Timestamp', 'Type', 'Device', 'Payload'].map((h) => (
                  <th
                    key={h}
                    className="py-3 pl-5 pr-4 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.1em]"
                    style={{ color: 'var(--color-fg-subtle)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>

        {/* Body */}
        <AnimatePresence mode="wait">
          {loading && events.length === 0 ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-20"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="h-6 w-6 rounded-full border-2 border-[var(--color-border-strong)] border-t-[var(--color-amber)]"
              />
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center text-sm"
              style={{ color: 'var(--color-danger)' }}
            >
              {error}
            </motion.div>
          ) : events.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center text-sm"
              style={{ color: 'var(--color-fg-subtle)' }}
            >
              No events yet — trigger some actions from the dashboard
            </motion.div>
          ) : (
            <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <table className="w-full table-fixed">
                <colgroup>
                  <col style={{ width: 160 }} />
                  <col style={{ width: 120 }} />
                  <col style={{ width: 120 }} />
                  <col />
                </colgroup>
                <tbody className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
                  {events.map((ev, i) => (
                    <EventRow key={ev.id} event={ev} index={i} />
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Footer count */}
      {events.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-right font-mono text-[11px]"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          {events.length} events · device: {DEVICE_ID}
        </motion.p>
      )}
    </div>
  )
}
