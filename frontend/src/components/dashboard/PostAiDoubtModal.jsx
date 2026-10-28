import { useState } from 'react'
import {
  X,
  Sparkles,
  HelpCircle,
  Coins,
  Send,
  Check,
  AlertCircle,
  FileQuestion,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { createDoubt } from '../../services/api'
import confetti from 'canvas-confetti'
import { anonymizeName, getAnonymousAvatar } from '../../utils/anonymize'
import { COMMUNITIES } from '../../data/communities'

export default function PostAiDoubtModal({
  isOpen,
  onClose,
  aiResponse,
  userQuestion,
  currentUser,
  onSuccess,
}) {
  const defaultTitle = userQuestion
    ? `[AI Review] Is this answer to "${userQuestion.slice(0, 65)}${userQuestion.length > 65 ? '...' : ''}" accurate?`
    : '[AI Review] Is this Spidyy AI explanation correct?'

  const [title, setTitle] = useState(defaultTitle)
  const [communityId, setCommunityId] = useState('apex-cs-2026')
  const [subject, setSubject] = useState('Operating Systems')
  const [studentNote, setStudentNote] = useState(
    'I generated this explanation using the Spidyy AI tutor, but I want to double-check whether the technical reasoning, steps, and formulas are 100% correct. Could campus peers or faculty review and verify?'
  )
  const [bounty, setBounty] = useState(25)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (!isOpen) return null

  const subjectMap = {
    'Operating Systems': 'CS-302',
    'Applied Mathematics': 'MA-201',
    'Computer Networks': 'CS-301',
    'Data Structures': 'CS-204',
    'Database Management': 'CS-304',
    'Machine Learning': 'CS-308',
    'Physics & Mechanical': 'ME-101',
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!title.trim()) {
      setErrorMsg('Please provide a title for the verification request.')
      return
    }

    setIsSubmitting(true)

    const fullDescription = `### ❓ Original Question:\n${userQuestion || 'Academic Doubt'}\n\n### 🤖 Spidyy AI Proposed Solution:\n> ${aiResponse.replace(/\n/g, '\n> ')}\n\n### 🔍 Verification Request by Student:\n${studentNote.trim()}`

    const targetCommunity =
      COMMUNITIES.find((c) => c.id === communityId) || COMMUNITIES[0]

    const newDoubt = {
      id: `doubt-ai-rev-${Date.now()}`,
      title: title.trim(),
      snippet: `[AI Verification Request] ${studentNote.slice(0, 140)}...`,
      fullDescription: fullDescription,
      subject: subject,
      subjectCode: subjectMap[subject] || 'CS-GEN',
      communityId: targetCommunity.id,
      community: targetCommunity.name,
      author: anonymizeName(currentUser?.fullName || 'Random 1'),
      authorAvatar: getAnonymousAvatar(currentUser?.fullName || 'Random 1'),
      authorBatch: `${currentUser?.course || 'B.Tech CS'} • ${currentUser?.semester || 'Sem 4'}`,
      authorId: currentUser?.email || currentUser?.studentId || 'random1@campus.edu',
      authorEmail: currentUser?.email || 'random1@campus.edu',
      upvotes: 1,
      upvotedBy: [currentUser?.email || currentUser?.studentId || 'author'],
      bounty: Number(bounty),
      time: 'Just now',
      isResolved: false,
      isAiVerification: true,
      acceptedAnswerId: null,
      tags: ['AI-Verification', 'Peer-Review', subject],
      answers: [],
    }

    try {
      const created = await createDoubt(newDoubt)
      setIsSubmitting(false)
      try {
        confetti({
          particleCount: 70,
          spread: 65,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#ff0c0c', '#ffffff'],
        })
      } catch (err) {}

      if (onSuccess) {
        onSuccess(created || newDoubt)
      }
      onClose()
    } catch (err) {
      setIsSubmitting(false)
      setErrorMsg(err.message || 'Failed to post doubt to backend.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#111111] border border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Top glowing accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-90" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Post AI Answer for Peer Review</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Fact Check
                </span>
              </h3>
              <p className="text-xs text-white/50">
                Ask campus peers & verified mentors to confirm if this AI answer is factually correct
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* AI Response Preview Quote */}
          <div>
            <label className="block text-xs uppercase font-semibold tracking-wider text-purple-300 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Answer Being Verified</span>
            </label>
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-purple-500/20 max-h-36 overflow-y-auto text-xs text-white/80 font-sans leading-relaxed space-y-2">
              <p className="font-semibold text-white/90">
                Q: {userQuestion || 'Academic Question'}
              </p>
              <div className="pl-3 border-l-2 border-purple-500/40 text-white/70 italic text-[11.5px] line-clamp-4">
                {aiResponse}
              </div>
            </div>
          </div>

          {/* Verification Doubt Title */}
          <div>
            <label className="block text-xs uppercase font-semibold tracking-wider text-white/70 mb-1.5">
              Doubt Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl rizzolve-input"
              placeholder="e.g. [AI Review] Is this explanation for Dijkstra correct?"
            />
          </div>

          {/* Target Community & Subject Board & Bounty Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs uppercase font-semibold tracking-wider text-white/70 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>Community *</span>
              </label>
              <select
                value={communityId}
                onChange={(e) => setCommunityId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl rizzolve-input bg-[#121212] cursor-pointer"
              >
                {COMMUNITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase font-semibold tracking-wider text-white/70 mb-1.5">
                Subject Board *
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl rizzolve-input bg-[#121212] cursor-pointer"
              >
                <option value="Operating Systems">CS-302 • Operating Systems</option>
                <option value="Applied Mathematics">MA-201 • Applied Mathematics</option>
                <option value="Computer Networks">CS-301 • Computer Networks</option>
                <option value="Data Structures">CS-204 • Data Structures</option>
                <option value="Database Management">CS-304 • Database Management</option>
                <option value="Machine Learning">CS-308 • Machine Learning</option>
                <option value="Physics & Mechanical">ME-101 • Physics & Mechanical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase font-semibold tracking-wider text-white/70 mb-1.5 flex items-center justify-between">
                <span>Verification Bounty</span>
                <span className="text-[11px] font-mono text-amber-400">
                  Wallet: {currentUser?.tokenBalance ?? 450}
                </span>
              </label>
              <select
                value={bounty}
                onChange={(e) => setBounty(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl rizzolve-input bg-[#121212] cursor-pointer"
              >
                <option value={15}>🪙 15 Tokens • Standard Review</option>
                <option value={25}>🪙 25 Tokens • Recommended Bounty</option>
                <option value={40}>🪙 40 Tokens • High Priority Validation</option>
                <option value={50}>🪙 50 Tokens • Faculty / Senior Review</option>
              </select>
            </div>
          </div>

          {/* Student Verification Note */}
          <div>
            <label className="block text-xs uppercase font-semibold tracking-wider text-white/70 mb-1.5">
              Specific Questions / Notes for Peers *
            </label>
            <textarea
              required
              rows={3}
              value={studentNote}
              onChange={(e) => setStudentNote(e.target.value)}
              placeholder="What specific part of the AI response do you want peers to verify?"
              className="w-full px-4 py-2.5 text-sm rounded-xl rizzolve-input resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white/60 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-[#ff0c0c] hover:opacity-95 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Publishing to Board...' : 'Post to Doubt Board'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

