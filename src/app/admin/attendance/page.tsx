'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Attendance, Profile } from '@/types'
import { formatDateTime, getInitials, cn } from '@/lib/utils'
import { Calendar, Clock, UserCheck, UserX, Search } from 'lucide-react'
import { format, subDays } from 'date-fns'

export default function AdminAttendancePage() {
  const [attendance, setAttendance] = useState<(Attendance & { user?: Profile })[]>([])
  const [employees, setEmployees] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [attRes, empRes] = await Promise.all([
      supabase.from('attendance').select('*, user:profiles(*)').eq('date', selectedDate).order('check_in', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'employee').eq('is_active', true).order('full_name'),
    ])
    if (attRes.data) setAttendance(attRes.data)
    if (empRes.data) setEmployees(empRes.data)
    setLoading(false)
  }, [selectedDate])

  useEffect(() => { fetchData() }, [fetchData])

  const checkedInIds = new Set(attendance.map(a => a.user_id))
  const notCheckedIn = employees.filter(e => !checkedInIds.has(e.id))

  const filtered = attendance.filter(a =>
    !search || a.user?.full_name.toLowerCase().includes(search.toLowerCase())
  )

  const getDuration = (checkIn?: string, checkOut?: string) => {
    if (!checkIn) return '—'
    const start = new Date(checkIn)
    const end = checkOut ? new Date(checkOut) : new Date()
    const mins = Math.floor((end.getTime() - start.getTime()) / 60000)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m}m`
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {attendance.length} of {employees.length} employees checked in today
          </p>
        </div>
        <input
          type="date"
          className="input text-sm w-auto"
          value={selectedDate}
          max={new Date().toISOString().split('T')[0]}
          onChange={e => setSelectedDate(e.target.value)}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{attendance.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Checked In</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{notCheckedIn.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Absent</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">{employees.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Total Team</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Checked in */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Checked In ({attendance.length})</h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <div className="p-4 text-center text-slate-400 text-sm">Loading…</div>
            ) : attendance.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No check-ins for this date</div>
            ) : attendance.map(a => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {a.user ? getInitials(a.user.full_name) : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{a.user?.full_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {a.check_in ? format(new Date(a.check_in), 'h:mm a') : '—'}
                    </span>
                    {a.check_out && (
                      <span className="text-xs text-slate-400">→ {format(new Date(a.check_out), 'h:mm a')}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{getDuration(a.check_in, a.check_out)}</p>
                  <span className={cn('text-xs', a.check_out ? 'text-slate-400' : 'text-emerald-500')}>
                    {a.check_out ? 'Checked out' : 'Active'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Not checked in */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <UserX className="w-4 h-4 text-red-400" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Not Checked In ({notCheckedIn.length})</h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {notCheckedIn.length === 0 ? (
              <div className="p-8 text-center text-sm">
                <UserCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-slate-500 dark:text-slate-400">Everyone is present!</p>
              </div>
            ) : notCheckedIn.map(emp => (
              <div key={emp.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 text-xs font-semibold shrink-0">
                  {getInitials(emp.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{emp.full_name}</p>
                  <p className="text-xs text-slate-400">{emp.department || emp.email}</p>
                </div>
                <span className="text-xs text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">Absent</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
