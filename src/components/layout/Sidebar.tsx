import React, { useState, useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, Factory, ShoppingBag,
  CreditCard, Users, UserCheck, TrendingUp, Truck, BarChart3,
  ChevronDown, ChevronRight, Building2, Settings, X, Clock,
  ShieldCheck, RotateCcw, Search, Sparkles, Activity
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useCompany } from '@/contexts/CompanyContext'

interface NavItem {
  label: string
  icon: React.ElementType
  path?: string
  badge?: string
  children?: NavItem[]
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Core Cockpit',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
      { label: 'Executive Analytics', icon: TrendingUp, path: '/analytics', badge: 'BI' },
    ]
  },
  {
    title: 'Plant & Operations',
    items: [
      {
        label: 'Manufacturing', icon: Factory, children: [
          { label: 'Production Orders', icon: Factory, path: '/manufacturing/production-orders' },
          { label: 'FG Inventory', icon: Package, path: '/manufacturing/fg-inventory' },
          { label: 'Stock Transfers', icon: Truck, path: '/inventory/transfers' },
        ]
      },
      {
        label: 'Master Data', icon: Package, children: [
          { label: 'Items & SKUs', icon: Package, path: '/master/items' },
          { label: 'Bill of Materials', icon: Factory, path: '/master/bom' },
          { label: 'Warehouses', icon: Building2, path: '/master/warehouses' },
          { label: 'Units of Measure', icon: Settings, path: '/master/units' },
          { label: 'Categories', icon: Package, path: '/master/categories' },
        ]
      },
      {
        label: 'Procurement', icon: ShoppingCart, children: [
          { label: 'Purchase Orders', icon: ShoppingCart, path: '/procurement/purchase-orders' },
          { label: 'Purchase Invoices', icon: ShoppingCart, path: '/procurement/purchase-invoices' },
          { label: 'Goods Receipts', icon: Package, path: '/procurement/goods-receipts' },
          { label: 'Purchase Returns', icon: RotateCcw, path: '/procurement/returns' },
        ]
      },
    ]
  },
  {
    title: 'Commerce & Partners',
    items: [
      {
        label: 'Sales', icon: ShoppingBag, children: [
          { label: 'Quotations', icon: ShoppingBag, path: '/sales/quotations' },
          { label: 'Sales Orders', icon: ShoppingBag, path: '/sales/orders' },
          { label: 'Invoices', icon: ShoppingBag, path: '/sales/invoices' },
          { label: 'Delivery Challans', icon: Truck, path: '/sales/delivery-challans' },
        ]
      },
      {
        label: 'Payments', icon: CreditCard, children: [
          { label: 'Customer Receipts', icon: CreditCard, path: '/payments/inward' },
          { label: 'Vendor Payments', icon: CreditCard, path: '/payments/outward' },
        ]
      },
      {
        label: 'Stakeholders', icon: Users, children: [
          { label: 'Vendors', icon: Building2, path: '/stakeholders/vendors' },
          { label: 'Customers', icon: UserCheck, path: '/stakeholders/customers' },
          { label: 'Labour Teams', icon: Users, path: '/stakeholders/labour' },
          { label: 'Transporters', icon: Truck, path: '/stakeholders/transporters' },
        ]
      },
    ]
  },
  {
    title: 'Finance & Compliance',
    items: [
      {
        label: 'Finance & Ledger', icon: TrendingUp, children: [
          { label: 'Customer Ledger', icon: TrendingUp, path: '/finance/customer-ledger' },
          { label: 'Vendor Ledger', icon: TrendingUp, path: '/finance/vendor-ledger' },
          { label: 'Outstanding Aging', icon: Clock, path: '/finance/aging' },
          { label: 'Expenses', icon: TrendingUp, path: '/finance/expenses' },
          { label: 'Other Income', icon: TrendingUp, path: '/finance/other-income' },
          { label: 'P&L Report', icon: TrendingUp, path: '/finance/pl-report' },
        ]
      },
      {
        label: 'Transport & Fleet', icon: Truck, children: [
          { label: 'Freight Register', icon: Truck, path: '/transport/freight' },
          { label: 'Transporter Payments', icon: CreditCard, path: '/transport/payments' },
        ]
      },
      {
        label: 'HR & Workforce', icon: UserCheck, children: [
          { label: 'Attendance', icon: UserCheck, path: '/hr/attendance' },
        ]
      },
      {
        label: 'Reports & Audit', icon: BarChart3, children: [
          { label: 'Sales Register', icon: BarChart3, path: '/reports/sales' },
          { label: 'Purchase Register', icon: BarChart3, path: '/reports/purchases' },
          { label: 'Stock Report', icon: BarChart3, path: '/reports/stock' },
          { label: 'Production Report', icon: BarChart3, path: '/reports/production' },
          { label: 'GST Summary', icon: BarChart3, path: '/reports/gst' },
          { label: 'Audit Trail', icon: ShieldCheck, path: '/settings/audit-logs' },
        ]
      },
    ]
  },
]

function NavGroup({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const location = useLocation()
  const hasActiveChild = item.children?.some(c =>
    c.path ? location.pathname === c.path || (c.path !== '/' && location.pathname.startsWith(c.path)) : false
  )
  const isDirectActive = item.path ? (item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)) : false
  const [open, setOpen] = useState(hasActiveChild ?? false)

  React.useEffect(() => {
    if (hasActiveChild) setOpen(true)
  }, [hasActiveChild])

  if (item.path) {
    return (
      <NavLink
        to={item.path}
        end={item.path === '/'}
        className={({ isActive }) =>
          cn(
            'group relative flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-xl transition-all duration-200',
            depth > 0 ? 'ml-2 text-slate-300 hover:text-white' : 'text-slate-300 hover:text-white',
            isActive
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-semibold shadow-[0_2px_14px_rgba(37,99,235,0.4)] ring-1 ring-white/20'
              : 'hover:bg-white/[0.07] hover:translate-x-0.5'
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span className="absolute -left-1 top-1.5 bottom-1.5 w-1 rounded-full bg-cyan-300 shadow-[0_0_8px_#67e8f9]" />
            )}

            <span className={cn(
              'p-1.5 rounded-lg transition-colors shrink-0',
              isActive ? 'bg-white/20 text-white' : 'bg-white/[0.05] text-slate-400 group-hover:text-cyan-400 group-hover:bg-white/[0.08]'
            )}>
              <item.icon className="h-3.5 w-3.5" />
            </span>

            <span className="truncate flex-1">{item.label}</span>

            {item.badge && (
              <span className={cn(
                'text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-wide uppercase',
                isActive ? 'bg-white/25 text-white' : 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
              )}>
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    )
  }

  const contentRef = React.useRef<HTMLDivElement>(null)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 group text-left',
          hasActiveChild
            ? 'text-white font-semibold bg-white/[0.08]'
            : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
        )}
      >
        <span className={cn(
          'p-1.5 rounded-lg transition-colors shrink-0',
          hasActiveChild ? 'bg-blue-600/30 text-blue-400' : 'bg-white/[0.05] text-slate-400 group-hover:text-cyan-400'
        )}>
          <item.icon className="h-3.5 w-3.5" />
        </span>

        <span className="flex-1 truncate">{item.label}</span>

        <span className={cn(
          'p-0.5 rounded text-slate-400 transition-transform duration-200',
          open && 'rotate-90 text-cyan-400'
        )}>
          <ChevronRight className="h-3 w-3" />
        </span>
      </button>

      {/* Connected Tree Submenu */}
      <div
        ref={contentRef}
        style={{ maxHeight: open ? `${(item.children?.length || 0) * 44 + 40}px` : '0px' }}
        className="overflow-hidden transition-all duration-300 ease-in-out pl-4 ml-3 border-l border-slate-700/60 mt-1 space-y-1"
      >
        {item.children?.map(child => {
          const isChildActive = child.path ? location.pathname === child.path || (child.path !== '/' && location.pathname.startsWith(child.path)) : false
          return (
            <NavLink
              key={child.label}
              to={child.path || '#'}
              className={cn(
                'relative flex items-center gap-2.5 px-3 py-1.5 text-xs rounded-lg transition-all duration-150',
                isChildActive
                  ? 'bg-blue-600/30 text-cyan-300 font-medium border border-blue-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05]'
              )}
            >
              {/* Branch connecting node */}
              <span className={cn(
                'absolute -left-[17px] top-1/2 -translate-y-1/2 rounded-full transition-all',
                isChildActive
                  ? 'w-2 h-2 bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                  : 'w-1.5 h-px bg-slate-700'
              )} />

              <child.icon className={cn('h-3.5 w-3.5 shrink-0', isChildActive ? 'text-cyan-300' : 'text-slate-400')} />
              <span className="truncate">{child.label}</span>
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { company } = useCompany()
  const [searchQuery, setSearchQuery] = useState('')

  // Filter items if searching
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return NAV_SECTIONS
    const q = searchQuery.toLowerCase()

    return NAV_SECTIONS.map(section => {
      const matchedItems = section.items.reduce<NavItem[]>((acc, item) => {
        if (item.label.toLowerCase().includes(q)) {
          acc.push(item)
        } else if (item.children) {
          const matchingChildren = item.children.filter(c => c.label.toLowerCase().includes(q))
          if (matchingChildren.length > 0) {
            acc.push({ ...item, children: matchingChildren })
          }
        }
        return acc
      }, [])

      return {
        ...section,
        items: matchedItems
      }
    }).filter(section => section.items.length > 0)
  }, [searchQuery])

  return (
    <>
      {/* Mobile overlay with backdrop blur */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Creative Dark Cockpit Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-40 flex flex-col sidebar-transition select-none',
          'w-[270px] bg-gradient-to-b from-[#091122] via-[#0B152A] to-[#070D1A]',
          'border-r border-slate-800/80 shadow-[4px_0_24px_rgba(0,0,0,0.35)]',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto'
        )}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 shrink-0 bg-slate-900/40">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-3 min-w-0">
              {company.logo_url ? (
                <div className="h-9 w-9 rounded-xl p-0.5 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 ring-1 ring-white/20 shadow-md flex items-center justify-center shrink-0">
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="h-full w-full object-contain rounded-lg bg-white p-0.5"
                    onError={e => {
                      ;(e.target as HTMLElement).style.display = 'none'
                    }}
                  />
                </div>
              ) : (
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/40 ring-1 ring-white/20">
                  <Factory className="h-4 w-4 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-white tracking-tight truncate font-heading">
                  {company.name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider truncate">
                    Paver Block OS
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick-filter Navigation Input */}
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Jump to module..."
              className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            ) : (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-400 px-1 py-0.5 rounded border border-slate-700/60">
                ⌘K
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {filteredSections.map(section => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 pt-1 pb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span>{section.title}</span>
                <span className="h-px flex-1 bg-slate-800/80 ml-2" />
              </div>

              <div className="space-y-0.5">
                {section.items.map(item => (
                  <NavGroup key={item.label} item={item} />
                ))}
              </div>
            </div>
          ))}

          {filteredSections.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400">
              No navigation module found matching "{searchQuery}"
            </div>
          )}
        </nav>

        {/* Industrial Plant Cockpit Status Widget & Settings */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 shrink-0 space-y-2">
          {/* Micro Plant Status Card */}
          <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Activity className="h-3.5 w-3.5 animate-pulse" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-200 leading-tight">Plant #1 Active</p>
                <p className="text-[9px] text-slate-400 font-mono">FY 2025–26 Live</p>
              </div>
            </div>
            <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              Online
            </span>
          </div>

          {/* Settings link */}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200',
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
              )
            }
          >
            <Settings className="h-4 w-4 text-slate-400 group-hover:text-cyan-400 group-hover:rotate-45 transition-transform duration-300" />
            <span className="flex-1">System Settings</span>
            <span className="text-[10px] text-slate-400 font-mono group-hover:text-slate-300">Config</span>
          </NavLink>
        </div>
      </aside>
    </>
  )
}
