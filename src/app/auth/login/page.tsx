'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Loader2, AlertCircle, Zap } from 'lucide-react'

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
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      if (!data.user) throw new Error('Login failed')
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      router.replace(profile?.role === 'admin' ? '/admin' : '/employee')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed'
      if (message.includes('Invalid login credentials') || message.includes('invalid_credentials')) {
        setError('Invalid email or password. Please try again.')
      } else {
        setError('Something went wrong. Please try again.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#F5A623]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#E07B00]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center">
            <div className="w-48 h-16 relative mb-3">
              <Image src="/logo.png" alt="HypeMitra" fill className="object-contain" priority />
            </div>
            <p className="text-slate-500 text-xs tracking-widest uppercase">Task Management</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2E2E2E] p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Welcome back</h2>
            <p className="text-slate-500 text-sm mt-1">Sign in to your workspace</p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 mb-5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email address</label>
              <input
                id="email" type="email" className="input"
                placeholder="you@hypemitra.com"
                value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email" autoFocus disabled={loading}
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password" type={showPassword ? 'text' : 'password'} className="input pr-10"
                  placeholder="Enter your password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password" disabled={loading}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link href="/auth/forgot-password" className="text-xs text-[#F5A623] hover:text-[#FFB83F] transition-colors">
                Forgot password?
              </Link>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : <><Zap className="w-4 h-4" /> Sign in</>}
            </button>
          </form>
        </div>

        {/* Tagline */}
        <p className="text-center mt-6 text-xs text-slate-600">
          We don't chase hype. <span className="gold-text font-semibold">We create it.</span>
        </p>
      </div>
    </div>
  )
}
