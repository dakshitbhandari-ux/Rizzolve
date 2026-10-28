import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import DashboardOverview from './DashboardOverview'
import DoubtBoardsView from '../doubts/DoubtBoardsView'
import AICopilotView from './AICopilotView'
import CommunitiesView from '../communities/CommunitiesView'
import ImmersiveBackground from '../background/ImmersiveBackground'
import {
  MessageSquareQuote,
  Users,
  Sparkles,
  Coins,
  ArrowRight,
  PlusCircle,
  HelpCircle,
  CheckCircle,
} from 'lucide-react'

export default function DashboardShell({ currentUser, onSignOut, onReplayIntro, onDeductTokens }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)


  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardOverview
            currentUser={currentUser}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )

      case 'doubts':
        return (
          <DoubtBoardsView
            currentUser={currentUser}
            onOpenAiChat={() => setActiveTab('ai-chat')}
          />
        )


      case 'communities':
        return (
          <CommunitiesView
            currentUser={currentUser}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )

      case 'ai-chat':
        return (
          <AICopilotView
            currentUser={currentUser}
            onDeductTokens={onDeductTokens}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )

      case 'wallet':
        return (
          <div className="p-6 sm:p-8 rounded-2xl bg-[#111111] border border-white/10 shadow-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ff0c0c]">
              Module: Token Wallet & Ledger
            </span>
            <h2 className="text-2xl sm:text-[2rem] font-bold text-white mt-1">
              Student Platform Credits
            </h2>
            <p className="text-sm text-white/70 mt-1 max-w-xl">
              Tokens are earned by solving doubts and providing accepted solutions to peers. Tokens can be spent on AI reasoning runs.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-gradient-to-br from-[#ff0c0c]/15 to-transparent border border-[#ff0c0c]/30">
                <p className="text-xs text-white/60">Current Balance</p>
                <p className="text-3xl font-black text-white mt-1">
                  🪙 {currentUser?.tokenBalance ?? 450}
                </p>
                <p className="text-[11px] text-emerald-400 mt-2 font-medium">
                  +50 Welcome Bonus Included
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-xs text-white/60">Total Earned (Lifetime)</p>
                <p className="text-3xl font-black text-white mt-1">🪙 620</p>
                <p className="text-[11px] text-white/50 mt-2">
                  From 12 accepted peer answers
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-xs text-white/60">Total Spent on AI</p>
                <p className="text-3xl font-black text-white mt-1">🪙 170</p>
                <p className="text-[11px] text-white/50 mt-2">
                  34 AI queries processed
                </p>
              </div>
            </div>

            {/* Live Ledger Activity */}
            <div className="mt-8 border-t border-white/10 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-white">Live Ledger & Transaction Activity</h4>
                <button
                  onClick={() => setActiveTab('doubts')}
                  className="text-xs text-[#ff0c0c] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Earn bounties by solving doubts</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {[
                  { desc: 'AI Copilot Prompt Execution', time: 'Recently', amount: '-5 Tokens', type: 'debit' },
                  { desc: 'Answer marked Accepted on Peterson Algorithm', time: '18m ago', amount: '+30 Tokens', type: 'credit' },
                  { desc: 'Cohort Welcome Bonus', time: 'Semester Start', amount: '+50 Tokens', type: 'credit' },
                  { desc: 'Initial Enrollment Grant', time: 'Semester Start', amount: '+400 Tokens', type: 'credit' },
                ].map((tx, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                    <div>
                      <p className="font-semibold text-white">{tx.desc}</p>
                      <p className="text-[10px] text-white/40">{tx.time}</p>
                    </div>
                    <span className={`font-mono font-bold ${tx.type === 'credit' ? 'text-emerald-400' : 'text-[#ff0c0c]'}`}>
                      {tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="relative min-h-screen bg-transparent text-[#fef9f8] flex overflow-x-hidden">
      {/* 1. Live Spider-Man Background Video Running Behind the Dashboard */}
      <ImmersiveBackground />

      {/* 2. Main Dashboard Content Layer */}
      <div className="relative z-10 flex w-full min-h-screen">
        {/* Sidebar Navigation (Desktop and Mobile Drawer) */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tabId) => setActiveTab(tabId)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          currentUser={currentUser}
          onSignOut={onSignOut}
        />

        {/* Main Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <Header
            currentUser={currentUser}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onSignOut={onSignOut}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onReplayIntro={onReplayIntro}
          />

          {/* Main Content Area: Clean, padded container */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {renderContent()}
          </main>

          {/* Minimal Dashboard Footer */}
          <footer className="border-t border-white/[0.06] py-4 px-6 text-xs text-white/40 flex flex-col sm:flex-row items-center justify-between gap-2 bg-[#090b12]/40 backdrop-blur-md">
            <span>&copy; {new Date().getFullYear()} Rizzolve SaaS Platform • Multi-College Academic Network</span>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="hover:text-white cursor-pointer transition-colors">Honor Code</span>
              <span className="hover:text-white cursor-pointer transition-colors">Documentation</span>
              <span className="hover:text-white cursor-pointer transition-colors">API Status</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
