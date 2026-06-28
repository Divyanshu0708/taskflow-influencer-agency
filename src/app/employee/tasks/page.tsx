'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTasks } from '@/hooks/useTasks'
import { Task, TaskStatus, TaskPriority } from '@/types'
import { statusConfig, priorityConfig, cn } from '@/lib/utils'
import TaskCard from '@/components/shared/TaskCard'
import TaskDetailModal from '@/components/shared/TaskDetailModal'
import { Search, CheckSquare, X, SlidersHorizontal } from 'lucide-react'

const STATUS_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: '⚠️ Overdue' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'not_started', label: 'Not Started' },
  { key: 'completed', label: 'Completed' },
]

export default function EmployeeTasksPage() {
  const { profile } = useAuth()
  const { tasks, loading, fetchTasks, updateTaskStatus } = useTasks()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<TaskPriority | ''>('')
  const [showFilters, setShowFilters] = useState(false)

  const loadTasks = useCallback(() => {
    if (!profile) return
    // Always fetch all employee tasks, filter client-side for tabs
    fetchTasks({
      assignedTo: profile.id,
      priority: filterPriority || undefined,
      search: search || undefined,
    })
  }, [profile, fetchTasks, filterPriority, search])

  useEffect(() => { loadTasks() }, [loadTasks])

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    await updateTaskStatus(id, status)
    loadTasks()
    // Update selectedTask if it's currently open
    if (selectedTask?.id === id) {
      setSelectedTask(prev => prev ? { ...prev, status } : null)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setFilterPriority('')
    setActiveTab('all')
    setShowFilters(false)
  }

  const hasFilters = search || filterPriority || activeTab !== 'all'

  // Client-side tab filtering
  const now = new Date()
  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'all') return true
    if (activeTab === 'overdue') return task.status !== 'completed' && task.deadline && new Date(task.deadline) < now
    return task.status === activeTab
  })

  // Tab counts
  const tabCounts = {
    all: tasks.length,
    overdue: tasks.filter(t => t.status !== 'completed' && t.deadline && new Date(t.deadline) < now).length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    not_started: tasks.filter(t => t.status === 'not_started').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Tasks</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
          {loading ? 'Loading…' : `${tasks.length} task${tasks.length !== 1 ? 's' : ''} assigned to you`}
        </p>
      </div>

      {/* Search + Filter toggle */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9 text-sm w-full"
            placeholder="Search tasks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search tasks"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'btn-secondary text-sm px-3 shrink-0',
            showFilters && 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700 text-indigo-600'
          )}
          aria-label="Toggle filters"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {filterPriority && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
        </button>
        {hasFilters && (
          <button onClick={clearFilters} className="btn-secondary text-sm px-3 shrink-0" aria-label="Clear filters">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Priority filter */}
      {showFilters && (
        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <label className="label text-xs mb-1.5">Filter by Priority</label>
          <select
            className="input text-sm w-auto"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as TaskPriority | '')}
            aria-label="Filter by priority"
          >
            <option value="">All priorities</option>
            {Object.entries(priorityConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-hide">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0',
              activeTab === tab.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            )}
          >
            {tab.label}
            {tabCounts[tab.key as keyof typeof tabCounts] > 0 && (
              <span className={cn(
                'ml-1.5 px-1.5 py-0.5 rounded-full text-xs',
                activeTab === tab.key ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'
              )}>
                {tabCounts[tab.key as keyof typeof tabCounts]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-16">
          <CheckSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">
            {hasFilters ? 'No tasks match your filters' : (activeTab as string) === 'completed' ? 'No completed tasks yet' : 'No tasks here'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {hasFilters ? 'Try adjusting your search or filters' : 'Your admin will assign tasks to you'}
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-secondary mt-4 text-sm">
              <X className="w-4 h-4" /> Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => (
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
