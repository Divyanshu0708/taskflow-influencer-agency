import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns'
import { TaskPriority, TaskStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | undefined): string {
  if (!date) return 'No deadline'
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDateTime(date: string | Date | undefined): string {
  if (!date) return '—'
  return format(new Date(date), 'MMM d, yyyy h:mm a')
}

export function formatRelative(date: string | Date | undefined): string {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function getDeadlineLabel(deadline: string | undefined): string {
  if (!deadline) return ''
  const d = new Date(deadline)
  if (isToday(d)) return 'Due today'
  if (isTomorrow(d)) return 'Due tomorrow'
  if (isPast(d)) return 'Overdue'
  return `Due ${format(d, 'MMM d')}`
}

export function isOverdue(deadline: string | undefined, status: TaskStatus): boolean {
  if (!deadline || status === 'completed') return false
  return isPast(new Date(deadline))
}

// Brand-themed priority config (dark mode optimized)
export const priorityConfig: Record<TaskPriority, { label: string; color: string; bg: string; dot: string }> = {
  high: {
    label: 'High',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    dot: 'bg-red-400',
  },
  medium: {
    label: 'Medium',
    color: 'text-[#F5A623]',
    bg: 'bg-[#F5A623]/10 border-[#F5A623]/20',
    dot: 'bg-[#F5A623]',
  },
  low: {
    label: 'Low',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
}

// Brand-themed status config
export const statusConfig: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  not_started: {
    label: 'Not Started',
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  overdue: {
    label: 'Overdue',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
  },
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}
