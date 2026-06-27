export type Role = 'admin' | 'employee'
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue'
export type TaskPriority = 'high' | 'medium' | 'low'
export type NotificationType = 'info' | 'task_assigned' | 'task_updated' | 'task_completed' | 'overdue'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  avatar_url?: string
  department?: string
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  description?: string
  assigned_to?: string
  created_by?: string
  priority: TaskPriority
  status: TaskStatus
  deadline?: string
  notes?: string
  completed_at?: string
  category?: string
  tags?: string[]
  created_at: string
  updated_at: string
  // Joined fields
  assignee?: Profile
  creator?: Profile
  comments?: TaskComment[]
  attachments?: TaskAttachment[]
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  user?: Profile
}

export interface TaskAttachment {
  id: string
  task_id: string
  user_id: string
  file_name: string
  file_url: string
  file_type?: string
  file_size?: number
  created_at: string
  user?: Profile
}

export interface Attendance {
  id: string
  user_id: string
  check_in?: string
  check_out?: string
  date: string
  notes?: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  is_read: boolean
  task_id?: string
  created_at: string
}

export interface TaskSummary {
  employee_id: string
  full_name: string
  email: string
  department?: string
  total_tasks: number
  completed_tasks: number
  in_progress_tasks: number
  not_started_tasks: number
  overdue_tasks: number
  completion_rate: number
}

export interface DashboardStats {
  total_tasks: number
  completed_tasks: number
  in_progress_tasks: number
  overdue_tasks: number
  not_started_tasks: number
  total_employees: number
  today_checkins: number
  completion_rate: number
}
