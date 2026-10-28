import { useState, useEffect } from 'react'
import { Shield, Sparkles, Volume2, VolumeX, Menu, X, Crosshair } from 'lucide-react'

export default function Navbar({ onShootWebTrigger }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [fluidLevel, setFluidLevel] = useState(98)
  const [soundEnabled, setSoundEnabled] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { label: 'ORIGIN', href: '#hero' },
    { label: 'ABILITIES', href: '#abilities' },
    { label: 'SUITS', href: '#suits' },
    { label: 'MULTIVERSE', href: '#multiverse' },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#050510]/90 backdrop-blur-md border-b border-white/[0.08] py-3 shadow-[0_10px_30px_rgba(5,5,16,0.8)]'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Spider Emblem Brand */}
        <a href="#hero" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#E23636] to-[#991111] p-0.5 shadow-[0_0_20px_rgba(226,54,54,0.5)] group-hover:shadow-[0_0_30px_rgba(226,54,54,0.8)] transition-all">
            <div className="w-full h-full bg-[#050510] rounded-[10px] flex items-center justify-center relative overflow-hidden">
              <svg viewBox="0 0 100 100" className="w-7 h-7 text-[#E23636] fill-current">
                <path d="M50 15 L50 85 M15 50 L85 50 M25 25 L75 75 M25 75 L75 25" stroke="currentColor" strokeWidth="6" />
                <polygon points="50,22 36,36 44,52 50,68 56,52 64,36" fill="#ffffff" />
              </svg>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-['Bebas_Neue'] text-2xl tracking-wider text-white group-hover:text-[#E23636] transition-colors leading-none">
                SPIDER-MAN
              </span>
              <span className="px-1.5 py-0.2 text-[9px] font-bold font-mono tracking-widest uppercase rounded bg-[#E23636]/20 text-[#E23636] border border-[#E23636]/40">
                EARTH-616
              </span>
            </div>
            <p className="text-[10px] text-white/50 tracking-widest font-mono">
              BE GREATER. TOGETHER.
            </p>
          </div>
        </a>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-['Oswald'] text-sm tracking-wider font-semibold text-white/70 hover:text-[#E23636] transition-colors relative py-1 group"
            >
              <span>{link.label}</span>
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#E23636] group-hover:w-full transition-all duration-300" />
            </a>
          ))}
        </nav>

        {/* Web-Fluid Status & Quick Action */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/60">WEB FLUID:</span>
            <span className="font-bold text-[#E23636]">{fluidLevel}%</span>
          </div>

          <button
            onClick={() => {
              if (onShootWebTrigger) onShootWebTrigger()
              setFluidLevel((prev) => (prev > 10 ? prev - 4 : 100))
            }}
            className="px-4 py-1.5 rounded-xl text-xs font-['Oswald'] uppercase tracking-wider font-bold text-white bg-[#E23636] hover:bg-[#ff2a2a] glow-spidey-red transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>THWIP!</span>
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-white/70 hover:text-white p-2 rounded-xl bg-white/5"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#050510]/95 backdrop-blur-xl border-b border-white/10 px-6 py-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block font-['Oswald'] text-lg tracking-wider text-white/80 hover:text-[#E23636] py-1 border-b border-white/5"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2 flex items-center justify-between">
            <span className="font-mono text-xs text-white/60">WEB FLUID: {fluidLevel}%</span>
            <button
              onClick={() => {
                if (onShootWebTrigger) onShootWebTrigger()
                setMobileMenuOpen(false)
              }}
              className="px-4 py-2 rounded-xl text-xs font-['Oswald'] uppercase font-bold text-white bg-[#E23636]"
            >
              SHOOT WEB
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
