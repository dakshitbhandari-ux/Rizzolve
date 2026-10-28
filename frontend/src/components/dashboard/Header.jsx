import { useState, useRef, useEffect } from 'react'
import {
  Menu,
  Bell,
  Coins,
  ChevronDown,
  Search,
  User,
  Settings,
  ShieldCheck,
  LogOut,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Play,
} from 'lucide-react'

export default function Header({
  currentUser,
  onOpenMobileSidebar,
  onSignOut,
  onNavigateTab,
  onReplayIntro,
}) {

  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(3)

  const profileRef = useRef(null)
  const notifRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const studentName = currentUser?.fullName || 'Random 1'
  const tokenCount = currentUser?.tokenBalance ?? 450

  const notifications = [
    {
      id: 1,
      title: 'Answer Marked as Accepted',
      desc: 'Random 2 accepted your solution on CS-302 (Operating Systems).',
      time: '12m ago',
      reward: '+25 Tokens',
      unread: true,
    },
    {
      id: 2,
      title: 'New Doubt in Enrolled Subject',
      desc: 'Random 4 asked a doubt in "Calculus & Linear Algebra".',
      time: '1h ago',
      reward: null,
      unread: true,
    },
    {
      id: 3,
      title: 'AI Academic Model Updated',
      desc: 'Claude 3.5 Sonnet & LaTeX math rendering is now active for all students.',
      time: '3h ago',
      reward: null,
      unread: true,
    },
  ]

  return (
    <header className="h-16 sticky top-0 z-20 w-full bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile Hamburger & Greeting */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile Hamburger Menu */}
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 text-white/70 hover:text-white hover:bg-white/[0.05] rounded-xl transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Greeting with student name */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-semibold text-white tracking-tight">
              Welcome back,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#f6f6f6] to-[#ff0c0c]">
                {studentName}
              </span>
            </h1>
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          </div>
          <p className="text-[11px] text-white/50 hidden sm:block">
            Apex Institute of Technology • Spring Semester 2026
          </p>
        </div>
      </div>

      {/* Right: Search, Token Badge, Notifications, User Menu */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Replay Cinematic Entry Video Button */}
        {onReplayIntro && (
          <button
            onClick={onReplayIntro}
            title="Watch the full cinematic entry video"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#ff0c0c]/50 text-xs text-white/70 hover:text-white transition-all cursor-pointer shadow-sm group"
          >
            <Play className="w-3.5 h-3.5 text-[#ff0c0c] fill-[#ff0c0c]/20 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline font-mono text-[11px] font-semibold">Intro Video</span>
          </button>
        )}

        {/* Sleek Token Balance Badge */}

        <button
          onClick={() => onNavigateTab && onNavigateTab('wallet')}
          title="Click to view Token Wallet & Ledger"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141414] hover:bg-[#1a1a1a] border border-[#ff0c0c]/30 hover:border-[#ff0c0c]/60 shadow-[0_0_15px_rgba(255,12,12,0.15)] transition-all cursor-pointer group"
        >
          <div className="w-5 h-5 rounded-md bg-[#ff0c0c]/20 border border-[#ff0c0c]/40 flex items-center justify-center text-[#ff0c0c]">
            <Coins className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs sm:text-sm font-bold font-mono text-white group-hover:text-[#fef9f8]">
            🪙 {tokenCount}
          </span>
          <span className="hidden sm:inline text-[11px] font-medium text-[#ff0c0c]">
            Tokens
          </span>
        </button>

        {/* Notification Bell with Badge & Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications)
              setShowProfileMenu(false)
            }}
            className="relative p-2 text-white/70 hover:text-white hover:bg-white/[0.05] rounded-xl transition-colors cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#ff0c0c] text-[10px] font-bold text-white flex items-center justify-center border-2 border-[#0a0a0a] shadow-[0_0_8px_#ff0c0c]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#111111] border border-white/10 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-white">
                    Campus Notifications
                  </span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded bg-[#ff0c0c]/20 text-[#ff0c0c] font-bold font-mono">
                    {unreadCount} New
                  </span>
                </div>
                <button
                  onClick={() => setUnreadCount(0)}
                  className="text-[11px] text-white/50 hover:text-[#ff0c0c] transition-colors"
                >
                  Mark all read
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.05]">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 hover:bg-white/[0.03] transition-colors ${
                      n.unread ? 'bg-[#ff0c0c]/[0.02]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-white">{n.title}</p>
                      <span className="text-[10px] text-white/40 shrink-0 font-mono">
                        {n.time}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 mt-1 leading-snug">{n.desc}</p>
                    {n.reward && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#ff0c0c]/15 text-[#ff0c0c] border border-[#ff0c0c]/30">
                        {n.reward}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-2.5 bg-[#0e0e0e] border-t border-white/10 text-center">
                <button
                  onClick={() => {
                    setShowNotifications(false)
                    if (onNavigateTab) onNavigateTab('doubts')
                  }}
                  className="text-xs text-white/70 hover:text-[#ff0c0c] font-medium transition-colors"
                >
                  View All Activity & Doubts &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar with Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu)
              setShowNotifications(false)
            }}
            className="flex items-center gap-2 p-1 pl-1.5 sm:pr-2.5 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer border border-transparent hover:border-white/10"
            aria-label="User account menu"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-zinc-800 to-red-950 border border-[#ff0c0c]/40 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              {studentName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <span className="text-xs font-medium text-white hidden md:inline truncate max-w-[100px]">
              {studentName.split(' ')[0]}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-white/50 hidden md:block" />
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#111111] border border-white/10 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] mb-2">
                <p className="text-xs font-bold text-white truncate">{studentName}</p>
                <p className="text-[11px] text-white/50 truncate font-mono">
                  {currentUser?.email || 'student@campus.edu'}
                </p>
                <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-white/60">
                  <span>Student ID:</span>
                  <span className="font-mono text-white">
                    {currentUser?.studentId || '2024-CS-0412'}
                  </span>
                </div>
              </div>

              <div className="space-y-0.5 text-xs text-white/80">
                <button
                  onClick={() => {
                    setShowProfileMenu(false)
                    if (onNavigateTab) onNavigateTab('wallet')
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Coins className="w-4 h-4 text-[#ff0c0c]" />
                    <span>Token Wallet</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#ff0c0c] font-bold">
                    {tokenCount}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setShowProfileMenu(false)
                    if (onNavigateTab) onNavigateTab('dashboard')
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-white/50" />
                  <span>Academic Profile</span>
                </button>
              </div>

              <div className="my-1 border-t border-white/10" />

              <button
                onClick={() => {
                  setShowProfileMenu(false)
                  onSignOut()
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#ff0c0c] hover:bg-[#ff0c0c]/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Campus</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
