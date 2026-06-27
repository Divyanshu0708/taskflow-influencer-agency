-- ============================================================
-- TaskFlow Agency - Complete Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  avatar_url TEXT,
  department TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TASKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'overdue')),
  deadline TIMESTAMPTZ,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  category TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TASK COMMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TASK ATTACHMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ATTENDANCE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'task_assigned', 'task_updated', 'task_completed', 'overdue')),
  is_read BOOLEAN DEFAULT false,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, update their own
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_admin" ON profiles FOR INSERT TO authenticated WITH CHECK (true);

-- Tasks: admins can do everything, employees see only their own
CREATE POLICY "tasks_admin_all" ON tasks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "tasks_employee_select" ON tasks FOR SELECT TO authenticated
  USING (assigned_to = auth.uid());

CREATE POLICY "tasks_employee_update_status" ON tasks FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- Task comments: authenticated users can read/create comments on their tasks
CREATE POLICY "comments_select" ON task_comments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND assigned_to = auth.uid())
  );

CREATE POLICY "comments_insert" ON task_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "comments_update_own" ON task_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Attachments: same as comments
CREATE POLICY "attachments_select" ON task_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND assigned_to = auth.uid())
  );

CREATE POLICY "attachments_insert" ON task_attachments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Attendance: users see their own, admin sees all
CREATE POLICY "attendance_admin" ON attendance FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "attendance_own" ON attendance FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Notifications: users see their own
CREATE POLICY "notifications_own" ON notifications FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_admin_insert" ON notifications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR user_id = auth.uid());

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-set completed_at when task is marked completed
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_completed_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_completed_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "attachments_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-attachments');

CREATE POLICY "attachments_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'task-attachments');

-- ============================================================
-- SAMPLE DATA (Optional - remove in production)
-- ============================================================
-- NOTE: Sample users must be created via Supabase Auth Admin API or Dashboard
-- Then update their profiles manually if needed

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Task summary view for admin dashboard
CREATE OR REPLACE VIEW task_summary AS
SELECT
  p.id as employee_id,
  p.full_name,
  p.email,
  p.department,
  COUNT(t.id) as total_tasks,
  COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
  COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
  COUNT(CASE WHEN t.status = 'not_started' THEN 1 END) as not_started_tasks,
  COUNT(CASE WHEN t.status != 'completed' AND t.deadline < NOW() THEN 1 END) as overdue_tasks,
  ROUND(
    CASE WHEN COUNT(t.id) > 0
    THEN COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::NUMERIC / COUNT(t.id)::NUMERIC * 100
    ELSE 0 END, 1
  ) as completion_rate
FROM profiles p
LEFT JOIN tasks t ON t.assigned_to = p.id
WHERE p.role = 'employee' AND p.is_active = true
GROUP BY p.id, p.full_name, p.email, p.department;

GRANT SELECT ON task_summary TO authenticated;
