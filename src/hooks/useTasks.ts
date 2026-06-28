'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Task, TaskStatus, TaskPriority } from '@/types'
import toast from 'react-hot-toast'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)

  const fetchTasks = useCallback(async (filters?: {
    assignedTo?: string
    status?: TaskStatus
    priority?: TaskPriority
    search?: string
  }) => {
    setLoading(true)
    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey(id, full_name, email, avatar_url, department),
          creator:profiles!tasks_created_by_fkey(id, full_name, email),
          comments:task_comments(id, content, created_at, user:profiles(id, full_name, avatar_url)),
          attachments:task_attachments(id, file_name, file_url, file_type, file_size, created_at)
        `)
        .order('created_at', { ascending: false })

      if (filters?.assignedTo) query = query.eq('assigned_to', filters.assignedTo)
      if (filters?.status) query = query.eq('status', filters.status)
      if (filters?.priority) query = query.eq('priority', filters.priority)
      if (filters?.search) query = query.ilike('title', `%${filters.search}%`)

      const { data, error } = await query
      if (error) throw error
      setTasks(data || [])
      return data || []
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load tasks'
      toast.error(message)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const createTask = useCallback(async (taskData: Partial<Task>) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single()

    if (error) {
      toast.error('Failed to create task: ' + error.message)
      return null
    }

    // Notify assigned employee
    if (taskData.assigned_to && data) {
      await supabase.from('notifications').insert([{
        user_id: taskData.assigned_to,
        title: 'New Task Assigned',
        message: `You have been assigned: "${taskData.title}"`,
        type: 'task_assigned',
        task_id: data.id,
      }])
    }

    toast.success('Task created!')
    return data
  }, [])

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      toast.error('Failed to update task')
      return null
    }
    toast.success('Task updated')
    return data
  }, [])

  const updateTaskStatus = useCallback(async (id: string, status: TaskStatus) => {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      toast.error('Failed to update status')
      return null
    }
    return data
  }, [])

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete task')
      return false
    }
    toast.success('Task deleted')
    return true
  }, [])

  const addComment = useCallback(async (taskId: string, userId: string, content: string) => {
    const { data, error } = await supabase
      .from('task_comments')
      .insert([{ task_id: taskId, user_id: userId, content }])
      .select('*, user:profiles(id, full_name, avatar_url)')
      .single()

    if (error) {
      toast.error('Failed to add comment')
      return null
    }
    return data
  }, [])

  const uploadAttachment = useCallback(async (taskId: string, userId: string, file: File) => {
    const fileExt = file.name.split('.').pop() || 'bin'
    const safeFileName = `${taskId}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(safeFileName, file, { cacheControl: '3600', upsert: false })

    if (uploadError) {
      toast.error('Failed to upload file')
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(safeFileName)

    const { data, error } = await supabase
      .from('task_attachments')
      .insert([{
        task_id: taskId,
        user_id: userId,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type || null,
        file_size: file.size,
      }])
      .select()
      .single()

    if (error) {
      toast.error('Failed to save attachment record')
      return null
    }
    toast.success('File uploaded successfully')
    return data
  }, [])

  return {
    tasks, loading, fetchTasks, createTask, updateTask,
    updateTaskStatus, deleteTask, addComment, uploadAttachment
  }
}
