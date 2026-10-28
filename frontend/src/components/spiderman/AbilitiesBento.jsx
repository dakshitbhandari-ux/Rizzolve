import {
  Crosshair,
  Zap,
  Activity,
  Layers,
  Compass,
  Radio,
  Eye,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react'

export default function AbilitiesBento({ onShootWebTrigger }) {
  const bentoCards = [
    {
      id: 'web-shooting',
      title: 'SYNTHETIC WEB-SHOOTING BALLISTICS',
      category: 'PRIMARY ARSENAL',
      desc: 'Engineered twin wrist-mounted mechanical spinnerets pressurized at 3,200 PSI. The specialized polymer fluid reacts with ambient oxygen to solidify instantly into high-tensile web-lines stronger than structural steel cables.',
      tag: '120 KPSI TENSILE STRENGTH',
      badgeColor: 'text-[#E23636] bg-[#E23636]/15 border-[#E23636]/30',
      icon: Crosshair,
      span: 'md:col-span-2 lg:col-span-2',
      metric: '3,200 PSI',
      metricLabel: 'PRESSURE CYLINDER',
      specialAction: true,
    },
    {
      id: 'spider-sense',
      title: 'PRECOGNITIVE SPIDER-SENSE',
      category: 'NEURO-SENSORY',
      desc: 'An omnidirectional 360° bio-electric radar tingling at the base of the skull, alerting Peter to impending hazards moments before they manifest in physical reality.',
      tag: '0.012s LATENCY',
      badgeColor: 'text-[#FFE600] bg-[#FFE600]/15 border-[#FFE600]/30',
      icon: Zap,
      span: 'md:col-span-1 lg:col-span-1',
      metric: '360° RADAR',
      metricLabel: 'OMNIDIRECTIONAL',
    },
    {
      id: 'wall-crawling',
      title: 'VAN DER WAALS WALL-CRAWLING',
      category: 'BIO-MECHANICAL',
      desc: 'Sub-atomic electrostatic attraction allowing frictionless adhesion to concrete, reinforced glass, and steel across 100-story Manhattan high-rises.',
      tag: '10 TONS ADHESION',
      badgeColor: 'text-[#0066FF] bg-[#0066FF]/15 border-[#0066FF]/30',
      icon: Activity,
      span: 'md:col-span-1 lg:col-span-1',
      metric: '10 TONS',
      metricLabel: 'SHEAR RETENTION',
    },
    {
      id: 'venom-blast',
      title: 'BIO-VOLTAIC VENOM STRIKE',
      category: 'MILES MORALES SUITE',
      desc: 'Concentrated bio-electric neural bursts that discharge through conductive gloves, stunning cyber-drones and paralyzing symbiote tendrils.',
      tag: '100,000 VOLTS',
      badgeColor: 'text-[#FFE600] bg-[#FFE600]/15 border-[#FFE600]/30',
      icon: Radio,
      span: 'md:col-span-1 lg:col-span-1',
      metric: '100 kV',
      metricLabel: 'PULSE DISCHARGE',
    },
    {
      id: 'multiverse-rift',
      title: 'MULTIVERSE SPIDER-SYNC',
      category: 'QUANTUM TEMPORAL',
      desc: 'Resonance beacon coordinating real-time comms and dimension shifts between Peter Parker, Miles Morales, and Spider-Gwen across the Web of Life and Destiny.',
      tag: 'DIMENSION 616 // 1610',
      badgeColor: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
      icon: Compass,
      span: 'md:col-span-1 lg:col-span-1',
      metric: '4 REALMS',
      metricLabel: 'WEB RECEPTORS',
    },
  ]

  return (
    <section id="abilities" className="relative py-24 px-4 sm:px-6 lg:px-8 select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#0033CC]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-[#E23636]/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        {/* Section Header with Comic Panel styling */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 pb-8 border-b border-white/[0.08]">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-md bg-[#E23636]/10 border border-[#E23636]/30 text-xs font-['Oswald'] uppercase tracking-widest text-[#E23636] mb-3">
              <span>SECTION II // CLASSIFIED TECH & BIOLOGY</span>
            </div>
            <h2 className="font-['Bebas_Neue'] text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tight uppercase glitch-text">
              SUPERHUMAN ARSENAL
            </h2>
          </div>
          <p className="max-w-md text-sm text-white/60 leading-relaxed font-sans">
            Engineered through genetic arachnid mutation and cutting-edge Parker Industries particle physics. Built to protect 8 million New Yorkers.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bentoCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.id}
                className={`spidey-glass rounded-2xl p-6 sm:p-8 flex flex-col justify-between group relative overflow-hidden ${card.span}`}
              >
                {/* Top Subtle Red Corner Accent */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#E23636]/10 to-transparent pointer-events-none" />

                <div>
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-white/50">
                      {card.category}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-mono font-bold px-2.5 py-0.5 rounded-full border ${card.badgeColor}`}
                    >
                      {card.tag}
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 group-hover:border-[#E23636]/50 group-hover:bg-[#E23636]/10 transition-colors">
                      <Icon className="w-6 h-6 text-[#E23636]" />
                    </div>
                    <h3 className="font-['Oswald'] text-xl sm:text-2xl font-bold tracking-wide text-white group-hover:text-[#fef9f8]">
                      {card.title}
                    </h3>
                  </div>

                  <p className="text-sm text-[#fef9f8]/70 leading-relaxed font-sans">
                    {card.desc}
                  </p>
                </div>

                {/* Bottom Card Footer */}
                <div className="mt-8 pt-5 border-t border-white/[0.06] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-white/40 block">
                      {card.metricLabel}
                    </span>
                    <span className="font-['Bebas_Neue'] text-2xl text-white tracking-wider group-hover:text-[#E23636] transition-colors">
                      {card.metric}
                    </span>
                  </div>

                  {card.specialAction ? (
                    <button
                      onClick={onShootWebTrigger}
                      className="px-4 py-2 rounded-xl text-xs font-['Oswald'] uppercase tracking-wider font-bold text-white bg-[#E23636] hover:bg-[#ff2a2a] glow-spidey-red flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>FIRE SPINNERET</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/40 group-hover:text-[#E23636] group-hover:border-[#E23636]/40 transition-colors">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
