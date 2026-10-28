import { useState, useRef, useEffect, useCallback } from 'react'
import { Volume2, VolumeX, ArrowRight, Sparkles } from 'lucide-react'

export default function CinematicEntryVideo({ onComplete }) {
  const mainVideoRef = useRef(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const handleFinish = useCallback(() => {
    if (isFadingOut) return
    setIsFadingOut(true)
    setTimeout(() => {
      onComplete()
    }, 600)
  }, [isFadingOut, onComplete])

  useEffect(() => {
    const mainVideo = mainVideoRef.current
    if (!mainVideo) return

    // Attempt autoplay with sound; fallback gracefully to muted if policy requires
    const startPlay = async () => {
      try {
        await mainVideo.play()
        setIsPlaying(true)
      } catch {
        mainVideo.muted = true
        setIsMuted(true)
        try {
          await mainVideo.play()
          setIsPlaying(true)
        } catch {
          // Fallback if autoplay is blocked
        }
      }
    }

    startPlay()

    // Auto-transition immediately to dashboard once 11.4s mask sequence finishes
    const maxTimer = setTimeout(() => {
      handleFinish()
    }, 11450)

    // Keyboard navigation: Escape or Space to skip, M to toggle audio
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.code === 'Space') {
        e.preventDefault()
        handleFinish()
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        if (mainVideoRef.current) {
          mainVideoRef.current.muted = !mainVideoRef.current.muted
          setIsMuted(mainVideoRef.current.muted)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(maxTimer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleFinish])

  const toggleMute = (e) => {
    e.stopPropagation()
    if (mainVideoRef.current) {
      const nextMuted = !isMuted
      mainVideoRef.current.muted = nextMuted
      setIsMuted(nextMuted)
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#0c0e17] flex items-center justify-center overflow-hidden select-none transition-all duration-700 ease-out ${
        isFadingOut ? 'opacity-0 scale-[1.02] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* 1. Lighter, Luminous Nocturnal Atmospheric Mesh (Senior Designer Curated Palette) */}
      <div className="absolute inset-0 bg-[#0c0e17] pointer-events-none overflow-hidden">
        {/* Soft Moonlit Ice Blue Radiance (Expands from center-top) */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-b from-sky-400/15 via-blue-500/8 to-transparent rounded-full blur-[120px]" />

        {/* Delicate Rose-Ruby Accent (Warm counter-balance on right, avoids harsh clash) */}
        <div className="absolute top-1/4 right-0 w-[550px] h-[550px] bg-rose-500/10 rounded-full blur-[140px]" />

        {/* Soft Indigo-Sapphire Velvet (Left shadow balance) */}
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/12 rounded-full blur-[150px]" />

        {/* Subtle Architectural Grid Lines at 15% opacity for crisp technical polish */}
        <div className="absolute inset-0 bg-city-grid opacity-15" />
      </div>

      {/* 2. Full-Frame Horizontal 16:9 Cinema Stage (Plays till 11.4s mask change) */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {/* Main High-Definition Trimmed Video Element */}
        <video
          ref={mainVideoRef}
          src="/entry_video_11s.mp4"
          playsInline
          autoPlay
          muted={isMuted}
          onEnded={handleFinish}
          /* Balanced cinematic grading: lifted shadow blacks for airy clarity, natural saturation */
          className="w-full h-full object-cover object-center filter contrast-[1.05] saturate-[1.06] brightness-[1.03]"
        />

        {/* Soft 35mm Fine Film Texture (Eliminates digital banding while keeping image crisp) */}
        <div className="absolute inset-0 pointer-events-none bg-noise-grain opacity-10 mix-blend-overlay" />

        {/* Luminous Edge Feathering (Softer and lighter than previous heavy black bars) */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(12,14,23,0.55)]" />
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[#0c0e17]/75 via-[#0c0e17]/25 to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#0c0e17]/80 via-[#0c0e17]/25 to-transparent pointer-events-none z-10" />
      </div>

      {/* 3. Top Clean, Neat, Frosted Studio HUD Header */}
      <div className="absolute top-0 left-0 right-0 z-30 p-5 sm:p-7 flex items-center justify-between pointer-events-auto">
        {/* Modern Studio Identity Pill */}
        <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-2xl border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-rose-500 to-rose-400 flex items-center justify-center text-white font-bold text-xs tracking-wider shadow-[0_0_12px_rgba(244,63,94,0.45)]">
            R
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white">
              Rizzolve
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span className="hidden sm:inline text-[10px] text-slate-300 font-mono tracking-wider">
              CAMPUS NETWORK
            </span>
          </div>
        </div>

        {/* Pretty Frosted Glass Skip Button */}
        <button
          onClick={handleFinish}
          className="group flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/[0.12] hover:bg-rose-500/90 text-white border border-white/20 hover:border-rose-400/80 backdrop-blur-2xl text-xs font-medium tracking-wider shadow-[0_4px_24px_rgba(0,0,0,0.2)] hover:shadow-[0_0_25px_rgba(244,63,94,0.35)] transition-all duration-300 cursor-pointer"
        >
          <span>ENTER DASHBOARD</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          <span className="hidden sm:inline text-[9px] font-mono px-2 py-0.5 rounded-full bg-black/30 text-slate-200 border border-white/10 ml-1">
            ESC
          </span>
        </button>
      </div>

      {/* 4. Bottom Clean Studio Telemetry & Audio Controller */}
      <div className="absolute bottom-5 left-0 right-0 z-30 px-5 sm:px-7 flex items-end justify-between pointer-events-auto">
        {/* Left: Minimal Studio Tag */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/40 backdrop-blur-2xl border border-white/10 text-[11px] font-mono text-slate-300/90 shadow-md">
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          <span>SPIDER-MAN // MASK TRANSFORMATION</span>
          <span className="text-white/25">•</span>
          <span className="text-slate-400">11.4S</span>
        </div>

        {/* Right: Modern Frosted Audio Control */}
        <button
          onClick={toggleMute}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/45 hover:bg-slate-900/75 text-white border border-white/15 hover:border-white/30 backdrop-blur-2xl text-xs font-mono transition-all duration-200 cursor-pointer shadow-lg group"
          title={isMuted ? 'Unmute Audio (Press M)' : 'Mute Audio (Press M)'}
        >
          {isMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
              <span className="text-slate-200 font-medium text-[11px]">UNMUTE</span>
              <span className="hidden md:inline text-[9px] text-slate-400 font-mono">[M]</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="text-sky-300 font-medium text-[11px]">CINEMA AUDIO</span>
              <span className="hidden md:inline text-[9px] text-sky-400/60 font-mono">[M]</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}


