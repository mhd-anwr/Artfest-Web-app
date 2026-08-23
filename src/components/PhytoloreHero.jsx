import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function PhytoloreHero({ onScrollToAbout }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const navigate = useNavigate()

  // 9-step entrance animation sequence (1 to 9)
  const [entranceStep, setEntranceStep] = useState(1)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, targetX: 0, targetY: 0, canvasX: 0, canvasY: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
    []
  )

  // 9-Step Entrance Timers
  useEffect(() => {
    if (prefersReducedMotion) {
      setEntranceStep(9)
      return
    }

    const t1 = setTimeout(() => setEntranceStep(2), 150)   // Deep blue/green glow
    const t2 = setTimeout(() => setEntranceStep(3), 500)   // Spore particles
    const t3 = setTimeout(() => setEntranceStep(4), 950)   // RENDEZVOUS'26 Logo Badge
    const t4 = setTimeout(() => setEntranceStep(5), 1400)  // DECODING title
    const t5 = setTimeout(() => setEntranceStep(6), 1850)  // PHYTOLORE title
    const t6 = setTimeout(() => setEntranceStep(7), 2300)  // Subtitle (OBSERVE · FOCUS · DECODE · REVEAL)
    const t7 = setTimeout(() => setEntranceStep(8), 2750)  // Action Buttons
    const t8 = setTimeout(() => setEntranceStep(9), 3300)  // LOOK CLOSER scroll indicator & interactive focus lens

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      clearTimeout(t5); clearTimeout(t6); clearTimeout(t7); clearTimeout(t8);
    }
  }, [prefersReducedMotion])

  // Mouse & Touch Tracking for Interactive Optical Lens & Motion
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const normX = (x / rect.width - 0.5) * 2
      const normY = (y / rect.height - 0.5) * 2

      setMousePos({
        targetX: normX,
        targetY: normY,
        canvasX: x,
        canvasY: y
      })
      setIsHovered(true)
    }

    const handleTouchMove = (e) => {
      if (!containerRef.current || !e.touches[0]) return
      const rect = containerRef.current.getBoundingClientRect()
      const touch = e.touches[0]
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      const normX = (x / rect.width - 0.5) * 2
      const normY = (y / rect.height - 0.5) * 2

      setMousePos({
        targetX: normX,
        targetY: normY,
        canvasX: x,
        canvasY: y
      })
      setIsHovered(true)
    }

    const handleMouseLeave = () => {
      setMousePos(prev => ({ ...prev, targetX: 0, targetY: 0 }))
      setIsHovered(false)
    }

    const el = containerRef.current
    if (el) {
      el.addEventListener('mousemove', handleMouseMove, { passive: true })
      el.addEventListener('mouseleave', handleMouseLeave, { passive: true })
      el.addEventListener('touchmove', handleTouchMove, { passive: true })
      el.addEventListener('touchend', handleMouseLeave, { passive: true })
    }

    return () => {
      if (el) {
        el.removeEventListener('mousemove', handleMouseMove)
        el.removeEventListener('mouseleave', handleMouseLeave)
        el.removeEventListener('touchmove', handleTouchMove)
        el.removeEventListener('touchend', handleMouseLeave)
      }
    }
  }, [])

  // Canvas 2D Render Engine (Clean Dark Botanical Atmosphere, Pollen Spores & Interactive Decode Lens)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId = 0
    let width = 0
    let height = 0
    let time = 0

    let lerpX = 0
    let lerpY = 0

    let lensX = 0
    let lensY = 0

    const handleResize = () => {
      if (!containerRef.current || !canvas) return
      const rect = containerRef.current.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
    }
    handleResize()
    window.addEventListener('resize', handleResize)

    // Micro-Spore Particles
    const spores = Array.from({ length: 32 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2.2 + 1,
      speedY: Math.random() * 0.00035 + 0.00012,
      swaySpeed: Math.random() * 0.0012 + 0.0006,
      phase: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.45 + 0.25,
    }))

    const render = () => {
      time += 0.012

      lerpX += (mousePos.targetX - lerpX) * 0.05
      lerpY += (mousePos.targetY - lerpY) * 0.05

      const targetLensX = isHovered && mousePos.canvasX ? mousePos.canvasX : width * 0.5
      const targetLensY = isHovered && mousePos.canvasY ? mousePos.canvasY : height * 0.45

      lensX += (targetLensX - lensX) * 0.08
      lensY += (targetLensY - lensY) * 0.08

      ctx.clearRect(0, 0, width, height)

      // ── 1. CLEAN CINEMATIC DARK BOTANICAL ATMOSPHERE RADIAL GLOW ──
      const bgGrad = ctx.createRadialGradient(
        width * 0.5 + lerpX * 25,
        height * 0.4 + lerpY * 20,
        width * 0.08,
        width * 0.5,
        height * 0.5,
        width * 0.85
      )
      bgGrad.addColorStop(0, '#031D28')
      bgGrad.addColorStop(0.5, '#011724')
      bgGrad.addColorStop(1, '#02090D')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // ── 2. INTERACTIVE OPTICAL FOCUS DECODE LENS (Active on hover/mouse interaction) ──
      if (entranceStep >= 9 && isHovered) {
        ctx.save()
        const lensRadius = Math.min(width * 0.18, 140)

        // Glass Lens Clip
        ctx.beginPath()
        ctx.arc(lensX, lensY, lensRadius, 0, Math.PI * 2)
        ctx.clip()

        // Radial Luminous Focus Glow
        const lensGlow = ctx.createRadialGradient(lensX, lensY, 0, lensX, lensY, lensRadius)
        lensGlow.addColorStop(0, 'rgba(1, 185, 152, 0.25)')
        lensGlow.addColorStop(0.6, 'rgba(100, 212, 49, 0.12)')
        lensGlow.addColorStop(1, 'rgba(2, 9, 13, 0)')
        ctx.fillStyle = lensGlow
        ctx.fillRect(lensX - lensRadius, lensY - lensRadius, lensRadius * 2, lensRadius * 2)

        // Revealed Luminous Botanical Cellular Grid inside Focus Area
        ctx.strokeStyle = 'rgba(226, 250, 4, 0.15)'
        ctx.lineWidth = 1
        const gridSize = 24
        const startGX = Math.floor((lensX - lensRadius) / gridSize) * gridSize
        const startGY = Math.floor((lensY - lensRadius) / gridSize) * gridSize
        for (let gx = startGX; gx < lensX + lensRadius; gx += gridSize) {
          for (let gy = startGY; gy < lensY + lensRadius; gy += gridSize) {
            const dist = Math.hypot(gx - lensX, gy - lensY)
            if (dist < lensRadius) {
              ctx.strokeRect(gx, gy, gridSize - 2, gridSize - 2)
            }
          }
        }

        ctx.restore()

        // Metallic Glass Lens Frame Ring
        ctx.save()
        ctx.beginPath()
        ctx.arc(lensX, lensY, lensRadius, 0, Math.PI * 2)
        ctx.strokeStyle = '#01B998'
        ctx.lineWidth = 3
        ctx.shadowColor = '#64D431'
        ctx.shadowBlur = 15
        ctx.stroke()
        ctx.restore()
      }

      // ── 3. FLOATING SPORE PARTICLES ──
      if (entranceStep >= 3) {
        ctx.save()
        spores.forEach((s) => {
          s.y -= s.speedY
          if (s.y < -0.05) s.y = 1.05
          s.phase += s.swaySpeed

          let px = (s.x + Math.sin(s.phase) * 0.02) * width + lerpX * 30
          let py = s.y * height + lerpY * 20

          if (isHovered) {
            const dx = lensX - px
            const dy = lensY - py
            const dist = Math.hypot(dx, dy)
            if (dist < 180 && dist > 5) {
              px += (dx / dist) * 0.7
              py += (dy / dist) * 0.7
            }
          }

          ctx.beginPath()
          ctx.arc(px, py, s.size, 0, Math.PI * 2)
          ctx.fillStyle = s.size > 2 ? '#AEE515' : '#19BB47'
          ctx.globalAlpha = s.opacity
          ctx.shadowColor = '#64D431'
          ctx.shadowBlur = s.size * 3
          ctx.fill()
        })
        ctx.restore()
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render)
      }
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [entranceStep, isHovered, mousePos, prefersReducedMotion])

  // Parallax transform helper
  const layerTransform = (multiplier) => {
    if (prefersReducedMotion) return {}
    const tx = mousePos.targetX * multiplier * 20
    const ty = mousePos.targetY * multiplier * 15
    return {
      transform: `translate3d(${tx}px, ${ty}px, 0)`,
      transition: 'transform 0.2s cubic-bezier(0.1, 0.8, 0.3, 1)'
    }
  }

  return (
    <section
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden bg-[#02090D] select-none flex flex-col justify-between"
    >
      {/* 2D Clean Dark Botanical Interactive Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Atmospheric Radial Gradient Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-1000"
        style={{
          background: 'radial-gradient(circle at 50% 45%, rgba(1, 125, 139, 0.16) 0%, rgba(2, 9, 13, 0.88) 75%)',
          opacity: entranceStep >= 2 ? 1 : 0
        }}
      />

      {/* Top Curatorial Badge */}
      <div className="relative z-20 pt-20 sm:pt-24 px-4 text-center pointer-events-none">
        <span className="inline-block text-[10px] sm:text-xs font-mono uppercase tracking-[0.35em] text-[#01B998] opacity-85">
          ISRA RENDEZVOUS’26 · CURATORIAL EDITION
        </span>
      </div>

      {/* ── CENTRAL DOMINANT EDITORIAL TYPOGRAPHY & BRANDING ── */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-4 max-w-5xl mx-auto w-full">
        
        {/* 1. RENDEZVOUS'26 Official Logo Mask Badge (Step 04) */}
        <div
          className="mb-4 sm:mb-6 transition-all duration-1000"
          style={{
            ...layerTransform(0.12),
            opacity: entranceStep >= 4 ? 1 : 0,
            transform: `${layerTransform(0.12).transform || ''} scale(${entranceStep >= 4 ? 1 : 0.92})`,
          }}
        >
          <div
            role="img"
            aria-label="ISRA Rendezvous'26 logo"
            className="hero-logo-mask w-full max-w-[260px] sm:max-w-md md:max-w-lg lg:max-w-xl h-14 sm:h-22 md:h-28 lg:h-36 mx-auto select-none"
            style={{
              backgroundColor: '#AEE515',
              filter: 'drop-shadow(0 0 18px rgba(100, 212, 49, 0.4))'
            }}
          />
        </div>

        {/* 2. Primary Title: DECODING PHYTOLORE (Step 05 & 06) */}
        <div
          className="transition-all duration-1000 my-2"
          style={{
            ...layerTransform(0.16),
            opacity: entranceStep >= 5 ? 1 : 0,
            transform: `${layerTransform(0.16).transform || ''} translateY(${entranceStep >= 5 ? 0 : 25}px)`
          }}
        >
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black font-brand uppercase tracking-tight text-white leading-none drop-shadow-2xl">
            <span className="block text-white drop-shadow-[0_12px_24px_rgba(0,0,0,0.95)]">DECODING</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#01B998] via-[#64D431] to-[#AEE515] drop-shadow-[0_0_40px_rgba(100,212,49,0.45)]">
              PHYTOLORE
            </span>
          </h1>

          <p
            className="text-xs sm:text-sm md:text-base font-mono uppercase tracking-[0.35em] text-[#64D431] mt-3 sm:mt-4 opacity-95 drop-shadow-lg font-bold transition-all duration-1000"
            style={{
              opacity: entranceStep >= 7 ? 1 : 0,
            }}
          >
            OBSERVE &nbsp;·&nbsp; FOCUS &nbsp;·&nbsp; DECODE &nbsp;·&nbsp; REVEAL
          </p>
        </div>

        {/* 3. Action Buttons (Step 08) */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8 transition-all duration-1000"
          style={{
            ...layerTransform(0.20),
            opacity: entranceStep >= 8 ? 1 : 0,
            transform: `${layerTransform(0.20).transform || ''} translateY(${entranceStep >= 8 ? 0 : 20}px)`
          }}
        >
          <button
            onClick={() => navigate('/results')}
            className="w-full sm:w-auto px-7 py-3 rounded-full font-bold text-sm sm:text-base text-black bg-gradient-to-r from-[#19BB47] via-[#64D431] to-[#AEE515] hover:opacity-95 transition-all shadow-[0_0_30px_rgba(100,212,49,0.5)] flex items-center justify-center gap-2 cursor-pointer group pointer-events-auto"
          >
            <span>View Results</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onScrollToAbout}
            className="w-full sm:w-auto px-7 py-3 rounded-full font-semibold text-sm sm:text-base text-white bg-black/60 hover:bg-black/80 border border-[#01B998]/45 hover:border-[#64D431] transition-all backdrop-blur-md cursor-pointer pointer-events-auto shadow-xl"
          >
            About Rendezvous
          </button>
        </div>

      </div>

      {/* ── BOTTOM "LOOK CLOSER" SCROLL INDICATOR (Step 09) ── */}
      <div
        className="relative z-20 pb-6 sm:pb-8 flex flex-col items-center justify-center text-center transition-all duration-1000 pointer-events-auto"
        style={{
          opacity: entranceStep >= 9 ? 1 : 0,
          transform: `translateY(${entranceStep >= 9 ? 0 : 15}px)`
        }}
      >
        <button
          onClick={onScrollToAbout}
          className="group flex flex-col items-center gap-2 text-mutedText hover:text-[#AEE515] transition cursor-pointer"
        >
          <span className="text-[11px] font-mono tracking-[0.35em] uppercase font-bold text-[#01B998] group-hover:text-[#AEE515] transition-colors">
            LOOK CLOSER
          </span>
          <div className="w-5 h-8 rounded-full border border-[#01B998]/45 flex items-start justify-center p-1 group-hover:border-[#64D431] transition-colors">
            <div className="w-1 h-2 rounded-full bg-[#64D431] animate-bounce mt-1" />
          </div>
        </button>
      </div>

    </section>
  )
}
