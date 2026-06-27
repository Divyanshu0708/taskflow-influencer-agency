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
}

export default function StatsCard({
  title, value, icon: Icon, iconColor = 'text-indigo-600', iconBg = 'bg-indigo-50 dark:bg-indigo-900/20',
  trend, trendUp, className
}: StatsCardProps) {
  return (
    <div className={cn('card p-5 flex items-start gap-4', className)}>
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{title}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{value}</p>
        {trend && (
          <p className={cn('text-xs mt-1', trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400')}>
            {trend}
          </p>
        )}
      </div>
    </div>
  )
}
