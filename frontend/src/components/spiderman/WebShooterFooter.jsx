import { useState } from 'react'
import { Crosshair, Zap, ArrowUp } from 'lucide-react'


export default function WebShooterFooter({ onShootWebTrigger }) {
  const [isWebShooting, setIsWebShooting] = useState(false)
  const [webShotCount, setWebShotCount] = useState(0)

  const handleShootWeb = () => {
    setIsWebShooting(true)
    setWebShotCount((prev) => prev + 1)
    if (onShootWebTrigger) onShootWebTrigger()

    setTimeout(() => {
      setIsWebShooting(false)
    }, 1200)
  }

  return (
    <footer id="multiverse" className="relative pt-24 pb-12 px-4 sm:px-6 lg:px-8 border-t border-white/[0.08] overflow-hidden select-none">
      {/* Background radial glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#E23636]/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Floating Web Splat Effect when firing */}
      {isWebShooting && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center animate-in zoom-in-50 duration-200">
          <svg viewBox="0 0 400 400" className="w-96 h-96 text-white/90 drop-shadow-[0_0_30px_#ffffff]">
            {/* Radial Web Strands */}
            <circle cx="200" cy="200" r="160" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6" />
            <circle cx="200" cy="200" r="110" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.8" />
            <circle cx="200" cy="200" r="60" stroke="currentColor" strokeWidth="3" fill="none" />
            <circle cx="200" cy="200" r="20" stroke="currentColor" strokeWidth="3" fill="none" />
            {/* Cross Lines */}
            <line x1="40" y1="200" x2="360" y2="200" stroke="currentColor" strokeWidth="2.5" />
            <line x1="200" y1="40" x2="200" y2="360" stroke="currentColor" strokeWidth="2.5" />
            <line x1="86" y1="86" x2="314" y2="314" stroke="currentColor" strokeWidth="2.5" />
            <line x1="86" y1="314" x2="314" y2="86" stroke="currentColor" strokeWidth="2.5" />
          </svg>
          <div className="absolute bg-[#FFE600] text-[#050510] font-['Anton'] text-4xl px-6 py-2 rounded-lg border-4 border-black shadow-[0_0_35px_#FFE600] rotate-[-8deg] uppercase animate-bounce">
            THWIP! WEB HIT!
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto text-center relative z-20">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#E23636] block mb-3">
          READY TO SWING THROUGH MANHATTAN?
        </span>

        <h2 className="font-['Bebas_Neue'] text-5xl sm:text-7xl md:text-8xl font-black text-white uppercase tracking-tight leading-none mb-6 glitch-text">
          BE GREATER. TOGETHER.
        </h2>

        <p className="max-w-xl mx-auto text-sm sm:text-base text-white/70 leading-relaxed font-sans mb-10">
          "With great power, there must also come great responsibility." Join Peter Parker and Miles Morales defending Earth-616 across the infinite multiverse.
        </p>

        {/* Dynamic Web Shooting Interactive Button */}
        <div className="inline-block relative group">
          {/* Animated SVG Web Tendril shoot on hover */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-12 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <svg viewBox="0 0 200 50" className="w-full h-full text-[#E23636] fill-none">
              <path
                d="M 100 50 Q 70 20 40 5 Q 100 0 160 5 Q 130 20 100 50"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="animate-pulse"
              />
            </svg>
          </div>

          <button
            onClick={handleShootWeb}
            onMouseEnter={handleShootWeb}
            className="relative px-10 py-5 rounded-2xl font-['Oswald'] text-lg uppercase tracking-widest font-black text-white bg-gradient-to-r from-[#E23636] via-[#b31e1e] to-[#0033CC] hover:from-[#ff2a2a] hover:to-[#0066FF] glow-spidey-red flex items-center gap-3 transition-all cursor-pointer shadow-[0_0_40px_rgba(226,54,54,0.7)] transform hover:scale-105 active:scale-95"
          >
            <Crosshair className="w-5 h-5 animate-spin" />
            <span>TRIGGER WEB-SHOOTER // THWIP!</span>
          </button>
        </div>

        {webShotCount > 0 && (
          <p className="mt-3 text-xs font-mono text-[#FFE600] animate-in fade-in">
            ⚡ Webs Fired Across City: {webShotCount} webs anchored!
          </p>
        )}

        {/* Divider */}
        <div className="mt-16 pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40 font-mono">
          <div className="flex items-center gap-2">
            <span className="font-['Bebas_Neue'] text-lg text-white tracking-wider">
              SPIDER-MAN 3D
            </span>
            <span>•</span>
            <span>CINEMATIC WEB EXPERIENCE</span>
          </div>

          <p>
            Fan Tribute Project inspired by Marvel & Insomniac Games.
          </p>

          <a
            href="#hero"
            className="flex items-center gap-1.5 text-white/60 hover:text-[#E23636] transition-colors"
          >
            <span>BACK TO TOP</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </footer>
  )
}
