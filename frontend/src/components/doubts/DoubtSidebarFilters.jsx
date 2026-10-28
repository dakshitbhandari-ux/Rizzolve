import {
  Filter,
  CheckCircle2,
  HelpCircle,
  Coins,
  Sparkles,
  BookOpen,
  Layers,
  ArrowRight,
} from 'lucide-react'

export default function DoubtSidebarFilters({
  subjects,
  selectedSubject,
  onSelectSubject,
  unresolvedOnly,
  onToggleUnresolved,
  myQuestionsOnly,
  onToggleMyQuestions,
  onOpenAiChat,
  stats,
}) {
  return (
    <aside className="space-y-5">
      {/* 1. Quick Filters & Toggle Switches */}
      <div className="rounded-2xl bg-[#111111] border border-white/10 p-5 shadow-lg">
        <div className="flex items-center gap-2 pb-3.5 border-b border-white/[0.08] mb-4">
          <Filter className="w-4 h-4 text-[#ff0c0c]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Filter Doubts
          </h3>
        </div>

        <div className="space-y-3.5">
          {/* Toggle: Unresolved Only */}
          <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] cursor-pointer transition-colors select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <div>
                <span className="text-xs font-semibold text-white block">
                  Unresolved Only
                </span>
                <span className="text-[10px] text-white/50">
                  Questions still awaiting solutions
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={unresolvedOnly}
              onChange={(e) => onToggleUnresolved(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#ff0c0c] focus:ring-[#ff0c0c] accent-[#ff0c0c] cursor-pointer"
            />
          </label>

          {/* Toggle: My Questions Only */}
          <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] cursor-pointer transition-colors select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-[#ff0c0c]" />
              <div>
                <span className="text-xs font-semibold text-white block">
                  My Questions
                </span>
                <span className="text-[10px] text-white/50">
                  Doubts posted from your account
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={myQuestionsOnly}
              onChange={(e) => onToggleMyQuestions(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#ff0c0c] focus:ring-[#ff0c0c] accent-[#ff0c0c] cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* 2. Clickable Subject Tags */}
      <div className="rounded-2xl bg-[#111111] border border-white/10 p-5 shadow-lg">
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#ff0c0c]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Enrolled Subjects
            </h3>
          </div>
          <span className="text-[10px] font-mono text-white/40">
            {subjects.length} Subjects
          </span>
        </div>

        <div className="space-y-1">
          {/* All Subjects option */}
          <button
            onClick={() => onSelectSubject('all')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedSubject === 'all'
                ? 'bg-[#1c1c1c] text-white border-l-4 border-[#ff0c0c] shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span className={selectedSubject === 'all' ? 'text-white font-bold' : ''}>
              All Enrolled Subjects
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-white/50">
              {stats?.totalDoubts || 148}
            </span>
          </button>

          {/* List of individual subjects */}
          {subjects.map((sub) => {
            const isSelected = selectedSubject === sub.name
            return (
              <button
                key={sub.id}
                onClick={() => onSelectSubject(sub.name)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1c1c1c] text-white border-l-4 border-[#ff0c0c] shadow-sm font-bold'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-mono text-[10px] text-[#ff0c0c] shrink-0 font-bold">
                    {sub.code}
                  </span>
                  <span className="truncate">{sub.name}</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.04] text-white/40 shrink-0 ml-1">
                  {sub.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. AI Academic Co-Pilot Shortcut */}
      <div className="relative rounded-2xl bg-gradient-to-br from-[#1c1212] via-[#111111] to-[#0d0d0d] border border-[#ff0c0c]/30 p-5 shadow-xl overflow-hidden">
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#ff0c0c]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-2 text-xs font-bold text-[#ff0c0c] uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Need Instant Derivations?</span>
        </div>

        <h4 className="text-sm font-bold text-white leading-snug">
          Ask Rizzolve AI Academic Tutor
        </h4>
        <p className="text-xs text-white/65 mt-1 leading-relaxed">
          Stuck on homework late at night? Generate LaTeX step-by-step proofs and code explanations in seconds.
        </p>

        <button
          onClick={onOpenAiChat}
          className="mt-4 w-full py-2.5 px-3 text-xs font-semibold text-white bg-[#ff0c0c] hover:bg-[#ff0101] rounded-xl glow-red-hover flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,12,12,0.3)]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Launch AI Solver</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  )
}
