'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Attendance } from '@/types'
import { formatDateTime, cn } from '@/lib/utils'
import { LogIn, LogOut, Clock, Calendar, CheckCircle2 } from 'lucide-react'
import { format, differenceInHours, differenceInMinutes } from 'date-fns'
import toast from 'react-hot-toast'

export default function EmployeeAttendancePage() {
  const { profile } = useAuth()
  const [today, setToday] = useState<Attendance | null>(null)
  const [history, setHistory] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [now, setNow] = useState(new Date())

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fetchData = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    const todayStr = new Date().toISOString().split('T')[0]
    const [todayRes, histRes] = await Promise.all([
      supabase.from('attendance').select('*').eq('user_id', profile.id).eq('date', todayStr).single(),
      supabase.from('attendance').select('*').eq('user_id', profile.id).order('date', { ascending: false }).limit(30),
    ])
    if (todayRes.data) setToday(todayRes.data)
    if (histRes.data) setHistory(histRes.data)
    setLoading(false)
  }, [profile])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAction = async () => {
    if (!profile) return
    setChecking(true)
    const todayStr = new Date().toISOString().split('T')[0]

    if (!today) {
      const { data } = await supabase.from('attendance').insert([{
        user_id: profile.id, date: todayStr, check_in: new Date().toISOString()
      }]).select().single()
      if (data) { setToday(data); toast.success('Good morning! You\'re checked in 🌟') }
    } else if (!today.check_out) {
      const { data } = await supabase.from('attendance').update({ check_out: new Date().toISOString() })
        .eq('id', today.id).select().single()
      if (data) { setToday(data); toast.success('Checked out. Great work today! 💪') }
    }
    fetchData()
    setChecking(false)
  }

  const getDuration = (checkIn?: string, checkOut?: string) => {
    if (!checkIn) return null
    const start = new Date(checkIn)
    const end = checkOut ? new Date(checkOut) : now
    const totalMins = differenceInMinutes(end, start)
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    return { hours: h, minutes: m, label: `${h}h ${m}m` }
  }

  const todayDuration = getDuration(today?.check_in, today?.check_out)
  const checkedIn = !!today?.check_in
  const checkedOut = !!today?.check_out

  const totalHoursThisMonth = history.reduce((acc, a) => {
    if (!a.check_in || !a.check_out) return acc
    return acc + differenceInMinutes(new Date(a.check_out), new Date(a.check_in)) / 60
  }, 0)

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Track your daily check-in and check-out</p>
      </div>

      {/* Today's status card */}
      <div className="card p-6 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{format(now, 'EEEE, MMMM d, yyyy')}</p>
        <p className="text-4xl font-mono font-bold text-slate-900 dark:text-white mb-4">
          {format(now, 'hh:mm:ss a')}
        </p>

        {/* Status indicator */}
        <div className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6',
          !checkedIn ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' :
          !checkedOut ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
          'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
        )}>
          <span className={cn('w-2 h-2 rounded-full', !checkedIn ? 'bg-slate-400' : !checkedOut ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500')} />
          {!checkedIn ? 'Not checked in' : !checkedOut ? 'Currently working' : 'Day completed'}
        </div>

        {/* Times */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Check In</p>
            <p className="text-base font-semibold text-slate-900 dark:text-white mt-0.5">
              {today?.check_in ? format(new Date(today.check_in), 'h:mm a') : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Duration</p>
            <p className={cn('text-base font-semibold mt-0.5', checkedIn && !checkedOut ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white')}>
              {todayDuration?.label || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Check Out</p>
            <p className="text-base font-semibold text-slate-900 dark:text-white mt-0.5">
              {today?.check_out ? format(new Date(today.check_out), 'h:mm a') : '—'}
            </p>
          </div>
        </div>

        {!checkedOut && (
          <button onClick={handleAction} disabled={checking} className={cn(
            'btn-primary px-8 py-3 text-base',
            checkedIn && 'bg-slate-700 hover:bg-slate-800'
          )}>
            {checkedIn ? <><LogOut className="w-5 h-5" /> Check Out</> : <><LogIn className="w-5 h-5" /> Check In</>}
          </button>
        )}

        {checkedOut && (
          <div className="flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Attendance recorded for today</span>
          </div>
        )}
      </div>

      {/* Monthly summary */}
      <div className="card p-4">
        <h2 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">This Month</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-xl font-bold text-slate-900 dark:text-white">{history.filter(a => a.check_in).length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Days Present</p>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{Math.round(totalHoursThisMonth)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Hours</p>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {history.length > 0 ? Math.round(totalHoursThisMonth / history.filter(a => a.check_in && a.check_out).length || 0) : 0}h
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Avg/Day</p>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Attendance History</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {loading ? (
            <div className="p-4 text-center text-slate-400 text-sm">Loading…</div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No attendance records yet</div>
          ) : history.map(a => {
            const dur = getDuration(a.check_in, a.check_out)
            return (
              <div key={a.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {format(new Date(a.date), 'EEE, MMM d')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {a.check_in ? format(new Date(a.check_in), 'h:mm a') : 'No check-in'}
                      {a.check_out ? ` → ${format(new Date(a.check_out), 'h:mm a')}` : ''}
                    </p>
                  </div>
                </div>
                <span className={cn('text-sm font-semibold', dur ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400')}>
                  {dur?.label || '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
