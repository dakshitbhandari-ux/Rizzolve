import {
  Network,
  Database,
  Binary,
  Cpu,
  Code2,
  BrainCircuit,
  ArrowRight,
  BookOpen,
  MessageSquare,
} from 'lucide-react'

export default function EnrolledSubjectsGrid({ onNavigateTab }) {
  const subjects = [
    {
      id: 'cs-301',
      code: 'CS-301',
      name: 'Computer Networks',
      icon: Network,
      activeDoubts: 8,
      instructor: 'Dr. V. Ramanathan',
      color: 'text-sky-400',
      iconBg: 'bg-sky-400/10 border-sky-400/25',
    },
    {
      id: 'cs-304',
      code: 'CS-304',
      name: 'Database Management',
      icon: Database,
      activeDoubts: 12,
      instructor: 'Prof. Ananya Sen',
      color: 'text-amber-400',
      iconBg: 'bg-amber-400/10 border-amber-400/25',
    },
    {
      id: 'ma-201',
      code: 'MA-201',
      name: 'Applied Mathematics',
      icon: Binary,
      activeDoubts: 15,
      instructor: 'Dr. K. S. Mukherjee',
      color: 'text-emerald-400',
      iconBg: 'bg-emerald-400/10 border-emerald-400/25',
    },
    {
      id: 'cs-302',
      code: 'CS-302',
      name: 'Operating Systems',
      icon: Cpu,
      activeDoubts: 19,
      instructor: 'Prof. Rajesh Nair',
      color: 'text-cyan-400',
      iconBg: 'bg-cyan-400/10 border-cyan-400/25',
    },
    {
      id: 'cs-308',
      code: 'CS-308',
      name: 'Machine Learning',
      icon: BrainCircuit,
      activeDoubts: 22,
      instructor: 'Dr. Meera Iyer',
      color: 'text-purple-400',
      iconBg: 'bg-purple-400/10 border-purple-400/25',
    },
    {
      id: 'cs-305',
      code: 'CS-305',
      name: 'Software Engineering',
      icon: Code2,
      activeDoubts: 6,
      instructor: 'Prof. Sunil Verma',
      color: 'text-rose-400',
      iconBg: 'bg-rose-400/10 border-rose-400/25',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
              Enrolled Subjects
            </h3>
            <p className="text-xs text-slate-400">
              Direct access to dedicated doubt boards & syllabus FAQs
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab && onNavigateTab('doubts')}
          className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>All Subjects</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid of Subject Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((sub) => {
          const Icon = sub.icon
          return (
            <div
              key={sub.id}
              onClick={() => onNavigateTab && onNavigateTab('doubts')}
              className="group relative rounded-2xl bg-slate-950/35 border border-white/[0.08] p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/40 hover:bg-slate-950/50 flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl border transition-colors ${sub.iconBg}`}>
                      <Icon className={`w-4 h-4 ${sub.color}`} />
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-300">
                      {sub.code}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-300 border border-white/[0.08] flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3 text-cyan-400" />
                    <span>{sub.activeDoubts} doubts</span>
                  </span>
                </div>

                <h4 className="text-base font-semibold text-white group-hover:text-cyan-200 transition-colors leading-snug">
                  {sub.name}
                </h4>
                <p className="text-xs text-slate-400 mt-1 truncate">
                  {sub.instructor}
                </p>
              </div>

              {/* Clean Footer Bar */}
              <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-[11px] text-slate-400/80 group-hover:text-slate-300 transition-colors">
                  Syllabus Board Active
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-cyan-400 group-hover:text-cyan-300 transition-colors">
                  <span>Go to Board</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
