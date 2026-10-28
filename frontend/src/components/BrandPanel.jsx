import { Sparkles, BookOpenCheck, Coins, Users, CheckCircle2, Flame, Award } from 'lucide-react'

export default function BrandPanel() {
  const highlights = [
    {
      icon: <BookOpenCheck className="w-5 h-5 text-[#ff0c0c]" />,
      title: "Subject-Wise Knowledge Vaults",
      desc: "Stop losing homework & exam questions in disorganized WhatsApp chats. Every doubt is cataloged by subject code and syllabus.",
      badge: "Zero Lost Doubts",
    },
    {
      icon: <Coins className="w-5 h-5 text-[#ff0c0c]" />,
      title: "Peer Token Rewards",
      desc: "Earn platform credits when your answers are marked as Accepted or upvoted by peers. Fuel your own AI queries with rewards.",
      badge: "+25 Tokens/Solution",
    },
    {
      icon: <Sparkles className="w-5 h-5 text-[#ff0c0c]" />,
      title: "Multi-Model AI Tutor",
      desc: "Unblock tricky math proofs, code debugging, and complex derivations 24/7 with customized academic reasoning models.",
      badge: "Instant Assistance",
    },
  ]

  const subjects = [
    "Data Structures",
    "Operating Systems",
    "Calculus & Linear Algebra",
    "DBMS",
    "Thermodynamics",
  ]

  return (
    <div className="relative flex flex-col justify-between p-8 lg:p-12 xl:p-16 h-full overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#ff0c0c]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#ff0101]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Brand & Badge */}
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-[#1c1c1c] to-[#0a0a0a] border border-[#ff0c0c]/40 shadow-[0_0_20px_rgba(255,12,12,0.3)]">
            <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-[#f6f6f6] to-[#ff0c0c]">
              R
            </span>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#ff0c0c] rounded-full border-2 border-[#0a0a0a] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-white">
                Rizzolve
              </span>
              <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-[#ff0c0c]/15 text-[#ff0c0c] border border-[#ff0c0c]/30">
                SaaS v1.0
              </span>
            </div>
            <p className="text-xs text-white/50 tracking-wide">Multi-College Academic Network</p>
          </div>
        </div>

        {/* Hero headline according to requested typography: H1 2.5rem bold */}
        <div className="mt-10 lg:mt-14 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-white/80 mb-5">
            <Flame className="w-3.5 h-3.5 text-[#ff0c0c]" />
            <span>Built for rigorous campus collaboration</span>
          </div>

          <h1 className="text-white text-3xl sm:text-4xl lg:text-[2.5rem] font-bold leading-tight tracking-tight">
            Where campus doubts get resolved{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#f6f6f6] to-[#ff0c0c]">
              in real time.
            </span>
          </h1>

          <p className="mt-4 text-[#fef9f8]/75 text-base sm:text-lg leading-relaxed">
            Replace chaotic WhatsApp messages and Discord pings with structured subject boards, peer bounties, and specialized AI tutoring.
          </p>
        </div>

        {/* Subject Pills */}
        <div className="mt-6 flex flex-wrap gap-2">
          {subjects.map((sub, idx) => (
            <span
              key={idx}
              className="px-3 py-1 text-xs rounded-lg bg-white/[0.03] text-white/70 border border-white/10 hover:border-[#ff0c0c]/40 hover:text-white transition-all cursor-default"
            >
              #{sub}
            </span>
          ))}
        </div>
      </div>

      {/* Middle: Feature Value Pillars */}
      <div className="relative z-10 my-8 lg:my-10 space-y-3.5 max-w-xl">
        {highlights.map((item, index) => (
          <div
            key={index}
            className="group p-4 rounded-xl bg-[#121212]/80 hover:bg-[#161616]/90 border border-white/[0.08] hover:border-[#ff0c0c]/40 transition-all duration-200 backdrop-blur-md"
          >
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/10 group-hover:border-[#ff0c0c]/30 group-hover:bg-[#ff0c0c]/10 transition-colors shrink-0">
                {item.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white group-hover:text-[#fef9f8]">
                    {item.title}
                  </h3>
                  <span className="text-[11px] font-medium text-[#ff0c0c] bg-[#ff0c0c]/10 px-2 py-0.5 rounded border border-[#ff0c0c]/20">
                    {item.badge}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#fef9f8]/60 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom: Social Proof Live Card */}
      <div className="relative z-10 pt-4 border-t border-white/[0.08] max-w-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-600 border-2 border-[#0a0a0a] flex items-center justify-center text-xs font-bold text-white">
                AS
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neutral-800 to-red-950 border-2 border-[#0a0a0a] flex items-center justify-center text-xs font-bold text-[#ff0c0c]">
                RK
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-500 border-2 border-[#0a0a0a] flex items-center justify-center text-xs font-bold text-white">
                MN
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#ff0c0c]" />
                <span>14,000+ campus peers connected</span>
              </p>
              <p className="text-[11px] text-white/50">Across 24 engineering & science faculties</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141414] border border-white/10 text-xs">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-white/80">98.2% Doubt Resolution Rate</span>
          </div>
        </div>
      </div>
    </div>
  )
}
