import { useState } from 'react'
import {
  ArrowLeft,
  ThumbsUp,
  MessageSquare,
  CheckCircle2,
  Clock,
  Coins,
  Share2,
  Bookmark,
  Sparkles,
  Send,
  Award,
  Check,
  ShieldCheck,
  Users,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { askAiQuestion } from '../../services/api'
import { anonymizeName, getAnonymousAvatar } from '../../utils/anonymize'

export default function QuestionDetailView({
  question,
  onBack,
  onToggleUpvote,
  onAcceptAnswer,
  onAddAnswer,
  currentUser,
}) {
  const [answerText, setAnswerText] = useState('')
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false)
  const [localAnswers, setLocalAnswers] = useState(question.answers || [])
  const [isGeneratingAiAnswer, setIsGeneratingAiAnswer] = useState(false)
  const [aiError, setAiError] = useState('')

  const handleAskAiForSolution = async () => {
    setIsGeneratingAiAnswer(true)
    setAiError('')
    try {
      const prompt = `Please answer this academic question step-by-step with clear reasoning:\n\nTitle: ${question.title}\nDetails: ${question.fullDescription || question.snippet}`
      const answer = await askAiQuestion(prompt)
      const aiAns = {
        id: `ai-ans-${Date.now()}`,
        author: 'Spidyy AI Academic Tutor',
        authorAvatar: 'AI',
        authorRole: 'Google Gemini 3.1 • Instant Solution',
        time: 'Just now',
        text: answer,
        upvotes: 3,
        userUpvoted: false,
        isAccepted: false,
        isAiGenerated: true,
      }
      setLocalAnswers((prev) => [aiAns, ...prev])
      onAddAnswer && onAddAnswer(question.id, aiAns)
    } catch (err) {
      setAiError(err.message || 'Could not reach AI Copilot backend.')
    } finally {
      setIsGeneratingAiAnswer(false)
    }
  }

  const handleUpvoteAnswer = (ansId) => {
    setLocalAnswers((prev) =>
      prev.map((ans) => {
        if (ans.id === ansId) {
          const newUpvoted = !ans.userUpvoted
          return {
            ...ans,
            userUpvoted: newUpvoted,
            upvotes: newUpvoted ? ans.upvotes + 1 : ans.upvotes - 1,
          }
        }
        return ans
      })
    )
  }

  const handleAccept = (ansId) => {
    setLocalAnswers((prev) =>
      prev.map((ans) => ({
        ...ans,
        isAccepted: ans.id === ansId,
      }))
    )

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10b981', '#ff0c0c', '#ffffff'],
      })
    } catch (e) {}

    onAcceptAnswer(question.id, ansId)
  }

  const handleSubmitNewAnswer = (e) => {
    e.preventDefault()
    if (!answerText.trim()) return

    setIsSubmittingAnswer(true)

    const newAnswer = {
      id: `ans-${Date.now()}`,
      author: anonymizeName(currentUser?.fullName || 'Random 1'),
      authorAvatar: getAnonymousAvatar(currentUser?.fullName || 'Random 1'),
      authorRole: `${currentUser?.course || 'B.Tech CS'} • Peer Contributor`,
      time: 'Just now',
      text: answerText.trim(),
      upvotes: 0,
      userUpvoted: false,
      isAccepted: false,
    }

    setTimeout(() => {
      setLocalAnswers((prev) => [...prev, newAnswer])
      setIsSubmittingAnswer(false)
      setAnswerText('')
      onAddAnswer(question.id, newAnswer)

      try {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#ff0c0c', '#fef9f8'],
        })
      } catch (err) {}
    }, 500)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Navigation Back Button */}
      <div className="flex items-center justify-between pb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Doubts</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50 font-mono">
            Thread ID: #{question.id}
          </span>
        </div>
      </div>

      {/* Main Question Card */}
      <article className="rounded-2xl bg-[#111111] border border-white/10 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative Top Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff0c0c] to-transparent opacity-80" />

        {/* Header Meta Line */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-zinc-800 to-red-950 border border-white/15 flex items-center justify-center text-sm font-bold text-white shadow-sm shrink-0">
              {getAnonymousAvatar(question.author) || question.authorAvatar || 'R1'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {anonymizeName(question.author)}
                </span>
                {question.isMyQuestion && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white/10 text-white/80 border border-white/15">
                    Your Question
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50">
                {question.authorBatch} • Posted {question.time}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {question.community && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                <Users className="w-3.5 h-3.5 text-[#ff0c0c]" />
                <span>{question.community}</span>
              </span>
            )}

            <span className="text-xs font-mono font-bold text-[#ff0c0c] bg-[#ff0c0c]/10 px-3 py-1 rounded-lg border border-[#ff0c0c]/30">
              {question.subjectCode} • {question.subject}
            </span>

            {question.isResolved ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Resolved FAQ</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Clock className="w-3.5 h-3.5" />
                <span>Open for Solutions</span>
              </span>
            )}
          </div>
        </div>

        {/* AI Fact Check Notice */}
        {question.isAiVerification && (
          <div className="mt-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-purple-300 uppercase tracking-wide">
                Peer Review & AI Fact-Checking Requested
              </p>
              <p className="text-xs text-white/80 mt-0.5">
                The student generated this answer using Spidyy AI and wants the campus community to verify if the explanation, steps, and formulas are 100% correct.
              </p>
            </div>
          </div>
        )}

        {/* Question Title & Full Text */}
        <div className="mt-6">
          <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug tracking-tight">
            {question.title}
          </h1>

          <div className="mt-4 text-sm sm:text-base text-[#fef9f8]/85 leading-relaxed space-y-4 whitespace-pre-line font-sans">
            {question.fullDescription || question.snippet}
          </div>

          {/* Tags */}
          {question.tags && (
            <div className="mt-6 flex flex-wrap gap-2">
              {question.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white/[0.04] text-white/60 border border-white/10"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* AI Instant Assistance Action */}
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-[#ff0c0c]/10 via-[#ff0c0c]/5 to-transparent border border-[#ff0c0c]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#ff0c0c]/20 border border-[#ff0c0c]/40 flex items-center justify-center text-[#ff0c0c]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Stuck on this doubt?</p>
                <p className="text-[11px] text-white/60">Generate an instant step-by-step resolution from Google Gemini</p>
              </div>
            </div>
            <button
              onClick={handleAskAiForSolution}
              disabled={isGeneratingAiAnswer}
              className="px-4 py-2 rounded-xl bg-[#ff0c0c] hover:bg-[#ff0c0c]/90 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-[#ff0c0c]/20 disabled:opacity-50 cursor-pointer self-start sm:self-auto transition-all"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAiAnswer ? 'animate-spin' : ''}`} />
              <span>{isGeneratingAiAnswer ? 'Generating AI Breakdown...' : 'Get Instant AI Answer'}</span>
            </button>
          </div>
          {aiError && (
            <p className="mt-2 text-xs text-rose-400">{aiError}</p>
          )}
        </div>

        {/* Question Footer: Upvotes & Bounty */}
        <div className="mt-8 pt-4 border-t border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onToggleUpvote(question.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                question.userUpvoted
                  ? 'bg-[#ff0c0c]/20 border-[#ff0c0c] text-[#ff0c0c] shadow-[0_0_15px_rgba(255,12,12,0.3)]'
                  : 'bg-white/5 border-white/10 text-white hover:border-[#ff0c0c]/50'
              }`}
            >
              <ThumbsUp
                className={`w-4 h-4 ${question.userUpvoted ? 'fill-[#ff0c0c]' : ''}`}
              />
              <span>{question.upvotes} Helpful Upvotes</span>
            </button>

            {question.bounty && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400">
                <Coins className="w-4 h-4" />
                <span>🪙 {question.bounty} Tokens Bounty Offered</span>
              </div>
            )}
          </div>

          <span className="text-xs text-white/50">
            {localAnswers.length} {localAnswers.length === 1 ? 'Answer' : 'Answers'} Submitted
          </span>
        </div>
      </article>

      {/* ================= ANSWERS SECTION ================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#ff0c0c]" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              Community & Mentor Answers ({localAnswers.length})
            </h3>
          </div>
          <span className="text-xs text-white/50">
            Sorted by peer helpfulness & verification
          </span>
        </div>

        {/* Answers List */}
        {localAnswers.length === 0 ? (
          <div className="rounded-2xl bg-[#111111] border border-white/10 p-8 text-center">
            <Clock className="w-8 h-8 text-white/40 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-white">No solutions posted yet</h4>
            <p className="text-xs text-white/50 mt-1 max-w-sm mx-auto">
              Be the first peer to provide a verified step-by-step breakdown and claim the{' '}
              <span className="text-amber-400 font-bold">🪙 {question.bounty || 25} Token bounty</span>!
            </p>
          </div>
        ) : (
          localAnswers.map((answer) => (
            <div
              key={answer.id}
              className={`rounded-2xl bg-[#111111] border p-5 sm:p-6 shadow-xl transition-all ${
                answer.isAccepted
                  ? 'border-emerald-500/50 bg-[#0d1612]/95 shadow-[0_0_25px_rgba(16,185,129,0.12)]'
                  : 'border-white/10'
              }`}
            >
              {/* Answer Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06] mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/15 flex items-center justify-center text-xs font-bold text-white">
                    {getAnonymousAvatar(answer.author) || answer.authorAvatar || 'R1'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-white">
                        {anonymizeName(answer.author)}
                      </span>
                      {answer.isAiGenerated && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ff0c0c]/20 text-[#ff0c0c] border border-[#ff0c0c]/40">
                          <Sparkles className="w-3 h-3" />
                          <span>Spidyy AI</span>
                        </span>
                      )}
                      {answer.isAccepted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Accepted Solution</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/50">
                      {answer.authorRole} • {answer.time}
                    </p>
                  </div>
                </div>

                {/* Right side: Accept Button */}
                <div className="flex items-center gap-2">
                  {!answer.isAccepted ? (
                    <button
                      onClick={() => handleAccept(answer.id)}
                      className="px-3 py-1.5 rounded-xl border border-white/15 hover:border-emerald-500/60 hover:text-emerald-400 hover:bg-emerald-500/10 text-xs font-medium text-white/70 transition-all cursor-pointer flex items-center gap-1.5"
                      title="Mark this answer as accepted solution"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept Answer</span>
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30">
                      <Award className="w-3.5 h-3.5" />
                      <span>Bounty Awarded</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Answer Body */}
              <div className="text-sm text-[#fef9f8]/85 leading-relaxed space-y-3 whitespace-pre-line font-sans">
                {answer.text}
              </div>

              {/* Answer Footer */}
              <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/60">
                <button
                  onClick={() => handleUpvoteAnswer(answer.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    answer.userUpvoted
                      ? 'bg-[#ff0c0c]/20 border-[#ff0c0c] text-[#ff0c0c]'
                      : 'bg-white/[0.03] border-white/10 text-white/70 hover:text-white hover:border-[#ff0c0c]/40'
                  }`}
                >
                  <ThumbsUp
                    className={`w-3.5 h-3.5 ${answer.userUpvoted ? 'fill-[#ff0c0c]' : ''}`}
                  />
                  <span>{answer.upvotes} Helpful</span>
                </button>

                <span className="text-[11px] text-white/40 font-mono">
                  Verified Academic Peer Response
                </span>
              </div>
            </div>
          ))
        )}

        {/* ================= YOUR ANSWER INPUT BOX ================= */}
        <div className="mt-8 rounded-2xl bg-[#111111] border border-white/10 p-5 sm:p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#ff0c0c]" />
            <h4 className="text-base font-bold text-white">Your Solution</h4>
            <span className="text-xs text-white/50 ml-auto">
              Earn +25 to +50 tokens when accepted
            </span>
          </div>

          <form onSubmit={handleSubmitNewAnswer}>
            <textarea
              required
              rows={4}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Write a clear, structured explanation. Include step-by-step logic, code snippets, or mathematical formulas..."
              className="w-full px-4 py-3 text-sm rounded-xl rizzolve-input resize-y leading-relaxed font-sans"
            />

            <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-white/50">
                Formatting tips: Use backticks for \`code\` and clear numbered steps.
              </span>

              <button
                type="submit"
                disabled={isSubmittingAnswer || !answerText.trim()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#ff0c0c] hover:bg-[#ff0101] glow-red-hover flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,12,12,0.35)] disabled:opacity-50"
              >
                {isSubmittingAnswer ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Answer</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
