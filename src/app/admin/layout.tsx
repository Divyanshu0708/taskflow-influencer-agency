'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Navbar from '@/components/shared/Navbar'
import {
  LayoutDashboard, CheckSquare, Users, BarChart3,
  Calendar, Settings, ChevronRight, Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/admin/employees', icon: Users, label: 'Employees' },
  { href: '/admin/reports', icon: BarChart3, label: 'Reports' },
  { href: '/admin/attendance', icon: Calendar, label: 'Attendance' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!loading && profile && profile.role !== 'admin') {
      router.replace('/employee')
    }
    if (!loading && !profile) {
      router.replace('/auth/login')
    }
  }, [profile, loading, router])

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} menuOpen={sidebarOpen} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={cn(
          'fixed lg:static inset-y-0 left-0 z-30 w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800',
          'flex flex-col pt-16 lg:pt-0 transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}>
          <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 py-2">
              Admin Panel
            </p>
            {navItems.map(({ href, icon: Icon, label }) => {
              const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn('sidebar-item', active && 'active')}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                  {active && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />}
                </Link>
              )
            })}
          </div>

          <div className="p-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Admin mode</span>
            </div>
          </div>
        </aside>

        {/* Backdrop */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
