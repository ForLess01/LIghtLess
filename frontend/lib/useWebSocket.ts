import { useEffect, useRef, useState } from 'react'
import { wsURL } from './api'
import { useDeviceStore } from './store'

type WSEvent = {
  type: string
  device_id?: string
  data?: Record<string, unknown>
}

export type WSStatus = 'connecting' | 'open' | 'closed'

export function useWebSocket() {
  const [status, setStatus] = useState<WSStatus>('connecting')
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let cancelled = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (cancelled) return
      setStatus('connecting')
      const ws = new WebSocket(wsURL())
      wsRef.current = ws

      ws.addEventListener('open', () => setStatus('open'))

      ws.addEventListener('message', (e) => {
        try {
          const event = JSON.parse(e.data) as WSEvent
          dispatch(event)
        } catch {
          /* ignore malformed */
        }
      })

      ws.addEventListener('close', () => {
        setStatus('closed')
        if (cancelled) return
        reconnectTimer = setTimeout(connect, 2000)
      })

      ws.addEventListener('error', () => {
        ws.close()
      })
    }

    connect()
    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      wsRef.current?.close()
    }
  }, [])

  return status
}

function dispatch(e: WSEvent) {
  const s = useDeviceStore.getState()
  const now = Date.now()

  switch (e.type) {
    case 'state_changed': {
      const state = Boolean((e.data as { state?: boolean } | undefined)?.state)
      s.setPower(state)
      s.setLastUpdate(now)
      s.pushEvent({
        id: `${now}-state`,
        type: 'state_changed',
        deviceId: e.device_id,
        message: `State changed → ${state ? 'ON' : 'OFF'}`,
        at: now,
      })
      break
    }
    case 'command_ack': {
      const cmdId = (e.data as { command_id?: string } | undefined)?.command_id
      if (cmdId && s.pendingCommandId === cmdId) {
        s.setPending(null)
      }
      break
    }
    case 'device_online': {
      s.setOnline(true)
      s.pushEvent({
        id: `${now}-online`,
        type: 'device_online',
        deviceId: e.device_id,
        message: 'Device came online',
        at: now,
      })
      break
    }
    case 'device_offline': {
      s.setOnline(false)
      s.pushEvent({
        id: `${now}-offline`,
        type: 'device_offline',
        deviceId: e.device_id,
        message: 'Device went offline',
        at: now,
      })
      break
    }
    case 'telemetry': {
      const rssi = (e.data as { rssi?: number } | undefined)?.rssi
      if (typeof rssi === 'number') s.setRSSI(rssi)
      break
    }
  }
}
