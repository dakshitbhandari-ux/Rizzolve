import { useCallback, useEffect, useState } from 'react'
import CinematicEntryVideo from './components/entry/CinematicEntryVideo'
import DashboardShell from './components/dashboard/DashboardShell'
import AuthCard from './components/AuthCard'
import ForgotPasswordModal from './components/ForgotPasswordModal'
import NotificationToast from './components/NotificationToast'
import { restoreAuthSession, signOut as signOutAccount } from './services/auth'

export default function App() {
  const [hasCompletedEntry, setHasCompletedEntry] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const [toast, setToast] = useState(null)
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)

  useEffect(() => {
    let active = true
    restoreAuthSession()
      .then(({ user, recovery }) => {
        if (!active) return
        setCurrentUser(user)
        setIsPasswordRecovery(Boolean(recovery))
      })
      .catch((error) => {
        if (active) {
          setToast({ type: 'error', title: 'Session Check Failed', message: error.message })
        }
      })
      .finally(() => {
        if (active) setAuthReady(true)
      })
    return () => { active = false }
  }, [])

  const handleSignOut = useCallback(async () => {
    try {
      await signOutAccount()
    } catch (error) {
      setToast({ type: 'error', title: 'Sign Out Notice', message: error.message })
    } finally {
      setCurrentUser(null)
      setToast({ type: 'info', title: 'Signed Out', message: 'You have safely signed out of your Rizzolve account.' })
    }
  }, [])

  const handleAuthSuccess = (userData) => {
    setCurrentUser(userData)
    setHasCompletedEntry(true)
    setToast({
      type: 'success',
      title: 'Welcome to Rizzolve',
      message: 'Signed in as ' + userData.fullName + '.',
    })
  }

  const handleDeductTokens = (amount) => {
    setCurrentUser((prev) => {
      if (!prev) return prev
      return { ...prev, tokenBalance: Math.max(0, (prev.tokenBalance || 0) - amount) }
    })
  }

  if (isPasswordRecovery) {
    return (
      <div className="min-h-screen bg-[#090b12] text-[#fef9f8] flex items-center justify-center p-4">
        <NotificationToast toast={toast} onClose={() => setToast(null)} />
        <div className="w-full max-w-md">
          <ForgotPasswordModal
            isOpen
            recoveryMode
            onClose={() => setIsPasswordRecovery(false)}
            onPasswordUpdated={() => setIsPasswordRecovery(false)}
            onNotify={setToast}
          />
        </div>
      </div>
    )
  }

  if (!hasCompletedEntry) {
    return <CinematicEntryVideo onComplete={() => setHasCompletedEntry(true)} />
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#090b12] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-[#ff0c0c] rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-white/60">Checking your Rizzolve account...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#090b12] text-[#fef9f8] selection:bg-[#ff0c0c] selection:text-white">
      <NotificationToast toast={toast} onClose={() => setToast(null)} />
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        onNotify={setToast}
      />

      {currentUser ? (
        <DashboardShell
          currentUser={currentUser}
          onSignOut={handleSignOut}
          onReplayIntro={() => setHasCompletedEntry(false)}
          onDeductTokens={handleDeductTokens}
        />
      ) : (
        <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.16),transparent_55%)] pointer-events-none" />
          <div className="relative z-10 w-full max-w-xl">
            <AuthCard
              onAuthSuccess={handleAuthSuccess}
              onOpenForgotPassword={() => setIsForgotModalOpen(true)}
              onNotify={setToast}
            />
          </div>
        </div>
      )}
    </div>
  )
}
