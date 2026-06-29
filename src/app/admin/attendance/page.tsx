'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Attendance, Profile } from '@/types'
import { cn } from '@/lib/utils'
import { Calendar, Clock, UserCheck, UserX } from 'lucide-react'
import { format, differenceInMinutes } from 'date-fns'

export default function AdminAttendancePage() {
  const [attendance, setAttendance] = useState<(Attendance & { user?: Profile })[]>([])
  const [employees, setEmployees] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [attRes, empRes] = await Promise.all([
        supabase
          .from('attendance')
          .select('*, user:profiles(*)')
          .eq('date', selectedDate)
          .order('check_in', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .eq('role', 'employee')
          .eq('is_active', true)
          .order('full_name'),
      ])
      if (attRes.data) setAttendance(attRes.data)
      if (empRes.data) setEmployees(empRes.data)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => { fetchData() }, [fetchData])

  const checkedInIds = new Set(attendance.map(a => a.user_id))
  const notCheckedIn = employees.filter(e => !checkedInIds.has(e.id))

  const getDuration = (checkIn?: string | null, checkOut?: string | null) => {
    if (!checkIn) return '—'
    const start = new Date(checkIn)
    const end = checkOut ? new Date(checkOut) : new Date()
    const mins = Math.max(0, differenceInMinutes(end, start))
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m}m`
  }

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const isToday = selectedDate === new Date().toISOString().split('T')[0]

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Attendance</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isToday ? 'Today' : format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')} ·{' '}
            {attendance.length} of {employees.length} checked in
          </p>
        </div>
        <input
          type="date"
          className="input text-sm w-auto"
          value={selectedDate}
          max={new Date().toISOString().split('T')[0]}
          onChange={e => setSelectedDate(e.target.value)}
          aria-label="Select date"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Checked In', value: attendance.length, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Absent', value: notCheckedIn.length, color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Total Team', value: employees.length, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
        ].map(s => (
          <div key={s.label} className={cn('card p-4 text-center', s.bg, 'border-0')}>
            <p className={cn('text-2xl font-bold', s.color)}>{loading ? '—' : s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Checked in */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-[#2E2E2E] flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <h2 className="font-semibold text-white text-sm">
              Checked In ({attendance.length})
            </h2>
          </div>
          <div className="divide-y divide-[#2E2E2E] max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-slate-400 text-sm">Loading…</div>
            ) : attendance.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No check-ins for this date</div>
            ) : attendance.map(a => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {a.user ? getInitials(a.user.full_name) : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {a.user?.full_name ?? 'Unknown'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">
                      {a.check_in ? format(new Date(a.check_in), 'h:mm a') : '—'}
                      {a.check_out ? ` → ${format(new Date(a.check_out), 'h:mm a')}` : isToday ? ' (active)' : ''}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-slate-300">
                    {getDuration(a.check_in, a.check_out)}
                  </p>
                  <span className={cn(
                    'text-xs',
                    a.check_out ? 'text-slate-400' : 'text-emerald-500'
                  )}>
                    {a.check_out ? 'Done' : 'Working'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Not checked in */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-[#2E2E2E] flex items-center gap-2">
            <UserX className="w-4 h-4 text-red-400" />
            <h2 className="font-semibold text-white text-sm">
              Not Checked In ({notCheckedIn.length})
            </h2>
          </div>
          <div className="divide-y divide-[#2E2E2E] max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-slate-400 text-sm">Loading…</div>
            ) : notCheckedIn.length === 0 ? (
              <div className="p-8 text-center">
                <UserCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Everyone is present! 🎉</p>
              </div>
            ) : notCheckedIn.map(emp => (
              <div key={emp.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 text-xs font-semibold shrink-0">
                  {getInitials(emp.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{emp.full_name}</p>
                  <p className="text-xs text-slate-400">{emp.department || emp.email}</p>
                </div>
                <span className="text-xs text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full shrink-0">
                  Absent
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
