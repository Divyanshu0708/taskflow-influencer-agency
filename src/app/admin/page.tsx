'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Task, TaskSummary, DashboardStats } from '@/types'
import { formatDate, statusConfig, priorityConfig, getInitials, cn } from '@/lib/utils'
import StatsCard from '@/components/shared/StatsCard'
import { CheckSquare, Clock, AlertCircle, Users, TrendingUp, Plus, ArrowRight, UserCheck } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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
      const today = new Date().toISOString().split('T')[0]
      const now = new Date().toISOString()
      const [allTasksRes, recentRes, employeesRes, attendanceRes, summaryRes] = await Promise.all([
        supabase.from('tasks').select('id, status, deadline'),
        supabase.from('tasks').select('id, title, priority, status, deadline, assigned_to, assignee:profiles!tasks_assigned_to_fkey(id, full_name)').order('created_at', { ascending: false }).limit(5) as any,
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'employee').eq('is_active', true),
        supabase.from('attendance').select('id', { count: 'exact' }).eq('date', today),
        supabase.from('task_summary').select('*').order('completion_rate', { ascending: false }).limit(5),
      ])

      const allTasks = allTasksRes.data || []
      const completed = allTasks.filter((t: any) => t.status === 'completed').length
      const inProgress = allTasks.filter((t: any) => t.status === 'in_progress').length
      const overdue = allTasks.filter((t: any) => t.status !== 'completed' && t.deadline && t.deadline < now).length

      setStats({
        total_tasks: allTasks.length, completed_tasks: completed, in_progress_tasks: inProgress,
        overdue_tasks: overdue, not_started_tasks: allTasks.filter((t: any) => t.status === 'not_started').length,
        total_employees: employeesRes.count ?? 0, today_checkins: attendanceRes.count ?? 0,
        completion_rate: allTasks.length > 0 ? Math.round(completed / allTasks.length * 100) : 0,
      })
      setRecentTasks(recentRes.data || [])
      setEmployeeSummary(summaryRes.data || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchDashboardData() }, [fetchDashboardData])

  const chartData = employeeSummary.map(e => ({
    name: e.full_name.split(' ')[0],
    completed: e.completed_tasks,
    pending: Math.max(0, e.total_tasks - e.completed_tasks),
  }))

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="h-8 w-56 bg-[#1A1A1A] rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-[#1A1A1A] rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{greeting}! 👋</h1>
          <p className="text-slate-500 text-sm mt-0.5">Here's what's happening with your team today.</p>
        </div>
        <Link href="/admin/tasks?new=true" className="btn-primary">
          <Plus className="w-4 h-4" /> New Task
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard title="Total Tasks" value={stats?.total_tasks ?? 0} icon={CheckSquare}
          iconColor="text-[#F5A623]" iconBg="bg-[#F5A623]/10" gold />
        <StatsCard title="Completed" value={stats?.completed_tasks ?? 0} icon={CheckSquare}
          iconColor="text-emerald-400" iconBg="bg-emerald-500/10"
          trend={`${stats?.completion_rate ?? 0}% rate`} trendUp />
        <StatsCard title="In Progress" value={stats?.in_progress_tasks ?? 0} icon={Clock}
          iconColor="text-blue-400" iconBg="bg-blue-500/10" />
        <StatsCard title="Overdue" value={stats?.overdue_tasks ?? 0} icon={AlertCircle}
          iconColor="text-red-400" iconBg="bg-red-500/10"
          trend={stats?.overdue_tasks ? `${stats.overdue_tasks} need attention` : 'All on track!'}
          trendUp={!stats?.overdue_tasks} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-[#1A1A1A] rounded-xl border border-[#2E2E2E] p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white">Team Performance</h2>
            <Link href="/admin/reports" className="text-xs text-[#F5A623] hover:text-[#FFB83F] flex items-center gap-1 transition-colors">
              Full report <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={20} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2E2E2E" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #2E2E2E', background: '#1A1A1A', color: '#fff', fontSize: '12px' }} />
                <Bar dataKey="completed" name="Completed" fill="#F5A623" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#2E2E2E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center text-slate-600">
              <CheckSquare className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">Assign tasks to see team performance</p>
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="space-y-3">
          {[
            { label: 'Active Employees', value: stats?.total_employees ?? 0, icon: Users, color: 'text-[#F5A623]', bg: 'bg-[#F5A623]/10' },
            { label: 'Checked In Today', value: stats?.today_checkins ?? 0, icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Completion Rate', value: `${stats?.completion_rate ?? 0}%`, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          ].map(s => (
            <div key={s.label} className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl p-4 flex items-center gap-3 hover:border-[#F5A623]/20 transition-colors">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', s.bg)}>
                <s.icon className={cn('w-5 h-5', s.color)} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="text-xl font-bold text-white">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Tasks */}
        <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-3">
            <h2 className="font-semibold text-white">Recent Tasks</h2>
            <Link href="/admin/tasks" className="text-xs text-[#F5A623] hover:text-[#FFB83F] flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#2E2E2E]">
            {recentTasks.length === 0 ? (
              <div className="p-8 text-center"><p className="text-sm text-slate-600">No tasks yet</p></div>
            ) : recentTasks.map((task: any) => {
              const pr = priorityConfig[task.priority as keyof typeof priorityConfig]
              const st = statusConfig[task.status as keyof typeof statusConfig]
              return (
                <div key={task.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#242424] transition-colors">
                  <div className={cn('w-1.5 h-8 rounded-full shrink-0', pr.dot)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{task.title}</p>
                    <p className="text-xs text-slate-600">{task.assignee?.full_name ?? 'Unassigned'} · {formatDate(task.deadline)}</p>
                  </div>
                  <span className={cn('badge text-xs shrink-0', st.bg, st.color)}>{st.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Employee Progress */}
        <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-3">
            <h2 className="font-semibold text-white">Employee Progress</h2>
            <Link href="/admin/employees" className="text-xs text-[#F5A623] hover:text-[#FFB83F] flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#2E2E2E]">
            {employeeSummary.length === 0 ? (
              <div className="p-8 text-center"><p className="text-sm text-slate-600">No employees yet</p></div>
            ) : employeeSummary.map((emp, i) => (
              <div key={emp.employee_id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#242424] transition-colors">
                <span className="text-xs font-bold text-slate-600 w-5 shrink-0 text-center">#{i + 1}</span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#0D0D0D] text-xs font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #F5A623 0%, #E07B00 100%)' }}>
                  {getInitials(emp.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{emp.full_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-[#2E2E2E] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${emp.completion_rate}%`, background: 'linear-gradient(90deg, #F5A623, #E07B00)' }} />
                    </div>
                    <span className="text-xs text-slate-500 shrink-0">{emp.completion_rate}%</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-white">{emp.completed_tasks}/{emp.total_tasks}</p>
                  {emp.overdue_tasks > 0 && <p className="text-xs text-red-400">{emp.overdue_tasks} late</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
