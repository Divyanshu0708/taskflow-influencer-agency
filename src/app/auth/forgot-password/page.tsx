'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { CheckSquare, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 dark:from-slate-900 dark:via-indigo-900/10 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4 shadow-lg shadow-indigo-500/30">
            <CheckSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">TaskFlow</h1>
        </div>

        <div className="card p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Check your email</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                We sent a password reset link to <strong>{email}</strong>
              </p>
              <Link href="/auth/login" className="btn-primary w-full">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">Reset password</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Enter your email and we'll send you a reset link.
              </p>

              {error && (
                <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-4">
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
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send reset link'}
                </button>
              </form>

              <Link href="/auth/login" className="flex items-center justify-center gap-1.5 mt-4 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
