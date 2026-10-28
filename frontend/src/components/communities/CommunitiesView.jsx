import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Users,
  GraduationCap,
  Code2,
  Cpu,
  BookOpen,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  Clock,
  Coins,
  Search,
  PlusCircle,
  Filter,
  ArrowRight,
  Check,
  Award,
  ShieldCheck,
  ThumbsUp,
  FileQuestion,
  Send,
  Lock,
  Globe,
  ChevronRight,
  HelpCircle,
  X,
  MessageSquarePlus,
} from 'lucide-react'
import { COMMUNITIES } from '../../data/communities'
import QuestionCard from '../doubts/QuestionCard'
import QuestionDetailView from '../doubts/QuestionDetailView'
import PostDoubtModal from '../doubts/PostDoubtModal'
import { anonymizeName, getAnonymousAvatar } from '../../utils/anonymize'
import {
  fetchDoubts,
  createDoubt,
  toggleUpvoteDoubt,
  submitDoubtAnswer,
  acceptDoubtAnswer,
} from '../../services/api'
import { initialDoubtList } from '../../data/mockDoubts'
import confetti from 'canvas-confetti'

export default function CommunitiesView({ currentUser, onNavigateTab }) {
  // Active Community State
  const [selectedCommunityId, setSelectedCommunityId] = useState('apex-cs-2026')
  // Active Section within the Community: 'doubts' or 'answers'
  const [activeCommunitySection, setActiveCommunitySection] = useState('doubts')

  // Global doubts list loaded from backend
  const [doubts, setDoubts] = useState(initialDoubtList)
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)

  // Filters within active community
  const [searchQuery, setSearchQuery] = useState('')
  const [doubtFilter, setDoubtFilter] = useState('all') // 'all', 'open', 'resolved', 'ai-review'
  const [answerSubTab, setAnswerSubTab] = useState('unanswered') // 'unanswered', 'all-solutions', 'verified'

  // Inline Quick Answer Modal State
  const [answeringQuestion, setAnsweringQuestion] = useState(null)
  const [answerText, setAnswerText] = useState('')
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false)

  // Fetch shared doubts from persistent backend
  const loadDoubts = useCallback(async () => {
    try {
      const data = await fetchDoubts()
      if (Array.isArray(data) && data.length > 0) {
        setDoubts(data)
      }
    } catch {
      // Fallback
    }
  }, [])

  useEffect(() => {
    loadDoubts()
    const timer = setInterval(loadDoubts, 3000)
    return () => clearInterval(timer)
  }, [loadDoubts])

  // Active community object
  const activeCommunity = useMemo(() => {
    return (
      COMMUNITIES.find((c) => c.id === selectedCommunityId) || COMMUNITIES[0]
    )
  }, [selectedCommunityId])

  // Icon selector
  const getCommunityIcon = (iconName, className = 'w-4 h-4') => {
    switch (iconName) {
      case 'GraduationCap':
        return <GraduationCap className={className} />
      case 'Code2':
        return <Code2 className={className} />
      case 'Cpu':
        return <Cpu className={className} />
      case 'BookOpen':
        return <BookOpen className={className} />
      case 'Sparkles':
        return <Sparkles className={className} />
      default:
        return <Users className={className} />
    }
  }

  // Doubts strictly belonging to this community
  const communityDoubts = useMemo(() => {
    return doubts.filter((d) => {
      if (d.communityId) {
        return d.communityId === activeCommunity.id
      }
      // Fallback match by community name or default to apex
      if (d.community) {
        return d.community.toLowerCase() === activeCommunity.name.toLowerCase()
      }
      return activeCommunity.id === 'apex-cs-2026'
    })
  }, [doubts, activeCommunity])

  // Filtered doubts for the Doubt Section
  const filteredCommunityDoubts = useMemo(() => {
    return communityDoubts.filter((d) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = (d.title || '').toLowerCase().includes(q)
        const matchDesc = (d.snippet || d.fullDescription || '')
          .toLowerCase()
          .includes(q)
        const matchSubject = (d.subject || '').toLowerCase().includes(q)
        if (!matchTitle && !matchDesc && !matchSubject) return false
      }

      // Doubt status filter
      if (doubtFilter === 'open' && d.isResolved) return false
      if (doubtFilter === 'resolved' && !d.isResolved) return false
      if (doubtFilter === 'ai-review' && !d.isAiVerification) return false

      return true
    })
  }, [communityDoubts, searchQuery, doubtFilter])

  // Questions needing answers in this community
  const openDoubtsNeedingAnswers = useMemo(() => {
    return communityDoubts.filter((d) => !d.isResolved)
  }, [communityDoubts])

  // All peer answers in this community flattened with their parent doubt context
  const communityAnswersList = useMemo(() => {
    const list = []
    communityDoubts.forEach((doubt) => {
      if (Array.isArray(doubt.answers)) {
        doubt.answers.forEach((ans) => {
          list.push({
            ...ans,
            doubtId: doubt.id,
            doubtTitle: doubt.title,
            doubtSubject: doubt.subject,
            doubtSubjectCode: doubt.subjectCode,
            doubtBounty: doubt.bounty,
            doubtResolved: doubt.isResolved,
          })
        })
      }
    })
    return list.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0))
  }, [communityDoubts])

  // Verified accepted answers
  const verifiedAnswersList = useMemo(() => {
    return communityAnswersList.filter((a) => a.isAccepted)
  }, [communityAnswersList])

  // Stats for this community
  const communityStats = useMemo(() => {
    const totalDoubts = communityDoubts.length
    const openDoubts = openDoubtsNeedingAnswers.length
    const resolvedDoubts = communityDoubts.filter((d) => d.isResolved).length
    const totalAnswers = communityAnswersList.length
    const totalBountyPool = communityDoubts.reduce(
      (sum, d) => sum + (d.bounty || 0),
      0
    )
    return {
      totalDoubts,
      openDoubts,
      resolvedDoubts,
      totalAnswers,
      totalBountyPool,
    }
  }, [communityDoubts, openDoubtsNeedingAnswers, communityAnswersList])

  // Upvote doubt handler
  const handleToggleUpvote = async (doubtId) => {
    setDoubts((prev) =>
      prev.map((d) => {
        if (d.id === doubtId) {
          const newUpvoted = !d.userUpvoted
          return {
            ...d,
            userUpvoted: newUpvoted,
            upvotes: newUpvoted ? d.upvotes + 1 : Math.max(0, d.upvotes - 1),
          }
        }
        return d
      })
    )
    try {
      const myId = currentUser?.email || currentUser?.studentId || 'anon'
      await toggleUpvoteDoubt(doubtId, myId)
    } catch {}
  }

  // Accept answer handler
  const handleAcceptAnswer = async (doubtId, answerId) => {
    setDoubts((prev) =>
      prev.map((d) => {
        if (d.id === doubtId) {
          return {
            ...d,
            isResolved: true,
            acceptedAnswerId: answerId,
            answers: (d.answers || []).map((ans) => ({
              ...ans,
              isAccepted: ans.id === answerId,
            })),
          }
        }
        return d
      })
    )
    try {
      await acceptDoubtAnswer(doubtId, answerId)
    } catch {}
  }

  // Add answer handler
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
      await submitDoubtAnswer(doubtId, newAnswer)
    } catch {}
  }

  // Create new doubt in this community
  const handlePostDoubt = async (newDoubt) => {
    // Ensure community tag is attached
    const enriched = {
      ...newDoubt,
      communityId: activeCommunity.id,
      community: activeCommunity.name,
    }
    setDoubts((prev) => [enriched, ...prev])
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ff0c0c', '#ffffff'],
      })
    } catch {}

    try {
      const created = await createDoubt(enriched)
      if (created) {
        setDoubts((prev) => [
          created,
          ...prev.filter((d) => d.id !== enriched.id),
        ])
      }
    } catch (e) {
      console.warn('Failed to post doubt to backend:', e)
    }
  }

  // Submit Quick Answer from the Answer Section
  const handleQuickSubmitAnswer = async (e) => {
    e.preventDefault()
    if (!answeringQuestion || !answerText.trim()) return

    setIsSubmittingAnswer(true)
    const newAns = {
      id: `ans-${Date.now()}`,
      author: anonymizeName(currentUser?.fullName || 'Random 1'),
      authorAvatar: getAnonymousAvatar(currentUser?.fullName || 'Random 1'),
      authorRole: `${currentUser?.course || 'B.Tech CS'} • Community Contributor`,
      time: 'Just now',
      text: answerText.trim(),
      upvotes: 0,
      userUpvoted: false,
      isAccepted: false,
    }

    try {
      await handleAddAnswer(answeringQuestion.id, newAns)
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#10b981', '#ffffff', '#ff0c0c'],
        })
      } catch {}
      setAnsweringQuestion(null)
      setAnswerText('')
    } finally {
      setIsSubmittingAnswer(false)
    }
  }

  // If a question is selected for full detail view, render it scoped to this community
  if (selectedQuestion) {
    return (
      <div className="space-y-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
          <button
            onClick={() => setSelectedQuestion(null)}
            className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-[#ff0c0c]" />
            <span>{activeCommunity.name}</span>
          </button>
          <span>/</span>
          <span className="text-white capitalize">
            {activeCommunitySection === 'doubts'
              ? 'Doubt Section'
              : 'Answer Section'}
          </span>
          <span>/</span>
          <span className="text-[#ff0c0c] font-medium line-clamp-1 max-w-xs">
            {selectedQuestion.title}
          </span>
        </div>

        <QuestionDetailView
          question={selectedQuestion}
          onBack={() => setSelectedQuestion(null)}
          onToggleUpvote={handleToggleUpvote}
          onAcceptAnswer={handleAcceptAnswer}
          onAddAnswer={handleAddAnswer}
          currentUser={currentUser}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ================= 1. COMMUNITY SELECTOR STRIP ================= */}
      <div className="rounded-2xl bg-[#111111] border border-white/10 p-3 sm:p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#ff0c0c]" />
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              Academic & Cohort Communities
            </h3>
          </div>
          <span className="text-[11px] text-white/50 hidden sm:inline">
            Each community maintains its own independent Doubt & Answer board
          </span>
        </div>

        {/* Scrollable Community Pills / Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {COMMUNITIES.map((c) => {
            const isSelected = c.id === selectedCommunityId
            const doubtCount = doubts.filter(
              (d) => d.communityId === c.id || d.community === c.name
            ).length

            return (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCommunityId(c.id)
                  setSelectedQuestion(null)
                }}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#ff0c0c]/20 via-[#ff0c0c]/10 to-transparent border-[#ff0c0c] text-white shadow-[0_0_20px_rgba(255,12,12,0.25)]'
                    : 'bg-white/[0.03] border-white/10 text-white/70 hover:text-white hover:bg-white/[0.06] hover:border-white/20'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-[#ff0c0c] text-white shadow-sm'
                      : 'bg-white/10 text-white/70'
                  }`}
                >
                  {getCommunityIcon(c.icon, 'w-3.5 h-3.5')}
                </div>
                <span>{c.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    isSelected
                      ? 'bg-[#ff0c0c]/40 text-white font-bold'
                      : 'bg-white/10 text-white/50'
                  }`}
                >
                  {doubtCount}
                </span>
                {c.type.includes('Private') ? (
                  <Lock className="w-3 h-3 text-amber-400/80 shrink-0" />
                ) : (
                  <Globe className="w-3 h-3 text-blue-400/80 shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ================= 2. ACTIVE COMMUNITY HERO BANNER ================= */}
      <div
        className={`relative rounded-3xl bg-gradient-to-b ${activeCommunity.bannerGradient} border border-white/10 p-6 sm:p-8 shadow-2xl overflow-hidden`}
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff0c0c] to-transparent opacity-90" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ff0c0c]/20 text-[#ff0c0c] border border-[#ff0c0c]/40 font-mono">
                {activeCommunity.code}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white/80 border border-white/15">
                {activeCommunity.type.includes('Private') ? (
                  <Lock className="w-3 h-3 text-amber-400" />
                ) : (
                  <Globe className="w-3 h-3 text-blue-400" />
                )}
                <span>{activeCommunity.type}</span>
              </span>
              <span className="text-xs text-white/50 font-mono">
                • {activeCommunity.members.toLocaleString()} Verified Members
              </span>
            </div>

            {/* Community Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {activeCommunity.name}
            </h1>

            {/* Description */}
            <p className="text-xs sm:text-sm text-[#fef9f8]/75 leading-relaxed">
              {activeCommunity.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {activeCommunity.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2.5 py-0.5 rounded-md bg-white/[0.04] text-white/60 border border-white/10"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="px-5 py-3 rounded-xl bg-[#ff0c0c] hover:bg-[#ff0c0c]/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#ff0c0c]/25 hover:shadow-[0_0_25px_rgba(255,12,12,0.4)] transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ask Doubt in this Community</span>
            </button>

            <button
              onClick={() => {
                setActiveCommunitySection('answers')
                setAnswerSubTab('unanswered')
              }}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-white/15 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Solve Doubts & Earn Bounties</span>
            </button>
          </div>
        </div>

        {/* Community Metrics Strip */}
        <div className="mt-6 pt-5 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-black/40 border border-white/5">
            <p className="text-[10px] uppercase font-bold text-white/50 tracking-wider">
              Total Doubts
            </p>
            <p className="text-lg font-bold text-white font-mono mt-0.5">
              {communityStats.totalDoubts}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/5">
            <p className="text-[10px] uppercase font-bold text-amber-400/80 tracking-wider">
              Open for Answers
            </p>
            <p className="text-lg font-bold text-amber-400 font-mono mt-0.5">
              {communityStats.openDoubts}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/5">
            <p className="text-[10px] uppercase font-bold text-emerald-400/80 tracking-wider">
              Verified Solutions
            </p>
            <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
              {communityStats.resolvedDoubts}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/5">
            <p className="text-[10px] uppercase font-bold text-[#ff0c0c] tracking-wider">
              Active Bounty Pool
            </p>
            <p className="text-lg font-bold text-white font-mono mt-0.5 flex items-center gap-1">
              <span>🪙</span>
              <span>{communityStats.totalBountyPool}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ================= 3. SEPARATE DOUBT & ANSWER SECTION NAV TABS ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-2">
        {/* Main Segmented Toggle: Doubt Section vs Answer Section */}
        <div className="inline-flex p-1 rounded-2xl bg-[#111111] border border-white/10 shadow-lg">
          {/* Doubt Section Tab */}
          <button
            onClick={() => setActiveCommunitySection('doubts')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeCommunitySection === 'doubts'
                ? 'bg-[#ff0c0c] text-white shadow-md shadow-[#ff0c0c]/30'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <FileQuestion className="w-4 h-4" />
            <span>❓ Community Doubt Section</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                activeCommunitySection === 'doubts'
                  ? 'bg-black/30 text-white'
                  : 'bg-white/10 text-white/50'
              }`}
            >
              {communityStats.totalDoubts}
            </span>
          </button>

          {/* Answer Section Tab */}
          <button
            onClick={() => setActiveCommunitySection('answers')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeCommunitySection === 'answers'
                ? 'bg-[#ff0c0c] text-white shadow-md shadow-[#ff0c0c]/30'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>💡 Community Answer Section</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                activeCommunitySection === 'answers'
                  ? 'bg-black/30 text-white'
                  : 'bg-white/10 text-white/50'
              }`}
            >
              {communityStats.totalAnswers}
            </span>
          </button>
        </div>

        {/* Search inside this community */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeCommunity.name}...`}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-[#111111] border border-white/10 text-white placeholder-white/40 focus:border-[#ff0c0c]/60 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ================= 4. SECTION CONTENT ================= */}

      {/* ---------------- A) DOUBT SECTION ---------------- */}
      {activeCommunitySection === 'doubts' && (
        <div className="space-y-4">
          {/* Sub Filters for Doubt Section */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {[
                { id: 'all', label: 'All Doubts', count: communityStats.totalDoubts },
                {
                  id: 'open',
                  label: 'Open for Solutions',
                  count: communityStats.openDoubts,
                },
                {
                  id: 'resolved',
                  label: 'Resolved FAQ',
                  count: communityStats.resolvedDoubts,
                },
                {
                  id: 'ai-review',
                  label: 'AI Review Doubts',
                  count: communityDoubts.filter((d) => d.isAiVerification).length,
                },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setDoubtFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    doubtFilter === f.id
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className="text-[10px] font-mono text-white/50">
                    ({f.count})
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsPostModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-[#ff0c0c]/20 hover:bg-[#ff0c0c]/30 text-[#ff0c0c] border border-[#ff0c0c]/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Post New Doubt</span>
            </button>
          </div>

          {/* Doubt Cards List */}
          {filteredCommunityDoubts.length === 0 ? (
            <div className="rounded-2xl bg-[#111111] border border-white/10 p-12 text-center">
              <FileQuestion className="w-12 h-12 text-white/30 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">
                No doubts found in {activeCommunity.name}
              </h3>
              <p className="text-xs text-white/60 mt-1 max-w-md mx-auto">
                {searchQuery
                  ? 'No questions matched your search query. Try a different keyword.'
                  : 'Be the first student to ask a question in this community and get peer and faculty assistance!'}
              </p>
              <button
                onClick={() => setIsPostModalOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-[#ff0c0c] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-[#ff0c0c]/20"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Ask the First Doubt</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCommunityDoubts.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  onSelect={(question) => setSelectedQuestion(question)}
                  onToggleUpvote={handleToggleUpvote}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- B) ANSWER SECTION ---------------- */}
      {activeCommunitySection === 'answers' && (
        <div className="space-y-5">
          {/* Answer Sub-Navigation Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAnswerSubTab('unanswered')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  answerSubTab === 'unanswered'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/10'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Doubts Needing Solutions</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/30 font-mono">
                  {openDoubtsNeedingAnswers.length}
                </span>
              </button>

              <button
                onClick={() => setAnswerSubTab('all-solutions')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  answerSubTab === 'all-solutions'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                    : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/10'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                <span>All Peer Solutions</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/30 font-mono">
                  {communityAnswersList.length}
                </span>
              </button>

              <button
                onClick={() => setAnswerSubTab('verified')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  answerSubTab === 'verified'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/10'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>Accepted Solutions FAQ</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/30 font-mono">
                  {verifiedAnswersList.length}
                </span>
              </button>
            </div>

            <span className="text-xs text-white/50 hidden sm:inline">
              Earn +25 to +50 tokens for every accepted community solution
            </span>
          </div>

          {/* 1. Sub-Tab: Doubts Needing Solutions */}
          {answerSubTab === 'unanswered' && (
            <div className="space-y-3">
              {openDoubtsNeedingAnswers.length === 0 ? (
                <div className="rounded-2xl bg-[#111111] border border-white/10 p-10 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white">
                    All Doubts in {activeCommunity.name} are Solved!
                  </h4>
                  <p className="text-xs text-white/50 mt-1 max-w-sm mx-auto">
                    Outstanding community teamwork. Browse previous answers or post a new challenging problem.
                  </p>
                </div>
              ) : (
                openDoubtsNeedingAnswers.map((doubt) => (
                  <div
                    key={doubt.id}
                    className="p-5 rounded-2xl bg-[#111111] border border-white/10 hover:border-amber-500/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1.5 max-w-3xl">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-[#ff0c0c] bg-[#ff0c0c]/10 px-2.5 py-0.5 rounded-md border border-[#ff0c0c]/30 font-mono">
                          {doubt.subjectCode} • {doubt.subject}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/25">
                          <Coins className="w-3 h-3" />
                          <span>🪙 {doubt.bounty || 25} Tokens Bounty</span>
                        </span>
                        <span className="text-[10px] text-white/40 font-mono">
                          {doubt.time}
                        </span>
                      </div>

                      <h4
                        onClick={() => setSelectedQuestion(doubt)}
                        className="text-base font-bold text-white group-hover:text-amber-300 transition-colors cursor-pointer leading-snug"
                      >
                        {doubt.title}
                      </h4>
                      <p className="text-xs text-[#fef9f8]/60 line-clamp-2 leading-relaxed">
                        {doubt.snippet || doubt.fullDescription}
                      </p>

                      <div className="text-[10px] text-white/50 flex items-center gap-2 pt-0.5">
                        <span>Asked by {anonymizeName(doubt.author)}</span>
                        <span>•</span>
                        <span>
                          {doubt.answers?.length || 0} existing peer replies
                        </span>
                      </div>
                    </div>

                    {/* Action: Direct Answer Button */}
                    <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                      <button
                        onClick={() => setAnsweringQuestion(doubt)}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Write Solution</span>
                      </button>

                      <button
                        onClick={() => setSelectedQuestion(doubt)}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 2. Sub-Tab: All Solutions Feed */}
          {answerSubTab === 'all-solutions' && (
            <div className="space-y-4">
              {communityAnswersList.length === 0 ? (
                <div className="rounded-2xl bg-[#111111] border border-white/10 p-10 text-center">
                  <MessageSquare className="w-10 h-10 text-white/30 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white">No solutions posted yet</h4>
                  <p className="text-xs text-white/50 mt-1">
                    Check the "Doubts Needing Solutions" tab to write the first answer.
                  </p>
                </div>
              ) : (
                communityAnswersList.map((ans) => {
                  const parentDoubt = doubts.find((d) => d.id === ans.doubtId)

                  return (
                    <div
                      key={ans.id}
                      className={`p-5 rounded-2xl bg-[#111111] border transition-all ${
                        ans.isAccepted
                          ? 'border-emerald-500/40 bg-[#0d1612]/90'
                          : 'border-white/10'
                      }`}
                    >
                      {/* Parent Doubt Reference */}
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.06] mb-3">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-[10px] font-mono font-bold text-[#ff0c0c] bg-[#ff0c0c]/10 px-2 py-0.5 rounded border border-[#ff0c0c]/20 shrink-0">
                            {ans.doubtSubjectCode}
                          </span>
                          <button
                            onClick={() =>
                              parentDoubt && setSelectedQuestion(parentDoubt)
                            }
                            className="text-xs font-semibold text-white/80 hover:text-white truncate hover:underline text-left"
                          >
                            Doubt: {ans.doubtTitle}
                          </button>
                        </div>

                        {ans.isAccepted && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Accepted Solution</span>
                          </span>
                        )}
                      </div>

                      {/* Answer Author */}
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/15 flex items-center justify-center text-xs font-bold text-white">
                          {getAnonymousAvatar(ans.author) || ans.authorAvatar || 'R1'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">
                            {anonymizeName(ans.author)}
                          </p>
                          <p className="text-[10px] text-white/50">
                            {ans.authorRole} • {ans.time}
                          </p>
                        </div>
                      </div>

                      {/* Answer Text */}
                      <div className="text-xs sm:text-sm text-[#fef9f8]/85 leading-relaxed whitespace-pre-line font-sans pl-9">
                        {ans.text}
                      </div>

                      {/* Footer: Upvotes & Thread Link */}
                      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs pl-9">
                        <div className="flex items-center gap-2 text-white/70">
                          <ThumbsUp className="w-3.5 h-3.5 text-[#ff0c0c]" />
                          <span>{ans.upvotes} Community Upvotes</span>
                        </div>

                        <button
                          onClick={() =>
                            parentDoubt && setSelectedQuestion(parentDoubt)
                          }
                          className="text-[#ff0c0c] hover:underline font-semibold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open Full Thread</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* 3. Sub-Tab: Accepted Solutions FAQ */}
          {answerSubTab === 'verified' && (
            <div className="space-y-4">
              {verifiedAnswersList.length === 0 ? (
                <div className="rounded-2xl bg-[#111111] border border-white/10 p-10 text-center">
                  <Award className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white">No accepted solutions yet</h4>
                  <p className="text-xs text-white/50 mt-1 max-w-sm mx-auto">
                    When question authors mark a peer explanation as the accepted answer, it gets immortalized here.
                  </p>
                </div>
              ) : (
                verifiedAnswersList.map((ans) => {
                  const parentDoubt = doubts.find((d) => d.id === ans.doubtId)

                  return (
                    <div
                      key={ans.id}
                      className="p-5 sm:p-6 rounded-2xl bg-[#0d1612]/95 border border-emerald-500/50 shadow-xl shadow-emerald-500/5 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-emerald-500/20">
                        <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Community Verified Solution</span>
                        </span>
                        <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
                          🪙 Bounty Awarded
                        </span>
                      </div>

                      <h4
                        onClick={() =>
                          parentDoubt && setSelectedQuestion(parentDoubt)
                        }
                        className="text-base font-bold text-white hover:text-emerald-300 transition-colors cursor-pointer"
                      >
                        Q: {ans.doubtTitle}
                      </h4>

                      <div className="text-xs sm:text-sm text-[#fef9f8]/90 leading-relaxed whitespace-pre-line font-sans pl-2 border-l-2 border-emerald-500/40">
                        {ans.text}
                      </div>

                      <div className="pt-2 flex items-center justify-between text-xs text-white/60">
                        <span className="text-[11px]">
                          Answered by{' '}
                          <strong className="text-white">
                            {anonymizeName(ans.author)}
                          </strong>{' '}
                          ({ans.authorRole})
                        </span>
                        <button
                          onClick={() =>
                            parentDoubt && setSelectedQuestion(parentDoubt)
                          }
                          className="text-emerald-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <span>View Full Discussion</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= 5. QUICK ANSWER MODAL ================= */}
      {answeringQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl bg-[#111111] border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Submit Verified Solution
                </h3>
              </div>
              <button
                onClick={() => setAnsweringQuestion(null)}
                className="text-white/40 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Question Preview */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-[10px] text-white/50 font-mono">
                <span>{answeringQuestion.subjectCode}</span>
                <span>•</span>
                <span className="text-amber-400 font-bold">
                  🪙 {answeringQuestion.bounty || 25} Tokens Bounty
                </span>
                <span>•</span>
                <span>Community: {activeCommunity.name}</span>
              </div>
              <h4 className="text-sm font-bold text-white">
                {answeringQuestion.title}
              </h4>
              <p className="text-xs text-white/60 line-clamp-2">
                {answeringQuestion.snippet || answeringQuestion.fullDescription}
              </p>
            </div>

            {/* Answer Input */}
            <form onSubmit={handleQuickSubmitAnswer} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-semibold tracking-wider text-white/70 mb-1.5 flex items-center justify-between">
                  <span>Your Step-by-Step Explanation *</span>
                  <span className="text-[10px] text-white/40">
                    Posting as {anonymizeName(currentUser?.fullName || 'Random 1')}
                  </span>
                </label>
                <textarea
                  required
                  rows={6}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Provide clear reasoning, mathematical formulas, algorithms, or proof steps..."
                  className="w-full p-3.5 text-xs sm:text-sm rounded-xl bg-black/50 border border-white/10 text-white placeholder-white/40 focus:border-amber-400 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAnsweringQuestion(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAnswer || !answerText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/25 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isSubmittingAnswer ? 'Publishing...' : 'Publish Solution'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 6. POST DOUBT MODAL (Pre-Scoped to Active Community) ================= */}
      <PostDoubtModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onSubmitDoubt={handlePostDoubt}
        currentUser={currentUser}
        initialCommunityId={activeCommunity.id}
      />
    </div>
  )
}

