import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

// Official Rendezvous'26 Gradient Colors
// #013157 -> #017D8B -> #01B998 -> #19BB47 -> #64D431 -> #AEE515 -> #E2FA04
const RENDEZVOUS_GRADIENT_STOPS = [
  { stop: 0.00, color: '#013157' },
  { stop: 0.16, color: '#017D8B' },
  { stop: 0.33, color: '#01B998' },
  { stop: 0.50, color: '#19BB47' },
  { stop: 0.66, color: '#64D431' },
  { stop: 0.83, color: '#AEE515' },
  { stop: 1.00, color: '#E2FA04' },
]

export default function PhytoloreHero({ onScrollToAbout }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const navigate = useNavigate()

  // 8-step entrance animation state (1 to 8)
  const [entranceStep, setEntranceStep] = useState(1)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, targetX: 0, targetY: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
    []
  )

  // 8-Step Entrance Sequence Timer
  useEffect(() => {
    if (prefersReducedMotion) {
      setEntranceStep(8)
      return
    }

    const t1 = setTimeout(() => setEntranceStep(2), 200)   // Atmospheric glow
    const t2 = setTimeout(() => setEntranceStep(3), 600)   // Organic cellular forms
    const t3 = setTimeout(() => setEntranceStep(4), 1100)  // Vascular vein structure
    const t4 = setTimeout(() => setEntranceStep(5), 1600)  // 3D Organic Ribbon
    const t5 = setTimeout(() => setEntranceStep(6), 2100)  // Rendezvous'26 Logo
    const t6 = setTimeout(() => setEntranceStep(7), 2600)  // Title DECODING PHYTOLORE
    const t7 = setTimeout(() => setEntranceStep(8), 3200)  // Settle into continuous idle & focus lens

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
      clearTimeout(t5)
      clearTimeout(t6)
      clearTimeout(t7)
    }
  }, [prefersReducedMotion])

  // Mouse & Touch Tracking for Parallax & Focus Lens
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const normX = (x / rect.width - 0.5) * 2 // -1 to 1
      const normY = (y / rect.height - 0.5) * 2 // -1 to 1

      setMousePos(prev => ({
        ...prev,
        targetX: normX,
        targetY: normY,
        canvasX: x,
        canvasY: y
      }))
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

      setMousePos(prev => ({
        ...prev,
        targetX: normX,
        targetY: normY,
        canvasX: x,
        canvasY: y
      }))
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

  // Canvas 2D Rendering Engine (Organic Environment, Vein Network, 3D Ribbon, Spores)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId = 0
    let width = 0
    let height = 0
    let time = 0

    // Smooth Lerped Mouse Values
    let lerpX = 0
    let lerpY = 0
    let focusX = 0
    let focusY = 0

    // Resize Handler with DPR Scaling
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

    // Vascular Vein Network Generators
    const veinBranches = [
      { startX: 0.15, startY: 0.2, endX: 0.45, endY: 0.6, width: 2.5, depth: 3 },
      { startX: 0.45, startY: 0.6, endX: 0.75, endY: 0.35, width: 2.0, depth: 3 },
      { startX: 0.45, startY: 0.6, endX: 0.3, endY: 0.85, width: 1.8, depth: 3 },
      { startX: 0.75, startY: 0.35, endX: 0.9, endY: 0.7, width: 1.5, depth: 2 },
      { startX: 0.3, startY: 0.85, endX: 0.6, endY: 0.9, width: 1.2, depth: 2 },
      { startX: 0.15, startY: 0.2, endX: 0.05, endY: 0.5, width: 1.5, depth: 2 },
    ]

    // Floating Spore Particles
    const spores = Array.from({ length: 32 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2 + 1,
      speedY: Math.random() * 0.0003 + 0.0001,
      swaySpeed: Math.random() * 0.001 + 0.0005,
      phase: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.5 + 0.2,
    }))

    // Main Render Loop
    const render = () => {
      time += 0.012

      // Lerp Mouse Movement
      lerpX += (mousePos.targetX - lerpX) * 0.05
      lerpY += (mousePos.targetY - lerpY) * 0.05

      const targetCanvasX = isHovered && mousePos.canvasX ? mousePos.canvasX : width / 2
      const targetCanvasY = isHovered && mousePos.canvasY ? mousePos.canvasY : height / 2
      focusX += (targetCanvasX - focusX) * 0.08
      focusY += (targetCanvasY - focusY) * 0.08

      // Clear Canvas
      ctx.clearRect(0, 0, width, height)

      // ── DEPTH LAYER 01: Background Atmosphere ──
      const bgGrad = ctx.createRadialGradient(
        width * 0.5 + lerpX * 30,
        height * 0.4 + lerpY * 20,
        width * 0.1,
        width * 0.5,
        height * 0.5,
        width * 0.85
      )
      bgGrad.addColorStop(0, '#031D28')
      bgGrad.addColorStop(0.5, '#011724')
      bgGrad.addColorStop(1, '#02090D')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // ── DEPTH LAYER 02: Large Organic Cellular Forms (Breathe & Morph) ──
      if (entranceStep >= 3) {
        ctx.save()
        ctx.globalAlpha = Math.min(1, (time - 0.2) * 1.5)

        // Shape 1 (Top Right Cellular Blob)
        const shape1X = width * 0.7 + Math.sin(time * 0.4) * 20 + lerpX * 25
        const shape1Y = height * 0.3 + Math.cos(time * 0.3) * 15 + lerpY * 15
        const shape1Grad = ctx.createRadialGradient(shape1X, shape1Y, 10, shape1X, shape1Y, width * 0.35)
        shape1Grad.addColorStop(0, 'rgba(1, 125, 139, 0.22)')
        shape1Grad.addColorStop(0.6, 'rgba(1, 49, 87, 0.12)')
        shape1Grad.addColorStop(1, 'rgba(2, 9, 13, 0)')
        ctx.fillStyle = shape1Grad
        ctx.beginPath()
        ctx.arc(shape1X, shape1Y, width * 0.35, 0, Math.PI * 2)
        ctx.fill()

        // Shape 2 (Bottom Left Organic Membrane)
        const shape2X = width * 0.25 + Math.cos(time * 0.5) * 25 - lerpX * 30
        const shape2Y = height * 0.7 + Math.sin(time * 0.4) * 20 - lerpY * 20
        const shape2Grad = ctx.createRadialGradient(shape2X, shape2Y, 10, shape2X, shape2Y, width * 0.4)
        shape2Grad.addColorStop(0, 'rgba(25, 187, 71, 0.15)')
        shape2Grad.addColorStop(0.7, 'rgba(1, 185, 152, 0.08)')
        shape2Grad.addColorStop(1, 'rgba(2, 9, 13, 0)')
        ctx.fillStyle = shape2Grad
        ctx.beginPath()
        ctx.arc(shape2X, shape2Y, width * 0.4, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
      }

      // ── DEPTH LAYER 03: Microscopic Botanical Vascular Structure ──
      if (entranceStep >= 4) {
        ctx.save()
        veinBranches.forEach((branch, idx) => {
          const sx = branch.startX * width + Math.sin(time * 0.3 + idx) * 8 + lerpX * 15
          const sy = branch.startY * height + Math.cos(time * 0.2 + idx) * 8 + lerpY * 10
          const ex = branch.endX * width + Math.cos(time * 0.4 + idx) * 12 + lerpX * 25
          const ey = branch.endY * height + Math.sin(time * 0.3 + idx) * 12 + lerpY * 18

          const cx1 = (sx + ex) / 2 + Math.sin(time * 0.5 + idx) * 40
          const cy1 = (sy + ey) / 2 + Math.cos(time * 0.5 + idx) * 40

          // Base veiled vein line
          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.quadraticCurveTo(cx1, cy1, ex, ey)
          ctx.strokeStyle = 'rgba(1, 185, 152, 0.15)'
          ctx.lineWidth = branch.width
          ctx.lineCap = 'round'
          ctx.stroke()

          // Secondary finer capillary details
          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.lineTo((sx + cx1) / 2 + Math.cos(time * 0.6) * 15, (sy + cy1) / 2 + Math.sin(time * 0.6) * 15)
          ctx.strokeStyle = 'rgba(100, 212, 49, 0.1)'
          ctx.lineWidth = branch.width * 0.5
          ctx.stroke()
        })
        ctx.restore()
      }

      // ── DEPTH LAYER 04: 3D Flowing Organic Ribbon / Stem (Rendezvous Palette) ──
      if (entranceStep >= 5) {
        ctx.save()
        const ribbonGrad = ctx.createLinearGradient(0, height * 0.8, width, height * 0.2)
        RENDEZVOUS_GRADIENT_STOPS.forEach(s => ribbonGrad.addColorStop(s.stop, s.color))

        ctx.beginPath()
        const startX = width * -0.05 + lerpX * 40
        const startY = height * 0.75 + Math.sin(time * 0.4) * 20 + lerpY * 25
        const cp1x = width * 0.3 + Math.cos(time * 0.5) * 35 + lerpX * 45
        const cp1y = height * 0.95 + Math.sin(time * 0.3) * 30 + lerpY * 35
        const cp2x = width * 0.65 + Math.sin(time * 0.6) * 35 + lerpX * 55
        const cp2y = height * 0.2 + Math.cos(time * 0.4) * 30 + lerpY * 25
        const endX = width * 1.05 + lerpX * 60
        const endY = height * 0.45 + Math.sin(time * 0.5) * 20 + lerpY * 30

        ctx.moveTo(startX, startY)
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY)

        ctx.strokeStyle = ribbonGrad
        ctx.lineWidth = Math.min(width * 0.025, 24)
        ctx.lineCap = 'round'
        ctx.shadowColor = '#64D431'
        ctx.shadowBlur = 18
        ctx.globalAlpha = 0.85
        ctx.stroke()
        ctx.restore()
      }

      // ── DECODE / FOCUS LENS INTERACTION (OBSERVE -> FOCUS -> DECODE -> REVEAL) ──
      if (entranceStep >= 8 && isHovered) {
        ctx.save()
        const lensRadius = Math.min(width * 0.22, 180)

        // Clip to focus lens area
        ctx.beginPath()
        ctx.arc(focusX, focusY, lensRadius, 0, Math.PI * 2)
        ctx.clip()

        // 1. High contrast, sharp cellular background inside focus region
        const lensBg = ctx.createRadialGradient(focusX, focusY, 0, focusX, focusY, lensRadius)
        lensBg.addColorStop(0, 'rgba(1, 185, 152, 0.25)')
        lensBg.addColorStop(0.7, 'rgba(25, 187, 71, 0.12)')
        lensBg.addColorStop(1, 'rgba(2, 9, 13, 0)')
        ctx.fillStyle = lensBg
        ctx.fillRect(focusX - lensRadius, focusY - lensRadius, lensRadius * 2, lensRadius * 2)

        // 2. High-definition luminous botanical veins illuminated in focus area
        veinBranches.forEach((branch, idx) => {
          const sx = branch.startX * width + Math.sin(time * 0.3 + idx) * 8 + lerpX * 15
          const sy = branch.startY * height + Math.cos(time * 0.2 + idx) * 8 + lerpY * 10
          const ex = branch.endX * width + Math.cos(time * 0.4 + idx) * 12 + lerpX * 25
          const ey = branch.endY * height + Math.sin(time * 0.3 + idx) * 12 + lerpY * 18
          const cx1 = (sx + ex) / 2 + Math.sin(time * 0.5 + idx) * 40
          const cy1 = (sy + ey) / 2 + Math.cos(time * 0.5 + idx) * 40

          // Luminous emerald/gold vein stroke inside focus lens
          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.quadraticCurveTo(cx1, cy1, ex, ey)
          ctx.strokeStyle = '#AEE515'
          ctx.lineWidth = branch.width * 1.8
          ctx.shadowColor = '#E2FA04'
          ctx.shadowBlur = 12
          ctx.stroke()
        })

        // 3. Reveal microscopic cellular grid pattern inside focus area
        ctx.strokeStyle = 'rgba(226, 250, 4, 0.12)'
        ctx.lineWidth = 1
        const gridSize = 24
        const startGX = Math.floor((focusX - lensRadius) / gridSize) * gridSize
        const startGY = Math.floor((focusY - lensRadius) / gridSize) * gridSize
        for (let gx = startGX; gx < focusX + lensRadius; gx += gridSize) {
          for (let gy = startGY; gy < focusY + lensRadius; gy += gridSize) {
            const dist = Math.hypot(gx - focusX, gy - focusY)
            if (dist < lensRadius) {
              ctx.strokeRect(gx, gy, gridSize - 2, gridSize - 2)
            }
          }
        }

        ctx.restore()
      }

      // ── DEPTH LAYER 05: Micro-Spore Particles (Drift & Magnetism) ──
      if (entranceStep >= 4) {
        ctx.save()
        spores.forEach((spore) => {
          spore.y -= spore.speedY
          if (spore.y < -0.05) spore.y = 1.05
          spore.phase += spore.swaySpeed

          let px = (spore.x + Math.sin(spore.phase) * 0.02) * width + lerpX * 35
          let py = spore.y * height + lerpY * 25

          // Magnetic drift towards cursor focus area
          if (isHovered) {
            const dx = focusX - px
            const dy = focusY - py
            const dist = Math.hypot(dx, dy)
            if (dist < 220 && dist > 5) {
              px += (dx / dist) * 0.8
              py += (dy / dist) * 0.8
            }
          }

          ctx.beginPath()
          ctx.arc(px, py, spore.size, 0, Math.PI * 2)
          ctx.fillStyle = spore.size > 2 ? '#AEE515' : '#19BB47'
          ctx.globalAlpha = spore.opacity * (entranceStep >= 8 ? 0.9 : 0.4)
          ctx.shadowColor = '#64D431'
          ctx.shadowBlur = spore.size * 3
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

  // Parallax transform calculations per depth layer
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
      {/* Background Interactive 2D/3D Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Subtle Atmospheric Gradient Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-1000"
        style={{
          background: 'radial-gradient(circle at 50% 45%, rgba(1, 125, 139, 0.15) 0%, rgba(2, 9, 13, 0.85) 75%)',
          opacity: entranceStep >= 2 ? 1 : 0
        }}
      />

      {/* ── Top Brand Bar Spacing Anchor ── */}
      <div className="relative z-20 pt-20 sm:pt-24 px-4 text-center pointer-events-none">
        <span className="inline-block text-[10px] sm:text-xs font-mono uppercase tracking-[0.35em] text-[#01B998] opacity-85">
          ISRA Rendezvous’26 · Curatorial Edition
        </span>
      </div>

      {/* ── DEPTH LAYER 05: Primary Editorial Typography & Identity ── */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-4 max-w-5xl mx-auto w-full">
        
        {/* 1. Rendezvous'26 Official Logo Asset */}
        <div
          className="mb-4 sm:mb-6 transition-all duration-1000"
          style={{
            ...layerTransform(0.18),
            opacity: entranceStep >= 6 ? 1 : 0,
            transform: `${layerTransform(0.18).transform || ''} scale(${entranceStep >= 6 ? 1 : 0.92})`,
          }}
        >
          <div
            role="img"
            aria-label="ISRA Rendezvous'26 logo"
            className="hero-logo-mask w-full max-w-[260px] sm:max-w-md md:max-w-lg lg:max-w-xl h-14 sm:h-22 md:h-28 lg:h-36 mx-auto select-none"
            style={{
              backgroundColor: '#AEE515',
              filter: 'drop-shadow(0 0 16px rgba(100, 212, 49, 0.35))'
            }}
          />
        </div>

        {/* 2. Primary Concept Title: DECODING PHYTOLORE */}
        <div
          className="transition-all duration-1000 my-2"
          style={{
            ...layerTransform(0.22),
            opacity: entranceStep >= 7 ? 1 : 0,
            transform: `${layerTransform(0.22).transform || ''} translateY(${entranceStep >= 7 ? 0 : 25}px)`
          }}
        >
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black font-brand uppercase tracking-tight text-white leading-none drop-shadow-2xl">
            <span className="block text-white">DECODING</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#01B998] via-[#64D431] to-[#AEE515]">
              PHYTOLORE
            </span>
          </h1>

          <p className="text-xs sm:text-sm md:text-base font-mono uppercase tracking-[0.3em] text-[#64D431] mt-3 sm:mt-4 opacity-90">
            Observe &nbsp;·&nbsp; Focus &nbsp;·&nbsp; Decode &nbsp;·&nbsp; Reveal
          </p>
        </div>

        {/* 3. CTA Actions: Results & About */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8 transition-all duration-1000"
          style={{
            ...layerTransform(0.25),
            opacity: entranceStep >= 8 ? 1 : 0,
            transform: `${layerTransform(0.25).transform || ''} translateY(${entranceStep >= 8 ? 0 : 20}px)`
          }}
        >
          <button
            onClick={() => navigate('/results')}
            className="w-full sm:w-auto px-7 py-3 rounded-full font-bold text-sm sm:text-base text-black bg-gradient-to-r from-[#19BB47] via-[#64D431] to-[#AEE515] hover:opacity-95 transition-all shadow-[0_0_25px_rgba(100,212,49,0.4)] flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>View Results</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onScrollToAbout}
            className="w-full sm:w-auto px-7 py-3 rounded-full font-semibold text-sm sm:text-base text-white bg-black/40 hover:bg-black/60 border border-[#01B998]/40 hover:border-[#64D431] transition-all backdrop-blur-md cursor-pointer"
          >
            About Rendezvous
          </button>
        </div>

      </div>

      {/* ── DEPTH LAYER 06: Bottom "LOOK CLOSER" Scroll Indicator ── */}
      <div
        className="relative z-20 pb-6 sm:pb-8 flex flex-col items-center justify-center text-center transition-all duration-1000 pointer-events-auto"
        style={{
          opacity: entranceStep >= 8 ? 1 : 0,
          transform: `translateY(${entranceStep >= 8 ? 0 : 15}px)`
        }}
      >
        <button
          onClick={onScrollToAbout}
          className="group flex flex-col items-center gap-2 text-mutedText hover:text-[#AEE515] transition cursor-pointer"
        >
          <span className="text-[11px] font-mono tracking-[0.35em] uppercase font-bold text-[#01B998] group-hover:text-[#AEE515] transition-colors">
            LOOK CLOSER
          </span>
          <div className="w-5 h-8 rounded-full border border-[#01B998]/40 flex items-start justify-center p-1 group-hover:border-[#64D431] transition-colors">
            <div className="w-1 h-2 rounded-full bg-[#64D431] animate-bounce mt-1" />
          </div>
        </button>
      </div>

    </section>
  )
}
