'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckSquare } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Fast check - get session then profile in one shot
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/auth/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile?.role === 'admin') router.replace('/admin')
      else router.replace('/employee')
    })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center">
          <CheckSquare className="w-7 h-7 text-white" />
        </div>
        <div className="flex gap-1">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
