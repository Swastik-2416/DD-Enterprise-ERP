import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MobileBottomNav } from './MobileBottomNav'
import { OfflineBanner } from '@/components/common/OfflineBanner'

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <OfflineBanner />
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 pb-20 md:pb-6 max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>

        <MobileBottomNav onMenuClick={() => setSidebarOpen(true)} />
      </div>
    </div>
  )
}
