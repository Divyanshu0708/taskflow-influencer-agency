'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Attendance } from '@/types'
import { cn } from '@/lib/utils'
import { LogIn, LogOut, Clock, Calendar, CheckCircle2 } from 'lucide-react'
import { format, differenceInMinutes } from 'date-fns'
import toast from 'react-hot-toast'

export default function EmployeeAttendancePage() {
  const { profile } = useAuth()
  const [today, setToday] = useState<Attendance | null>(null)
  const [history, setHistory] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [now, setNow] = useState(new Date())
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Live clock - use ref to avoid re-renders affecting other state
  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const fetchData = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      const [todayRes, histRes] = await Promise.all([
        supabase.from('attendance').select('*').eq('user_id', profile.id).eq('date', todayStr).maybeSingle(),
        supabase.from('attendance').select('*').eq('user_id', profile.id).order('date', { ascending: false }).limit(30),
      ])
      setToday(todayRes.data ?? null)
      setHistory(histRes.data || [])
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAction = async () => {
    if (!profile || checking) return
    setChecking(true)
    try {
      const todayStr = new Date().toISOString().split('T')[0]

      if (!today) {
        const { data, error } = await supabase
          .from('attendance')
          .insert([{ user_id: profile.id, date: todayStr, check_in: new Date().toISOString() }])
          .select()
          .single()
        if (error) throw error
        setToday(data)
        toast.success("Checked in! Have a great day 🌟")
      } else if (!today.check_out) {
        const { data, error } = await supabase
          .from('attendance')
          .update({ check_out: new Date().toISOString() })
          .eq('id', today.id)
          .select()
          .single()
        if (error) throw error
        setToday(data)
        toast.success("Checked out. Great work today! 💪")
      }
      await fetchData()
    } catch {
      toast.error('Failed to record attendance. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  const getDuration = (checkIn?: string | null, checkOut?: string | null, liveNow?: Date) => {
    if (!checkIn) return null
    const start = new Date(checkIn)
    const end = checkOut ? new Date(checkOut) : (liveNow || new Date())
    const totalMins = Math.max(0, differenceInMinutes(end, start))
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    return `${h}h ${m}m`
  }

  const checkedIn = !!today?.check_in
  const checkedOut = !!today?.check_out

  const totalMinsThisMonth = history.reduce((acc, a) => {
    if (!a.check_in || !a.check_out) return acc
    return acc + Math.max(0, differenceInMinutes(new Date(a.check_out), new Date(a.check_in)))
  }, 0)
  const totalHoursThisMonth = Math.round(totalMinsThisMonth / 60)
  const daysWithFullRecord = history.filter(a => a.check_in && a.check_out).length
  const avgHoursPerDay = daysWithFullRecord > 0 ? Math.round(totalMinsThisMonth / daysWithFullRecord / 60) : 0

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Attendance</h1>
        <p className="text-slate-500 text-sm mt-0.5">Track your daily check-in and check-out</p>
      </div>

      {/* Today's check-in card */}
      <div className="card p-6 text-center">
        <p className="text-sm text-slate-500 mb-1">
          {format(now, 'EEEE, MMMM d, yyyy')}
        </p>
        <p className="text-4xl font-mono font-bold text-white mb-4 tabular-nums tracking-tight">
          {format(now, 'hh:mm:ss a')}
        </p>

        {/* Status indicator */}
        <div className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6',
          !checkedIn ? 'bg-[#1A1A1A] text-slate-400'
            : !checkedOut ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
            : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
        )}>
          <span className={cn(
            'w-2 h-2 rounded-full',
            !checkedIn ? 'bg-slate-400'
              : !checkedOut ? 'bg-emerald-500 animate-pulse'
              : 'bg-indigo-500'
          )} />
          {!checkedIn ? 'Not checked in' : !checkedOut ? 'Currently working' : 'Day completed'}
        </div>

        {/* Times */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-xs text-slate-500 mb-1">Check In</p>
            <p className="text-base font-semibold text-white tabular-nums">
              {today?.check_in ? format(new Date(today.check_in), 'h:mm a') : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Duration</p>
            <p className={cn(
              'text-base font-semibold tabular-nums',
              checkedIn && !checkedOut ? 'text-emerald-600 dark:text-emerald-400' : 'text-white'
            )}>
              {checkedIn ? getDuration(today?.check_in, today?.check_out, !checkedOut ? now : undefined) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Check Out</p>
            <p className="text-base font-semibold text-white tabular-nums">
              {today?.check_out ? format(new Date(today.check_out), 'h:mm a') : '—'}
            </p>
          </div>
        </div>

        {!checkedOut ? (
          <button
            onClick={handleAction}
            disabled={checking}
            className={cn(
              'btn-primary px-8 py-3 text-base',
              checkedIn && 'bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500'
            )}
          >
            {checking ? (
              <span className="flex items-center gap-2"><Clock className="w-5 h-5 animate-spin" /> Please wait…</span>
            ) : checkedIn ? (
              <><LogOut className="w-5 h-5" /> Check Out</>
            ) : (
              <><LogIn className="w-5 h-5" /> Check In</>
            )}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Attendance recorded for today</span>
          </div>
        )}
      </div>

      {/* Monthly summary */}
      <div className="card p-4">
        <h2 className="font-semibold text-white mb-3 text-sm">This Month Summary</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Days Present', value: history.filter(a => a.check_in).length, color: 'text-indigo-600 dark:text-indigo-400' },
            { label: 'Total Hours', value: totalHoursThisMonth, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Avg / Day', value: `${avgHoursPerDay}h`, color: 'text-white' },
          ].map(s => (
            <div key={s.label} className="text-center p-3 bg-[#242424] rounded-lg">
              <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-[#2E2E2E]">
          <h2 className="font-semibold text-white text-sm">Attendance History</h2>
        </div>
        <div className="divide-y divide-[#2E2E2E]">
          {loading ? (
            <div className="p-4 text-center text-slate-400 text-sm">Loading…</div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No attendance records yet</div>
          ) : history.map(a => {
            const dur = getDuration(a.check_in, a.check_out)
            return (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">
                    {format(new Date(a.date + 'T00:00:00'), 'EEE, MMM d')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {a.check_in ? format(new Date(a.check_in), 'h:mm a') : 'No check-in'}
                    {a.check_out ? ` → ${format(new Date(a.check_out), 'h:mm a')}` : a.check_in ? ' (no checkout)' : ''}
                  </p>
                </div>
                <span className={cn(
                  'text-sm font-semibold shrink-0',
                  dur ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                )}>
                  {dur || '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
