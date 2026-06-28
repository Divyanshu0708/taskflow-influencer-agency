'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Notification } from '@/types'
import { formatRelative, getInitials } from '@/lib/utils'
import Image from 'next/image'
import { Bell, LogOut, Menu, X, BellOff } from 'lucide-react'

interface NavbarProps {
  onMenuToggle: () => void
  menuOpen: boolean
}

export default function Navbar({ onMenuToggle, menuOpen }: NavbarProps) {
  const { profile, signOut } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const router = useRouter()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!profile) return
    supabase.from('notifications').select('*').eq('user_id', profile.id)
      .order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setNotifications(data) })

    channelRef.current = supabase.channel(`notifs:${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        (payload) => { setNotifications(prev => [payload.new as Notification, ...prev.slice(0, 19)]) })
      .subscribe()

    return () => {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
    }
  }, [profile])

  const markAllRead = async () => {
    if (!profile) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length
  const handleSignOut = async () => { setShowProfile(false); await signOut(); router.replace('/auth/login') }
  const closeAll = () => { setShowNotifs(false); setShowProfile(false) }

  return (
    <header className="h-16 bg-[#0D0D0D] border-b border-[#2E2E2E] flex items-center px-4 gap-3 sticky top-0 z-40">
      {/* Mobile menu */}
      <button onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-[#1A1A1A] text-slate-400 transition-colors"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Logo */}
      <div className="flex items-center mr-auto">
        <div className="relative w-32 h-10">
          <Image src="/logo.png" alt="HypeMitra" fill className="object-contain object-left" priority />
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false) }}
            className="relative p-2 rounded-lg hover:bg-[#1A1A1A] text-slate-400 hover:text-slate-200 transition-colors"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}>
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F5A623] rounded-full animate-pulse" />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2E2E2E]">
                <h3 className="font-semibold text-sm text-white">
                  Notifications {unreadCount > 0 && <span className="text-xs text-[#F5A623]">({unreadCount})</span>}
                </h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-[#F5A623] hover:text-[#FFB83F] transition-colors">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-[#2E2E2E]">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                    <BellOff className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : notifications.map(notif => (
                  <div key={notif.id} className={`px-4 py-3 transition-colors ${!notif.is_read ? 'bg-[#F5A623]/5' : 'hover:bg-[#242424]'}`}>
                    <div className="flex items-start gap-2">
                      {!notif.is_read && <div className="w-1.5 h-1.5 bg-[#F5A623] rounded-full mt-1.5 shrink-0" />}
                      <div className={!notif.is_read ? '' : 'ml-3.5'}>
                        <p className="text-xs font-medium text-white">{notif.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{notif.message}</p>
                        <p className="text-xs text-slate-600 mt-1">{formatRelative(notif.created_at)}</p>
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
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-[#1A1A1A] transition-colors"
            aria-label="Profile menu">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#0D0D0D] text-xs font-bold shrink-0 select-none"
              style={{ background: 'linear-gradient(135deg, #F5A623 0%, #E07B00 100%)' }}>
              {profile ? getInitials(profile.full_name) : '?'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-white leading-none">{profile?.full_name ?? '…'}</p>
              <p className="text-xs text-slate-500 capitalize mt-0.5">{profile?.role}</p>
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-52 bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-in">
              <div className="px-4 py-3 border-b border-[#2E2E2E]">
                <p className="text-sm font-semibold text-white truncate">{profile?.full_name}</p>
                <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
                <span className="text-xs text-[#F5A623] capitalize font-medium">{profile?.role}</span>
              </div>
              <div className="p-1.5">
                <button onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(showNotifs || showProfile) && (
        <div className="fixed inset-0 z-30" onClick={closeAll} aria-hidden="true" />
      )}
    </header>
  )
}
