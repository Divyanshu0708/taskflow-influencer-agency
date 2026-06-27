'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Profile, TaskSummary } from '@/types'
import { getInitials, cn } from '@/lib/utils'
import {
  Plus, X, Loader2, Users, Search, Mail, Phone,
  Building2, CheckCircle2, AlertCircle, Clock, Circle,
  Edit2, UserX, UserCheck, Eye
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface EmployeeForm {
  full_name: string
  email: string
  password: string
  department: string
  phone: string
}

const defaultForm: EmployeeForm = { full_name: '', email: '', password: '', department: '', phone: '' }

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Profile[]>([])
  const [summaries, setSummaries] = useState<Record<string, TaskSummary>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<EmployeeForm>(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [empRes, summaryRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'employee').order('full_name'),
      supabase.from('task_summary').select('*'),
    ])
    if (empRes.data) setEmployees(empRes.data)
    if (summaryRes.data) {
      const map: Record<string, TaskSummary> = {}
      summaryRes.data.forEach((s: TaskSummary) => { map[s.employee_id] = s })
      setSummaries(map)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    // Use admin API through a server function (or just use Supabase admin SDK)
    // For client-side, we use signUp and then update role
    const { data, error } = await supabase.auth.admin?.createUser({
      email: form.email,
      password: form.password,
      user_metadata: { full_name: form.full_name, role: 'employee' },
      email_confirm: true,
    }) as any

    if (error) {
      // Fallback: regular signup (works in most setups)
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.full_name, role: 'employee' } }
      })

      if (signupError) {
        toast.error(signupError.message)
        setSubmitting(false)
        return
      }

      // Update profile with extra details
      if (signupData.user) {
        await supabase.from('profiles').upsert({
          id: signupData.user.id,
          email: form.email,
          full_name: form.full_name,
          role: 'employee',
          department: form.department,
          phone: form.phone,
        })
      }
    } else if (data?.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: form.email,
        full_name: form.full_name,
        role: 'employee',
        department: form.department,
        phone: form.phone,
      })
    }

    toast.success(`Employee ${form.full_name} created successfully`)
    setShowModal(false)
    setForm(defaultForm)
    fetchData()
    setSubmitting(false)
  }

  const toggleActive = async (employee: Profile) => {
    await supabase.from('profiles').update({ is_active: !employee.is_active }).eq('id', employee.id)
    toast.success(`${employee.full_name} ${employee.is_active ? 'deactivated' : 'activated'}`)
    fetchData()
  }

  const filtered = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Employees</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{employees.length} team member{employees.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input className="input pl-9 text-sm" placeholder="Search employees…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">{search ? 'No employees found' : 'No employees yet'}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {search ? 'Try a different search' : 'Add your first team member to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(emp => {
            const summary = summaries[emp.id]
            return (
              <div key={emp.id} className={cn('card p-5', !emp.is_active && 'opacity-60')}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold shrink-0">
                      {getInitials(emp.full_name)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{emp.full_name}</h3>
                      {emp.department && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {emp.department}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => toggleActive(emp)}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        emp.is_active
                          ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500'
                          : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-400 hover:text-emerald-500'
                      )}
                      title={emp.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {emp.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  {emp.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{emp.phone}</span>
                    </div>
                  )}
                </div>

                {summary ? (
                  <>
                    <div className="grid grid-cols-4 gap-1 mb-3">
                      {[
                        { label: 'Total', value: summary.total_tasks, color: 'text-slate-600 dark:text-slate-400' },
                        { label: 'Done', value: summary.completed_tasks, color: 'text-emerald-600' },
                        { label: 'Active', value: summary.in_progress_tasks, color: 'text-blue-600' },
                        { label: 'Overdue', value: summary.overdue_tasks, color: 'text-red-500' },
                      ].map(stat => (
                        <div key={stat.label} className="text-center">
                          <p className={cn('text-base font-bold', stat.color)}>{stat.value}</p>
                          <p className="text-xs text-slate-400">{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Completion</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{summary.completion_rate}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            summary.completion_rate >= 75 ? 'bg-emerald-500' :
                            summary.completion_rate >= 50 ? 'bg-indigo-500' :
                            summary.completion_rate >= 25 ? 'bg-amber-500' : 'bg-red-500'
                          )}
                          style={{ width: `${summary.completion_rate}%` }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-2">No tasks assigned yet</p>
                )}

                <Link
                  href={`/admin/tasks?employee=${emp.id}`}
                  className="btn-secondary w-full mt-4 text-xs justify-center"
                >
                  <Eye className="w-3.5 h-3.5" /> View Tasks
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Add Employee</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" placeholder="Sarah Johnson" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Email Address *</label>
                <input type="email" className="input" placeholder="sarah@agency.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Temporary Password *</label>
                <input type="password" className="input" placeholder="Min. 8 characters" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={8} />
                <p className="text-xs text-slate-400 mt-1">Employee can change this after first login</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Department</label>
                  <input className="input" placeholder="Marketing" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" placeholder="+91 9876543210" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
