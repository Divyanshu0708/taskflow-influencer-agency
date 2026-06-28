import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: string
  trendUp?: boolean
  className?: string
  gold?: boolean
}

export default function StatsCard({
  title, value, icon: Icon,
  iconColor = 'text-[#F5A623]',
  iconBg = 'bg-[#F5A623]/10',
  trend, trendUp, className, gold = false
}: StatsCardProps) {
  return (
    <div className={cn(
      'bg-[#1A1A1A] rounded-xl border border-[#2E2E2E] p-5 flex items-start gap-4 transition-all duration-200 hover:border-[#F5A623]/20',
      gold && 'border-[#F5A623]/30 bg-gradient-to-br from-[#1A1A1A] to-[#F5A623]/5',
      className
    )}>
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500 truncate">{title}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {trend && (
          <p className={cn('text-xs mt-1', trendUp ? 'text-emerald-400' : 'text-red-400')}>
            {trend}
          </p>
        )}
      </div>
    </div>
  )
}
