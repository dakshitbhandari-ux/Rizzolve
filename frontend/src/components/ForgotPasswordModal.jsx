import { useState } from 'react'
import { Mail, ArrowRight, X, CheckCircle, ShieldAlert } from 'lucide-react'

export default function ForgotPasswordModal({ isOpen, onClose, onNotify }) {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      onNotify({
        type: 'error',
        title: 'Invalid Email',
        message: 'Please provide a valid college email address.',
      })
      return
    }

    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      setIsSubmitted(true)
      onNotify({
        type: 'success',
        title: 'Recovery Link Dispatched',
        message: `Password reset instructions sent to ${email}`,
      })
    }, 900)
  }

  const handleReset = () => {
    setIsSubmitted(false)
    setEmail('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#111111] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Ambient glow in modal */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#ff0c0c]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#ff0c0c]/10 border border-[#ff0c0c]/30 flex items-center justify-center text-[#ff0c0c]">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-semibold text-white">Reset Account Access</h3>
          </div>
          <button
            onClick={handleReset}
            className="text-white/40 hover:text-white transition-colors p-1 rounded-md"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <p className="text-sm text-[#fef9f8]/70 leading-relaxed">
              Enter your registered college email address. We will send you a one-time verification link to restore your academic profile.
            </p>

            <div>
              <label htmlFor="reset-email" className="block text-xs uppercase tracking-wider font-medium text-[#fef9f8]/60 mb-2">
                College Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. yourname@college.edu"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl rizzolve-input"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="w-1/3 py-2.5 px-4 text-sm font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-[#ff0c0c] hover:bg-[#ff0101] rounded-xl glow-red-hover flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6 text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h4 className="text-base font-semibold text-white">Instructions Sent!</h4>
            <p className="text-sm text-[#fef9f8]/70 mt-2 leading-relaxed">
              We've dispatched a recovery link to <span className="text-white font-medium">{email}</span>. Please check your inbox and college junk folder.
            </p>
            <button
              onClick={handleReset}
              className="mt-6 w-full py-2.5 px-4 text-sm font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl transition-all"
            >
              Return to Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
