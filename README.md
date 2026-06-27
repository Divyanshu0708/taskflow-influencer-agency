# TaskFlow — Agency Task Management System

A production-ready, mobile-first task management application built for marketing & PR agencies. Built with Next.js 14, Supabase, and Tailwind CSS.

---

## ✨ Features

### Admin
- Create & manage employee accounts
- Assign tasks with priority, deadline, notes, category
- Real-time task status tracking
- Team performance dashboard with charts
- Employee attendance overview
- Export reports to Excel & PDF
- Notifications when tasks are updated

### Employee
- Personal dashboard with task progress
- Update task status (Not Started → In Progress → Completed)
- Add comments and updates on tasks
- Upload proof of completion (images, PDFs, docs)
- Daily check-in / check-out with duration tracking
- Attendance history

### General
- 🌙 Dark mode + light mode
- 📱 Fully mobile-responsive
- 🔔 Real-time notifications
- 🔐 Role-based access (Admin / Employee)
- 🔍 Search & filter tasks
- 📊 Charts: bar, line, pie
- 📥 Export to Excel & PDF

---

## 🗂 Folder Structure

```
taskflow/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── layout.tsx          ← Admin layout with sidebar
│   │   │   ├── page.tsx            ← Admin dashboard
│   │   │   ├── tasks/page.tsx      ← Task management
│   │   │   ├── employees/page.tsx  ← Employee management
│   │   │   ├── reports/page.tsx    ← Analytics & export
│   │   │   └── attendance/page.tsx ← Attendance overview
│   │   ├── employee/
│   │   │   ├── layout.tsx          ← Employee layout
│   │   │   ├── page.tsx            ← Employee dashboard
│   │   │   ├── tasks/page.tsx      ← My tasks
│   │   │   └── attendance/page.tsx ← Check-in/out
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   ├── layout.tsx              ← Root layout (theme + auth)
│   │   ├── page.tsx                ← Auto-redirect
│   │   └── globals.css
│   ├── components/
│   │   └── shared/
│   │       ├── Navbar.tsx          ← Top navbar with notifications
│   │       ├── StatsCard.tsx       ← Metric card
│   │       ├── TaskCard.tsx        ← Task list item
│   │       └── TaskDetailModal.tsx ← Full task view
│   ├── hooks/
│   │   ├── useAuth.tsx             ← Auth context + profile
│   │   └── useTasks.ts             ← Task CRUD operations
│   ├── lib/
│   │   ├── supabase.ts             ← Supabase client
│   │   └── utils.ts                ← Helpers, formatters, config
│   └── types/
│       └── index.ts                ← TypeScript interfaces
├── supabase-schema.sql             ← Complete DB schema
├── .env.local.example
├── package.json
├── tailwind.config.js
└── next.config.js
```

---

## 🚀 Setup Instructions

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project**
3. Set a name (e.g. `taskflow-agency`) and a strong database password
4. Wait for the project to initialize (~2 minutes)

### Step 2: Run the Database Schema

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy the entire contents of `supabase-schema.sql` and paste it
4. Click **Run** (or press Ctrl+Enter)
5. You should see "Success. No rows returned."

### Step 3: Get Your API Keys

1. In Supabase dashboard, go to **Settings → API**
2. Copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon/public** key

### Step 4: Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_ADMIN_EMAIL=admin@youragency.com
```

### Step 5: Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 👤 Creating the Admin Account

### Option A: Supabase Dashboard (Recommended)

1. Go to **Authentication → Users** in Supabase
2. Click **Add User → Create New User**
3. Enter your admin email and a strong password
4. After creating, go to **Table Editor → profiles**
5. Find your user row and set `role` to `admin`

### Option B: SQL

```sql
-- After the user signs up, update their role:
UPDATE profiles SET role = 'admin' WHERE email = 'admin@youragency.com';
```

---

## 👥 Sample Data (Optional)

Run this SQL in Supabase SQL Editor after creating your admin and employees:

```sql
-- First create employee accounts via Auth → Users in dashboard
-- Then run this to add sample tasks (replace UUIDs with actual user IDs):

INSERT INTO tasks (title, description, assigned_to, created_by, priority, status, deadline, notes, category)
VALUES
  ('Write press release for Q4 product launch', 'Draft a 500-word press release highlighting the new features and benefits.', 
   '<employee_id>', '<admin_id>', 'high', 'in_progress', NOW() + INTERVAL '2 days', 'Focus on the mobile app angle', 'PR'),
  
  ('Create social media content calendar for November', 'Plan 30 days of posts across Instagram, LinkedIn, and Twitter.',
   '<employee_id>', '<admin_id>', 'high', 'not_started', NOW() + INTERVAL '5 days', 'Use brand colors and tone guide', 'Social Media'),
  
  ('Client report for ABC Corp - October', 'Compile monthly performance metrics and insights.',
   '<employee_id>', '<admin_id>', 'medium', 'not_started', NOW() + INTERVAL '7 days', 'Client expects PDF format', 'Reporting'),
  
  ('Influencer outreach for product campaign', 'Identify and contact 20 micro-influencers in the lifestyle niche.',
   '<employee_id>', '<admin_id>', 'medium', 'completed', NOW() - INTERVAL '1 day', NULL, 'Influencer Marketing'),
  
  ('Update agency website homepage copy', 'Refresh the hero section and case studies section.',
   '<employee_id>', '<admin_id>', 'low', 'not_started', NOW() + INTERVAL '14 days', NULL, 'Content');
```

---

## 🌐 Deployment

### Deploy to Vercel (Recommended — Free)

1. Push your code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit: TaskFlow"
git remote add origin https://github.com/yourname/taskflow.git
git push -u origin main
```

2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repository
4. Add environment variables (same as `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**
6. Your app is live at `https://yourproject.vercel.app`

### Deploy to Netlify

```bash
npm run build
# Upload the .next folder or connect GitHub repo
```

Add the same environment variables in Netlify's dashboard under **Site settings → Environment variables**.

---

## 🔒 Security Notes

- Supabase Row Level Security (RLS) is enabled on all tables
- Employees can only see their own tasks and data
- Admin can see everything
- File uploads are limited to 50MB per file
- Password reset is handled via Supabase Auth email flow

---

## 📱 Mobile Usage

The app is optimized for mobile. Employees can:
- Check in/out from their phone
- Update task status with one tap
- Add comments and upload photos as proof of completion
- Receive instant push-style notifications (in-app)

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| UI | Tailwind CSS + Radix UI |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Charts | Recharts |
| Export | xlsx + jspdf |
| Icons | Lucide React |
| Themes | next-themes |
| Toasts | react-hot-toast |

---

## 🙋 FAQ

**Q: Can I have multiple admins?**  
A: Yes — set `role = 'admin'` for any profile in the `profiles` table.

**Q: How do employees receive notifications?**  
A: Notifications appear in the bell icon in the navbar. They update in real-time via Supabase Realtime subscriptions.

**Q: Can employees reset their own password?**  
A: Yes — the "Forgot Password" link on the login page sends a reset email via Supabase Auth.

**Q: How do I increase the file upload limit?**  
A: Edit the `supabase-schema.sql` storage bucket `file_size_limit` value (currently 52428800 = 50MB).

**Q: Is there a limit on number of employees?**  
A: Supabase free tier supports up to 50,000 monthly active users. The app itself has no employee limit.

---

## 📞 Support

Built for marketing & PR agencies managing teams of 5–50 employees. For customizations contact your developer.
