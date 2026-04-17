'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken } from '@/lib/auth'

export default function RootRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace(getToken() ? '/dashboard' : '/login')
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="h-6 w-6 animate-pulse rounded-full bg-white/20" />
    </main>
  )
}
