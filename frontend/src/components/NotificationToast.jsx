import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export default function NotificationToast({ toast, onClose }) {
  if (!toast) return null

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-[#ff0c0c] shrink-0" />,
    info: <Info className="w-5 h-5 text-red-400 shrink-0" />,
  }

  const borderStyles = {
    success: 'border-emerald-500/30 bg-[#0d1612]/95',
    error: 'border-[#ff0c0c]/40 bg-[#160b0b]/95',
    info: 'border-white/10 bg-[#121212]/95',
  }

  return (
    <div className="fixed top-6 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl ${
          borderStyles[toast.type || 'info']
        }`}
      >
        {icons[toast.type || 'info']}
        <div className="flex-1 text-sm">
          {toast.title && <p className="font-semibold text-white">{toast.title}</p>}
          <p className="text-[#fef9f8]/80 mt-0.5 leading-relaxed">{toast.message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white transition-colors p-1"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
