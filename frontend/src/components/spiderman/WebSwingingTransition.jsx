import { useEffect, useState } from 'react'

export default function WebSwingingTransition() {
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight
      if (totalHeight > 0) {
        const progress = Math.min(Math.max(window.scrollY / totalHeight, 0), 1)
        setScrollProgress(progress)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Calculate stroke dashoffset from progress (total length ~2500)
  const totalLength = 2800
  const dashOffset = totalLength * (1 - scrollProgress)

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      <svg
        className="w-full h-full"
        viewBox="0 0 1440 2400"
        fill="none"
        preserveAspectRatio="none"
      >
        {/* Subtle Web Anchor Strands */}
        <path
          d="M 120 0 Q 300 400 150 900 T 400 1600 T 200 2400"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1.5"
          strokeDasharray="4 8"
        />
        <path
          d="M 1320 0 Q 1100 500 1250 1100 T 1000 1800 T 1300 2400"
          stroke="rgba(0, 102, 255, 0.12)"
          strokeWidth="1.5"
          strokeDasharray="6 6"
        />

        {/* Dynamic Main Swing Line Drawing Itself On Scroll */}
        <path
          d="M 720 0 C 900 350 300 700 850 1100 C 1300 1450 400 1800 720 2400"
          stroke="url(#web-gradient)"
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            strokeDasharray: totalLength,
            strokeDashoffset: dashOffset,
            transition: 'stroke-dashoffset 0.1s linear',
          }}
        />

        {/* Dynamic Nodes along the line */}
        <circle
          cx="720"
          cy={scrollProgress * 2400}
          r="6"
          fill="#E23636"
          className="animate-pulse"
          filter="drop-shadow(0 0 8px #E23636)"
        />

        {/* Gradients */}
        <defs>
          <linearGradient id="web-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E23636" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="70%" stopColor="#0066FF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#E23636" stopOpacity="0.95" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}
