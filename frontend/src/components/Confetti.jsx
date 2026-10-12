/**
 * Confetti explosion — fires 60 colored pieces when mounted.
 * Mount this component when the winner is declared.
 */
import { useEffect, useRef } from 'react'

const COLORS = ['#6C63FF', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#A855F7', '#FBBF24']

export default function Confetti() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const pieces = 70

    for (let i = 0; i < pieces; i++) {
      const el = document.createElement('div')
      el.className = 'confetti-piece'
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      const size = Math.random() * 8 + 5
      const left = Math.random() * 100
      const duration = Math.random() * 2.5 + 2
      const delay = Math.random() * 0.8
      const rotate = Math.random() * 360

      Object.assign(el.style, {
        background: color,
        width: `${size}px`,
        height: `${size * (Math.random() > 0.5 ? 1 : 2.5)}px`,
        left: `${left}%`,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      })

      container.appendChild(el)
      setTimeout(() => el.remove(), (duration + delay) * 1000 + 200)
    }
  }, [])

  return (
    <div ref={containerRef} style={{
      position: 'fixed', inset: 0,
      pointerEvents: 'none', zIndex: 9999,
      overflow: 'hidden',
    }} />
  )
}
