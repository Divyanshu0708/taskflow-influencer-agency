'use client'

import { useState } from 'react'
import { Task, TaskStatus } from '@/types'
import { cn, priorityConfig, statusConfig, formatDate, getDeadlineLabel, isOverdue, getInitials } from '@/lib/utils'
import {
  Calendar, MessageSquare, Paperclip, CheckCircle2,
  Clock, AlertCircle, Circle, Trash2, Edit2
} from 'lucide-react'

interface TaskCardProps {
  task: Task
  isAdmin?: boolean
  onStatusChange?: (id: string, status: TaskStatus) => void
  onEdit?: (task: Task) => void
  onDelete?: (id: string) => void
  onClick?: (task: Task) => void
}

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  not_started: <Circle className="w-4 h-4 text-slate-400" />,
  in_progress: <Clock className="w-4 h-4 text-blue-500" />,
  completed: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  overdue: <AlertCircle className="w-4 h-4 text-red-500" />,
}

const statusCycle: Record<TaskStatus, TaskStatus> = {
  not_started: 'in_progress',
  in_progress: 'completed',
  completed: 'not_started',
  overdue: 'in_progress',
}

const statuses: TaskStatus[] = ['not_started', 'in_progress', 'completed']

export default function TaskCard({ task, isAdmin, onStatusChange, onEdit, onDelete, onClick }: TaskCardProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const priority = priorityConfig[task.priority]
  const status = statusConfig[task.status]
  const overdue = isOverdue(task.deadline, task.status)
  const deadlineLabel = getDeadlineLabel(task.deadline)

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowStatusMenu(!showStatusMenu)
  }

  const handleStatusSelect = (e: React.MouseEvent, newStatus: TaskStatus) => {
    e.stopPropagation()
    onStatusChange?.(task.id, newStatus)
    setShowStatusMenu(false)
  }

  return (
    <div
      className={cn(
        'task-card card p-4 cursor-pointer group',
        task.status === 'completed' && 'opacity-70',
        overdue && task.status !== 'completed' && 'border-red-200 dark:border-red-900'
      )}
      onClick={() => onClick?.(task)}
      role="article"
      aria-label={task.title}
    >
      <div className="flex items-start gap-3">
        {/* Status toggle */}
        <div className="relative mt-0.5 shrink-0">
          <button
            onClick={handleStatusClick}
            className="hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
            title={`Status: ${status.label}. Click to change.`}
            aria-label={`Task status: ${status.label}`}
          >
            {statusIcons[task.status]}
          </button>

          {showStatusMenu && (
            <>
              <div className="absolute left-0 top-7 w-40 card shadow-xl z-20 overflow-hidden animate-slide-in py-1">
                {statuses.map(s => (
                  <button
                    key={s}
                    onClick={e => handleStatusSelect(e, s)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors',
                      task.status === s && 'bg-indigo-50 dark:bg-indigo-900/20 font-medium'
                    )}
                  >
                    {statusIcons[s]}
                    <span className={statusConfig[s].color}>{statusConfig[s].label}</span>
                  </button>
                ))}
              </div>
              <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); setShowStatusMenu(false) }} />
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn(
              'font-medium text-slate-900 dark:text-white text-sm leading-snug',
              task.status === 'completed' && 'line-through text-slate-400 dark:text-slate-500'
            )}>
              {task.title}
            </h3>

            {/* Admin actions */}
            {isAdmin && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); onEdit?.(task) }}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  title="Edit task"
                  aria-label="Edit task"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onDelete?.(task.id) }}
                  className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                  title="Delete task"
                  aria-label="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {task.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {/* Priority */}
            <span className={cn('badge border text-xs', priority.bg, priority.color)}>
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', priority.dot)} />
              {priority.label}
            </span>

            {/* Status */}
            <span className={cn('badge text-xs', status.bg, status.color)}>
              {status.label}
            </span>

            {/* Deadline */}
            {task.deadline && (
              <span className={cn(
                'flex items-center gap-1 text-xs',
                overdue && task.status !== 'completed'
                  ? 'text-red-500 dark:text-red-400 font-medium'
                  : 'text-slate-400 dark:text-slate-500'
              )}>
                <Calendar className="w-3 h-3 shrink-0" />
                {deadlineLabel || formatDate(task.deadline)}
              </span>
            )}

            {/* Assignee (admin view) */}
            {isAdmin && task.assignee && (
              <div className="flex items-center gap-1 ml-auto">
                <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
                  {getInitials(task.assignee.full_name)}
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-16">
                  {task.assignee.full_name.split(' ')[0]}
                </span>
              </div>
            )}
          </div>

          {/* Comment/attachment counts */}
          {((task.comments?.length ?? 0) > 0 || (task.attachments?.length ?? 0) > 0) && (
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
              {(task.comments?.length ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <MessageSquare className="w-3 h-3" /> {task.comments!.length}
                </span>
              )}
              {(task.attachments?.length ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Paperclip className="w-3 h-3" /> {task.attachments!.length}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
