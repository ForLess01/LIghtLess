'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/api'
import { setToken } from '@/lib/auth'

/* ── Floating particles ─── */
// Generamos las partículas SOLO en el cliente para evitar hydration mismatch
// (Math.random() en SSR vs cliente producía valores distintos)
type Particle = { id: number; size: number; x: number; y: number; delay: number; duration: number }

function Particles() {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    setParticles(
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        size: Math.random() * 3 + 1,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 4,
        duration: Math.random() * 6 + 6,
      }))
    )
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: 'rgba(245,185,66,0.3)',
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

/* ── Input field ─── */
function Field({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  const [focused, setFocused] = useState(false)

  return (
    <div className="group relative">
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="input-base"
          style={{
            boxShadow: focused
              ? '0 0 0 3px var(--color-amber-glow)'
              : '0 0 0 0 transparent',
          }}
        />
        {/* Focus glow */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[14px]"
          animate={{
            boxShadow: focused
              ? '0 0 20px rgba(245,185,66,0.1)'
              : '0 0 0 rgba(0,0,0,0)',
          }}
          transition={{ duration: 0.25 }}
        />
      </div>
    </div>
  )
}

/* ── Login page ─── */
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const { token } = await login(email, password)
      setToken(token)
      router.replace('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <Particles />

      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute"
          style={{
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,185,66,0.06) 0%, transparent 70%)',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -70%)',
            animation: 'ambientPulse 6s ease-in-out infinite',
          }}
        />
        <div
          className="absolute"
          style={{
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(120,100,255,0.05) 0%, transparent 70%)',
            right: '10%',
            bottom: '15%',
            animation: 'ambientPulse 8s ease-in-out infinite 2s',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        {/* Card */}
        <div
          className="overflow-hidden rounded-[28px]"
          style={{
            background: 'rgba(13,13,16,0.85)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
            backdropFilter: 'blur(40px) saturate(200%)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          }}
        >
          {/* Card top shine */}
          <div
            className="pointer-events-none"
            style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            }}
          />

          <div className="p-8">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 24 }}
              className="mb-8 flex flex-col items-center"
            >
              <motion.div
                animate={{ boxShadow: ['0 0 20px rgba(245,185,66,0.3)', '0 0 40px rgba(245,185,66,0.5)', '0 0 20px rgba(245,185,66,0.3)'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px]"
                style={{
                  background: 'linear-gradient(135deg, #f5b942 0%, #c97d10 100%)',
                  border: '1px solid rgba(245,185,66,0.3)',
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26C17.81 13.47 19 11.38 19 9c0-3.87-3.13-7-7-7z"
                    fill="rgba(0,0,0,0.6)"
                  />
                  <path d="M9 21h6M10 19h4" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </motion.div>
              <h1
                className="text-2xl font-semibold"
                style={{ letterSpacing: '-0.03em' }}
              >
                LightLess
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-fg-subtle)' }}>
                Sign in to your workspace
              </p>
            </motion.div>

            {/* Form */}
            <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
              <Field
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="admin@lightless.local"
                autoComplete="email"
              />
              <Field
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete="current-password"
              />

              {/* Error */}
              <motion.div
                initial={false}
                animate={{ height: error ? 'auto' : 0, opacity: error ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {error && (
                  <div
                    className="rounded-xl px-4 py-2.5 text-sm"
                    style={{
                      background: 'rgba(255,69,58,0.1)',
                      border: '1px solid rgba(255,69,58,0.2)',
                      color: 'var(--color-danger)',
                    }}
                  >
                    {error}
                  </div>
                )}
              </motion.div>

              {/* Submit */}
              <motion.button
                id="login-submit"
                type="submit"
                disabled={loading || !email || !password}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="relative mt-2 w-full overflow-hidden rounded-[14px] py-3.5 text-[15px] font-semibold disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #f5b942 0%, #e09520 100%)',
                  color: '#000',
                  boxShadow: '0 4px 24px rgba(245,185,66,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                }}
              >
                {/* Shimmer */}
                <motion.div
                  className="absolute inset-0"
                  animate={{ translateX: ['−100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                  }}
                />
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="inline-block h-4 w-4 rounded-full border-2 border-black/40 border-r-transparent"
                    />
                    Signing in…
                  </span>
                ) : (
                  'Sign In'
                )}
              </motion.button>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--color-fg-subtle)' }}>
          LightLess • IoT Smart Light Control
        </p>
      </motion.div>
    </main>
  )
}
