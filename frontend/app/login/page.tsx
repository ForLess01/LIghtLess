'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Auto-login page — redirects to dashboard immediately */
export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="h-6 w-6 animate-pulse rounded-full bg-white/20" />
    </main>
  )
}