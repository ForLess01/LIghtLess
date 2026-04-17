/**
 * ── Demo Mode ──────────────────────────────────────────────────
 * TODO: Remove this entire file when the backend is deployed.
 * This provides fake data so the UI can be showcased on Vercel
 * without a running Go backend.
 * ────────────────────────────────────────────────────────────────
 */

const DEMO_TOKEN_KEY = 'lightless_demo'

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(DEMO_TOKEN_KEY) === 'true'
}

export function enterDemoMode() {
  window.localStorage.setItem(DEMO_TOKEN_KEY, 'true')
  // Also set a fake JWT so auth guards pass
  window.localStorage.setItem('lightless_token', 'demo-token')
}

export function exitDemoMode() {
  window.localStorage.removeItem(DEMO_TOKEN_KEY)
  window.localStorage.removeItem('lightless_token')
}

export type MockEvent = {
  id: number
  command_id?: string
  device_id: string
  event_type: string
  payload: string
  created_at: string
}

/** Generates realistic-looking mock events */
export function generateMockEvents(count = 20): MockEvent[] {
  const now = Date.now()
  const types = [
    { type: 'state_changed', payloadFn: (on: boolean) => JSON.stringify({ state: on, timestamp: Math.floor(now / 1000) }) },
    { type: 'command_sent', payloadFn: (on: boolean) => JSON.stringify({ action: 'set_state', value: on, timestamp: Math.floor(now / 1000) }) },
    { type: 'device_online', payloadFn: () => JSON.stringify({ status: 'online', timestamp: Math.floor(now / 1000) }) },
    { type: 'telemetry', payloadFn: () => JSON.stringify({ rssi: -55 + Math.floor(Math.random() * 20), uptime: 3600 + Math.floor(Math.random() * 7200), free_heap: 180000 }) },
  ]

  const events: MockEvent[] = []
  let lightOn = true

  for (let i = 0; i < count; i++) {
    const minutesAgo = i * 3
    const date = new Date(now - minutesAgo * 60_000)
    const pick = types[i % types.length]

    events.push({
      id: count - i,
      device_id: 'foco-sala',
      event_type: pick.type,
      payload: pick.payloadFn(lightOn),
      created_at: date.toISOString(),
    })

    if (pick.type === 'state_changed') lightOn = !lightOn
  }

  return events
}

/** Mock initial device state */
export const DEMO_DEVICE_STATE = {
  power: true,
  online: true,
  rssi: -52,
  lastUpdate: Date.now(),
}
