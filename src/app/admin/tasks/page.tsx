'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTasks } from '@/hooks/useTasks'
import { Task, Profile, TaskStatus, TaskPriority } from '@/types'
import { statusConfig, priorityConfig, getInitials, cn } from '@/lib/utils'
import TaskCard from '@/components/shared/TaskCard'
import TaskDetailModal from '@/components/shared/TaskDetailModal'
import { Plus, Search, X, Loader2, CheckSquare, Users, User, CheckCheck, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

type AssignMode = 'single' | 'multiple' | 'all'

interface TaskFormData {
  title: string
  description: string
  assigned_to: string        // single mode
  assigned_to_multiple: string[] // multiple mode
  assign_mode: AssignMode
  priority: TaskPriority
  deadline: string
  notes: string
  category: string
}

const defaultForm: TaskFormData = {
  title: '', description: '',
  assigned_to: '', assigned_to_multiple: [],
  assign_mode: 'single',
  priority: 'medium', deadline: '', notes: '', category: ''
}

function AdminTasksContent() {
  const { profile } = useAuth()
  const { tasks, loading, fetchTasks, updateTask, updateTaskStatus, deleteTask } = useTasks()
  const [employees, setEmployees] = useState<Profile[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [form, setForm] = useState<TaskFormData>(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitProgress, setSubmitProgress] = useState({ done: 0, total: 0 })
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('')
  const [filterPriority, setFilterPriority] = useState<TaskPriority | ''>('')
  const [filterEmployee, setFilterEmployee] = useState('')
  const searchParams = useSearchParams()

  const loadTasks = useCallback(() => {
    fetchTasks({
      search: search || undefined,
      status: filterStatus || undefined,
      priority: filterPriority || undefined,
      assignedTo: filterEmployee || undefined,
    })
  }, [fetchTasks, search, filterStatus, filterPriority, filterEmployee])

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data } = await supabase
        .from('profiles').select('*').eq('role', 'employee').eq('is_active', true).order('full_name')
      if (data) setEmployees(data)
    }
    fetchEmployees()
    const empParam = searchParams.get('employee')
    if (empParam) setFilterEmployee(empParam)
    if (searchParams.get('new') === 'true') setShowModal(true)
  }, [searchParams])

  useEffect(() => { loadTasks() }, [loadTasks])

  const openCreate = () => { setForm(defaultForm); setEditingTask(null); setShowModal(true) }

  const openEdit = (task: Task) => {
    setEditingTask(task)
    setForm({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      assigned_to_multiple: [],
      assign_mode: 'single',
      priority: task.priority,
      deadline: task.deadline ? task.deadline.split('T')[0] : '',
      notes: task.notes || '',
      category: task.category || '',
    })
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditingTask(null); setForm(defaultForm); setSubmitProgress({ done: 0, total: 0 }) }

  // Determine which employees to assign to
  const getTargetEmployees = (): string[] => {
    if (form.assign_mode === 'all') return employees.map(e => e.id)
    if (form.assign_mode === 'multiple') return form.assigned_to_multiple
    return form.assigned_to ? [form.assigned_to] : []
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return

    const targets = getTargetEmployees()

    // Edit mode — single employee only
    if (editingTask) {
      setSubmitting(true)
      const payload: Partial<Task> = {
        title: form.title, description: form.description || undefined,
        assigned_to: form.assigned_to || undefined, priority: form.priority,
        deadline: form.deadline ? new Date(form.deadline + 'T23:59:59').toISOString() : undefined,
        notes: form.notes || undefined, category: form.category || undefined,
      }
      await updateTask(editingTask.id, payload)
      closeModal()
      loadTasks()
      setSubmitting(false)
      return
    }

    // Create mode — handle bulk
    if (targets.length === 0) {
      toast.error('Please select at least one employee')
      return
    }

    setSubmitting(true)
    setSubmitProgress({ done: 0, total: targets.length })

    const deadline = form.deadline ? new Date(form.deadline + 'T23:59:59').toISOString() : undefined
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < targets.length; i++) {
      const employeeId = targets[i]
      const { data, error } = await supabase.from('tasks').insert([{
        title: form.title,
        description: form.description || null,
        assigned_to: employeeId,
        created_by: profile?.id,
        priority: form.priority,
        status: 'not_started',
        deadline: deadline || null,
        notes: form.notes || null,
        category: form.category || null,
      }]).select().single()

      if (error) {
        failCount++
      } else {
        successCount++
        // Send notification
        await supabase.from('notifications').insert([{
          user_id: employeeId,
          title: 'New Task Assigned',
          message: `You have been assigned: "${form.title}"`,
          type: 'task_assigned',
          task_id: data.id,
        }])
      }
      setSubmitProgress({ done: i + 1, total: targets.length })
    }

    if (successCount > 0 && failCount === 0) {
      toast.success(`Task assigned to ${successCount} employee${successCount > 1 ? 's' : ''} successfully!`)
    } else if (successCount > 0) {
      toast.success(`Assigned to ${successCount} employees (${failCount} failed)`)
    } else {
      toast.error('Failed to assign tasks')
    }

    closeModal()
    loadTasks()
    setSubmitting(false)
  }

  const toggleEmployeeSelection = (id: string) => {
    setForm(prev => ({
      ...prev,
      assigned_to_multiple: prev.assigned_to_multiple.includes(id)
        ? prev.assigned_to_multiple.filter(e => e !== id)
        : [...prev.assigned_to_multiple, id]
    }))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task? This action cannot be undone.')) return
    const ok = await deleteTask(id)
    if (ok) loadTasks()
  }

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    await updateTaskStatus(id, status)
    loadTasks()
  }

  const clearFilters = () => { setSearch(''); setFilterStatus(''); setFilterPriority(''); setFilterEmployee('') }
  const hasFilters = search || filterStatus || filterPriority || filterEmployee

  const assignLabel = form.assign_mode === 'all'
    ? `All ${employees.length} employees`
    : form.assign_mode === 'multiple'
    ? form.assigned_to_multiple.length > 0
      ? `${form.assigned_to_multiple.length} employee${form.assigned_to_multiple.length > 1 ? 's' : ''} selected`
      : 'Select employees'
    : ''

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading ? 'Loading…' : `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input className="input pl-9 text-sm" placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value as TaskStatus | '')} aria-label="Filter by status">
          <option value="">All statuses</option>
          {Object.entries(statusConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>
        <select className="input text-sm w-auto" value={filterPriority} onChange={e => setFilterPriority(e.target.value as TaskPriority | '')} aria-label="Filter by priority">
          <option value="">All priorities</option>
          {Object.entries(priorityConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>
        <select className="input text-sm w-auto" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} aria-label="Filter by employee">
          <option value="">All employees</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="btn-secondary text-sm px-3" title="Clear filters">
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {/* Task Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-[#1A1A1A] rounded-xl animate-pulse" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16">
          <CheckSquare className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white">{hasFilters ? 'No tasks match filters' : 'No tasks yet'}</h3>
          <p className="text-slate-500 text-sm mt-1">{hasFilters ? 'Try adjusting your filters' : 'Create a task to get started'}</p>
          {!hasFilters && <button onClick={openCreate} className="btn-primary mt-4"><Plus className="w-4 h-4" /> Create first task</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} isAdmin onStatusChange={handleStatusChange} onEdit={openEdit} onDelete={handleDelete} onClick={setSelectedTask} />
          ))}
        </div>
      )}

      {/* ===== CREATE / EDIT MODAL ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#2E2E2E] sticky top-0 bg-[#1A1A1A] z-10">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editingTask ? 'Edit Task' : 'Create New Task'}
                </h2>
                {!editingTask && (
                  <p className="text-xs text-slate-500 mt-0.5">Assign to one, multiple, or all employees at once</p>
                )}
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-[#242424] text-slate-500 hover:text-white transition-colors" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">

              {/* Title */}
              <div>
                <label className="label" htmlFor="task-title">Task Title *</label>
                <input id="task-title" className="input" placeholder="e.g. Write Instagram captions for Nike drop"
                  value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required maxLength={200} />
              </div>

              {/* Description */}
              <div>
                <label className="label" htmlFor="task-desc">Description</label>
                <textarea id="task-desc" className="input resize-none" rows={3}
                  placeholder="Task details, requirements, deliverables…"
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} maxLength={2000} />
              </div>

              {/* ===== ASSIGNMENT SECTION ===== */}
              {!editingTask && (
                <div className="space-y-3">
                  <label className="label">Assign To</label>

                  {/* Mode selector tabs */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0D0D0D] rounded-xl border border-[#2E2E2E]">
                    {[
                      { mode: 'single' as AssignMode, icon: User, label: 'Single' },
                      { mode: 'multiple' as AssignMode, icon: Users, label: 'Multiple' },
                      { mode: 'all' as AssignMode, icon: CheckCheck, label: `All (${employees.length})` },
                    ].map(({ mode, icon: Icon, label }) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, assign_mode: mode, assigned_to: '', assigned_to_multiple: [] }))}
                        className={cn(
                          'flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-150',
                          form.assign_mode === mode
                            ? 'text-[#0D0D0D]'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-[#1A1A1A]'
                        )}
                        style={form.assign_mode === mode ? { background: 'linear-gradient(135deg, #F5A623 0%, #E07B00 100%)' } : {}}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="hidden sm:inline">{label}</span>
                        <span className="sm:hidden">{mode === 'all' ? `All` : label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Single employee dropdown */}
                  {form.assign_mode === 'single' && (
                    <select
                      className="input"
                      value={form.assigned_to}
                      onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}
                      aria-label="Select employee"
                    >
                      <option value="">— Select employee —</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}{e.department ? ` · ${e.department}` : ''}</option>)}
                    </select>
                  )}

                  {/* Multiple employee checkboxes */}
                  {form.assign_mode === 'multiple' && (
                    <div className="bg-[#0D0D0D] border border-[#2E2E2E] rounded-xl overflow-hidden">
                      {/* Select all bar */}
                      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2E2E2E]">
                        <span className="text-xs text-slate-500">{form.assigned_to_multiple.length} selected</span>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setForm(p => ({ ...p, assigned_to_multiple: employees.map(e => e.id) }))}
                            className="text-xs text-[#F5A623] hover:text-[#FFB83F] transition-colors">
                            Select all
                          </button>
                          <span className="text-slate-700">·</span>
                          <button type="button" onClick={() => setForm(p => ({ ...p, assigned_to_multiple: [] }))}
                            className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                            Clear
                          </button>
                        </div>
                      </div>

                      {/* Employee list */}
                      <div className="max-h-52 overflow-y-auto divide-y divide-[#1A1A1A]">
                        {employees.length === 0 ? (
                          <p className="text-center py-4 text-xs text-slate-500">No employees found</p>
                        ) : employees.map(emp => {
                          const selected = form.assigned_to_multiple.includes(emp.id)
                          return (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => toggleEmployeeSelection(emp.id)}
                              className={cn(
                                'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                                selected ? 'bg-[#F5A623]/5' : 'hover:bg-[#1A1A1A]'
                              )}
                            >
                              {/* Custom checkbox */}
                              <div className={cn(
                                'w-4.5 h-4.5 rounded flex items-center justify-center shrink-0 border transition-all',
                                selected
                                  ? 'border-[#F5A623]'
                                  : 'border-[#3A3A3A] bg-[#0D0D0D]'
                              )}
                                style={selected ? { background: 'linear-gradient(135deg, #F5A623, #E07B00)' } : {}}
                              >
                                {selected && (
                                  <svg className="w-3 h-3 text-[#0D0D0D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[#0D0D0D] text-xs font-bold shrink-0"
                                style={{ background: selected ? 'linear-gradient(135deg, #F5A623, #E07B00)' : '#2E2E2E' }}>
                                <span className={selected ? 'text-[#0D0D0D]' : 'text-slate-400'}>{getInitials(emp.full_name)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-sm font-medium truncate', selected ? 'text-white' : 'text-slate-400')}>{emp.full_name}</p>
                                {emp.department && <p className="text-xs text-slate-600 truncate">{emp.department}</p>}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Assign to all — confirmation banner */}
                  {form.assign_mode === 'all' && (
                    <div className="flex items-center gap-3 p-3.5 rounded-xl border"
                      style={{ background: 'rgba(245, 166, 35, 0.05)', borderColor: 'rgba(245, 166, 35, 0.25)' }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'linear-gradient(135deg, #F5A623, #E07B00)' }}>
                        <CheckCheck className="w-4 h-4 text-[#0D0D0D]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Assigning to all {employees.length} employees</p>
                        <p className="text-xs text-slate-500 mt-0.5">Each employee will receive their own copy of this task</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Edit mode — single assign dropdown */}
              {editingTask && (
                <div>
                  <label className="label" htmlFor="task-assign-edit">Assign To</label>
                  <select id="task-assign-edit" className="input" value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}>
                    <option value="">— Unassigned —</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </select>
                </div>
              )}

              {/* Priority + Deadline */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="task-priority">Priority</label>
                  <select id="task-priority" className="input" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as TaskPriority }))}>
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="task-deadline">Deadline</label>
                  <input id="task-deadline" type="date" className="input" value={form.deadline}
                    min={new Date().toISOString().split('T')[0]} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
                </div>
              </div>

              {/* Category + Notes */}
              <div>
                <label className="label" htmlFor="task-category">Category</label>
                <input id="task-category" className="input" placeholder="e.g. Campaign, Content, Design"
                  value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} maxLength={50} />
              </div>

              <div>
                <label className="label" htmlFor="task-notes">Admin Notes</label>
                <textarea id="task-notes" className="input resize-none" rows={2}
                  placeholder="Special instructions, context, or reminders…"
                  value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} maxLength={1000} />
              </div>

              {/* Progress bar when bulk assigning */}
              {submitting && submitProgress.total > 1 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Assigning tasks…</span>
                    <span>{submitProgress.done}/{submitProgress.total}</span>
                  </div>
                  <div className="h-1.5 bg-[#2E2E2E] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${submitProgress.total > 0 ? (submitProgress.done / submitProgress.total) * 100 : 0}%`,
                        background: 'linear-gradient(90deg, #F5A623, #E07B00)'
                      }} />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                <button
                  type="submit"
                  disabled={submitting || !form.title.trim() || (
                    !editingTask && (
                      (form.assign_mode === 'single' && !form.assigned_to) ||
                      (form.assign_mode === 'multiple' && form.assigned_to_multiple.length === 0) ||
                      (form.assign_mode === 'all' && employees.length === 0)
                    )
                  )}
                  className="btn-primary flex-1"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />
                      {submitProgress.total > 1 ? `${submitProgress.done}/${submitProgress.total}…` : 'Saving…'}</>
                  ) : editingTask ? 'Update Task' : (
                    form.assign_mode === 'all' ? `Assign to All (${employees.length})` :
                    form.assign_mode === 'multiple' ? `Assign to ${form.assigned_to_multiple.length || '…'}` :
                    'Create Task'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={loadTasks} />
      )}
    </div>
  )
}

export default function AdminTasksPage() {
  return (
    <Suspense fallback={
      <div className="p-6 space-y-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-[#1A1A1A] rounded-xl animate-pulse" />)}
      </div>
    }>
      <AdminTasksContent />
    </Suspense>
  )
}
