import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

// Hero Background Asset
import heroBgImg from "../assets/hero/hero_bg.jpg"
import rendezvousWordmark from "../assets/hero/rendezvous-wordmark.png"
// Official Rendezvous'26 Gradient Palette
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

  // 11-step cinematic entrance animation state (1 to 11)
  const [entranceStep, setEntranceStep] = useState(1)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, targetX: 0, targetY: 0, canvasX: 0, canvasY: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
    []
  )

  // 11-Step Entrance Sequence Timers matching precise prompt specifications
  useEffect(() => {
    if (prefersReducedMotion) {
      setEntranceStep(11)
      return
    }

    const t1 = setTimeout(() => setEntranceStep(2), 150)   // 0.5s: Faint blue/teal atmospheric glow
    const t2 = setTimeout(() => setEntranceStep(3), 500)   // 1.0s: Background botanical textures & ribbon
    const t3 = setTimeout(() => setEntranceStep(4), 950)   // 1.3s: 🍃 Object 01: Large Leaf
    const t4 = setTimeout(() => setEntranceStep(5), 1350)  // 1.7s: 🌳 Object 04: Tree Slice
    const t5 = setTimeout(() => setEntranceStep(6), 1700)  // 2.0s: 🌰 Object 03: Seed Pod
    const t6 = setTimeout(() => setEntranceStep(7), 2000)  // 2.2s: 📜 Object 05: Herbarium Specimen
    const t7 = setTimeout(() => setEntranceStep(8), 2400)  // 2.5s: 🔍 Object 02: Magnifying Glass
    const t8 = setTimeout(() => setEntranceStep(9), 2800)  // 2.8s: RENDEZVOUS'26 Logo
    const t9 = setTimeout(() => setEntranceStep(10), 3200) // 3.3s: Title DECODING
    const t10 = setTimeout(() => setEntranceStep(11), 3600)// 3.6s: Title PHYTOLORE & Settle into idle focus

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      clearTimeout(t5); clearTimeout(t6); clearTimeout(t7); clearTimeout(t8);
      clearTimeout(t9); clearTimeout(t10);
    }
  }, [prefersReducedMotion])

  // Mouse & Touch Interaction Tracking for 3D Parallax & Lens Physics
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

  // Canvas Render Engine (Organic Ribbon, Atmospheric Spores & Optical Decode Lens)
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

    // Floating Spore Particles
    const pollen = Array.from({ length: 32 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2.2 + 1,
      speedY: Math.random() * 0.00035 + 0.00012,
      swaySpeed: Math.random() * 0.0012 + 0.0006,
      phase: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.45 + 0.2,
    }))

    const render = () => {
      try {
        time += 0.012

        lerpX += (mousePos.targetX - lerpX) * 0.05
        lerpY += (mousePos.targetY - lerpY) * 0.05

        ctx.clearRect(0, 0, width, height)

        // ── 1. CINEMATIC DARK BOTANICAL ATMOSPHERE RADIAL GLOW ──
        const bgGrad = ctx.createRadialGradient(
          width * 0.5 + lerpX * 20,
          height * 0.4 + lerpY * 15,
          width * 0.1,
          width * 0.5,
          height * 0.5,
          width * 0.85
        )
        bgGrad.addColorStop(0, 'rgba(1, 125, 139, 0.15)')
        bgGrad.addColorStop(0.55, 'rgba(1, 49, 87, 0.08)')
        bgGrad.addColorStop(1, 'rgba(2, 9, 13, 0)')
        ctx.fillStyle = bgGrad
        ctx.fillRect(0, 0, width, height)

        // ── 2. OBJECT 06 — ORGANIC GRADIENT RIBBON ──
        if (entranceStep >= 3) {
          ctx.save()
          const ribbonGrad = ctx.createLinearGradient(0, height * 0.85, width, height * 0.15)
          RENDEZVOUS_GRADIENT_STOPS.forEach(s => ribbonGrad.addColorStop(s.stop, s.color))

          ctx.beginPath()
          const rSX = width * -0.05 + lerpX * 30
          const rSY = height * 0.8 + Math.sin(time * 0.4) * 18 + lerpY * 20
          const rCP1X = width * 0.3 + Math.cos(time * 0.5) * 30 + lerpX * 35
          const rCP1Y = height * 0.95 + Math.sin(time * 0.3) * 25 + lerpY * 30
          const rCP2X = width * 0.7 + Math.sin(time * 0.6) * 30 + lerpX * 45
          const rCP2Y = height * 0.15 + Math.cos(time * 0.4) * 25 + lerpY * 20
          const rEX = width * 1.05 + lerpX * 50
          const rEY = height * 0.4 + Math.sin(time * 0.5) * 18 + lerpY * 25

          ctx.moveTo(rSX, rSY)
          ctx.bezierCurveTo(rCP1X, rCP1Y, rCP2X, rCP2Y, rEX, rEY)

          ctx.strokeStyle = ribbonGrad
          ctx.lineWidth = Math.min(width * 0.022, 22)
          ctx.lineCap = 'round'
          ctx.shadowColor = '#64D431'
          ctx.shadowBlur = 18
          ctx.globalAlpha = 0.78
          ctx.stroke()
          ctx.restore()
        }

        // ── 3. FLOATING SPORE PARTICLES ──
        if (entranceStep >= 4) {
          ctx.save()
          pollen.forEach((p) => {
            p.y -= p.speedY
            if (p.y < -0.05) p.y = 1.05
            p.phase += p.swaySpeed

            let px = (p.x + Math.sin(p.phase) * 0.02) * width + lerpX * 30
            let py = p.y * height + lerpY * 20

            if (isHovered && mousePos.canvasX && mousePos.canvasY) {
              const dx = mousePos.canvasX - px
              const dy = mousePos.canvasY - py
              const dist = Math.hypot(dx, dy)
              if (dist < 200 && dist > 5) {
                px += (dx / dist) * 0.7
                py += (dy / dist) * 0.7
              }
            }

            ctx.beginPath()
            ctx.arc(px, py, p.size, 0, Math.PI * 2)
            ctx.fillStyle = p.size > 2 ? '#AEE515' : '#19BB47'
            ctx.globalAlpha = p.opacity
            ctx.shadowColor = '#64D431'
            ctx.shadowBlur = p.size * 3
            ctx.fill()
          })
          ctx.restore()
        }
      } catch (err) {
        console.warn('Canvas render error in PhytoloreHero:', err)
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

  // Multi-Layer Parallax Transform Helper
  const layerTransform = (multiplier) => {
    if (prefersReducedMotion) return {}
    const tx = mousePos.targetX * multiplier * 25
    const ty = mousePos.targetY * multiplier * 18
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
      {/* 1. BACKGROUND PLANE — Dark Cinematic Botanical Environment from Reference Image */}
      <div
        className="absolute inset-0 pointer-events-none z-0 bg-cover bg-center transition-opacity duration-1000"
        style={{
          backgroundImage: `url(${heroBgImg})`,
          opacity: entranceStep >= 2 ? 0.9 : 0,
          filter: 'brightness(0.9) contrast(1.1)'
        }}
      />

      {/* 2. Interactive Canvas Layer (Ribbon, Spore Particles & Real-time Optical Decode Lens) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Atmospheric Depth Vignette Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-1000"
        style={{
          background: 'radial-gradient(circle at 50% 45%, rgba(1, 125, 139, 0.14) 0%, rgba(2, 9, 13, 0.82) 75%)',
          opacity: entranceStep >= 2 ? 1 : 0
        }}
      />

      {/* ── CENTRAL DOMINANT EDITORIAL TYPOGRAPHY & BRANDING ── */}
      <div className="relative z-30 flex-1 flex flex-col items-center justify-center text-center px-4 max-w-5xl mx-auto w-full py-12 sm:py-16">

        {/* 1. RENDEZVOUS'26 Official Wordmark Image — Edge-Aligned (Step 09) */}
        <div
          className="mb-2 sm:mb-3 transition-all duration-1000 flex justify-center w-full"
          style={{
            ...layerTransform(0.12),
            opacity: entranceStep >= 9 ? 1 : 0,
            transform: `${layerTransform(0.12).transform || ''} translateY(${entranceStep >= 9 ? 0 : 12}px)`,
          }}
        >
          <img
            src={rendezvousWordmark}
            alt="Rendezvous'26 Official Wordmark"
            className="w-full max-w-[200px] xs:max-w-[240px] sm:max-w-[320px] md:max-w-[480px] lg:max-w-[580px] xl:max-w-[620px] h-auto object-contain select-none pointer-events-none"
            style={{
              filter: 'brightness(0) invert(1)',
              mixBlendMode: 'screen',
            }}
          />
        </div>

        {/* 2. Primary Concept Title: DECODING PHYTOLORE (Step 10 & 11) — Single Horizontal Line */}
        <div
          className="transition-all duration-1000 my-1 sm:my-2 w-full flex flex-col items-center justify-center"
          style={{
            ...layerTransform(0.16),
            opacity: entranceStep >= 10 ? 1 : 0,
            transform: `${layerTransform(0.16).transform || ''} translateY(${entranceStep >= 10 ? 0 : 25}px)`
          }}
        >
          <h1 className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-corvion font-bold uppercase tracking-wider text-white leading-none drop-shadow-2xl flex flex-nowrap items-center justify-center gap-x-[0.35em] whitespace-nowrap">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#01B998] via-[#64D431] to-[#AEE515] drop-shadow-[0_0_35px_rgba(100,212,49,0.4)]">
              DECODING PHYTOLORE
            </span>
          </h1>
        </div>

        {/* 3. Action Buttons (Step 11) */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8 transition-all duration-1000"
          style={{
            ...layerTransform(0.20),
            opacity: entranceStep >= 11 ? 1 : 0,
            transform: `${layerTransform(0.20).transform || ''} translateY(${entranceStep >= 11 ? 0 : 20}px)`
          }}
        >
          <button
            onClick={() => navigate('/results')}
            className="w-full sm:w-auto px-7 py-3 rounded-full font-bold text-sm sm:text-base text-black bg-gradient-to-r from-[#19BB47] via-[#64D431] to-[#AEE515] hover:opacity-95 transition-all shadow-[0_0_25px_rgba(100,212,49,0.45)] flex items-center justify-center gap-2 cursor-pointer group pointer-events-auto"
          >
            <span>Results</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onScrollToAbout}
            className="w-full sm:w-auto px-7 py-3 rounded-full font-semibold text-sm sm:text-base text-white bg-black/50 hover:bg-black/70 border border-[#01B998]/40 hover:border-[#64D431] transition-all backdrop-blur-md cursor-pointer pointer-events-auto shadow-lg"
          >
            About
          </button>
        </div>

      </div>

    </section>
  )
}
