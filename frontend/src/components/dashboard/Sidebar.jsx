import {
  LayoutDashboard,
  MessageSquareQuote,
  Users,
  Sparkles,
  Coins,
  X,
  GraduationCap,
  ChevronRight,
  ShieldCheck,
  LogOut,
} from 'lucide-react'

export default function Sidebar({
  activeTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
  currentUser,
  onSignOut,
}) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      desc: 'Overview & Activity',
    },
    {
      id: 'doubts',
      label: 'Doubt Boards',
      icon: MessageSquareQuote,
      badge: '12 Active',
      desc: 'Subject Q&A & FAQs',
    },
    {
      id: 'communities',
      label: 'Communities',
      icon: Users,
      badge: '3 Joined',
      desc: 'College & Batch Groups',
    },
    {
      id: 'ai-chat',
      label: 'AI Chat',
      icon: Sparkles,
      badge: 'v2.5',
      desc: 'Academic Copilot',
    },
    {
      id: 'wallet',
      label: 'Token Wallet',
      icon: Coins,
      badge: `${currentUser?.tokenBalance || 450}`,
      desc: 'Platform Credits & Ledger',
    },
  ]

  const handleNavClick = (tabId) => {
    onSelectTab(tabId)
    if (onCloseMobile) {
      onCloseMobile()
    }
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0d0d0d] border-r border-white/[0.08] select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#242424] to-[#0a0a0a] border border-[#ff0c0c]/40 shadow-[0_0_15px_rgba(255,12,12,0.3)]">
            <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#ff0c0c]">
              R
            </span>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#ff0c0c] rounded-full border border-[#0d0d0d]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-extrabold tracking-tight text-white">
                Rizzolve
              </span>
              <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider rounded bg-[#ff0c0c]/15 text-[#ff0c0c] border border-[#ff0c0c]/30">
                SaaS
              </span>
            </div>
            <p className="text-[10px] text-white/40 tracking-wide font-mono">
              CAMPUS WORKSPACE
            </p>
          </div>
        </div>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-white/50 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* College Workspace Pill */}
      <div className="px-4 py-3 mx-3 my-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-[#ff0c0c]/10 border border-[#ff0c0c]/25 flex items-center justify-center text-[#ff0c0c] shrink-0">
          <GraduationCap className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">
            Apex Institute of Tech
          </p>
          <p className="text-[10px] text-white/50 truncate">
            {currentUser?.course || 'Computer Science (Sem 4)'}
          </p>
        </div>
      </div>

      {/* Navigation Section */}
      <div className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
        <p className="px-3 pb-1 text-[10px] uppercase font-bold tracking-wider text-white/40">
          Main Navigation
        </p>

        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-[#1c1c1c] text-[#ff0c0c] border-l-4 border-[#ff0c0c] shadow-[0_0_20px_rgba(255,12,12,0.12)]'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-[#ff0c0c]' : 'text-white/50 group-hover:text-white'
                  }`}
                />
                <span className={isActive ? 'font-semibold text-white' : ''}>
                  {item.label}
                </span>
              </div>

              {item.badge && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-[#ff0c0c]/20 text-[#ff0c0c] font-bold border border-[#ff0c0c]/30'
                      : 'bg-white/[0.05] text-white/50 border border-white/[0.06]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Bottom User Profile Section */}
      <div className="p-3 border-t border-white/[0.08] bg-[#0a0a0a]">
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-tr from-zinc-800 to-zinc-700 border border-white/20 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {currentUser?.fullName
                ? currentUser.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                : 'R1'}
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#0a0a0a]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {currentUser?.fullName || 'Random 1'}
              </p>
              <p className="text-[10px] text-white/50 font-mono truncate">
                {currentUser?.studentId || '2024-CS-0412'}
              </p>
            </div>
          </div>

          <button
            onClick={onSignOut}
            title="Sign Out"
            className="p-1.5 text-white/40 hover:text-[#ff0c0c] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Static Sidebar */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Out Drawer / Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          {/* Drawer content */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
