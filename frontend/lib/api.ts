import { getToken, setToken } from './auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
const DEFAULT_EMAIL = 'admin@lightless.local'
const DEFAULT_PASSWORD = 'admin'

export async function autoLogin(): Promise<string> {
  const existing = getToken()
  if (existing) return existing

  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD }),
  })
  if (!res.ok) throw new Error('auto-login failed')
  const { token } = await res.json()
  setToken(token)
  return token
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await autoLogin()
  return { Authorization: `Bearer ${token}` }
}

async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = await authHeaders()
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers instanceof Headers ? Object.fromEntries(init.headers) : init.headers ?? {}), ...headers },
  })
  if (res.status === 401) {
    // Token expired — re-login and retry once
    const newToken = await autoLoginForce()
    const retryHeaders = { Authorization: `Bearer ${newToken}` }
    return fetch(url, {
      ...init,
      headers: { ...(init.headers instanceof Headers ? Object.fromEntries(init.headers) : init.headers ?? {}), ...retryHeaders },
    })
  }
  return res
}

async function autoLoginForce(): Promise<string> {
  // Clear stale token and get a fresh one
  setToken('')
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD }),
  })
  if (!res.ok) throw new Error('auto-login failed')
  const { token } = await res.json()
  setToken(token)
  return token
}

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
  const res = await authFetch(`${API_URL}/api/devices/${deviceId}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set_state', value }),
  })
  if (!res.ok) throw new Error('command failed')
  return res.json()
}

export async function sendAICommand(
  deviceId: string,
  text: string,
): Promise<{ command_id: string; action: string; parsed: { action: string; value?: boolean; count?: number; interval?: number } }> {
  const res = await authFetch(`${API_URL}/api/devices/${deviceId}/ai-command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'ai command failed' }))
    throw new Error(body.error ?? 'ai command failed')
  }
  return res.json()
}

export async function fetchEvents(
  deviceId: string,
  limit = 20,
): Promise<DeviceEvent[]> {
  const res = await authFetch(
    `${API_URL}/api/devices/${deviceId}/events?limit=${limit}`,
  )
  if (!res.ok) throw new Error('fetch events failed')
  return res.json()
}

export function wsURL(): string {
  const token = getToken() ?? ''
  const url = new URL(API_URL)
  const proto = url.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${url.host}/ws?token=${token}`
}
