import { Coins, HelpCircle, CheckCircle2, Clock, ArrowUpRight, TrendingUp } from 'lucide-react'

export default function StatsOverviewGrid({ currentUser }) {
  const tokenBalance = currentUser?.tokenBalance ?? 450

  const stats = [
    {
      id: 'tokens',
      title: 'Total Tokens',
      value: `${tokenBalance}`,
      trend: '+50 this wk',
      trendPositive: true,
      subtext: 'Platform credits for AI & bounties',
      icon: Coins,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-400/10 border-amber-400/25',
      glowColor: 'group-hover:bg-amber-400/10',
    },
    {
      id: 'questions',
      title: 'Questions Asked',
      value: '14',
      trend: '2 pending',
      trendPositive: true,
      subtext: '12 resolved into campus FAQs',
      icon: HelpCircle,
      iconColor: 'text-cyan-400',
      iconBg: 'bg-cyan-400/10 border-cyan-400/25',
      glowColor: 'group-hover:bg-cyan-400/10',
    },
    {
      id: 'answers',
      title: 'Answers Given',
      value: '26',
      trend: '94% approval',
      trendPositive: true,
      subtext: '18 accepted campus solutions',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-400/10 border-emerald-400/25',
      glowColor: 'group-hover:bg-emerald-400/10',
    },
    {
      id: 'unresolved',
      title: 'Active In Review',
      value: '03',
      trend: '24m avg time',
      trendPositive: false,
      subtext: 'Campus peer review active',
      icon: Clock,
      iconColor: 'text-rose-400',
      iconBg: 'bg-rose-400/10 border-rose-400/25',
      glowColor: 'group-hover:bg-rose-400/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.id}
            className="group relative rounded-2xl bg-slate-950/35 border border-white/[0.08] p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/40 hover:bg-slate-950/50 cursor-default overflow-hidden"
          >
            {/* Ambient hover glow inside card */}
            <div
              className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl transition-all duration-300 pointer-events-none ${stat.glowColor}`}
            />

            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-slate-200 transition-colors">
                {stat.title}
              </span>
              <div
                className={`p-2 rounded-xl border transition-all duration-200 ${stat.iconBg} ${stat.iconColor}`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {stat.value}
              </h3>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                <TrendingUp className="w-3 h-3" />
                <span>{stat.trend}</span>
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-400/80 leading-relaxed truncate">
              {stat.subtext}
            </p>
          </div>
        )
      })}
    </div>
  )
}
