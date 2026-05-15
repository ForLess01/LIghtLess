'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, setToken } from '@/lib/auth'
import { login } from '@/lib/api'

const DEFAULT_EMAIL = 'admin@lightless.local'
const DEFAULT_PASSWORD = 'admin'

export default function RootRedirect() {
  const router = useRouter()

  useEffect(() => {
    async function go() {
      if (getToken()) {
        router.replace('/dashboard')
        return
      }
      try {
        const { token } = await login(DEFAULT_EMAIL, DEFAULT_PASSWORD)
        setToken(token)
        router.replace('/dashboard')
      } catch {
        router.replace('/dashboard')
      }
    }
    go()
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="h-6 w-6 animate-pulse rounded-full bg-white/20" />
    </main>
  )
}
