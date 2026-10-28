import {
  Sparkles,
  MessageSquarePlus,
  Coins,
  ArrowRight,
  Users,
  GraduationCap,
  Flame,
} from 'lucide-react'

export default function WelcomeBanner({ currentUser, onNavigateTab }) {
  const studentName = currentUser?.fullName || 'Random 1'
  const tokenBalance = currentUser?.tokenBalance ?? 450

  return (
    <div className="relative rounded-2xl bg-slate-950/35 border border-white/[0.08] p-6 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.36)] backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:border-cyan-500/25 group">
      {/* Subtle Cyan Ambient Aura in Background */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-[90px] pointer-events-none group-hover:bg-cyan-500/15 transition-all duration-500" />
      <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Decorative Top Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

      <div className="relative z-10 max-w-2xl">
        {/* Campus Workspace Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs text-slate-300 mb-3.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-medium text-[11px] tracking-wide">Apex Institute of Technology • Spring 2026</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
        </div>

        {/* Clean Modern Typography */}
        <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight leading-tight">
          Welcome back,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400">
            {studentName}
          </span>
          .
        </h2>

        <p className="mt-2 text-xs sm:text-sm text-slate-300/80 leading-relaxed">
          Campus workspace active • <span className="text-white font-medium">3 doubts in review</span> •{' '}
          <span className="text-cyan-300 font-medium">{tokenBalance} tokens</span> available • 14 campus FAQs resolved.
        </p>

        {/* Clean Action Button Bar */}
        <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-3">
          {/* Primary Action Button */}
          <button
            onClick={() => onNavigateTab && onNavigateTab('doubts')}
            className="px-4.5 py-2.2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center gap-2 cursor-pointer transition-all duration-200"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>Ask a Doubt</span>
          </button>

          {/* AI Copilot Button */}
          <button
            onClick={() => onNavigateTab && onNavigateTab('ai-chat')}
            className="px-4 py-2.2 text-xs font-medium text-slate-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-400/40 rounded-xl flex items-center gap-2 cursor-pointer transition-all duration-200"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Launch AI Co-Pilot</span>
          </button>

          {/* Communities Button */}
          <button
            onClick={() => onNavigateTab && onNavigateTab('communities')}
            className="px-3.5 py-2.2 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-xl flex items-center gap-1.5 cursor-pointer transition-all duration-200"
          >
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>Batch Communities</span>
          </button>
        </div>
      </div>
    </div>
  )
}
