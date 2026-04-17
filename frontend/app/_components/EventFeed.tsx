'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useDeviceStore } from '@/lib/store'

const EVENT_STYLES: Record<string, { dot: string; label: string; color: string }> = {
  state_changed: {
    dot: 'bg-[var(--color-amber)]',
    label: 'STATE',
    color: 'var(--color-amber)',
  },
  command_sent: {
    dot: 'bg-[var(--color-fg-subtle)]',
    label: 'CMD',
    color: 'var(--color-fg-muted)',
  },
  device_online: {
    dot: 'bg-[var(--color-success)]',
    label: 'ONLINE',
    color: 'var(--color-success)',
  },
  device_offline: {
    dot: 'bg-[var(--color-danger)]',
    label: 'OFFLINE',
    color: 'var(--color-danger)',
  },
  telemetry: {
    dot: 'bg-blue-400',
    label: 'TELEMETRY',
    color: 'rgb(96,165,250)',
  },
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 5_000) return 'just now'
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
}

export default function EventFeed() {
  const events = useDeviceStore((s) => s.events)

  if (events.length === 0) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--color-fg-subtle)' }}>
          Waiting for events…
        </p>
      </div>
    )
  }

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        background: 'rgba(13,13,16,0.6)',
        border: '1px solid var(--color-border)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      <div
        className="border-b px-5 py-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-[0.1em]"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          Live Events
        </p>
      </div>

      <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
        <AnimatePresence initial={false}>
          {events.slice(0, 6).map((ev) => {
            const style = EVENT_STYLES[ev.type] ?? EVENT_STYLES.command_sent
            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                className="flex items-center gap-3 px-5 py-3"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${style.dot}`} />
                <span
                  className="w-[68px] flex-shrink-0 font-mono text-[10px] font-semibold tracking-[0.08em]"
                  style={{ color: style.color }}
                >
                  {style.label}
                </span>
                <span
                  className="flex-1 truncate font-mono text-xs"
                  style={{ color: 'var(--color-fg-muted)' }}
                >
                  {ev.message}
                </span>
                <span
                  className="flex-shrink-0 font-mono text-[10px]"
                  style={{ color: 'var(--color-fg-subtle)' }}
                >
                  {timeAgo(ev.at)}
                </span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
