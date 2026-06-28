'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTasks } from '@/hooks/useTasks'
import { Task, Profile, TaskStatus, TaskPriority } from '@/types'
import { statusConfig, priorityConfig, cn } from '@/lib/utils'
import TaskCard from '@/components/shared/TaskCard'
import TaskDetailModal from '@/components/shared/TaskDetailModal'
import { Plus, Search, X, Loader2, CheckSquare } from 'lucide-react'

interface TaskFormData {
  title: string
  description: string
  assigned_to: string
  priority: TaskPriority
  deadline: string
  notes: string
  category: string
}

const defaultForm: TaskFormData = {
  title: '', description: '', assigned_to: '', priority: 'medium', deadline: '', notes: '', category: ''
}

function AdminTasksContent() {
  const { profile } = useAuth()
  const { tasks, loading, fetchTasks, createTask, updateTask, updateTaskStatus, deleteTask } = useTasks()
  const [employees, setEmployees] = useState<Profile[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [form, setForm] = useState<TaskFormData>(defaultForm)
  const [submitting, setSubmitting] = useState(false)
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
        .from('profiles')
        .select('*')
        .eq('role', 'employee')
        .eq('is_active', true)
        .order('full_name')
      if (data) setEmployees(data)
    }
    fetchEmployees()

    // Handle ?employee= filter from employees page
    const empParam = searchParams.get('employee')
    if (empParam) setFilterEmployee(empParam)

    // Handle ?new=true from dashboard
    if (searchParams.get('new') === 'true') setShowModal(true)
  }, [searchParams])

  // Single effect for filter changes
  useEffect(() => { loadTasks() }, [loadTasks])

  const openCreate = () => { setForm(defaultForm); setEditingTask(null); setShowModal(true) }

  const openEdit = (task: Task) => {
    setEditingTask(task)
    setForm({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      priority: task.priority,
      deadline: task.deadline ? task.deadline.split('T')[0] : '',
      notes: task.notes || '',
      category: task.category || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)

    const payload: Partial<Task> = {
      ...form,
      assigned_to: form.assigned_to || undefined,
      created_by: profile?.id,
      deadline: form.deadline ? new Date(form.deadline + 'T23:59:59').toISOString() : undefined,
    }

    if (editingTask) {
      await updateTask(editingTask.id, payload)
    } else {
      await createTask(payload)
    }

    setShowModal(false)
    setForm(defaultForm)
    setEditingTask(null)
    loadTasks()
    setSubmitting(false)
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

  const clearFilters = () => {
    setSearch('')
    setFilterStatus('')
    setFilterPriority('')
    setFilterEmployee('')
  }

  const hasFilters = search || filterStatus || filterPriority || filterEmployee

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tasks</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9 text-sm"
            placeholder="Search tasks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input text-sm w-auto"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as TaskStatus | '')}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {Object.entries(statusConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>
        <select
          className="input text-sm w-auto"
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value as TaskPriority | '')}
          aria-label="Filter by priority"
        >
          <option value="">All priorities</option>
          {Object.entries(priorityConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>
        <select
          className="input text-sm w-auto"
          value={filterEmployee}
          onChange={e => setFilterEmployee(e.target.value)}
          aria-label="Filter by employee"
        >
          <option value="">All employees</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="btn-secondary text-sm px-3" title="Clear filters">
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {/* Task grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16">
          <CheckSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">
            {hasFilters ? 'No tasks match your filters' : 'No tasks yet'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {hasFilters ? 'Try adjusting your filters' : 'Create a task to get started'}
          </p>
          {!hasFilters && (
            <button onClick={openCreate} className="btn-primary mt-4">
              <Plus className="w-4 h-4" /> Create first task
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              isAdmin
              onStatusChange={handleStatusChange}
              onEdit={openEdit}
              onDelete={handleDelete}
              onClick={setSelectedTask}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowModal(false); setEditingTask(null) }} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditingTask(null) }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="label" htmlFor="task-title">Task Title *</label>
                <input
                  id="task-title"
                  className="input"
                  placeholder="e.g. Write press release for product launch"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  required
                  maxLength={200}
                />
              </div>

              <div>
                <label className="label" htmlFor="task-desc">Description</label>
                <textarea
                  id="task-desc"
                  className="input resize-none"
                  rows={3}
                  placeholder="Task details, requirements, deliverables…"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  maxLength={2000}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="task-assign">Assign To</label>
                  <select
                    id="task-assign"
                    className="input"
                    value={form.assigned_to}
                    onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}
                  >
                    <option value="">— Select employee —</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="task-priority">Priority</label>
                  <select
                    id="task-priority"
                    className="input"
                    value={form.priority}
                    onChange={e => setForm(p => ({ ...p, priority: e.target.value as TaskPriority }))}
                  >
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="task-deadline">Deadline</label>
                  <input
                    id="task-deadline"
                    type="date"
                    className="input"
                    value={form.deadline}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="task-category">Category</label>
                  <input
                    id="task-category"
                    className="input"
                    placeholder="e.g. Campaign, Content"
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    maxLength={50}
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="task-notes">Admin Notes</label>
                <textarea
                  id="task-notes"
                  className="input resize-none"
                  rows={2}
                  placeholder="Special instructions, context, or reminders…"
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  maxLength={1000}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingTask(null) }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting || !form.title.trim()} className="btn-primary flex-1">
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    : editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={loadTasks}
        />
      )}
    </div>
  )
}

export default function AdminTasksPage() {
  return (
    <Suspense fallback={
      <div className="p-6 space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    }>
      <AdminTasksContent />
    </Suspense>
  )
}
