'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTasks } from '@/hooks/useTasks'
import { Task, TaskStatus, TaskPriority } from '@/types'
import { statusConfig, priorityConfig, cn } from '@/lib/utils'
import TaskCard from '@/components/shared/TaskCard'
import TaskDetailModal from '@/components/shared/TaskDetailModal'
import { Search, CheckSquare, X, SlidersHorizontal } from 'lucide-react'

export default function EmployeeTasksPage() {
  const { profile } = useAuth()
  const { tasks, loading, fetchTasks, updateTaskStatus } = useTasks()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('')
  const [filterPriority, setFilterPriority] = useState<TaskPriority | ''>('')
  const [showFilters, setShowFilters] = useState(false)

  const loadTasks = useCallback(() => {
    if (!profile) return
    fetchTasks({
      assignedTo: profile.id,
      status: filterStatus || undefined,
      priority: filterPriority || undefined,
      search: search || undefined,
    })
  }, [profile, fetchTasks, filterStatus, filterPriority, search])

  useEffect(() => { loadTasks() }, [loadTasks])

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    await updateTaskStatus(id, status)
    loadTasks()
  }

  const clearFilters = () => { setSearch(''); setFilterStatus(''); setFilterPriority('') }
  const hasFilters = search || filterStatus || filterPriority

  const grouped = {
    overdue: tasks.filter(t => t.status !== 'completed' && t.deadline && new Date(t.deadline) < new Date()),
    in_progress: tasks.filter(t => t.status === 'in_progress' && !(t.deadline && new Date(t.deadline) < new Date())),
    not_started: tasks.filter(t => t.status === 'not_started' && !(t.deadline && new Date(t.deadline) < new Date())),
    completed: tasks.filter(t => t.status === 'completed'),
  }

  const activeTab = filterStatus || 'all'

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Tasks</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned to you</p>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9 text-sm" placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={cn('btn-secondary text-sm px-3', showFilters && 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700 text-indigo-600')}>
          <SlidersHorizontal className="w-4 h-4" /> Filters {hasFilters && '•'}
        </button>
        {hasFilters && <button onClick={clearFilters} className="btn-secondary text-sm px-3"><X className="w-4 h-4" /></button>}
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <select className="input text-sm w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value as TaskStatus | '')}>
            <option value="">All statuses</option>
            {Object.entries(statusConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
          <select className="input text-sm w-auto" value={filterPriority} onChange={e => setFilterPriority(e.target.value as TaskPriority | '')}>
            <option value="">All priorities</option>
            {Object.entries(priorityConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
        </div>
      )}

      {/* Quick status tabs */}
      {!hasFilters && (
        <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'All', count: tasks.length },
            { key: 'overdue', label: '⚠️ Overdue', count: grouped.overdue.length },
            { key: 'in_progress', label: 'In Progress', count: grouped.in_progress.length },
            { key: 'not_started', label: 'Not Started', count: grouped.not_started.length },
            { key: 'completed', label: 'Completed', count: grouped.completed.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key === 'all' ? '' : tab.key as TaskStatus)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                filterStatus === tab.key || (tab.key === 'all' && !filterStatus)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              {tab.label} {tab.count > 0 && <span className="ml-1 opacity-70">{tab.count}</span>}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16">
          <CheckSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">
            {hasFilters ? 'No tasks match your filters' : 'No tasks assigned yet'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {hasFilters ? 'Try adjusting your search' : 'Your admin will assign tasks to you'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={handleStatusChange}
              onClick={setSelectedTask}
            />
          ))}
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
