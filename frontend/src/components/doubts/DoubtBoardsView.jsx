import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Search,
  PlusCircle,
  HelpCircle,
  Filter,
  Sparkles,
  Layers,
  X,
  MessageSquare,
  BookOpen,
  Users,
} from 'lucide-react'
import QuestionCard from './QuestionCard'
import DoubtSidebarFilters from './DoubtSidebarFilters'
import PostDoubtModal from './PostDoubtModal'
import QuestionDetailView from './QuestionDetailView'
import { initialDoubtList } from '../../data/mockDoubts'
import { COMMUNITIES } from '../../data/communities'
import {
  fetchDoubts,
  createDoubt,
  toggleUpvoteDoubt,
  submitDoubtAnswer,
  acceptDoubtAnswer,
} from '../../services/api'
import confetti from 'canvas-confetti'

export default function DoubtBoardsView({ currentUser, onOpenAiChat }) {
  const [doubts, setDoubts] = useState(initialDoubtList)
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [selectedCommunity, setSelectedCommunity] = useState('all')
  const [unresolvedOnly, setUnresolvedOnly] = useState(false)
  const [myQuestionsOnly, setMyQuestionsOnly] = useState(false)

  // Helper to dynamically check if a doubt was authored by current user
  const isDoubtMine = useCallback(
    (d) => {
      if (!currentUser) return false
      const myEmail = (currentUser.email || '').toLowerCase()
      const myId = currentUser.studentId || currentUser.email || ''
      const authorId = (d.authorId || '').toLowerCase()
      const authorEmail = (d.authorEmail || '').toLowerCase()
      const authorName = (d.author || '').toLowerCase()
      const myName = (currentUser.fullName || '').toLowerCase()

      return (
        (authorEmail && authorEmail === myEmail) ||
        (authorId && (authorId === myId.toLowerCase() || authorId === myEmail)) ||
        (authorName && authorName === myName)
      )
    },
    [currentUser]
  )

  // Fetch all shared doubts from persistent backend store
  const loadDoubts = useCallback(async () => {
    try {
      const data = await fetchDoubts()
      if (Array.isArray(data) && data.length > 0) {
        setDoubts(data)
      }
    } catch {
      // Fallback preserves local state if backend is temporarily unreachable
    }
  }, [])

  useEffect(() => {
    loadDoubts()
    // Poll every 3 seconds so doubts posted by other users appear in real time
    const timer = setInterval(loadDoubts, 3000)
    return () => clearInterval(timer)
  }, [loadDoubts])

  // Subjects available
  const subjects = [
    { id: 'os', code: 'CS-302', name: 'Operating Systems', count: 18 },
    { id: 'math', code: 'MA-201', name: 'Applied Mathematics', count: 15 },
    { id: 'net', code: 'CS-301', name: 'Computer Networks', count: 12 },
    { id: 'ds', code: 'CS-204', name: 'Data Structures', count: 24 },
    { id: 'dbms', code: 'CS-304', name: 'Database Management', count: 14 },
    { id: 'mech', code: 'ME-101', name: 'Physics & Mechanical', count: 9 },
  ]

  // Filtered Questions with dynamic author identification per user
  const filteredDoubts = useMemo(() => {
    const myUserId = currentUser?.email || currentUser?.studentId || 'anon'
    return doubts
      .map((d) => {
        const isMine = isDoubtMine(d)
        const hasUpvoted = Array.isArray(d.upvotedBy)
          ? d.upvotedBy.includes(myUserId)
          : Boolean(d.userUpvoted)
        return {
          ...d,
          isMyQuestion: isMine,
          userUpvoted: hasUpvoted,
        }
      })
      .filter((d) => {
        // Search Query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const matchesTitle = d.title.toLowerCase().includes(q)
          const matchesSnippet = d.snippet.toLowerCase().includes(q)
          const matchesSubject = d.subject.toLowerCase().includes(q)
          const matchesTags = d.tags?.some((t) => t.toLowerCase().includes(q))
          if (!matchesTitle && !matchesSnippet && !matchesSubject && !matchesTags) {
            return false
          }
        }

        // Subject Filter
        if (selectedSubject !== 'all' && d.subject !== selectedSubject) {
          return false
        }

        // Unresolved Only Filter
        if (unresolvedOnly && d.isResolved) {
          return false
        }

        // Community Filter
        if (selectedCommunity !== 'all') {
          if (
            d.communityId !== selectedCommunity &&
            d.community !== selectedCommunity
          ) {
            return false
          }
        }

        // My Questions Filter
        if (myQuestionsOnly && !d.isMyQuestion) {
          return false
        }

        return true
      })
  }, [doubts, searchQuery, selectedSubject, selectedCommunity, unresolvedOnly, myQuestionsOnly, isDoubtMine, currentUser])

  // Upvote Question with backend sync
  const handleToggleUpvote = async (doubtId) => {
    const myUserId = currentUser?.email || currentUser?.studentId || 'anonymous'
    setDoubts((prev) =>
      prev.map((d) => {
        if (d.id === doubtId) {
          const upvoted = Array.isArray(d.upvotedBy)
            ? d.upvotedBy.includes(myUserId)
            : Boolean(d.userUpvoted)
          const newUpvoted = !upvoted
          const newUpvotedBy = newUpvoted
            ? [...(d.upvotedBy || []), myUserId]
            : (d.upvotedBy || []).filter((id) => id !== myUserId)
          return {
            ...d,
            userUpvoted: newUpvoted,
            upvotes: newUpvoted ? d.upvotes + 1 : Math.max(0, d.upvotes - 1),
            upvotedBy: newUpvotedBy,
          }
        }
        return d
      })
    )

    if (selectedQuestion && selectedQuestion.id === doubtId) {
      setSelectedQuestion((prev) => ({
        ...prev,
        userUpvoted: !prev.userUpvoted,
        upvotes: !prev.userUpvoted ? prev.upvotes + 1 : Math.max(0, prev.upvotes - 1),
      }))
    }

    try {
      const updated = await toggleUpvoteDoubt(doubtId, myUserId)
      if (updated) {
        setDoubts((prev) => prev.map((d) => (d.id === doubtId ? updated : d)))
      }
    } catch (e) {
      console.warn('Failed to sync upvote:', e)
    }
  }

  // Accept Answer with backend sync
  const handleAcceptAnswer = async (doubtId, ansId) => {
    setDoubts((prev) =>
      prev.map((d) => {
        if (d.id === doubtId) {
          return {
            ...d,
            isResolved: true,
            acceptedAnswerId: ansId,
            answers: (d.answers || []).map((ans) => ({
              ...ans,
              isAccepted: ans.id === ansId,
            })),
          }
        }
        return d
      })
    )

    if (selectedQuestion && selectedQuestion.id === doubtId) {
      setSelectedQuestion((prev) => ({
        ...prev,
        isResolved: true,
        acceptedAnswerId: ansId,
      }))
    }

    try {
      const updated = await acceptDoubtAnswer(doubtId, ansId)
      if (updated) {
        setDoubts((prev) => prev.map((d) => (d.id === doubtId ? updated : d)))
      }
    } catch (e) {
      console.warn('Failed to sync accept answer:', e)
    }
  }

  // Submit Answer with backend sync
  const handleAddAnswer = async (doubtId, newAnswer) => {
    setDoubts((prev) =>
      prev.map((d) => {
        if (d.id === doubtId) {
          return {
            ...d,
            answers: [...(d.answers || []), newAnswer],
          }
        }
        return d
      })
    )

    try {
      const updated = await submitDoubtAnswer(doubtId, newAnswer)
      if (updated) {
        setDoubts((prev) => prev.map((d) => (d.id === doubtId ? updated : d)))
      }
    } catch (e) {
      console.warn('Failed to sync answer:', e)
    }
  }

  // Post New Doubt with backend persistence
  const handlePostDoubt = async (newDoubt) => {
    // Optimistic local add
    setDoubts((prev) => [newDoubt, ...prev])
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ff0c0c', '#ffffff'],
      })
    } catch (e) {}

    try {
      const created = await createDoubt(newDoubt)
      if (created) {
        setDoubts((prev) => [created, ...prev.filter((d) => d.id !== newDoubt.id)])
      }
    } catch (e) {
      console.warn('Failed to persist doubt to backend:', e)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Post a Doubt Modal */}
      <PostDoubtModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onSubmitDoubt={handlePostDoubt}
        currentUser={currentUser}
      />

      {/* If a question is selected, render QuestionDetailView */}
      {selectedQuestion ? (
        <QuestionDetailView
          question={selectedQuestion}
          onBack={() => setSelectedQuestion(null)}
          onToggleUpvote={handleToggleUpvote}
          onAcceptAnswer={handleAcceptAnswer}
          onAddAnswer={handleAddAnswer}
          currentUser={currentUser}
        />
      ) : (
        /* Otherwise render the Two-Column Doubt Board feed */
        <>
          {/* ================= SEARCH & POST HEADER ================= */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#111111] border border-white/10 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search Bar with Red Glow on focus */}
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search doubts by title, formula, concept (e.g. SVD, Peterson, BCNF)..."
                className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl rizzolve-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Post a Doubt Primary Button (using --accent / --secondary: #ff0c0c) */}
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#ff0c0c] hover:bg-[#ff0101] glow-red-hover flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(255,12,12,0.35)] shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post a Doubt</span>
            </button>
          </div>

          {/* ================= COMMUNITY QUICK-FILTER BAR ================= */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin px-0.5">
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider shrink-0 flex items-center gap-1.5 mr-1">
              <Users className="w-3.5 h-3.5 text-[#ff0c0c]" />
              <span>Community:</span>
            </span>
            <button
              onClick={() => setSelectedCommunity('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCommunity === 'all'
                  ? 'bg-[#ff0c0c] text-white shadow-md shadow-[#ff0c0c]/30 font-bold'
                  : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/10 hover:bg-white/[0.06]'
              }`}
            >
              All Communities ({doubts.length})
            </button>
            {COMMUNITIES.map((c) => {
              const count = doubts.filter(
                (d) => d.communityId === c.id || d.community === c.name
              ).length
              const isSelected = selectedCommunity === c.id

              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCommunity(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#ff0c0c] text-white shadow-md shadow-[#ff0c0c]/30 font-bold'
                      : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/10 hover:bg-white/[0.06]'
                  }`}
                >
                  <span>{c.name}</span>
                  <span className="text-[10px] font-mono opacity-70">({count})</span>
                </button>
              )
            })}
          </div>

          {/* ================= TWO-COLUMN LAYOUT ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Main Question Feed Column (Left/Center ~70% width) */}
            <div className="lg:col-span-8 space-y-4">
              {/* Feed Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    {selectedSubject === 'all'
                      ? 'All Campus Doubts'
                      : `${selectedSubject} Feed`}
                  </h2>
                  <span className="text-xs text-white/50 font-mono">
                    ({filteredDoubts.length} {filteredDoubts.length === 1 ? 'result' : 'results'})
                  </span>
                </div>

                {(unresolvedOnly || myQuestionsOnly || selectedSubject !== 'all' || selectedCommunity !== 'all' || searchQuery) && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedSubject('all')
                      setSelectedCommunity('all')
                      setUnresolvedOnly(false)
                      setMyQuestionsOnly(false)
                    }}
                    className="text-xs text-[#ff0c0c] hover:underline cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              {/* Feed Questions List */}
              {filteredDoubts.length === 0 ? (
                <div className="rounded-2xl bg-[#111111] border border-white/10 p-12 text-center">
                  <HelpCircle className="w-10 h-10 text-white/30 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white">No doubts found</h3>
                  <p className="text-xs text-white/50 mt-1 max-w-sm mx-auto">
                    No academic questions match your current search or filters. Try clearing your filters or post a new question!
                  </p>
                  <button
                    onClick={() => setIsPostModalOpen(true)}
                    className="mt-5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#ff0c0c] hover:bg-[#ff0101] inline-flex items-center gap-2 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Post this Doubt First</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredDoubts.map((doubt) => (
                    <QuestionCard
                      key={doubt.id}
                      question={doubt}
                      onSelect={(q) => setSelectedQuestion(q)}
                      onToggleUpvote={handleToggleUpvote}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Filter / Subject Sidebar Column (Right ~30% width) */}
            <div className="lg:col-span-4">
              <DoubtSidebarFilters
                subjects={subjects}
                selectedSubject={selectedSubject}
                onSelectSubject={(subj) => setSelectedSubject(subj)}
                unresolvedOnly={unresolvedOnly}
                onToggleUnresolved={(val) => setUnresolvedOnly(val)}
                myQuestionsOnly={myQuestionsOnly}
                onToggleMyQuestions={(val) => setMyQuestionsOnly(val)}
                onOpenAiChat={onOpenAiChat}
                stats={{
                  totalDoubts: doubts.length,
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
