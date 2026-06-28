'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, CheckSquare, Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Sign in
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      if (!data.user) throw new Error('No user returned')

      // Fetch profile in parallel - single query
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      // Redirect based on role immediately
      if (profile?.role === 'admin') {
        router.replace('/admin')
      } else {
        router.replace('/employee')
      }
    } catch (err: any) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 dark:from-slate-900 dark:via-indigo-900/10 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4 shadow-lg shadow-indigo-500/30">
            <CheckSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">TaskFlow</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Influencer Agency</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">Sign in</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Welcome back! Enter your credentials.</p>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@agency.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link href="/auth/forgot-password" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
              ) : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-6">
          © 2025 HypeMitrainhouse. All rights reserved.
        </p>
      </div>
    </div>
  )
}
