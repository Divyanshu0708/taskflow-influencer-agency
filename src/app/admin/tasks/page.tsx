'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTasks } from '@/hooks/useTasks'
import { Task, Profile, TaskStatus, TaskPriority } from '@/types'
import { statusConfig, priorityConfig, cn } from '@/lib/utils'
import TaskCard from '@/components/shared/TaskCard'
import TaskDetailModal from '@/components/shared/TaskDetailModal'
import {
  Plus, Search, Filter, X, Loader2, Calendar,
  ChevronDown, SlidersHorizontal, CheckSquare
} from 'lucide-react'
import toast from 'react-hot-toast'

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

export default function AdminTasksPage() {
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

  useEffect(() => {
    fetchEmployees()
    loadTasks()
    if (searchParams.get('new') === 'true') setShowModal(true)
  }, [])

  const loadTasks = useCallback(() => {
    fetchTasks({
      search: search || undefined,
      status: filterStatus || undefined,
      priority: filterPriority || undefined,
      assignedTo: filterEmployee || undefined,
    })
  }, [fetchTasks, search, filterStatus, filterPriority, filterEmployee])

  useEffect(() => { loadTasks() }, [search, filterStatus, filterPriority, filterEmployee])

  const fetchEmployees = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'employee').eq('is_active', true).order('full_name')
    if (data) setEmployees(data)
  }

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

    const payload = {
      ...form,
      created_by: profile?.id,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
    }

    if (editingTask) {
      await updateTask(editingTask.id, payload)
    } else {
      await createTask(payload)
    }

    setShowModal(false)
    setForm(defaultForm)
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
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
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

        <select className="input text-sm w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value as TaskStatus | '')}>
          <option value="">All statuses</option>
          {Object.entries(statusConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>

        <select className="input text-sm w-auto" value={filterPriority} onChange={e => setFilterPriority(e.target.value as TaskPriority | '')}>
          <option value="">All priorities</option>
          {Object.entries(priorityConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>

        <select className="input text-sm w-auto" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
          <option value="">All employees</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
        </select>

        {hasFilters && (
          <button onClick={clearFilters} className="btn-secondary text-sm px-3">
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
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">No tasks found</h3>
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="label">Task Title *</label>
                <input
                  className="input"
                  placeholder="e.g. Write press release for product launch"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Task details, requirements, deliverables…"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Assign To</label>
                  <select className="input" value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}>
                    <option value="">— Select employee —</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select className="input" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as TaskPriority }))}>
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Deadline</label>
                  <input
                    type="date"
                    className="input"
                    value={form.deadline}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <input
                    className="input"
                    placeholder="e.g. Social Media, PR"
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="label">Admin Notes (visible to employee)</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  placeholder="Special instructions, context, or reminders…"
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
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
