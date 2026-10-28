import {
  ThumbsUp,
  MessageSquare,
  CheckCircle2,
  Clock,
  Coins,
  ArrowRight,
  Sparkles,
  Users,
} from 'lucide-react'
import { anonymizeName, getAnonymousAvatar } from '../../utils/anonymize'

export default function QuestionCard({ question, onSelect, onToggleUpvote }) {
  const displayAuthor = anonymizeName(question.author)
  const displayAvatar = getAnonymousAvatar(question.author) || question.authorAvatar || 'R1'

  return (
    <article
      onClick={() => onSelect(question)}
      className="group relative rounded-2xl bg-[#111111] hover:bg-[#141414] border border-white/10 hover:border-[#ff0c0c]/60 p-5 sm:p-6 shadow-md hover:shadow-[0_0_25px_rgba(255,12,12,0.18)] transition-all duration-200 cursor-pointer overflow-hidden"
    >
      {/* Subtle top indicator if user's own question */}
      {question.isMyQuestion && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff0c0c] to-transparent opacity-80" />
      )}

      {/* Meta Top Line: User Avatar, Name, Batch, Time & Subject Tag */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2.5">
          {/* User Avatar */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-zinc-800 to-red-950 border border-white/15 flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0">
            {displayAvatar}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white group-hover:text-[#fef9f8]">
                {displayAuthor}
              </span>
              {question.isMyQuestion && (
                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-white/10 text-white/70 border border-white/15">
                  You
                </span>
              )}
            </div>
            <p className="text-[10px] text-white/50">{question.authorBatch}</p>
          </div>
        </div>

        {/* Right side: Subject & Status Badges */}
        <div className="flex items-center gap-2">
          {/* Community Badge */}
          {question.community && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-white/70 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/10">
              <Users className="w-2.5 h-2.5 text-[#ff0c0c]" />
              <span className="truncate max-w-[130px]">{question.community}</span>
            </span>
          )}

          {/* Subject Badge */}
          <span className="text-[11px] font-semibold font-mono text-[#ff0c0c] bg-[#ff0c0c]/10 px-2.5 py-0.5 rounded-md border border-[#ff0c0c]/25">
            {question.subjectCode} • {question.subject}
          </span>

          {/* AI Verification Badge */}
          {question.isAiVerification && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>AI Review</span>
            </span>
          )}

          {/* Resolved Checkmark vs Open Badge */}
          {question.isResolved ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
              <CheckCircle2 className="w-3 h-3" />
              <span>Resolved</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
              <Clock className="w-3 h-3" />
              <span>Open</span>
            </span>
          )}

          <span className="text-[10px] text-white/40 font-mono hidden sm:inline">
            {question.time}
          </span>
        </div>
      </div>

      {/* Question Title & Snippet */}
      <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-[#fef9f8] transition-colors leading-snug">
        {question.title}
      </h3>
      <p className="mt-1.5 text-xs sm:text-sm text-[#fef9f8]/65 line-clamp-2 leading-relaxed">
        {question.snippet}
      </p>

      {/* Tags */}
      {question.tags && question.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {question.tags.map((tag, idx) => (
            <span
              key={idx}
              className="text-[10px] px-2 py-0.5 rounded bg-white/[0.03] text-white/50 border border-white/[0.06]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Card Footer: Upvote Button, Answer Count, Bounty & Open Detail Prompt */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/60">
        <div className="flex items-center gap-3">
          {/* Interactive Upvote Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleUpvote(question.id)
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              question.userUpvoted
                ? 'bg-[#ff0c0c]/20 border-[#ff0c0c] text-[#ff0c0c] shadow-[0_0_12px_rgba(255,12,12,0.35)]'
                : 'bg-white/[0.03] border-white/10 text-white/70 hover:text-white hover:border-[#ff0c0c]/40'
            }`}
            title="Upvote this question"
          >
            <ThumbsUp
              className={`w-3.5 h-3.5 transition-transform ${
                question.userUpvoted ? 'fill-[#ff0c0c] scale-110' : ''
              }`}
            />
            <span>{question.upvotes}</span>
          </button>

          {/* Answers Count */}
          <div className="flex items-center gap-1.5 text-white/70">
            <MessageSquare className="w-3.5 h-3.5 text-white/40" />
            <span>
              {question.answers?.length || 0}{' '}
              {question.answers?.length === 1 ? 'answer' : 'answers'}
            </span>
          </div>

          {/* Token Bounty */}
          {question.bounty && (
            <div className="flex items-center gap-1 text-amber-400 font-medium">
              <Coins className="w-3.5 h-3.5" />
              <span>+{question.bounty} Tokens</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-white/40 group-hover:text-[#ff0c0c] font-medium transition-colors">
          <span>Read & Answer</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </article>
  )
}
