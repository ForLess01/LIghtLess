'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { clearToken } from '@/lib/auth'

const NAV_ITEMS = [
  {
    href: '/dashboard',
    exact: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 12L12 4l9.5 8" />
        <path d="M5 9.5V20a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V9.5" />
      </svg>
    ),
    label: 'Dashboard',
  },
  {
    href: '/dashboard/logs',
    exact: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12h6M9 8h6m-6 8h4" />
        <rect x="3" y="3" width="18" height="18" rx="3" />
      </svg>
    ),
    label: 'Event Logs',
  },
]

function NavItem({ href, icon, label, exact }: (typeof NAV_ITEMS)[0]) {
  const pathname = usePathname()
  const active = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link href={href} className="relative block">
      <motion.div
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
        style={{
          color: active ? 'var(--color-fg)' : 'var(--color-fg-subtle)',
          background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
        }}
        whileHover={{ background: 'rgba(255,255,255,0.05)' }}
        transition={{ duration: 0.15 }}
      >
        {active && (
          <motion.div
            layoutId="nav-indicator"
            className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full"
            style={{ background: 'var(--color-amber)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
        <span style={{ color: active ? 'var(--color-amber)' : 'inherit' }}>{icon}</span>
        {label}
      </motion.div>
    </Link>
  )
}

export default function Sidebar() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleLogout = () => {
    clearToken()
    router.replace('/login')
  }

  const sidebarContent = (
    <nav className="flex h-full flex-col">
      {/* Logo */}
      <div className="px-4 pb-6 pt-5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #f5b942, #c97d10)',
              boxShadow: '0 2px 12px rgba(245,185,66,0.4)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26C17.81 13.47 19 11.38 19 9c0-3.87-3.13-7-7-7z"
                fill="rgba(0,0,0,0.7)"
                stroke="rgba(0,0,0,0.4)"
                strokeWidth="0.5"
              />
              <path d="M9 21h6M10 19h4" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ letterSpacing: '-0.02em' }}>
              LightLess
            </p>
            <p className="text-[10px]" style={{ color: 'var(--color-fg-subtle)' }}>
              IoT Control
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 space-y-0.5 px-2">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      {/* Logout */}
      <div className="border-t p-4" style={{ borderColor: 'var(--color-border)' }}>
        <motion.button
          onClick={handleLogout}
          whileHover={{ background: 'rgba(255,69,58,0.08)' }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors"
          style={{ color: 'var(--color-fg-subtle)' }}
          id="logout-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Sign out
        </motion.button>
      </div>
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden w-[220px] flex-shrink-0 lg:flex lg:flex-col"
        style={{
          background: 'rgba(13,13,16,0.7)',
          borderRight: '1px solid var(--color-border)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile: hamburger + drawer */}
      <div className="lg:hidden">
        <button
          id="mobile-menu-btn"
          onClick={() => setOpen(true)}
          className="fixed left-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--color-border)',
            backdropFilter: 'blur(12px)',
          }}
          aria-label="Open menu"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>

        <AnimatePresence>
          {open && (
            <>
              <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-40"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              />
              <motion.aside
                key="drawer"
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                exit={{ x: -240 }}
                transition={{ type: 'spring', stiffness: 400, damping: 38 }}
                className="fixed bottom-0 left-0 top-0 z-50 w-[220px]"
                style={{
                  background: 'rgba(13,13,16,0.95)',
                  borderRight: '1px solid var(--color-border)',
                  backdropFilter: 'blur(40px)',
                }}
              >
                {sidebarContent}
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
