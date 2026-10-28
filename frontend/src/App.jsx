import { useState } from 'react'
import CinematicEntryVideo from './components/entry/CinematicEntryVideo'
import DashboardShell from './components/dashboard/DashboardShell'
import AuthCard from './components/AuthCard'
import ForgotPasswordModal from './components/ForgotPasswordModal'
import NotificationToast from './components/NotificationToast'

export default function App() {
  // Entry video plays when opening the website, then immediately switches to Dashboard
  const [hasCompletedEntry, setHasCompletedEntry] = useState(false)

  // Authenticated Student State (Default student profile for instant seamless access)
  const [currentUser, setCurrentUser] = useState({
    fullName: 'Random 1',
    email: 'random1@campus.edu',
    studentId: '2024-CS-0412',
    course: 'B.Tech Computer Science',
    semester: 'Semester 4',
    tokenBalance: 450,
    role: 'student',
  })

  const [toast, setToast] = useState(null)
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)

  // When entry video completes, immediately switch into Dashboard
  const handleEntryComplete = () => {
    setHasCompletedEntry(true)
  }

  // Replay intro video on demand
  const handleReplayIntro = () => {
    setHasCompletedEntry(false)
  }

  const handleSignOut = () => {
    setCurrentUser(null)
    setToast({
      type: 'info',
      title: 'Signed Out',
      message: 'You have safely signed out of your campus account.',
    })
  }

  const handleAuthSuccess = (userData) => {
    setCurrentUser(userData)
    setToast({
      type: 'success',
      title: 'Welcome Back',
      message: `Logged in as ${userData.fullName}. Campus dashboard ready.`,
    })
  }

  const handleDeductTokens = (amount) => {
    setCurrentUser((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        tokenBalance: Math.max(0, (prev.tokenBalance || 0) - amount),
      }
    })
  }

  // PHASE 1: Complete Cinematic Entry Video (Plays alone, no rings, completely visible, once only)
  if (!hasCompletedEntry) {
    return <CinematicEntryVideo onComplete={handleEntryComplete} />
  }

  // PHASE 2: Main Application & Dashboard (Loads after video finishes)
  return (
    <div className="min-h-screen bg-[#090b12] text-[#fef9f8] selection:bg-[#ff0c0c] selection:text-white">
      {/* Toast Notification Container */}
      <NotificationToast toast={toast} onClose={() => setToast(null)} />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        onNotify={(msg) => setToast(msg)}
      />

      {currentUser ? (
        /* Full Authenticated Student Dashboard */
        <DashboardShell
          currentUser={currentUser}
          onSignOut={handleSignOut}
          onReplayIntro={handleReplayIntro}
          onDeductTokens={handleDeductTokens}
        />
      ) : (
        /* Auth Screen if user explicitly signed out */
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <AuthCard
              onAuthSuccess={handleAuthSuccess}
              onOpenForgotPassword={() => setIsForgotModalOpen(true)}
              onNotify={(msg) => setToast(msg)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
