'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Task, TaskStatus, TaskComment, TaskAttachment } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useTasks } from '@/hooks/useTasks'
import {
  priorityConfig, statusConfig, formatDateTime, formatDate,
  getInitials, formatFileSize, cn
} from '@/lib/utils'
import {
  X, Send, Paperclip, Download, FileText, Image as ImageIcon,
  Flag, CheckCircle2, ChevronDown, MessageSquare, Tag, StickyNote,
  Calendar, Loader2, User
} from 'lucide-react'

interface TaskDetailModalProps {
  task: Task
  onClose: () => void
  onUpdate: () => void
}

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

export default function TaskDetailModal({ task, onClose, onUpdate }: TaskDetailModalProps) {
  const { profile } = useAuth()
  const { updateTaskStatus, addComment, uploadAttachment } = useTasks()
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [currentTask, setCurrentTask] = useState(task)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [loadingFull, setLoadingFull] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  const isAdmin = profile?.role === 'admin'
  const canUpdateStatus = isAdmin || currentTask.assigned_to === profile?.id

  // Fetch full task data including comments/attachments on open
  const fetchFullTask = useCallback(async () => {
    setLoadingFull(true)
    try {
      const { data } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey(id, full_name, email, avatar_url, department),
          creator:profiles!tasks_created_by_fkey(id, full_name, email),
          comments:task_comments(id, content, created_at, user:profiles(id, full_name, avatar_url)),
          attachments:task_attachments(*)
        `)
        .eq('id', task.id)
        .single()
      if (data) setCurrentTask(data)
    } finally {
      setLoadingFull(false)
    }
  }, [task.id])

  useEffect(() => {
    fetchFullTask()
  }, [fetchFullTask])

  useEffect(() => {
    if (!loadingFull) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [currentTask.comments, loadingFull])

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleStatusChange = async (status: TaskStatus) => {
    const updated = await updateTaskStatus(currentTask.id, status)
    if (updated) {
      setCurrentTask(prev => ({ ...prev, status, completed_at: updated.completed_at }))
      setShowStatusMenu(false)
      onUpdate()
    }
  }

  const handleAddComment = async () => {
    if (!comment.trim() || !profile || submitting) return
    setSubmitting(true)
    try {
      const newComment = await addComment(currentTask.id, profile.id, comment.trim())
      if (newComment) {
        setCurrentTask(prev => ({
          ...prev,
          comments: [...(prev.comments || []), newComment as TaskComment]
        }))
        setComment('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddComment()
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    // 50MB limit check
    if (file.size > 52428800) {
      import('react-hot-toast').then(({ default: toast }) => toast.error('File too large. Max 50MB.'))
      return
    }

    setUploading(true)
    try {
      const attachment = await uploadAttachment(currentTask.id, profile.id, file)
      if (attachment) {
        setCurrentTask(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), attachment as TaskAttachment]
        }))
        onUpdate()
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const priority = priorityConfig[currentTask.priority]
  const status = statusConfig[currentTask.status]

  const getFileIcon = (fileType?: string | null) => {
    if (!fileType) return <FileText className="w-5 h-5 text-slate-400" />
    if (fileType.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-blue-400" />
    return <FileText className="w-5 h-5 text-slate-400" />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={currentTask.title}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white leading-snug">{currentTask.title}</h2>
            {currentTask.category && (
              <span className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1">
                <Tag className="w-3 h-3" /> {currentTask.category}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingFull ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Meta grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Status */}
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1.5">Status</p>
                  {canUpdateStatus ? (
                    <div className="relative">
                      <button
                        onClick={() => setShowStatusMenu(!showStatusMenu)}
                        className={cn(
                          'w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border',
                          status.bg, status.color
                        )}
                      >
                        {status.label}
                        <ChevronDown className="w-3 h-3 ml-auto" />
                      </button>
                      {showStatusMenu && (
                        <>
                          <div className="absolute top-full mt-1 left-0 w-full card shadow-xl z-20 overflow-hidden">
                            {statusOptions.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => handleStatusChange(opt.value)}
                                className={cn(
                                  'w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors',
                                  currentTask.status === opt.value && 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(false)} />
                        </>
                      )}
                    </div>
                  ) : (
                    <span className={cn('badge text-xs', status.bg, status.color)}>{status.label}</span>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1.5">Priority</p>
                  <span className={cn('badge border text-xs', priority.bg, priority.color)}>
                    <Flag className="w-3 h-3" /> {priority.label}
                  </span>
                </div>

                {/* Deadline */}
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1.5">Deadline</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {currentTask.deadline ? formatDate(currentTask.deadline) : 'None'}
                  </p>
                </div>

                {/* Assigned to */}
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1.5">Assigned</p>
                  {currentTask.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
                        {getInitials(currentTask.assignee.full_name)}
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{currentTask.assignee.full_name}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 flex items-center gap-1"><User className="w-3.5 h-3.5" /> Unassigned</p>
                  )}
                </div>
              </div>

              {/* Completed timestamp */}
              {currentTask.completed_at && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    Completed {formatDateTime(currentTask.completed_at)}
                  </p>
                </div>
              )}

              {/* Description */}
              {currentTask.description && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Description</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{currentTask.description}</p>
                </div>
              )}

              {/* Admin Notes */}
              {currentTask.notes && (
                <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-1">
                    <StickyNote className="w-3.5 h-3.5" /> Admin Notes
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-300">{currentTask.notes}</p>
                </div>
              )}

              {/* Attachments */}
              {(currentTask.attachments?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    Attachments ({currentTask.attachments!.length})
                  </p>
                  <div className="space-y-2">
                    {currentTask.attachments!.map(att => (
                      <a
                        key={att.id}
                        href={att.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
                      >
                        {getFileIcon(att.file_type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{att.file_name}</p>
                          {att.file_size && (
                            <p className="text-xs text-slate-400">{formatFileSize(att.file_size)}</p>
                          )}
                        </div>
                        <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Comments ({currentTask.comments?.length ?? 0})
                </p>

                <div className="space-y-3 mb-4">
                  {(currentTask.comments?.length ?? 0) === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic">No comments yet.</p>
                  ) : currentTask.comments?.map(c => (
                    <div key={c.id} className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
                        {c.user ? getInitials(c.user.full_name) : '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {c.user?.full_name ?? 'Unknown'}
                          </span>
                          <span className="text-xs text-slate-400">{formatDateTime(c.created_at)}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed break-words">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={commentsEndRef} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Comment input */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1 text-sm"
              placeholder="Add a comment or update…"
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={submitting || loadingFull}
              maxLength={1000}
            />
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              disabled={uploading || loadingFull}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || loadingFull}
              className="btn-secondary px-3 shrink-0"
              title="Attach file (max 50MB)"
              type="button"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </button>
            <button
              onClick={handleAddComment}
              disabled={!comment.trim() || submitting || loadingFull}
              className="btn-primary px-3 shrink-0"
              type="button"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">Press Enter to send · Attach files up to 50MB</p>
        </div>
      </div>
    </div>
  )
}
