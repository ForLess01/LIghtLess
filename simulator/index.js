import mqtt from 'mqtt'

const BROKER_URL = process.env.MQTT_BROKER_URL ?? 'mqtt://localhost:1883'
const DEVICE_ID = process.env.DEVICE_ID ?? 'foco-sala'
const HARDWARE_DELAY_MS = Number(process.env.HARDWARE_DELAY_MS ?? 200)
const TELEMETRY_INTERVAL_MS = Number(process.env.TELEMETRY_INTERVAL_MS ?? 30_000)

const topics = {
  command: `devices/${DEVICE_ID}/command`,
  state: `devices/${DEVICE_ID}/state`,
  telemetry: `devices/${DEVICE_ID}/telemetry`,
  health: `devices/${DEVICE_ID}/health`,
}

const device = {
  on: false,
  bootTime: Date.now(),
  rssi: -55,
}

const log = (level, msg, extra = {}) => {
  const ts = new Date().toISOString()
  console.log(`[${ts}] [${level}] ${msg}`, Object.keys(extra).length ? extra : '')
}

const client = mqtt.connect(BROKER_URL, {
  clientId: `simulator-${DEVICE_ID}-${Math.random().toString(16).slice(2, 8)}`,
  clean: true,
  reconnectPeriod: 2000,
  will: {
    topic: topics.health,
    payload: JSON.stringify({ status: 'offline', timestamp: Math.floor(Date.now() / 1000) }),
    qos: 1,
    retain: true,
  },
})

client.on('connect', () => {
  log('INFO', `Connected to broker ${BROKER_URL} as ${DEVICE_ID}`)

  client.publish(
    topics.health,
    JSON.stringify({ status: 'online', timestamp: Math.floor(Date.now() / 1000) }),
    { qos: 1, retain: true },
  )

  client.subscribe(topics.command, { qos: 1 }, (err) => {
    if (err) {
      log('ERROR', 'Failed to subscribe to command topic', { err: err.message })
      return
    }
    log('INFO', `Subscribed to ${topics.command}`)
  })

  publishState()
})

client.on('reconnect', () => log('WARN', 'Reconnecting to broker...'))
client.on('error', (err) => log('ERROR', 'MQTT error', { err: err.message }))
client.on('close', () => log('WARN', 'Connection closed'))

client.on('message', async (topic, payload) => {
  if (topic !== topics.command) return

  let command
  try {
    command = JSON.parse(payload.toString())
  } catch (err) {
    log('ERROR', 'Invalid command payload', { raw: payload.toString() })
    return
  }

  log('INFO', 'Command received', command)

  await sleep(HARDWARE_DELAY_MS)

  if (command.action === 'set_state') {
    device.on = Boolean(command.value)
    log('INFO', `LED is now ${device.on ? 'ON' : 'OFF'}`)
    publishState(command.id)
  } else {
    log('WARN', `Unknown action: ${command.action}`)
  }
})

const publishState = (commandId = null) => {
  const state = {
    command_id: commandId,
    state: device.on,
    timestamp: Math.floor(Date.now() / 1000),
  }
  client.publish(topics.state, JSON.stringify(state), { qos: 1, retain: true })
  log('INFO', 'State published', state)
}

const publishTelemetry = () => {
  device.rssi = clamp(device.rssi + jitter(-3, 3), -90, -30)
  const telemetry = {
    rssi: device.rssi,
    uptime: Math.floor((Date.now() - device.bootTime) / 1000),
    free_heap: 180_000 + jitter(-5_000, 5_000),
    timestamp: Math.floor(Date.now() / 1000),
  }
  client.publish(topics.telemetry, JSON.stringify(telemetry), { qos: 0 })
  log('DEBUG', 'Telemetry published', telemetry)
}

setInterval(publishTelemetry, TELEMETRY_INTERVAL_MS)

const shutdown = () => {
  log('INFO', 'Shutting down simulator...')
  client.publish(
    topics.health,
    JSON.stringify({ status: 'offline', timestamp: Math.floor(Date.now() / 1000) }),
    { qos: 1, retain: true },
    () => client.end(false, {}, () => process.exit(0)),
  )
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const jitter = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const clamp = (n, min, max) => Math.max(min, Math.min(max, n))
