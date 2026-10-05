import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Factory, Package,
  UserCheck, Menu
} from 'lucide-react'
import { cn } from '@/lib/cn'

interface MobileBottomNavProps {
  onMenuClick: () => void
}

export function MobileBottomNav({ onMenuClick }: MobileBottomNavProps) {
  const navItems = [
    { label: 'Home', icon: LayoutDashboard, path: '/' },
    { label: 'Production', icon: Factory, path: '/manufacturing/production-orders' },
    { label: 'Stock', icon: Package, path: '/reports/stock' },
    { label: 'Attendance', icon: UserCheck, path: '/hr/attendance' },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-outline-variant shadow-lg flex items-center justify-around px-2 py-1.5 safe-area-pb">
      {navItems.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-medium transition-colors',
              isActive
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            )
          }
        >
          <item.icon className="h-5 w-5 mb-0.5" />
          <span>{item.label}</span>
        </NavLink>
      ))}

      <button
        onClick={onMenuClick}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-medium text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <Menu className="h-5 w-5 mb-0.5" />
        <span>Menu</span>
      </button>
    </nav>
  )
}
