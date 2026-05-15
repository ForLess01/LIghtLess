'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { sendCommand } from './api'

export type ClapPhase = 'idle' | 'first_hit' | 'confirmed'

/**
 * useClapDetection — Double-clap detection using Web Audio API.
 *
 * Improvements over naive RMS:
 * 1. Uses energy in mid-high frequency band (1-8 kHz) where claps live, ignoring low rumbles
 * 2. Adaptive threshold: normalizes against recent ambient noise floor
 * 3. Peak decay: after a hit, amplitude must drop belowthreshold before next hit counts
 * 4. Exposes `clapPhase` so UI can show "1st clap detected" feedback
 * 5. Exposes `volume` (0-1) for visualizing audio level in real time
 */
const FREQ_LOW = 1000     // Hz — lower bound of clap frequency band
const FREQ_HIGH = 8000    // Hz — upper bound
const HIT_RATIO = 3.0     // Amplitude must be this × the noise floor to count as a hit
const MIN_HIT_RATIO = 2.0 // Minimum ratio when noise floor is very low (prevents ghost triggers)
const DECAY_MS = 120      // After a hit, amplitude must drop below threshold for this long before next hit
const CLAP_WINDOW_MS = 700   // Max ms between first and second clap
const COOLDOWN_MS = 1500      // Cooldown after double-clap detection
const SAMPLE_RATE = 10       // How often we check (per second, so ~100ms intervals)
const NOISE_ALPHA = 0.95    // Exponential moving average alpha for noise floor estimation
const MIN_NOISE_FLOOR = 0.04 // Minimum noise floor to prevent division issues

export function useClapDetection(
  enabled: boolean,
  deviceId: string,
  currentPower: boolean,
) {
  const [listening, setListening] = useState(false)
  const [clapPhase, setClapPhase] = useState<ClapPhase>('idle')
  const [volume, setVolume] = useState(0)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number>(0)
  const lastHitTimeRef = useRef<number>(0)
  const cooldownUntilRef = useRef<number>(0)
  const noiseFloorRef = useRef<number>(MIN_NOISE_FLOOR)
  const decayUntilRef = useRef<number>(0)
  const powerRef = useRef(currentPower)

  // Keep powerRef in sync
  useEffect(() => {
    powerRef.current = currentPower
  }, [currentPower])

  const stopListening = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    analyserRef.current = null
    setListening(false)
    setClapPhase('idle')
    setVolume(0)
  }, [])

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false, // We want raw levels for better clap detection
        },
      })
      streamRef.current = stream

      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx

      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.4
      source.connect(analyser)
      analyserRef.current = analyser

      // Frequency bin resolution
      const nyquist = audioCtx.sampleRate / 2
      const binCount = analyser.frequencyBinCount
      const binWidth = nyquist / binCount
      const lowBin = Math.max(1, Math.floor(FREQ_LOW / binWidth))
      const highBin = Math.min(binCount - 1, Math.ceil(FREQ_HIGH / binWidth))

      const dataArray = new Uint8Array(binCount)
      const intervalMs = 1000 / SAMPLE_RATE
      let lastCheck = performance.now()

      const detect = (now: number) => {
        if (!analyserRef.current) return

        analyserRef.current.getByteFrequencyData(dataArray)

        // Calculate energy in the clap frequency band
        let sum = 0
        const bins = highBin - lowBin + 1
        for (let i = lowBin; i <= highBin; i++) {
          sum += dataArray[i] * dataArray[i]
        }
        const energy = Math.sqrt(sum / bins) / 255 // Normalize to 0-1

        // Update noise floor (exponential moving average, only when not in a hit)
        const currentTime = Date.now()
        const inCooldown = currentTime < cooldownUntilRef.current
        const inDecay = currentTime < decayUntilRef.current

        if (!inDecay && !inCooldown && energy < noiseFloorRef.current * HIT_RATIO) {
          noiseFloorRef.current = NOISE_ALPHA * noiseFloorRef.current + (1 - NOISE_ALPHA) * energy
          if (noiseFloorRef.current < MIN_NOISE_FLOOR) noiseFloorRef.current = MIN_NOISE_FLOOR
        }

        // Update volume for UI visualization (smooth it)
        setVolume((prev) => prev * 0.6 + energy * 0.4)

        // Throttle detection to ~SAMPLE_RATE per second
        if (now - lastCheck < intervalMs) {
          rafRef.current = requestAnimationFrame(detect)
          return
        }
        lastCheck = now

        // Skip if in cooldown
        if (inCooldown) {
          rafRef.current = requestAnimationFrame(detect)
          return
        }

        // Dynamic threshold: amplitude must exceed noiseFloor × HIT_RATIO
        const threshold = Math.max(noiseFloorRef.current * HIT_RATIO, MIN_NOISE_FLOOR * MIN_HIT_RATIO)

        if (energy > threshold) {
          // If in decay (just had a hit), ignore
          if (inDecay) {
            rafRef.current = requestAnimationFrame(detect)
            return
          }

          // This is a hit!
          const lastHit = lastHitTimeRef.current

          // Set decay — amplitude must drop before next hit
          decayUntilRef.current = currentTime + DECAY_MS

          if (lastHit > 0 && currentTime - lastHit < CLAP_WINDOW_MS) {
            // DOUBLE CLAP!
            cooldownUntilRef.current = currentTime + COOLDOWN_MS
            lastHitTimeRef.current = 0
            decayUntilRef.current = currentTime + COOLDOWN_MS
            setClapPhase('confirmed')

            // Toggle the light
            const newPower = !powerRef.current
            sendCommand(deviceId, newPower).catch(() => {})

            // Reset phase after visual feedback
            setTimeout(() => setClapPhase('idle'), 800)

          } else {
            // First clap
            lastHitTimeRef.current = currentTime
            setClapPhase('first_hit')

            // Clear if no second clap arrives
            setTimeout(() => {
              if (lastHitTimeRef.current === currentTime) {
                lastHitTimeRef.current = 0
                setClapPhase('idle')
              }
            }, CLAP_WINDOW_MS)
          }
        }

        rafRef.current = requestAnimationFrame(detect)
      }

      rafRef.current = requestAnimationFrame(detect)
      setListening(true)
    } catch (err) {
      console.error('Clap detection: microphone access denied', err)
      setListening(false)
    }
  }, [deviceId])

  // Start/stop based on enabled flag
  useEffect(() => {
    if (enabled) {
      startListening()
    } else {
      stopListening()
    }
    return () => {
      stopListening()
    }
  }, [enabled, startListening, stopListening])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [stopListening])

  return { listening, clapPhase, volume }
}