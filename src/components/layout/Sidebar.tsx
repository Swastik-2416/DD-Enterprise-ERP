import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, Factory, ShoppingBag,
  CreditCard, Users, UserCheck, TrendingUp, Truck, BarChart3,
  ChevronDown, ChevronRight, Building2, Settings, Menu, X
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { APP_NAME } from '@/lib/constants'
import { useAuth } from '@/contexts/AuthContext'

interface NavItem {
  label: string
  icon: React.ElementType
  path?: string
  children?: NavItem[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
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
      { label: 'Suppliers', icon: Building2, path: '/stakeholders/suppliers' },
      { label: 'Customers', icon: UserCheck, path: '/stakeholders/customers' },
      { label: 'Employees', icon: Users, path: '/stakeholders/employees' },
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
      { label: 'Credit Notes', icon: ShoppingBag, path: '/sales/credit-notes' },
    ]
  },
  {
    label: 'Payments', icon: CreditCard, children: [
      { label: 'Customer Receipts', icon: CreditCard, path: '/payments/inward' },
      { label: 'Supplier Payments', icon: CreditCard, path: '/payments/outward' },
    ]
  },
  {
    label: 'HR & Payroll', icon: UserCheck, children: [
      { label: 'Attendance', icon: UserCheck, path: '/hr/attendance' },
      { label: 'Payroll', icon: CreditCard, path: '/hr/payroll' },
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
      { label: 'Supplier Ledger', icon: TrendingUp, path: '/finance/supplier-ledger' },
      { label: 'Expenses', icon: TrendingUp, path: '/finance/expenses' },
      { label: 'Other Income', icon: TrendingUp, path: '/finance/other-income' },
      { label: 'P&L Report', icon: TrendingUp, path: '/finance/pl-report' },
    ]
  },
  {
    label: 'Reports', icon: BarChart3, children: [
      { label: 'Purchase Report', icon: BarChart3, path: '/reports/purchases' },
      { label: 'Sales Report', icon: BarChart3, path: '/reports/sales' },
      { label: 'Stock Report', icon: BarChart3, path: '/reports/stock' },
      { label: 'Production Report', icon: BarChart3, path: '/reports/production' },
      { label: 'GST Summary', icon: BarChart3, path: '/reports/gst' },
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
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
          'text-slate-700 hover:bg-slate-100',
          isActive && 'text-blue-700 font-semibold'
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
          'fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-40 flex flex-col sidebar-transition',
          'w-[260px]',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Factory className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 leading-none">DD Enterprise</div>
              <div className="text-xs text-slate-500">ERP System</div>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-slate-100 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Company info */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
          <p className="text-xs text-slate-500">Logged in as</p>
          <p className="text-xs font-semibold text-slate-800 truncate">{user?.full_name}</p>
          <span className={cn(
            'inline-block text-xs px-2 py-0.5 rounded-full mt-0.5 font-medium',
            user?.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
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
        <div className="px-3 py-3 border-t border-slate-200 shrink-0">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
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
