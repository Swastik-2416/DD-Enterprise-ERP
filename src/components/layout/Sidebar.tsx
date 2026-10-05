import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, Factory, ShoppingBag,
  CreditCard, Users, UserCheck, TrendingUp, Truck, BarChart3,
  ChevronDown, ChevronRight, Building2, Settings, Menu, X, Clock,
  ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { APP_NAME } from '@/lib/constants'
import { useAuth } from '@/contexts/AuthContext'
import { useCompany } from '@/contexts/CompanyContext'

interface NavItem {
  label: string
  icon: React.ElementType
  path?: string
  children?: NavItem[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Executive Analytics', icon: TrendingUp, path: '/analytics' },
  {
    label: 'Master Data', icon: Package, children: [
      { label: 'Items', icon: Package, path: '/master/items' },
      { label: 'Bill of Materials', icon: Factory, path: '/master/bom' },
      { label: 'Units of Measure', icon: Settings, path: '/master/units' },
      { label: 'Categories', icon: Package, path: '/master/categories' },
    ]
  },
  {
    label: 'Stakeholders', icon: Users, children: [
      { label: 'Vendors', icon: Building2, path: '/stakeholders/vendors' },
      { label: 'Customers', icon: UserCheck, path: '/stakeholders/customers' },
      // { label: 'Employees', icon: Users, path: '/stakeholders/employees' },
      { label: 'Labour', icon: Users, path: '/stakeholders/labour' },
      { label: 'Transporters', icon: Truck, path: '/stakeholders/transporters' },
    ]
  },
  {
    label: 'Procurement', icon: ShoppingCart, children: [
      { label: 'Purchase Orders', icon: ShoppingCart, path: '/procurement/purchase-orders' },
      { label: 'Purchase Invoices', icon: ShoppingCart, path: '/procurement/purchase-invoices' },
      { label: 'Goods Receipts', icon: Package, path: '/procurement/goods-receipts' },
    ]
  },
  {
    label: 'Manufacturing', icon: Factory, children: [
      { label: 'Production Orders', icon: Factory, path: '/manufacturing/production-orders' },
      { label: 'FG Inventory', icon: Package, path: '/manufacturing/fg-inventory' },
    ]
  },
  {
    label: 'Sales', icon: ShoppingBag, children: [
      { label: 'Quotations', icon: ShoppingBag, path: '/sales/quotations' },
      { label: 'Sales Orders', icon: ShoppingBag, path: '/sales/orders' },
      { label: 'Invoices', icon: ShoppingBag, path: '/sales/invoices' },
      { label: 'Delivery Challans', icon: Truck, path: '/sales/delivery-challans' },
      // { label: 'Credit Notes', icon: ShoppingBag, path: '/sales/credit-notes' },
    ]
  },
  {
    label: 'Payments', icon: CreditCard, children: [
      { label: 'Customer Receipts', icon: CreditCard, path: '/payments/inward' },
      { label: 'Vendor Payments', icon: CreditCard, path: '/payments/outward' },
    ]
  },
  {
    label: 'HR & Payroll', icon: UserCheck, children: [
      { label: 'Attendance', icon: UserCheck, path: '/hr/attendance' },
      // { label: 'Payroll', icon: CreditCard, path: '/hr/payroll' },
    ]
  },
  {
    label: 'Transport', icon: Truck, children: [
      { label: 'Freight Register', icon: Truck, path: '/transport/freight' },
      { label: 'Transporter Payments', icon: CreditCard, path: '/transport/payments' },
    ]
  },
  {
    label: 'Finance', icon: TrendingUp, children: [
      { label: 'Customer Ledger', icon: TrendingUp, path: '/finance/customer-ledger' },
      { label: 'Vendor Ledger', icon: TrendingUp, path: '/finance/vendor-ledger' },
      { label: 'Outstanding Aging', icon: Clock, path: '/finance/aging' },
      { label: 'Expenses', icon: TrendingUp, path: '/finance/expenses' },
      { label: 'Other Income', icon: TrendingUp, path: '/finance/other-income' },
      { label: 'P&L Report', icon: TrendingUp, path: '/finance/pl-report' },
    ]
  },
  {
    label: 'Reports', icon: BarChart3, children: [
      { label: 'Sales Register', icon: BarChart3, path: '/reports/sales' },
      { label: 'Purchase Register', icon: BarChart3, path: '/reports/purchases' },
      { label: 'Stock Report', icon: BarChart3, path: '/reports/stock' },
      { label: 'Production Report', icon: BarChart3, path: '/reports/production' },
      { label: 'GST Summary', icon: BarChart3, path: '/reports/gst' },
      { label: 'Audit Trail', icon: ShieldCheck, path: '/settings/audit-logs' },
    ]
  },
]

function NavGroup({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const location = useLocation()
  const isActive = item.children?.some(c => location.pathname.startsWith(c.path ?? '###'))
  const [open, setOpen] = useState(isActive ?? false)

  if (item.path) {
    return (
      <NavLink
        to={item.path}
        end={item.path === '/'}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            depth > 0 ? 'pl-9' : '',
            isActive
              ? 'bg-primary text-white'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          )
        }
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </NavLink>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          'text-on-surface-variant hover:bg-surface-container',
          isActive && 'text-primary font-semibold'
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left truncate">{item.label}</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && (
        <div className="mt-1 space-y-0.5">
          {item.children?.map(child => (
            <NavGroup key={child.label} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth()
  const { company } = useCompany()

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-surface border-r border-outline-variant z-40 flex flex-col sidebar-transition',
          'w-[260px]',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name}
                className="h-8 w-8 object-contain rounded-lg border border-outline-variant shrink-0 bg-white p-0.5"
                onError={e => {
                  ;(e.target as HTMLElement).style.display = 'none'
                }}
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Factory className="h-4 w-4 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-bold text-on-surface leading-none truncate">
                {company.name}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-outline truncate">ERP System</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-primary/10 text-primary font-semibold rounded">
                  FY {company.active_fy.replace('20', '').replace('-20', '-')}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-surface-container rounded shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Company info */}
        <div className="px-4 py-2 bg-background border-b border-outline-variant shrink-0">
          <p className="text-xs text-outline">Logged in as</p>
          <p className="text-xs font-semibold text-on-surface truncate">{user?.full_name}</p>
          <span className={cn(
            'inline-block text-xs px-2 py-0.5 rounded-full mt-0.5 font-medium',
            user?.role === 'manager' ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700'
          )}>
            {user?.role === 'manager' ? 'Manager' : 'Accountant (Read-only)'}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <NavGroup key={item.label} item={item} />
          ))}
        </nav>

        {/* Settings link */}
        <div className="px-3 py-3 border-t border-outline-variant shrink-0">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-on-surface-variant hover:bg-surface-container'
              )
            }
          >
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
        </div>
      </aside>
    </>
  )
}
