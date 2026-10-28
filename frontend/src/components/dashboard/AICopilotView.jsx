import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Sparkles,
  Send,
  Bot,
  User,
  RotateCcw,
  Flame,
  Check,
  Copy,
  AlertCircle,
  Clock,
  Layers,
  ChevronRight,
  RefreshCw,
  Terminal,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  CheckCheck,
} from 'lucide-react'
import { askAiQuestion, getMostAskedQuestions, checkBackendHealth } from '../../services/api'
import PostAiDoubtModal from './PostAiDoubtModal'

export default function AICopilotView({ currentUser, onDeductTokens, onNavigateTab }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am Spidyy AI, your campus academic tutor. Ask me any question in Computer Science, Mathematics, or Engineering, and I will walk you through step-by-step.',
      timestamp: 'Ready',
    },
  ])
  const [inputQuestion, setInputQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [backendStatus, setBackendStatus] = useState('checking') // 'online' | 'offline' | 'checking'
  const [backendInfo, setBackendInfo] = useState(null)
  const [statsVersion, setStatsVersion] = useState(0)
  const [mostAsked, setMostAsked] = useState([])
  const [isLoadingMostAsked, setIsLoadingMostAsked] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false)
  const [verifyingMessage, setVerifyingMessage] = useState(null)
  const [verifyingIndex, setVerifyingIndex] = useState(null)
  const [postedIndexes, setPostedIndexes] = useState(new Set())

  const messagesEndRef = useRef(null)

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  // Check backend health
  const checkHealth = useCallback(async () => {
    setBackendStatus('checking')
    try {
      const data = await checkBackendHealth()
      setBackendStatus('online')
      setBackendInfo(data)
    } catch {
      setBackendStatus('offline')
      setBackendInfo(null)
    }
  }, [])

  useEffect(() => {
    checkHealth()
    const interval = setInterval(() => {
      checkBackendHealth()
        .then((data) => {
          setBackendStatus('online')
          setBackendInfo(data)
        })
        .catch(() => {
          // If offline, preserve state
        })
    }, 4000)
    return () => clearInterval(interval)
  }, [checkHealth])

  // Load Most Asked Questions
  const loadMostAsked = useCallback(async () => {
    setIsLoadingMostAsked(true)
    try {
      const res = await getMostAskedQuestions(10)
      if (res && res.questions) {
        setMostAsked(res.questions)
      }
    } catch {
      // Backend may be offline or no questions yet
    } finally {
      setIsLoadingMostAsked(false)
    }
  }, [])

  useEffect(() => {
    loadMostAsked()
  }, [loadMostAsked, statsVersion])

  const handleSend = async (questionText = inputQuestion) => {
    const q = (questionText || '').trim()
    if (!q || isLoading) return

    // Add user message
    const userMsg = {
      role: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages((prev) => [...prev, userMsg])
    setInputQuestion('')
    setIsLoading(true)

    // Deduct 5 tokens for academic prompt if handler provided
    if (onDeductTokens) {
      onDeductTokens(5)
    }

    try {
      const answer = await askAiQuestion(q)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: answer,
          userQuestion: q,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
      // Trigger recount of most-asked questions after 1.5s
      setTimeout(() => setStatsVersion((v) => v + 1), 1500)
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'error',
          text: err.message || 'Failed to generate answer. Please ensure the Python backend is running on port 8000.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenVerifyModal = (msg, index) => {
    let q = msg.userQuestion
    if (!q && index > 0) {
      for (let i = index - 1; i >= 0; i--) {
        if (messages[i]?.role === 'user') {
          q = messages[i].text
          break
        }
      }
    }
    setVerifyingMessage({ ...msg, userQuestion: q || 'Academic Question' })
    setVerifyingIndex(index)
    setIsVerifyModalOpen(true)
  }

  const handleVerifySuccess = () => {
    if (verifyingIndex !== null) {
      setPostedIndexes((prev) => new Set([...prev, verifyingIndex]))
    }
  }

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const samplePrompts = [
    "Explain Peterson's algorithm for mutual exclusion",
    'Why does Red-Black tree insertion take at most 2 rotations?',
    'What is the difference between TCP CUBIC and BBR?',
    'Derive the time complexity of QuickSort in worst and average case',
  ]

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#111111] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#ff0c0c]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#ff0c0c]">
                Integrated Academic Copilot
              </span>
              <button
                type="button"
                onClick={checkHealth}
                title="Click to re-check backend connection"
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer ${
                  backendStatus === 'online'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                    : backendStatus === 'offline'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                    : 'bg-white/10 text-white/50 border border-white/10'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    backendStatus === 'online'
                      ? 'bg-emerald-400 animate-pulse'
                      : backendStatus === 'offline'
                      ? 'bg-rose-400'
                      : 'bg-white/40'
                  }`}
                />
                {backendStatus === 'online'
                  ? `FastAPI Online (${backendInfo?.model || 'Gemini 3.1 Flash-Lite'}${backendInfo?.gemini_key_configured ? '' : ' • Demo Mode'})`
                  : backendStatus === 'offline'
                  ? 'FastAPI Offline • Click to retry'
                  : 'Checking AI Backend...'}
              </button>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Spidyy AI Academic Tutor
            </h2>
            <p className="text-sm text-white/70 mt-1 max-w-xl">
              Instant explanations, algorithm walkthroughs, and equation derivations. Powered by Gemini & semantic MiniLM similarity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-white/10 text-right">
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Available Credits</p>
              <p className="text-base font-black text-white flex items-center gap-1">
                <span className="text-[#ff0c0c]">🪙</span> {currentUser?.tokenBalance ?? 450}{' '}
                <span className="text-[11px] font-normal text-white/40">(-5/prompt)</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Copilot Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Chat Area (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-[#111111] border border-white/10 shadow-2xl flex flex-col h-[650px] overflow-hidden">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((m, idx) => {
              const isAssistant = m.role === 'assistant'
              const isError = m.role === 'error'

              return (
                <div
                  key={idx}
                  className={`flex gap-3 ${isAssistant || isError ? 'items-start' : 'items-start flex-row-reverse'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                      isAssistant
                        ? 'bg-[#ff0c0c]/15 text-[#ff0c0c] border border-[#ff0c0c]/30'
                        : isError
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-white/10 text-white border border-white/20'
                    }`}
                  >
                    {isAssistant ? <Bot className="w-4 h-4" /> : isError ? <AlertCircle className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                    isAssistant
                      ? 'bg-white/[0.03] border border-white/10 text-white/90'
                      : isError
                      ? 'bg-rose-950/30 border border-rose-800/40 text-rose-200'
                      : 'bg-[#ff0c0c] text-white font-medium shadow-lg shadow-[#ff0c0c]/20'
                  }`}>
                    <div className="flex items-center justify-between gap-4 mb-1 text-[11px] opacity-60">
                      <span>{isAssistant ? 'Spidyy AI Copilot' : isError ? 'Error' : currentUser?.fullName || 'You'}</span>
                      <div className="flex items-center gap-2">
                        <span>{m.timestamp}</span>
                        {isAssistant && (
                          <button
                            onClick={() => handleCopy(m.text, idx)}
                            className="hover:text-white transition-colors"
                            title="Copy response"
                          >
                            {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed">
                      {m.text}
                    </div>

                    {/* Action Bar: Post to Doubts for Peer Verification */}
                    {isAssistant && idx > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                          <HelpCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>Not sure if this AI answer is 100% correct?</span>
                        </div>

                        {postedIndexes.has(idx) ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>Posted to Doubts</span>
                            </span>
                            {onNavigateTab && (
                              <button
                                type="button"
                                onClick={() => onNavigateTab('doubts')}
                                className="inline-flex items-center gap-1 text-xs text-purple-300 hover:text-white underline cursor-pointer"
                              >
                                <span>View Thread</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenVerifyModal(m, idx)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/35 hover:border-purple-500/60 text-purple-200 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm self-start sm:self-auto"
                            title="Post this question and AI answer to the Doubt section so campus peers can check if it's correct"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                            <span>Ask Peers: Is this answer correct?</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {isLoading && (
              <div className="flex gap-3 items-start animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-[#ff0c0c]/15 text-[#ff0c0c] border border-[#ff0c0c]/30 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-sm text-white/70 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#ff0c0c] animate-spin" />
                  <span>Synthesizing academic response & checking similarity group...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Suggestions */}
          <div className="px-4 py-2 border-t border-white/5 bg-[#0a0a0a]/50 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
            <span className="text-[11px] text-white/40 shrink-0 font-medium">Try:</span>
            {samplePrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSend(p)}
                disabled={isLoading}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/5 transition-colors text-xs text-left"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-white/10 bg-[#0a0a0a]">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder="Ask an academic question (e.g. explain Dijkstra's algorithm)..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#ff0c0c] transition-colors"
              />
              <button
                type="submit"
                disabled={!inputQuestion.trim() || isLoading}
                className="px-5 py-3 rounded-xl bg-[#ff0c0c] hover:bg-[#ff0c0c]/90 disabled:opacity-40 disabled:hover:bg-[#ff0c0c] text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-[#ff0c0c]/30 transition-all cursor-pointer"
              >
                <span>Ask</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right: Live Most-Asked Leaderboard (1 col) */}
        <div className="rounded-2xl bg-[#111111] border border-white/10 p-5 shadow-2xl flex flex-col h-[650px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#ff0c0c]" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                Campus AI Trends
              </h3>
            </div>
            <button
              onClick={loadMostAsked}
              disabled={isLoadingMostAsked}
              className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              title="Refresh trends"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMostAsked ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <p className="text-xs text-white/50 mt-2">
            Most frequent questions clustered by sentence similarity (MiniLM) across the network.
          </p>

          <div className="flex-1 overflow-y-auto mt-4 space-y-2.5 pr-1">
            {mostAsked.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4">
                <Layers className="w-8 h-8 text-white/20 mb-2" />
                <p className="text-xs text-white/40">
                  {backendStatus === 'online'
                    ? 'No questions have reached the group threshold yet. Start asking above!'
                    : 'Backend server is offline. Run the FastAPI server to view live question trends.'}
                </p>
              </div>
            ) : (
              mostAsked.map((q) => (
                <div
                  key={q.id}
                  onClick={() => handleSend(q.question)}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#ff0c0c]/40 hover:bg-white/[0.05] transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-white/90 group-hover:text-white line-clamp-2">
                      {q.question}
                    </p>
                    <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ff0c0c]/15 text-[#ff0c0c] border border-[#ff0c0c]/30">
                      {q.count}x
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-white/40">
                    <span>Click to ask AI</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Info Box */}
          <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-white/60 space-y-1">
            <div className="flex items-center justify-between">
              <span>Embedding Engine:</span>
              <span className="font-mono text-white/80">all-MiniLM-L6-v2</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Similarity Threshold:</span>
              <span className="font-mono text-white/80">0.80 cosine</span>
            </div>
            <div className="flex items-center justify-between">
              <span>CORS Whitelist:</span>
              <span className="font-mono text-white/80">http://localhost:5173</span>
            </div>
          </div>
        </div>
      </div>

      {/* Post AI Doubt Verification Modal */}
      {verifyingMessage && (
        <PostAiDoubtModal
          isOpen={isVerifyModalOpen}
          onClose={() => setIsVerifyModalOpen(false)}
          aiResponse={verifyingMessage.text}
          userQuestion={verifyingMessage.userQuestion}
          currentUser={currentUser}
          onSuccess={handleVerifySuccess}
        />
      )}
    </div>
  )
}
