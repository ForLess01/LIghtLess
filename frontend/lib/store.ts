import { create } from 'zustand'
import type { DeviceEvent } from './api'

type LiveEvent = {
  id: string
  type: string
  deviceId?: string
  message: string
  at: number
}

type DeviceState = {
  power: boolean
  pendingCommandId: string | null
  online: boolean
  rssi: number | null
  lastUpdate: number | null
  events: LiveEvent[]
  setPower: (p: boolean) => void
  setPending: (id: string | null) => void
  setOnline: (online: boolean) => void
  setRSSI: (rssi: number) => void
  setLastUpdate: (t: number) => void
  pushEvent: (e: LiveEvent) => void
  hydrateFromHistory: (events: DeviceEvent[]) => void
  reset: () => void
}

const initialState = {
  power: false,
  pendingCommandId: null,
  online: false,
  rssi: null,
  lastUpdate: null,
  events: [] as LiveEvent[],
}

export const useDeviceStore = create<DeviceState>((set) => ({
  ...initialState,
  setPower: (p) => set({ power: p }),
  setPending: (id) => set({ pendingCommandId: id }),
  setOnline: (online) => set({ online }),
  setRSSI: (rssi) => set({ rssi }),
  setLastUpdate: (t) => set({ lastUpdate: t }),
  pushEvent: (e) =>
    set((s) => ({ events: [e, ...s.events].slice(0, 30) })),
  hydrateFromHistory: (events) => {
    let power = false
    let online = false
    let lastUpdate: number | null = null
    const live: LiveEvent[] = []

    for (const ev of events) {
      if (ev.event_type === 'state_changed' && lastUpdate === null) {
        try {
          const parsed = JSON.parse(ev.payload)
          power = Boolean(parsed.state)
          lastUpdate = new Date(ev.created_at).getTime()
        } catch { /* ignore */ }
      }
      if (
        (ev.event_type === 'device_online' || ev.event_type === 'device_offline') &&
        !live.some((l) => l.type === 'device_online' || l.type === 'device_offline')
      ) {
        online = ev.event_type === 'device_online'
      }
      live.push({
        id: String(ev.id),
        type: ev.event_type,
        deviceId: ev.device_id,
        message: summarize(ev),
        at: new Date(ev.created_at).getTime(),
      })
    }

    set({
      power,
      online,
      lastUpdate,
      events: live.slice(0, 30),
    })
  },
  reset: () => set(initialState),
}))

function summarize(ev: DeviceEvent): string {
  try {
    const p = JSON.parse(ev.payload)
    switch (ev.event_type) {
      case 'command_sent':
        return `Command: set_state → ${p.value ? 'ON' : 'OFF'}`
      case 'state_changed':
        return `State changed → ${p.state ? 'ON' : 'OFF'}`
      case 'device_online':
        return 'Device came online'
      case 'device_offline':
        return 'Device went offline'
      default:
        return ev.event_type
    }
  } catch {
    return ev.event_type
  }
}
