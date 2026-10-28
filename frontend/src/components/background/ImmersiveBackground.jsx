import { useEffect, useState, useRef } from 'react'
import { Volume2, VolumeX, Sparkles } from 'lucide-react'

export default function ImmersiveBackground() {
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 })
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef(null)

  useEffect(() => {
    let animationFrameId
    const handleMouseMove = (e) => {
      // Subtle cinematic drift following mouse
      const targetX = (e.clientX / window.innerWidth - 0.5) * 18
      const targetY = (e.clientY / window.innerHeight - 0.5) * 18

      cancelAnimationFrame(animationFrameId)
      animationFrameId = requestAnimationFrame(() => {
        setMouseOffset({ x: targetX, y: targetY })
      })
    }

    if (videoRef.current) {
      videoRef.current.playbackRate = 1.0
      videoRef.current.play().catch(() => {})
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  const toggleAudio = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted
      videoRef.current.muted = nextMuted
      setIsMuted(nextMuted)
    }
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none overflow-hidden select-none"
        style={{ zIndex: 0 }}
      >
        {/* 1. Nocturnal Slate Base Canvas */}
        <div className="absolute inset-0 bg-[#07090e]" />

        {/* 2. Standing Black Spider-Man Background Video (Glowing Cyan Chest Emblem & Particles) */}
        <div
          className="absolute inset-0 transition-transform duration-1000 ease-out will-change-transform opacity-75"
          style={{
            transform: `scale(1.03) translate(${mouseOffset.x}px, ${mouseOffset.y}px)`,
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            preload="auto"
            className="w-full h-full object-cover object-center filter contrast-[1.08] saturate-[1.1] brightness-[1.05]"
          >
            <source src="/dashboard_bg_final.mp4" type="video/mp4" />
            <source src="/dashboard_bg_horizontal.mp4" type="video/mp4" />
            <source src="/dashboard_bg.mp4" type="video/mp4" />
          </video>
        </div>

        {/* 3. Ambient Synchronized Stage Glows (Electric Cyan mirroring chest emblem) */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[60vw] h-[60vw] rounded-full pointer-events-none opacity-20"
          style={{
            background:
              'radial-gradient(circle, rgba(56, 189, 248, 0.3) 0%, rgba(14, 165, 233, 0.12) 40%, transparent 70%)',
            filter: 'blur(110px)',
            mixBlendMode: 'screen',
          }}
        />

        {/* Top Vignette Fade (smoothly merges with header) */}
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[#07090e] via-[#07090e]/60 to-transparent pointer-events-none" />

        {/* Bottom Vignette Fade (smoothly dissolves into lower sections) */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#07090e] via-[#07090e]/70 to-transparent pointer-events-none" />

        {/* Subtle Side Vignette */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090e]/50 via-transparent to-[#07090e]/50 pointer-events-none" />

        {/* 4. Fine Grain Texture */}
        <div className="absolute inset-0 pointer-events-none bg-noise-grain opacity-5 mix-blend-overlay" />
      </div>

      {/* Floating Audio Toggle Pill for Dashboard Background Video */}
      <div className="fixed bottom-6 right-6 z-40 pointer-events-auto">
        <button
          onClick={toggleAudio}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/60 hover:bg-slate-900/90 text-white border border-white/10 hover:border-cyan-400/50 backdrop-blur-2xl text-xs font-mono font-medium tracking-wider transition-all duration-300 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.5)] group"
          title={isMuted ? 'Unmute Background Audio' : 'Mute Background Audio'}
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              <span className="hidden sm:inline text-slate-300 text-[11px]">BG AUDIO</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline text-cyan-300 text-[11px]">AUDIO LIVE</span>
            </>
          )}
        </button>
      </div>
    </>
  )
}

