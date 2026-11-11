import { useState } from 'react'
import { Mail, ArrowRight, X, CheckCircle, ShieldAlert, Lock } from 'lucide-react'
import { requestPasswordReset, updateAccountPassword } from '../services/auth'

export default function ForgotPasswordModal({ isOpen, onClose, onNotify, recoveryMode = false, onPasswordUpdated }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen && !recoveryMode) return null

  const close = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setIsSubmitted(false)
    setError('')
    onClose()
  }

  const handleRequest = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await requestPasswordReset(email)
      setIsSubmitted(true)
      onNotify({ type: 'success', title: 'Recovery Email Sent', message: 'Check your inbox for the secure password reset link.' })
    } catch (err) {
      setError(err.message || 'Could not send the recovery email.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Your new password must contain at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }
    setIsLoading(true)
    try {
      await updateAccountPassword(password)
      onNotify({ type: 'success', title: 'Password Updated', message: 'Your password has been changed. Please sign in again.' })
      onPasswordUpdated?.()
      close()
    } catch (err) {
      setError(err.message || 'Could not update your password.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#111111] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#ff0c0c]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#ff0c0c]/10 border border-[#ff0c0c]/30 flex items-center justify-center text-[#ff0c0c]">
              {recoveryMode ? <Lock className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            </div>
            <h3 className="text-lg font-semibold text-white">{recoveryMode ? 'Choose a New Password' : 'Reset Account Access'}</h3>
          </div>
          {!recoveryMode && (
            <button onClick={close} className="text-white/40 hover:text-white transition-colors p-1 rounded-md" aria-label="Close modal">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {recoveryMode ? (
          <form onSubmit={handlePasswordUpdate} className="mt-5 space-y-4">
            <p className="text-sm text-[#fef9f8]/70">Your recovery link is valid. Enter a new password for your Rizzolve account.</p>
            <label className="block text-xs uppercase tracking-wider font-medium text-white/60">
              New password
              <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" className="mt-2 w-full px-4 py-2.5 text-sm rounded-xl rizzolve-input" />
            </label>
            <label className="block text-xs uppercase tracking-wider font-medium text-white/60">
              Confirm new password
              <input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Enter it again" className="mt-2 w-full px-4 py-2.5 text-sm rounded-xl rizzolve-input" />
            </label>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <button disabled={isLoading} className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-[#ff0c0c] hover:bg-[#ff0101] disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? 'Updating...' : <>Update Password <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        ) : isSubmitted ? (
          <div className="mt-6 text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h4 className="text-base font-semibold text-white">Check Your Inbox</h4>
            <p className="text-sm text-[#fef9f8]/70 mt-2">If an account exists for {email}, a secure password reset link has been sent.</p>
            <button onClick={close} className="mt-6 w-full py-2.5 px-4 text-sm font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl">Return to Login</button>
          </div>
        ) : (
          <form onSubmit={handleRequest} className="mt-5 space-y-4">
            <p className="text-sm text-[#fef9f8]/70 leading-relaxed">Enter your registered college email. We will send you a secure password reset link.</p>
            <label className="block text-xs uppercase tracking-wider font-medium text-white/60">
              College email
              <span className="relative block mt-2">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@college.edu" autoComplete="email" className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl rizzolve-input" />
              </span>
            </label>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <div className="pt-2 flex items-center gap-3">
              <button type="button" onClick={close} className="w-1/3 py-2.5 px-4 text-sm font-medium text-white/70 bg-white/5 border border-white/10 rounded-xl">Cancel</button>
              <button type="submit" disabled={isLoading} className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-[#ff0c0c] hover:bg-[#ff0101] rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                {isLoading ? 'Sending...' : <>Send Reset Link <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
