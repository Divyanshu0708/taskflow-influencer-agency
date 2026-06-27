'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Task, TaskSummary, DashboardStats, Profile } from '@/types'
import { formatDate, formatRelative, statusConfig, priorityConfig, getInitials, cn } from '@/lib/utils'
import StatsCard from '@/components/shared/StatsCard'
import {
  CheckSquare, Clock, AlertCircle, Users, TrendingUp,
  Plus, ArrowRight, Circle, Calendar, UserCheck
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  const [employeeSummary, setEmployeeSummary] = useState<TaskSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
  }, [])

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      const [tasksRes, profilesRes, attendanceRes, summaryRes] = await Promise.all([
        supabase.from('tasks').select('*, assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url)').order('created_at', { ascending: false }).limit(8),
        supabase.from('profiles').select('id').eq('role', 'employee').eq('is_active', true),
        supabase.from('attendance').select('id').eq('date', new Date().toISOString().split('T')[0]),
        supabase.from('task_summary').select('*'),
      ])

      const tasks = tasksRes.data || []
      const totalTasks = tasks.length
      const allTasksRes = await supabase.from('tasks').select('id, status, deadline')
      const allTasks = allTasksRes.data || []

      const completed = allTasks.filter(t => t.status === 'completed').length
      const inProgress = allTasks.filter(t => t.status === 'in_progress').length
      const overdue = allTasks.filter(t => t.status !== 'completed' && t.deadline && new Date(t.deadline) < new Date()).length
      const notStarted = allTasks.filter(t => t.status === 'not_started').length

      setStats({
        total_tasks: allTasks.length,
        completed_tasks: completed,
        in_progress_tasks: inProgress,
        overdue_tasks: overdue,
        not_started_tasks: notStarted,
        total_employees: (profilesRes.data || []).length,
        today_checkins: (attendanceRes.data || []).length,
        completion_rate: allTasks.length > 0 ? Math.round(completed / allTasks.length * 100) : 0,
      })
      setRecentTasks(tasks)
      setEmployeeSummary(summaryRes.data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDashboardData() }, [fetchDashboardData])

  const chartData = employeeSummary.slice(0, 6).map(e => ({
    name: e.full_name.split(' ')[0],
    completed: e.completed_tasks,
    pending: e.total_tasks - e.completed_tasks,
    rate: e.completion_rate,
  }))

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{greeting}! 👋</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Here's what's happening with your team today.
          </p>
        </div>
        <Link href="/admin/tasks?new=true" className="btn-primary">
          <Plus className="w-4 h-4" /> New Task
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          title="Total Tasks"
          value={stats?.total_tasks ?? 0}
          icon={CheckSquare}
          iconColor="text-indigo-600 dark:text-indigo-400"
          iconBg="bg-indigo-50 dark:bg-indigo-900/20"
        />
        <StatsCard
          title="Completed"
          value={stats?.completed_tasks ?? 0}
          icon={CheckSquare}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
          trend={`${stats?.completion_rate ?? 0}% completion rate`}
          trendUp
        />
        <StatsCard
          title="In Progress"
          value={stats?.in_progress_tasks ?? 0}
          icon={Clock}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatsCard
          title="Overdue"
          value={stats?.overdue_tasks ?? 0}
          icon={AlertCircle}
          iconColor="text-red-600 dark:text-red-400"
          iconBg="bg-red-50 dark:bg-red-900/20"
          trend={stats?.overdue_tasks ? 'Needs attention' : 'All on track!'}
          trendUp={!stats?.overdue_tasks}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Team Performance Chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900 dark:text-white">Team Performance</h2>
            <Link href="/admin/reports" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
              Full report <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={20} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }}
                />
                <Bar dataKey="completed" name="Completed" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
              No data yet — assign some tasks to get started
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="space-y-3">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Active Employees</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{stats?.total_employees ?? 0}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Checked In Today</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{stats?.today_checkins ?? 0}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Completion Rate</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{stats?.completion_rate ?? 0}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Tasks */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-3">
            <h2 className="font-semibold text-slate-900 dark:text-white">Recent Tasks</h2>
            <Link href="/admin/tasks" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {recentTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No tasks yet</div>
            ) : recentTasks.slice(0, 5).map(task => {
              const pr = priorityConfig[task.priority]
              const st = statusConfig[task.status]
              return (
                <div key={task.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <div className={cn('w-1.5 h-8 rounded-full shrink-0', pr.dot)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{task.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {(task as any).assignee?.full_name ?? 'Unassigned'} · {formatDate(task.deadline)}
                    </p>
                  </div>
                  <span className={cn('badge text-xs shrink-0', st.bg, st.color)}>{st.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Employee leaderboard */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-3">
            <h2 className="font-semibold text-slate-900 dark:text-white">Employee Progress</h2>
            <Link href="/admin/employees" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {employeeSummary.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No employees yet</div>
            ) : employeeSummary.slice(0, 5).map((emp, i) => (
              <div key={emp.employee_id} className="flex items-center gap-3 px-5 py-3">
                <span className="text-xs font-bold text-slate-400 w-4 shrink-0">#{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {getInitials(emp.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{emp.full_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${emp.completion_rate}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 shrink-0">{emp.completion_rate}%</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{emp.completed_tasks}/{emp.total_tasks}</p>
                  {emp.overdue_tasks > 0 && (
                    <p className="text-xs text-red-500">{emp.overdue_tasks} overdue</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
