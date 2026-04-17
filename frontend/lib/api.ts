import { getToken } from './auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export type DeviceEvent = {
  id: number
  command_id?: string
  device_id: string
  event_type: string
  payload: string
  created_at: string
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string }> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'login failed' }))
    throw new Error(body.error ?? 'login failed')
  }
  return res.json()
}

export async function sendCommand(
  deviceId: string,
  value: boolean,
): Promise<{ command_id: string }> {
  const token = getToken()
  const res = await fetch(`${API_URL}/api/devices/${deviceId}/command`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: 'set_state', value }),
  })
  if (!res.ok) throw new Error('command failed')
  return res.json()
}

export async function fetchEvents(
  deviceId: string,
  limit = 20,
): Promise<DeviceEvent[]> {
  const token = getToken()
  const res = await fetch(
    `${API_URL}/api/devices/${deviceId}/events?limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error('fetch events failed')
  return res.json()
}

export function wsURL(): string {
  const token = getToken()
  const url = new URL(API_URL)
  const proto = url.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${url.host}/ws?token=${token}`
}
