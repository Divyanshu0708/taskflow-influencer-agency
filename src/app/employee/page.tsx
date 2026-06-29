'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Task, Attendance } from '@/types'
import { statusConfig, priorityConfig, formatDate, getDeadlineLabel, isOverdue, cn } from '@/lib/utils'
import { CheckCircle2, Clock, AlertCircle, ArrowRight, LogIn, LogOut, CheckSquare, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function EmployeeDashboard() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [attendance, setAttendance] = useState<Attendance | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
  }, [])

  const fetchData = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const [tasksRes, attRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*, assignee:profiles!tasks_assigned_to_fkey(id, full_name)')
          .eq('assigned_to', profile.id)
          .order('deadline', { ascending: true, nullsFirst: false }),
        supabase
          .from('attendance')
          .select('*')
          .eq('user_id', profile.id)
          .eq('date', today)
          .maybeSingle(),
      ])
      if (tasksRes.data) setTasks(tasksRes.data)
      setAttendance(attRes.data ?? null)
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCheckIn = async () => {
    if (!profile || checkingIn) return
    setCheckingIn(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      if (!attendance) {
        const { data, error } = await supabase
          .from('attendance')
          .insert([{ user_id: profile.id, date: today, check_in: new Date().toISOString() }])
          .select()
          .single()
        if (error) throw error
        setAttendance(data)
        toast.success('Checked in! Have a great day 🎉')
      } else if (!attendance.check_out) {
        const { data, error } = await supabase
          .from('attendance')
          .update({ check_out: new Date().toISOString() })
          .eq('id', attendance.id)
          .select()
          .single()
        if (error) throw error
        setAttendance(data)
        toast.success('Checked out. See you tomorrow! 👋')
      }
    } catch {
      toast.error('Failed to record attendance')
    } finally {
      setCheckingIn(false)
    }
  }

  const now = new Date()
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => isOverdue(t.deadline, t.status)).length,
  }

  const urgentTasks = tasks
    .filter(t => t.status !== 'completed' && (t.priority === 'high' || isOverdue(t.deadline, t.status)))
    .slice(0, 5)

  const activeTasks = tasks.filter(t => t.status !== 'completed').slice(0, 5)

  const checkedIn = !!attendance?.check_in
  const checkedOut = !!attendance?.check_out
  const completionRate = stats.total > 0 ? Math.round(stats.completed / stats.total * 100) : 0

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {greeting}, {profile?.full_name.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {format(now, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Check-in widget */}
        <div className="card p-3 flex items-center gap-3">
          <div>
            <p className="text-xs text-slate-500">
              {!checkedIn ? 'Not checked in yet'
                : !checkedOut ? `In since ${format(new Date(attendance!.check_in!), 'h:mm a')}`
                : `Done at ${format(new Date(attendance!.check_out!), 'h:mm a')}`}
            </p>
            <p className="text-xs font-semibold text-slate-300">
              {!checkedIn ? 'Check in to start your day' : !checkedOut ? 'Currently working' : 'Day complete ✓'}
            </p>
          </div>
          {!checkedOut && (
            <button
              onClick={handleCheckIn}
              disabled={checkingIn}
              className={cn(
                'btn-primary text-xs px-3 py-2 shrink-0',
                checkedIn && 'bg-slate-700 hover:bg-slate-800'
              )}
            >
              {checkingIn ? (
                <Clock className="w-3.5 h-3.5 animate-spin" />
              ) : checkedIn ? (
                <><LogOut className="w-3.5 h-3.5" /> Check Out</>
              ) : (
                <><LogIn className="w-3.5 h-3.5" /> Check In</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: CheckSquare },
          { label: 'Completed', value: stats.completed, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: CheckCircle2 },
          { label: 'In Progress', value: stats.inProgress, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: Clock },
          { label: 'Overdue', value: stats.overdue, color: stats.overdue > 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-400', bg: stats.overdue > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-[#242424]', icon: AlertCircle },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', s.bg)}>
              <s.icon className={cn('w-5 h-5', s.color)} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-xl font-bold text-white">
                {loading ? '—' : s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {!loading && stats.total > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-300">Overall Progress</p>
            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{completionRate}%</p>
          </div>
          <div className="h-2.5 bg-[#2E2E2E] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-700"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">{stats.completed} of {stats.total} tasks completed</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Urgent / Overdue */}
        {urgentTasks.length > 0 && (
          <div className="card overflow-hidden">
            <div className="p-4 pb-3 border-b border-[#2E2E2E] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <h2 className="font-semibold text-white text-sm">Needs Attention</h2>
              <span className="ml-auto bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs px-2 py-0.5 rounded-full font-medium">
                {urgentTasks.length}
              </span>
            </div>
            <div className="divide-y divide-[#2E2E2E]">
              {urgentTasks.map(task => {
                const pr = priorityConfig[task.priority]
                const overdue = isOverdue(task.deadline, task.status)
                return (
                  <Link
                    key={task.id}
                    href="/employee/tasks"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#242424]/30 transition-colors"
                  >
                    <div className={cn('w-1.5 h-8 rounded-full shrink-0', pr.dot)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{task.title}</p>
                      <p className={cn('text-xs mt-0.5', overdue ? 'text-red-500' : 'text-amber-500')}>
                        {overdue ? '⚠️ Overdue' : getDeadlineLabel(task.deadline)}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Active tasks */}
        <div className={cn('card overflow-hidden', urgentTasks.length === 0 && 'sm:col-span-2')}>
          <div className="p-4 pb-3 border-b border-[#2E2E2E] flex items-center justify-between">
            <h2 className="font-semibold text-white text-sm">Active Tasks</h2>
            <Link href="/employee/tasks" className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
              All tasks <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#2E2E2E]">
            {loading ? (
              <div className="p-4 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-[#2E2E2E] rounded animate-pulse" />
                ))}
              </div>
            ) : activeTasks.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  {stats.total === 0 ? 'No tasks assigned yet' : 'All tasks completed! 🎉'}
                </p>
              </div>
            ) : activeTasks.map(task => {
              const st = statusConfig[task.status]
              return (
                <Link
                  key={task.id}
                  href="/employee/tasks"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#242424]/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{task.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(task.deadline)}
                    </p>
                  </div>
                  <span className={cn('badge text-xs shrink-0', st.bg, st.color)}>{st.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
