'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react'

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
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#F5A623]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="relative w-44 h-14 mx-auto mb-2">
            <Image src="/logo.png" alt="HypeMitra" fill className="object-contain" priority />
          </div>
        </div>
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2E2E2E] p-8 shadow-2xl">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#F5A623]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-sm text-slate-500 mb-6">Password reset link sent to <span className="text-[#F5A623]">{email}</span></p>
              <Link href="/auth/login" className="btn-primary w-full justify-center">Back to sign in</Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-1">Reset password</h2>
              <p className="text-sm text-slate-500 mb-6">We'll send you a reset link.</p>
              {error && <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 mb-4"><p className="text-sm text-red-400">{error}</p></div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label" htmlFor="email">Email address</label>
                  <input id="email" type="email" className="input" placeholder="you@hypemitra.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send reset link'}
                </button>
              </form>
              <Link href="/auth/login" className="flex items-center justify-center gap-1.5 mt-4 text-sm text-slate-600 hover:text-slate-400 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
