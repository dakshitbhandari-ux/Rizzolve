import { useState } from 'react'
import {
  Zap,
  ArrowRight,
  Shield,
  Activity,
  Crosshair,
  Volume2,
  ChevronDown,
} from 'lucide-react'

export default function HeroSection({ onShootWebTrigger, onExploreSuits }) {
  const [spiderSenseActive, setSpiderSenseActive] = useState(false)

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center pt-24 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden select-none"
    >
      {/* Spider-Sense Radar Pulse Warning (Triggers on hover or click) */}
      {spiderSenseActive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          <div className="w-[500px] h-[500px] rounded-full border-4 border-[#FFE600] animate-ping opacity-40" />
          <div className="absolute w-[700px] h-[700px] rounded-full border-2 border-[#E23636] animate-ping opacity-30 delay-150" />
          <div className="absolute top-28 bg-[#FFE600] text-[#050510] font-['Anton'] tracking-wider px-4 py-1 text-sm rounded shadow-[0_0_25px_#FFE600] uppercase animate-bounce">
            ⚡ SPIDER-SENSE TINGLING! THREAT DETECTED ⚡
          </div>
        </div>
      )}

      {/* Main Hero Content layered on top of 3D Canvas */}
      <div className="relative z-20 max-w-5xl mx-auto text-center flex flex-col items-center">
        {/* Comic Edition Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.04] border border-[#E23636]/40 text-xs font-['Oswald'] uppercase tracking-widest text-white/90 mb-6 backdrop-blur-md shadow-[0_0_20px_rgba(226,54,54,0.3)]">
          <span className="w-2 h-2 rounded-full bg-[#E23636] animate-ping" />
          <span>MARVEL COMICS // EARTH-616 • NYC CORRIDOR</span>
          <span className="text-[#FFE600] font-bold">★ 100% CANON</span>
        </div>

        {/* Giant Cinematic Headline with Multiverse Glitch */}
        <div className="relative">
          <h1 className="font-['Bebas_Neue'] text-7xl sm:text-8xl md:text-9xl lg:text-[11rem] leading-[0.88] font-black tracking-tight text-white uppercase glitch-text drop-shadow-[0_15px_35px_rgba(0,0,0,0.9)]">
            SWING INTO
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#E23636] via-[#ffffff] to-[#0066FF]">
              ACTION
            </span>
          </h1>

          {/* Comic Sound Effect Floating Sticker */}
          <div className="absolute -top-6 -right-6 sm:-right-12 rotate-12 bg-[#E23636] text-white font-['Anton'] text-xl sm:text-2xl px-4 py-1.5 rounded-md border-2 border-white shadow-[0_0_25px_rgba(226,54,54,0.8)] animate-pulse">
            THWIP!
          </div>
        </div>

        {/* Cinematic Subtitle */}
        <p className="mt-6 sm:mt-8 max-w-2xl text-base sm:text-lg md:text-xl text-[#fef9f8]/80 leading-relaxed font-sans font-light">
          Traverse the concrete canyons of New York City in hyper-tactile 3D. Master high-velocity web swinging, precognitive spider-sense instincts, and multi-dimensional combat.
        </p>

        {/* Interactive Action Button Bar */}
        <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-4">
          {/* Primary Web Shoot Button */}
          <button
            onClick={onShootWebTrigger}
            className="px-8 py-4 rounded-2xl font-['Oswald'] text-base tracking-widest uppercase font-bold text-white bg-gradient-to-r from-[#E23636] to-[#b31e1e] hover:from-[#ff2a2a] hover:to-[#E23636] glow-spidey-red flex items-center gap-3 transition-all cursor-pointer shadow-[0_0_35px_rgba(226,54,54,0.6)] transform hover:-translate-y-1 active:translate-y-0"
          >
            <Crosshair className="w-5 h-5" />
            <span>SHOOT WEB // TRAVERSE</span>
          </button>

          {/* Spider-Sense Test Trigger */}
          <button
            onClick={() => {
              setSpiderSenseActive(true)
              setTimeout(() => setSpiderSenseActive(false), 2400)
            }}
            className="px-6 py-4 rounded-2xl font-['Oswald'] text-base tracking-wider uppercase font-semibold text-white bg-white/5 hover:bg-[#0033CC]/30 border border-white/10 hover:border-[#0066FF] glow-spidey-blue flex items-center gap-2.5 transition-all cursor-pointer backdrop-blur-md transform hover:-translate-y-1"
          >
            <Zap className="w-5 h-5 text-[#FFE600]" />
            <span>TEST SPIDER-SENSE</span>
          </button>
        </div>

        {/* Tactical HUD Metrics Bar */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl pt-8 border-t border-white/[0.08]">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
            <span className="text-[10px] uppercase font-mono tracking-wider text-white/50 block">
              TRAVERSAL VELOCITY
            </span>
            <span className="font-['Bebas_Neue'] text-2xl text-white tracking-wider">
              142 MPH
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
            <span className="text-[10px] uppercase font-mono tracking-wider text-white/50 block">
              TENSILE STRENGTH
            </span>
            <span className="font-['Bebas_Neue'] text-2xl text-[#E23636] tracking-wider">
              120 KPSI
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
            <span className="text-[10px] uppercase font-mono tracking-wider text-white/50 block">
              REACTION TIME
            </span>
            <span className="font-['Bebas_Neue'] text-2xl text-[#FFE600] tracking-wider">
              0.012 SEC
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
            <span className="text-[10px] uppercase font-mono tracking-wider text-white/50 block">
              DIMENSIONAL SYNC
            </span>
            <span className="font-['Bebas_Neue'] text-2xl text-[#0066FF] tracking-wider">
              EARTH-616
            </span>
          </div>
        </div>

        {/* Scroll Indicator */}
        <a
          href="#abilities"
          className="mt-10 flex flex-col items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors"
        >
          <span className="font-mono tracking-widest text-[10px] uppercase">
            SCROLL TO EXPLORE POWERS
          </span>
          <ChevronDown className="w-4 h-4 animate-bounce text-[#E23636]" />
        </a>
      </div>
    </section>
  )
}
