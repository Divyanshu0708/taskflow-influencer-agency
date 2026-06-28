'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { TaskSummary } from '@/types'
import { getInitials, cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'
import { FileText, FileSpreadsheet, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function AdminReportsPage() {
  const [summaries, setSummaries] = useState<TaskSummary[]>([])
  const [weeklyData, setWeeklyData] = useState<{ date: string; created: number; completed: number }[]>([])
  const [tasksByCategory, setTasksByCategory] = useState<{ name: string; value: number }[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryRes, tasksRes] = await Promise.all([
        supabase.from('task_summary').select('*').order('completion_rate', { ascending: false }),
        supabase.from('tasks').select('id, status, category, created_at, completed_at, deadline'),
      ])

      if (summaryRes.data) setSummaries(summaryRes.data)

      if (tasksRes.data) {
        const tasks = tasksRes.data

        // Weekly data (last 7 days)
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (6 - i))
          const dateStr = d.toISOString().split('T')[0]
          return {
            date: d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
            created: tasks.filter(t => t.created_at?.startsWith(dateStr)).length,
            completed: tasks.filter(t => t.completed_at?.startsWith(dateStr)).length,
          }
        })
        setWeeklyData(days)

        // Tasks by category
        const catMap: Record<string, number> = {}
        tasks.forEach(t => {
          const cat = t.category || 'Uncategorized'
          catMap[cat] = (catMap[cat] || 0) + 1
        })
        const catData = Object.entries(catMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6)
        setTasksByCategory(catData)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const exportToExcel = () => {
    if (summaries.length === 0) { toast.error('No data to export'); return }
    const data = summaries.map(s => ({
      'Employee': s.full_name,
      'Email': s.email,
      'Department': s.department || '—',
      'Total Tasks': s.total_tasks,
      'Completed': s.completed_tasks,
      'In Progress': s.in_progress_tasks,
      'Not Started': s.not_started_tasks,
      'Overdue': s.overdue_tasks,
      'Completion Rate (%)': s.completion_rate,
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Performance Report')
    XLSX.writeFile(wb, `TaskFlow_Report_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Exported to Excel')
  }

  const exportToPDF = async () => {
    if (summaries.length === 0) { toast.error('No data to export'); return }
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.text('TaskFlow — Performance Report', 14, 20)
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)

      autoTable(doc, {
        startY: 35,
        head: [['Employee', 'Department', 'Total', 'Done', 'In Progress', 'Overdue', 'Rate']],
        body: summaries.map(s => [
          s.full_name,
          s.department || '—',
          s.total_tasks,
          s.completed_tasks,
          s.in_progress_tasks,
          s.overdue_tasks,
          `${s.completion_rate}%`
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [99, 102, 241] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      })

      doc.save(`TaskFlow_Report_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('Exported to PDF')
    } catch {
      toast.error('Failed to generate PDF')
    }
  }

  const totals = summaries.reduce(
    (acc, s) => ({
      total: acc.total + s.total_tasks,
      completed: acc.completed + s.completed_tasks,
      overdue: acc.overdue + s.overdue_tasks,
      inProgress: acc.inProgress + s.in_progress_tasks,
    }),
    { total: 0, completed: 0, overdue: 0, inProgress: 0 }
  )

  const pieData = [
    { name: 'Completed', value: totals.completed },
    { name: 'In Progress', value: totals.inProgress },
    { name: 'Not Started', value: Math.max(0, totals.total - totals.completed - totals.inProgress - totals.overdue) },
    { name: 'Overdue', value: totals.overdue },
  ].filter(d => d.value > 0)

  const overallRate = totals.total > 0 ? Math.round(totals.completed / totals.total * 100) : 0

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Performance & productivity analytics</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportToExcel} className="btn-secondary text-sm" disabled={loading}>
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={exportToPDF} className="btn-secondary text-sm" disabled={loading}>
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Tasks', value: totals.total, icon: CheckCircle2, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'Completed', value: totals.completed, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'In Progress', value: totals.inProgress, icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Overdue', value: totals.overdue, icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
        ].map(stat => (
          <div key={stat.label} className="card p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', stat.bg)}>
              <stat.icon className={cn('w-5 h-5', stat.color)} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {loading ? '—' : stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {/* Weekly trend */}
        <div className="lg:col-span-2 card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">7-Day Activity Trend</h2>
          {loading ? (
            <div className="h-[220px] bg-slate-50 dark:bg-slate-800 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="created" name="Created" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">Task Distribution</h2>
          <p className="text-xs text-slate-400 mb-3">Overall rate: <span className="font-semibold text-indigo-600">{overallRate}%</span></p>
          {loading ? (
            <div className="h-[160px] bg-slate-50 dark:bg-slate-800 rounded-lg animate-pulse" />
          ) : pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-slate-600 dark:text-slate-400">{item.name}</span>
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-slate-400 text-sm">No task data yet</div>
          )}
        </div>
      </div>

      {/* Category breakdown */}
      {tasksByCategory.length > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Tasks by Category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tasksByCategory.map((cat, i) => (
              <div key={cat.name} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">{cat.name}</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{cat.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employee performance table */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">Employee Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                {['Employee', 'Department', 'Total', 'Completed', 'In Progress', 'Overdue', 'Rate'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : summaries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">No employee data yet</td>
                </tr>
              ) : summaries.map(emp => (
                <tr key={emp.employee_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
                        {getInitials(emp.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{emp.full_name}</p>
                        <p className="text-xs text-slate-400 truncate">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">{emp.department || '—'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{emp.total_tasks}</td>
                  <td className="px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400 font-medium">{emp.completed_tasks}</td>
                  <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400">{emp.in_progress_tasks}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-sm font-medium', emp.overdue_tasks > 0 ? 'text-red-500' : 'text-slate-400')}>
                      {emp.overdue_tasks}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            emp.completion_rate >= 75 ? 'bg-emerald-500' :
                            emp.completion_rate >= 50 ? 'bg-indigo-500' : 'bg-amber-500'
                          )}
                          style={{ width: `${emp.completion_rate}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-8 text-right shrink-0">
                        {emp.completion_rate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
