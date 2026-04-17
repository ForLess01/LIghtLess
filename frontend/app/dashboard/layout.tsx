import type { ReactNode } from 'react'
import Sidebar from '../_components/Sidebar'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Top bar (mobile padding) */}
        <div
          className="flex h-14 flex-shrink-0 items-center border-b px-4 lg:hidden"
          style={{ borderColor: 'var(--color-border)', background: 'rgba(13,13,16,0.6)' }}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
