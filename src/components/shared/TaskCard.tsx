'use client'

import { useState } from 'react'
import { Task, TaskStatus } from '@/types'
import { cn, priorityConfig, statusConfig, formatDate, getDeadlineLabel, isOverdue, getInitials } from '@/lib/utils'
import { Calendar, MessageSquare, Paperclip, CheckCircle2, Clock, AlertCircle, Circle, Trash2, Edit2 } from 'lucide-react'

interface TaskCardProps {
  task: Task
  isAdmin?: boolean
  onStatusChange?: (id: string, status: TaskStatus) => void
  onEdit?: (task: Task) => void
  onDelete?: (id: string) => void
  onClick?: (task: Task) => void
}

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  not_started: <Circle className="w-4 h-4 text-slate-500" />,
  in_progress: <Clock className="w-4 h-4 text-blue-400" />,
  completed: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  overdue: <AlertCircle className="w-4 h-4 text-red-400" />,
}

const statuses: TaskStatus[] = ['not_started', 'in_progress', 'completed']

export default function TaskCard({ task, isAdmin, onStatusChange, onEdit, onDelete, onClick }: TaskCardProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const priority = priorityConfig[task.priority]
  const status = statusConfig[task.status]
  const overdue = isOverdue(task.deadline, task.status)
  const deadlineLabel = getDeadlineLabel(task.deadline)

  return (
    <div
      className={cn(
        'task-card bg-[#1A1A1A] border rounded-xl p-4 cursor-pointer group transition-all duration-200',
        task.status === 'completed' ? 'opacity-60 border-[#2E2E2E]' :
        overdue ? 'border-red-500/30 hover:border-red-500/50' :
        'border-[#2E2E2E] hover:border-[#F5A623]/30'
      )}
      onClick={() => onClick?.(task)}
      role="article"
      aria-label={task.title}
    >
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className="relative mt-0.5 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); setShowStatusMenu(!showStatusMenu) }}
            className="hover:scale-110 transition-transform focus:outline-none"
            title={`Status: ${status.label}`}
            aria-label={`Task status: ${status.label}`}
          >
            {statusIcons[task.status]}
          </button>

          {showStatusMenu && (
            <>
              <div className="absolute left-0 top-7 w-40 bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl shadow-2xl z-20 overflow-hidden py-1">
                {statuses.map(s => (
                  <button
                    key={s}
                    onClick={e => { e.stopPropagation(); onStatusChange?.(task.id, s); setShowStatusMenu(false) }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#242424] transition-colors',
                      task.status === s && 'bg-[#F5A623]/10 font-medium'
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
          {/* Task title row */}
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn(
              'font-bold text-sm leading-snug',
              task.status === 'completed'
                ? 'line-through text-slate-500'
                : overdue
                ? 'text-red-300'
                : 'text-white'   // ← bold white, always readable on dark background
            )}>
              {task.title}
            </h3>

            {/* Admin edit/delete */}
            {isAdmin && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); onEdit?.(task) }}
                  className="p-1 rounded hover:bg-[#2E2E2E] text-slate-500 hover:text-[#F5A623] transition-colors"
                  title="Edit task" aria-label="Edit task"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onDelete?.(task.id) }}
                  className="p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                  title="Delete task" aria-label="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {/* Priority */}
            <span className={cn('badge border text-xs font-semibold', priority.bg, priority.color)}>
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', priority.dot)} />
              {priority.label}
            </span>

            {/* Status */}
            <span className={cn('badge text-xs font-medium', status.bg, status.color)}>
              {status.label}
            </span>

            {/* Deadline */}
            {task.deadline && (
              <span className={cn(
                'flex items-center gap-1 text-xs font-medium',
                overdue && task.status !== 'completed' ? 'text-red-400' : 'text-slate-500'
              )}>
                <Calendar className="w-3 h-3 shrink-0" />
                {deadlineLabel || formatDate(task.deadline)}
              </span>
            )}

            {/* Assignee (admin only) */}
            {isAdmin && task.assignee && (
              <div className="flex items-center gap-1.5 ml-auto">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[#0D0D0D] text-xs font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #F5A623, #E07B00)' }}>
                  {getInitials(task.assignee.full_name)}
                </div>
                <span className="text-xs text-slate-400 truncate max-w-[80px]">
                  {task.assignee.full_name.split(' ')[0]}
                </span>
              </div>
            )}
          </div>

          {/* Comments / attachments count */}
          {((task.comments?.length ?? 0) > 0 || (task.attachments?.length ?? 0) > 0) && (
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[#2E2E2E]">
              {(task.comments?.length ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <MessageSquare className="w-3 h-3" /> {task.comments!.length}
                </span>
              )}
              {(task.attachments?.length ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
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
