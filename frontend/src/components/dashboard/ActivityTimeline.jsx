import {
  Clock,
  Coins,
  MessageSquareCheck,
  Megaphone,
  ThumbsUp,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'

export default function ActivityTimeline({ onNavigateTab }) {
  const activities = [
    {
      id: 1,
      type: 'reward',
      title: 'Token Bounty Credited',
      desc: 'You earned +50 tokens for your accepted answer on Peterson’s algorithm.',
      time: '14m ago',
      tokens: '+50 Tokens',
      icon: Coins,
      iconColor: 'text-[#ff0c0c]',
      iconBg: 'bg-[#ff0c0c]/15 border-[#ff0c0c]/40',
      actionTab: 'wallet',
    },
    {
      id: 2,
      type: 'answer',
      title: 'Peer Answer Submitted',
      desc: 'Random 2 (Senior Mentor) answered your question in Operating Systems.',
      time: '48m ago',
      tokens: null,
      icon: MessageSquareCheck,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30',
      actionTab: 'doubts',
    },
    {
      id: 3,
      type: 'announcement',
      title: 'Graphic Era Campus Hub',
      desc: 'New announcement: Mid-term doubt clinic schedules published for CS-301 & CS-304.',
      time: '2h ago',
      tokens: null,
      icon: Megaphone,
      iconColor: 'text-sky-400',
      iconBg: 'bg-sky-500/15 border-sky-500/30',
      actionTab: 'communities',
    },
    {
      id: 4,
      type: 'upvote',
      title: 'Solution Upvoted',
      desc: 'Random 3 and 4 others upvoted your explanation on Singular Value Decomposition.',
      time: '5h ago',
      tokens: '+10 Tokens',
      icon: ThumbsUp,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/15 border-amber-500/30',
      actionTab: 'wallet',
    },
    {
      id: 5,
      type: 'ai',
      title: 'AI Tutor Derivation',
      desc: 'Exported LaTeX derivation on AVL tree rotations to your notes vault.',
      time: 'Yesterday',
      tokens: '-5 Tokens',
      icon: Sparkles,
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/15 border-purple-500/30',
      actionTab: 'ai-chat',
    },
  ]

  return (
    <div className="rounded-2xl bg-slate-950/35 border border-white/[0.08] p-5 sm:p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between transition-all duration-300 hover:border-cyan-500/25">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">
                Recent Campus Activity
              </h3>
              <p className="text-xs text-slate-400">Live timeline & notifications</p>
            </div>
          </div>

          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        {/* Vertical Timeline */}
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-gradient-to-b before:from-cyan-400/50 before:via-white/10 before:to-transparent">
          {activities.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.id}
                onClick={() => onNavigateTab && onNavigateTab(item.actionTab)}
                className="relative group cursor-pointer"
              >
                {/* Node icon on vertical timeline line */}
                <div
                  className={`absolute -left-[30px] top-0.5 w-6 h-6 rounded-full border flex items-center justify-center shadow-md transition-transform group-hover:scale-110 ${item.iconBg}`}
                >
                  <Icon className={`w-3 h-3 ${item.iconColor}`} />
                </div>

                {/* Content Box */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] group-hover:bg-white/[0.05] border border-white/[0.05] group-hover:border-cyan-400/30 transition-all">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-xs font-semibold text-white group-hover:text-cyan-200 transition-colors">
                      {item.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {item.time}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300/70 leading-relaxed">
                    {item.desc}
                  </p>

                  {item.tokens && (
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded font-mono border ${
                          item.tokens.startsWith('+')
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-white/5 text-slate-400 border-white/10'
                        }`}
                      >
                        {item.tokens}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="mt-6 pt-3 border-t border-white/[0.08] text-center">
        <button
          onClick={() => onNavigateTab && onNavigateTab('wallet')}
          className="text-xs font-medium text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer inline-flex items-center gap-1.5"
        >
          <span>View complete ledger & history</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
