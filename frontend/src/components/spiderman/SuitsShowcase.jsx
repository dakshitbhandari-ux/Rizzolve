import { useState } from 'react'
import { Shield, Zap, Wind, Crosshair, Award, ArrowRight } from 'lucide-react'

export default function SuitsShowcase({ onShootWebTrigger }) {
  const suits = [
    {
      id: 'advanced-2',
      name: 'ADVANCED SUIT 2.0',
      hero: 'PETER PARKER',
      dimension: 'EARTH-616',
      accentColor: '#E23636',
      borderColor: 'border-[#E23636]',
      glowColor: 'shadow-[0_0_30px_rgba(226,54,54,0.4)]',
      description: 'The definitive modern Spider-Man attire featuring the iconic flexible white carbon-polymer spider emblem. Nanofiber reinforced joints withstand multi-ton impacts while maintaining peak acrobatic flexibility.',
      stats: {
        agility: 95,
        defense: 88,
        webTech: 96,
        venomPower: 65,
      },
      perk: 'Resilient Kinetic Web-Wings + Quad-Nano Arms',
    },
    {
      id: 'symbiote-black',
      name: 'SYMBIOTE ALIEN SUIT',
      hero: 'PETER PARKER // KLYNTAR',
      dimension: 'EARTH-616 EXTRACT',
      accentColor: '#ffffff',
      borderColor: 'border-white/40',
      glowColor: 'shadow-[0_0_30px_rgba(255,255,255,0.3)]',
      description: 'An extraterrestrial living biomass bonded to the host neural network. Generates boundless organic webbing, superhuman brute force, and razor-sharp liquid tendrils that decimate criminal syndicates.',
      stats: {
        agility: 90,
        defense: 98,
        webTech: 82,
        venomPower: 100,
      },
      perk: 'Symbiote Tendril Slam + Infinite Bio-Web Generation',
    },
    {
      id: 'miles-track',
      name: 'BROOKLYN TRACK SUIT',
      hero: 'MILES MORALES',
      dimension: 'EARTH-1610',
      accentColor: '#E23636',
      borderColor: 'border-[#E23636]',
      glowColor: 'shadow-[0_0_30px_rgba(226,54,54,0.5)]',
      description: 'Tailored with conductive micro-coils optimized for routing raw bio-electric venom blasts. Integrated with active electro-chromic threading for instantaneous tactical camouflage.',
      stats: {
        agility: 98,
        defense: 84,
        webTech: 90,
        venomPower: 100,
      },
      perk: 'Chain Venom Lighting Burst + Photonic Cloaking',
    },
    {
      id: 'spiderman-2099',
      name: 'SPIDER-MAN 2099',
      hero: 'MIGUEL O\'HARA',
      dimension: 'NUEVA YORK // 2099',
      accentColor: '#0066FF',
      borderColor: 'border-[#0066FF]',
      glowColor: 'shadow-[0_0_30px_rgba(0,102,255,0.4)]',
      description: 'Fabricated from military-grade unstable molecules with a holographic skull-spider sigil. Equipped with razor talons, accelerated sensory processing, and a low-yield antigravity web-cape.',
      stats: {
        agility: 94,
        defense: 92,
        webTech: 98,
        venomPower: 70,
      },
      perk: 'Accelerated Decoy Afterimages + Plasma Claws',
    },
    {
      id: 'spider-gwen',
      name: 'GHOST-SPIDER HOODED',
      hero: 'GWEN STACY',
      dimension: 'EARTH-65',
      accentColor: '#06b6d4',
      borderColor: 'border-cyan-400',
      glowColor: 'shadow-[0_0_30px_rgba(6,182,212,0.3)]',
      description: 'Signature white, black, and hot pink hooded bodysuit equipped with a quantum dimension-hopping watch. Combines rhythmic kinetic ballet combat with hyper-reactive acoustic awareness.',
      stats: {
        agility: 100,
        defense: 82,
        webTech: 91,
        venomPower: 75,
      },
      perk: 'Acrobatic Sonic Web Blast + Dimensional Rift Leap',
    },
  ]

  const [activeSuit, setActiveSuit] = useState(suits[0])

  return (
    <section id="suits" className="relative py-24 px-4 sm:px-6 lg:px-8 select-none">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 pb-8 border-b border-white/[0.08]">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-md bg-[#0066FF]/10 border border-[#0066FF]/30 text-xs font-['Oswald'] uppercase tracking-widest text-[#0066FF] mb-3">
              <span>SECTION III // MULTIVERSE WARDROBE</span>
            </div>
            <h2 className="font-['Bebas_Neue'] text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tight uppercase glitch-text">
              SUIT ARSENAL & ARMOR
            </h2>
          </div>
          <p className="max-w-md text-sm text-white/60 leading-relaxed font-sans">
            Switch between legendary suits across the spider-verse. Each suit is engineered with unique kinetic parameters, stealth mechanics, and offensive web perks.
          </p>
        </div>

        {/* Suit Selector Tabs */}
        <div className="flex flex-wrap gap-2.5 mb-10 pb-2 overflow-x-auto">
          {suits.map((suit) => {
            const isSelected = activeSuit.id === suit.id
            return (
              <button
                key={suit.id}
                onClick={() => setActiveSuit(suit)}
                className={`px-5 py-3 rounded-xl font-['Oswald'] text-sm tracking-wider uppercase font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#181a38] text-white border-[#E23636] shadow-[0_0_20px_rgba(226,54,54,0.4)]'
                    : 'bg-white/[0.03] text-white/60 hover:text-white border-white/10 hover:border-white/20'
                }`}
              >
                <span>{suit.name}</span>
                <span className="block text-[10px] text-white/40 font-mono mt-0.5">
                  {suit.dimension}
                </span>
              </button>
            )
          })}
        </div>

        {/* Selected Suit Showcase Card */}
        <div className="spidey-glass rounded-3xl p-8 sm:p-12 border border-white/10 relative overflow-hidden">
          {/* Subtle Backglow */}
          <div
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[120px] pointer-events-none opacity-40"
            style={{ backgroundColor: activeSuit.accentColor }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Suit Details */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 rounded-md text-xs font-mono font-bold tracking-widest uppercase bg-white/10 text-white border border-white/15">
                  {activeSuit.dimension}
                </span>
                <span className="text-xs font-mono text-[#E23636] font-bold">
                  PILOT: {activeSuit.hero}
                </span>
              </div>

              <h3 className="font-['Bebas_Neue'] text-4xl sm:text-5xl md:text-6xl text-white tracking-wide uppercase leading-none">
                {activeSuit.name}
              </h3>

              <p className="text-sm sm:text-base text-white/70 leading-relaxed font-sans">
                {activeSuit.description}
              </p>

              {/* Unique Perk Badge */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                <Award className="w-5 h-5 text-[#FFE600] shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-mono text-white/50 block">
                    EXCLUSIVE SUIT POWER
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-white">
                    {activeSuit.perk}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex items-center gap-4">
                <button
                  onClick={onShootWebTrigger}
                  className="px-6 py-3 rounded-xl font-['Oswald'] text-sm tracking-wider uppercase font-bold text-white bg-[#E23636] hover:bg-[#ff2a2a] glow-spidey-red flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Crosshair className="w-4 h-4" />
                  <span>EQUIP SUIT // TEST WEB</span>
                </button>
              </div>
            </div>

            {/* Right Column: Tactical Stat Gauges */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-[#090b1c]/90 border border-white/10 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="font-['Oswald'] text-sm tracking-wider uppercase text-white font-bold">
                  TACTICAL PERFORMANCE
                </span>
                <span className="text-[11px] font-mono text-emerald-400">
                  SYSTEM READY
                </span>
              </div>

              {/* Agility Gauge */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-white/60 flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-[#0066FF]" />
                    <span>Acrobatic Agility</span>
                  </span>
                  <span className="font-bold text-white">{activeSuit.stats.agility}%</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#0066FF] to-sky-400 rounded-full transition-all duration-700"
                    style={{ width: `${activeSuit.stats.agility}%` }}
                  />
                </div>
              </div>

              {/* Defense Gauge */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-white/60 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#E23636]" />
                    <span>Kinetic Impact Defense</span>
                  </span>
                  <span className="font-bold text-white">{activeSuit.stats.defense}%</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#E23636] to-rose-400 rounded-full transition-all duration-700"
                    style={{ width: `${activeSuit.stats.defense}%` }}
                  />
                </div>
              </div>

              {/* Web Tech Gauge */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-white/60 flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-white" />
                    <span>Web Fluid Velocity</span>
                  </span>
                  <span className="font-bold text-white">{activeSuit.stats.webTech}%</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-zinc-300 to-white rounded-full transition-all duration-700"
                    style={{ width: `${activeSuit.stats.webTech}%` }}
                  />
                </div>
              </div>

              {/* Venom Power Gauge */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-white/60 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#FFE600]" />
                    <span>Bio-Electric Output</span>
                  </span>
                  <span className="font-bold text-[#FFE600]">{activeSuit.stats.venomPower}%</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-[#FFE600] rounded-full transition-all duration-700"
                    style={{ width: `${activeSuit.stats.venomPower}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
