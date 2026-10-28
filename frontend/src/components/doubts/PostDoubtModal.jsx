import { useState } from 'react'
import {
  X,
  HelpCircle,
  Upload,
  Image as ImageIcon,
  Code,
  Coins,
  Sparkles,
  ArrowRight,
  Check,
  Paperclip,
  AlertTriangle,
  Users,
} from 'lucide-react'
import { initialDoubtList } from '../../data/mockDoubts'
import { anonymizeName, getAnonymousAvatar } from '../../utils/anonymize'
import { COMMUNITIES } from '../../data/communities'

export default function PostDoubtModal({
  isOpen,
  onClose,
  onSubmitDoubt,
  currentUser,
  initialCommunityId,
}) {
  const [communityId, setCommunityId] = useState(initialCommunityId || 'apex-cs-2026')
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('Operating Systems')
  const [description, setDescription] = useState('')
  const [bounty, setBounty] = useState(25)
  const [tagsInput, setTagsInput] = useState('')
  const [attachedFileName, setAttachedFileName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [similarMatches, setSimilarMatches] = useState([])

  if (!isOpen) return null

  const handleTitleChange = (val) => {
    setTitle(val)
    const trimmed = val.trim()
    if (trimmed.length > 5) {
      const q = trimmed.toLowerCase()
      const words = q.split(/\s+/).filter((w) => w.length > 3)
      const matches = initialDoubtList.filter((d) => {
        const titleLower = d.title.toLowerCase()
        return titleLower.includes(q) || words.filter((w) => titleLower.includes(w)).length >= 2
      }).slice(0, 2)
      setSimilarMatches(matches)
    } else {
      setSimilarMatches([])
    }
  }

  const subjectMap = {
    'Operating Systems': 'CS-302',
    'Computer Networks': 'CS-301',
    'Database Management': 'CS-304',
    'Applied Mathematics': 'MA-201',
    'Data Structures': 'CS-204',
    'Physics & Mechanical': 'ME-101',
    'Machine Learning': 'CS-308',
  }

  const handleSimulatedFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setAttachedFileName(file.name)
    }
  }

  const handleInsertFormatting = (prefix, suffix = '') => {
    setDescription((prev) => `${prev}\n${prefix}sample text${suffix}\n`)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!title.trim()) {
      setErrorMsg('Please enter a descriptive question title.')
      return
    }

    if (!description.trim() || description.length < 15) {
      setErrorMsg('Please provide more context in the description (at least 15 characters).')
      return
    }

    setIsSubmitting(true)

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    const targetCommunity =
      COMMUNITIES.find((c) => c.id === communityId) || COMMUNITIES[0]

    const newDoubt = {
      id: `doubt-${Date.now()}`,
      title: title.trim(),
      snippet: description.slice(0, 150) + (description.length > 150 ? '...' : ''),
      fullDescription: description.trim(),
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
      upvotedBy: [currentUser?.email || currentUser?.studentId || 'user-default'],
      bounty: Number(bounty),
      time: 'Just now',
      isResolved: false,
      acceptedAnswerId: null,
      tags: tags.length > 0 ? tags : ['Academic Doubt', subject],
      answers: [],
    }

    setTimeout(() => {
      setIsSubmitting(false)
      onSubmitDoubt(newDoubt)
      // Reset form
      setTitle('')
      setDescription('')
      setAttachedFileName('')
      setTagsInput('')
      onClose()
    }, 600)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#111111] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Subtle decorative top red line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff0c0c] to-transparent opacity-80" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#ff0c0c]/15 border border-[#ff0c0c]/30 flex items-center justify-center text-[#ff0c0c]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Post an Academic Doubt
              </h3>
              <p className="text-xs text-white/50">
                Broadcast your question to peers and verified mentors across campus
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#ff0c0c]/10 border border-[#ff0c0c]/30 text-white text-xs">
              {errorMsg}
            </div>
          )}

          {/* Question Title */}
          <div>
            <label className="block text-xs uppercase font-semibold tracking-wider text-white/70 mb-1.5 flex items-center justify-between">
              <span>Question Title *</span>
              <span className="text-[10px] text-white/40">Instant duplicate detection active</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Why does Peterson's algorithm fail on modern multi-core CPUs without memory barriers?"
              className="w-full px-4 py-2.5 text-sm rounded-xl rizzolve-input"
            />

            {/* Trigram Duplicate / Similar Doubts Alert */}
            {similarMatches.length > 0 && (
              <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Similar question already asked on campus:</span>
                </div>
                <div className="mt-1.5 space-y-1">
                  {similarMatches.map((m) => (
                    <div key={m.id} className="text-xs text-white/80 line-clamp-1 flex items-center gap-1.5">
                      <span className="text-[#ff0c0c]">•</span>
                      <span>{m.title}</span>
                      <span className="text-[10px] text-amber-400 font-mono">({m.upvotes} upvotes)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Target Community & Subject Board & Bounty (Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs uppercase font-semibold tracking-wider text-white/70 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#ff0c0c]" />
                <span>Target Community *</span>
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
                <option value="Computer Networks">CS-301 • Computer Networks</option>
                <option value="Database Management">CS-304 • Database Management</option>
                <option value="Applied Mathematics">MA-201 • Applied Mathematics</option>
                <option value="Data Structures">CS-204 • Data Structures</option>
                <option value="Machine Learning">CS-308 • Machine Learning</option>
                <option value="Physics & Mechanical">ME-101 • Physics & Mechanical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase font-semibold tracking-wider text-white/70 mb-1.5 flex items-center justify-between">
                <span>Token Bounty</span>
                <span className="text-[11px] font-mono text-amber-400">
                  Wallet: {currentUser?.tokenBalance ?? 450}
                </span>
              </label>
              <select
                value={bounty}
                onChange={(e) => setBounty(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl rizzolve-input bg-[#121212] cursor-pointer"
              >
                <option value={15}>🪙 15 Tokens (Standard)</option>
                <option value={25}>🪙 25 Tokens (Recommended)</option>
                <option value={50}>🪙 50 Tokens (High Priority Urgent)</option>
                <option value={100}>🪙 100 Tokens (Exam Bounty)</option>
              </select>
            </div>
          </div>

          {/* Description & Rich Text Toolbar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs uppercase font-semibold tracking-wider text-white/70">
                Detailed Context & Derivation *
              </label>
              <div className="flex items-center gap-1.5 text-xs text-white/50">
                <button
                  type="button"
                  onClick={() => handleInsertFormatting('```c\n// insert code here\n', '```')}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Code className="w-3 h-3 text-[#ff0c0c]" />
                  <span>Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertFormatting('$$ e^{i\\pi} + 1 = 0 $$')}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                >
                  <span>LaTeX</span>
                </button>
              </div>
            </div>

            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what concept you are struggling with, any textbook formulas, error logs, or specific steps..."
              className="w-full px-4 py-3 text-sm rounded-xl rizzolve-input resize-y font-sans leading-relaxed"
            />
          </div>

          {/* Tags & File Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs uppercase font-semibold tracking-wider text-white/70 mb-1.5">
                Topic Tags (Comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. SVD, Orthogonality, Proof"
                className="w-full px-3.5 py-2 text-sm rounded-xl rizzolve-input"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-semibold tracking-wider text-white/70 mb-1.5">
                Attach Screenshot / Diagram
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="doubt-file-upload"
                  onChange={handleSimulatedFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="doubt-file-upload"
                  className="w-full px-3.5 py-2 rounded-xl border border-dashed border-white/20 hover:border-[#ff0c0c]/50 bg-white/[0.02] hover:bg-white/[0.04] text-xs text-white/70 flex items-center justify-between cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Paperclip className="w-3.5 h-3.5 text-[#ff0c0c]" />
                    <span className="truncate">
                      {attachedFileName || 'Upload image or problem PDF'}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40 uppercase">Browse</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
            <span className="text-xs text-white/50">
              Bounty of <span className="text-white font-mono font-bold">🪙 {bounty} Tokens</span> will be escrowed.
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#ff0c0c] hover:bg-[#ff0101] rounded-xl glow-red-hover flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,12,12,0.35)] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Post Doubt to Campus</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
