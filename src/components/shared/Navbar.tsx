'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Notification } from '@/types'
import { formatRelative, getInitials } from '@/lib/utils'
import {
  Sun, Moon, Bell, LogOut, User, CheckSquare,
  Menu, X, BellOff
} from 'lucide-react'

interface NavbarProps {
  onMenuToggle: () => void
  menuOpen: boolean
}

export default function Navbar({ onMenuToggle, menuOpen }: NavbarProps) {
  const { profile, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!profile) return
    fetchNotifications()

    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile])

  const fetchNotifications = async () => {
    if (!profile) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setNotifications(data)
  }

  const markAllRead = async () => {
    if (!profile) return
    await supabase.from('notifications').update({ is_read: true })
      .eq('user_id', profile.id).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const handleSignOut = async () => {
    await signOut()
    router.replace('/auth/login')
  }

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 gap-3 sticky top-0 z-40">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
      >
        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <div className="flex items-center gap-2 mr-auto">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <CheckSquare className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-slate-900 dark:text-white hidden sm:block">TaskFlow</span>
      </div>

      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false) }}
            className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 card shadow-xl z-50 animate-slide-in overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <BellOff className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm">No notifications</p>
                  </div>
                ) : notifications.map(notif => (
                  <div key={notif.id} className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!notif.is_read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                    <div className="flex items-start gap-2">
                      {!notif.is_read && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />}
                      <div className={!notif.is_read ? '' : 'ml-3.5'}>
                        <p className="text-xs font-medium text-slate-900 dark:text-white">{notif.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{notif.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatRelative(notif.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative ml-1">
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotifs(false) }}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {profile ? getInitials(profile.full_name) : 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-900 dark:text-white leading-none">{profile?.full_name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize mt-0.5">{profile?.role}</p>
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-52 card shadow-xl z-50 animate-slide-in overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{profile?.full_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{profile?.email}</p>
              </div>
              <div className="p-1.5">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop for dropdowns */}
      {(showNotifs || showProfile) && (
        <div className="fixed inset-0 z-30" onClick={() => { setShowNotifs(false); setShowProfile(false) }} />
      )}
    </header>
  )
}
