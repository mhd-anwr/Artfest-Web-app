import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

// Photorealistic Specimen & Background Assets
import leafImg from '../assets/hero/leaf.jpg'
import lensImg from '../assets/hero/lens.jpg'
import seedPodImg from '../assets/hero/seed_pod.jpg'
import treeSliceImg from '../assets/hero/tree_slice.jpg'
import herbariumImg from '../assets/hero/herbarium.jpg'
import heroBgImg from '../assets/hero/hero_bg.jpg'

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

  // 11-step entrance animation state (1 to 11)
  const [entranceStep, setEntranceStep] = useState(1)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, targetX: 0, targetY: 0, canvasX: 0, canvasY: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
    []
  )

  // 11-Step Entrance Sequence Timers
  useEffect(() => {
    if (prefersReducedMotion) {
      setEntranceStep(11)
      return
    }

    const t1 = setTimeout(() => setEntranceStep(2), 150)   // Deep blue/green glow
    const t2 = setTimeout(() => setEntranceStep(3), 500)   // Organic ribbon & particles
    const t3 = setTimeout(() => setEntranceStep(4), 950)   // 🍃 Object 01: Large Leaf
    const t4 = setTimeout(() => setEntranceStep(5), 1400)  // 🌰 Object 03: Seed Pod
    const t5 = setTimeout(() => setEntranceStep(6), 1850)  // 🌳 Object 04: Tree Slice
    const t6 = setTimeout(() => setEntranceStep(7), 2300)  // 📜 Object 05: Herbarium Sheet
    const t7 = setTimeout(() => setEntranceStep(8), 2750)  // 🔍 Object 02: Magnifying Lens
    const t8 = setTimeout(() => setEntranceStep(9), 3200)  // RENDEZVOUS'26 Logo Badge
    const t9 = setTimeout(() => setEntranceStep(10), 3650) // DECODING
    const t10 = setTimeout(() => setEntranceStep(11), 4200)// PHYTOLORE & Settle into continuous idle & focus lens

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      clearTimeout(t5); clearTimeout(t6); clearTimeout(t7); clearTimeout(t8);
      clearTimeout(t9); clearTimeout(t10);
    }
  }, [prefersReducedMotion])

  // Mouse & Touch Tracking for Multi-Layer Parallax & Lens Physics
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

  // Canvas 2D / 3D Specimen Render Engine (Organic Ribbon, Atmospheric Haze, Pollen Spores & Optical Decode)
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

    // Smooth physical lens position lerp
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

    // Floating Spore / Pollen Particles
    const pollen = Array.from({ length: 36 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2.5 + 1,
      speedY: Math.random() * 0.00035 + 0.00012,
      swaySpeed: Math.random() * 0.0012 + 0.0006,
      phase: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.5 + 0.2,
    }))

    const render = () => {
      time += 0.012

      lerpX += (mousePos.targetX - lerpX) * 0.05
      lerpY += (mousePos.targetY - lerpY) * 0.05

      // Leaf center position in canvas coordinates
      const leafCenterX = width * 0.24 + lerpX * 25
      const leafCenterY = height * 0.38 + lerpY * 18

      // Lens physical target position (follows mouse smoothly with inertia)
      const targetLensX = isHovered && mousePos.canvasX ? mousePos.canvasX : width * 0.26 + Math.sin(time * 0.45) * 16
      const targetLensY = isHovered && mousePos.canvasY ? mousePos.canvasY : height * 0.42 + Math.cos(time * 0.38) * 16

      lensX += (targetLensX - lensX) * 0.06
      lensY += (targetLensY - lensY) * 0.06

      const distToLeaf = Math.hypot(lensX - leafCenterX, lensY - leafCenterY)
      const revealIntensity = Math.max(0, 1 - distToLeaf / (width * 0.35))

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
      bgGrad.addColorStop(0, 'rgba(1, 125, 139, 0.18)')
      bgGrad.addColorStop(0.55, 'rgba(1, 49, 87, 0.12)')
      bgGrad.addColorStop(1, 'rgba(2, 9, 13, 0)')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // ── 2. ORGANIC VASCULAR GRADIENT RIBBON (Layer 04) ──
      if (entranceStep >= 3) {
        ctx.save()
        const ribbonGrad = ctx.createLinearGradient(0, height * 0.85, width, height * 0.15)
        RENDEZVOUS_GRADIENT_STOPS.forEach(s => ribbonGrad.addColorStop(s.stop, s.color))

        ctx.beginPath()
        const rSX = width * -0.05 + lerpX * 30
        const rSY = height * 0.78 + Math.sin(time * 0.4) * 18 + lerpY * 20
        const rCP1X = width * 0.3 + Math.cos(time * 0.5) * 30 + lerpX * 35
        const rCP1Y = height * 0.95 + Math.sin(time * 0.3) * 25 + lerpY * 30
        const rCP2X = width * 0.7 + Math.sin(time * 0.6) * 30 + lerpX * 45
        const rCP2Y = height * 0.15 + Math.cos(time * 0.4) * 25 + lerpY * 20
        const rEX = width * 1.05 + lerpX * 50
        const rEY = height * 0.42 + Math.sin(time * 0.5) * 18 + lerpY * 25

        ctx.moveTo(rSX, rSY)
        ctx.bezierCurveTo(rCP1X, rCP1Y, rCP2X, rCP2Y, rEX, rEY)

        ctx.strokeStyle = ribbonGrad
        ctx.lineWidth = Math.min(width * 0.024, 24)
        ctx.lineCap = 'round'
        ctx.shadowColor = '#64D431'
        ctx.shadowBlur = 20
        ctx.globalAlpha = 0.85
        ctx.stroke()
        ctx.restore()
      }

      // ── 3. OPTICAL DECODE EFFECT (Luminous Vein Glow inside Lens over Leaf) ──
      if (entranceStep >= 8 && revealIntensity > 0) {
        ctx.save()
        const lensRadius = Math.min(width * 0.16, 135)

        ctx.beginPath()
        ctx.arc(lensX, lensY, lensRadius, 0, Math.PI * 2)
        ctx.clip()

        // Luminous radial glow inside glass lens
        const lensGlow = ctx.createRadialGradient(lensX, lensY, 0, lensX, lensY, lensRadius)
        lensGlow.addColorStop(0, 'rgba(226, 250, 4, 0.32)')
        lensGlow.addColorStop(0.65, 'rgba(174, 229, 21, 0.18)')
        lensGlow.addColorStop(1, 'rgba(1, 185, 152, 0)')
        ctx.fillStyle = lensGlow
        ctx.fillRect(lensX - lensRadius, lensY - lensRadius, lensRadius * 2, lensRadius * 2)

        // Draw sharp luminous golden/emerald leaf vein structure inside lens region
        ctx.translate(leafCenterX, leafCenterY)
        const leafScale = Math.min(width, height) * 0.36

        ctx.beginPath()
        ctx.moveTo(-leafScale * 0.2, -leafScale * 0.6)
        ctx.lineTo(leafScale * 0.2, leafScale * 0.6)
        ctx.strokeStyle = '#E2FA04'
        ctx.lineWidth = 3.8
        ctx.shadowColor = '#AEE515'
        ctx.shadowBlur = 18
        ctx.stroke()

        const veinCount = 8
        for (let v = 1; v <= veinCount; v++) {
          const vy = -leafScale * 0.5 + (v * leafScale) / (veinCount + 1)
          ctx.beginPath()
          ctx.moveTo(0, vy)
          ctx.quadraticCurveTo(-leafScale * 0.3, vy - 20, -leafScale * 0.45, vy - 35)
          ctx.strokeStyle = '#AEE515'
          ctx.lineWidth = 2.4
          ctx.stroke()

          ctx.beginPath()
          ctx.moveTo(0, vy)
          ctx.quadraticCurveTo(leafScale * 0.3, vy - 20, leafScale * 0.45, vy - 35)
          ctx.strokeStyle = '#AEE515'
          ctx.lineWidth = 2.4
          ctx.stroke()
        }

        ctx.restore()
      }

      // ── 4. FLOATING SPORE / POLLEN PARTICLES ──
      if (entranceStep >= 4) {
        ctx.save()
        pollen.forEach((p) => {
          p.y -= p.speedY
          if (p.y < -0.05) p.y = 1.05
          p.phase += p.swaySpeed

          let px = (p.x + Math.sin(p.phase) * 0.02) * width + lerpX * 30
          let py = p.y * height + lerpY * 20

          if (isHovered) {
            const dx = lensX - px
            const dy = lensY - py
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

  // Parallax Layer Transform Helper
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
      {/* 1. Photorealistic Reference Hero Environment Base Layer (Exact 1:1 Visual Parity with Reference Image) */}
      <div
        className="absolute inset-0 pointer-events-none z-0 bg-cover bg-center transition-opacity duration-1000"
        style={{
          backgroundImage: `url(${heroBgImg})`,
          opacity: entranceStep >= 2 ? 1 : 0,
          filter: 'brightness(0.95) contrast(1.15)'
        }}
      />

      {/* 2. Interactive Canvas Overlay Layer (60fps Ribbon, Spore Particles & Real-time Optical Decode Lens) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Atmospheric Depth Vignette Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-1000"
        style={{
          background: 'radial-gradient(circle at 50% 45%, rgba(1, 125, 139, 0.12) 0%, rgba(2, 9, 13, 0.75) 75%)',
          opacity: entranceStep >= 2 ? 1 : 0
        }}
      />

      {/* Top Curatorial Badge */}
      <div className="relative z-20 pt-20 sm:pt-24 px-4 text-center pointer-events-none">
        <span className="inline-block text-[10px] sm:text-xs font-mono uppercase tracking-[0.35em] text-[#01B998] opacity-90 drop-shadow-md">
          ISRA RENDEZVOUS’26 · CURATORIAL EDITION
        </span>
      </div>

      {/* ── 3D PHOTOREALISTIC SPECIMEN LAYERS (Multi-Layer Parallax Floating & Interaction) ── */}

      {/* 🍃 OBJECT 01 — LARGE REALISTIC LEAF (Observation - Top Left) */}
      <div
        className="absolute z-10 pointer-events-none transition-all duration-1000 origin-top-left"
        style={{
          top: '10%',
          left: '2%',
          width: 'clamp(320px, 36vw, 560px)',
          ...layerTransform(0.35),
          opacity: entranceStep >= 4 ? 1 : 0,
          transform: `${layerTransform(0.35).transform || ''} scale(${entranceStep >= 4 ? 1 : 0.88}) rotate(-10deg)`,
          filter: 'drop-shadow(0 25px 45px rgba(0,0,0,0.9)) drop-shadow(0 0 30px rgba(1,185,152,0.4))'
        }}
      >
        <img
          src={leafImg}
          alt="Realistic Botanical Leaf Specimen"
          className="w-full h-auto rounded-3xl object-contain mix-blend-screen"
        />
      </div>

      {/* 🌰 OBJECT 03 — REALISTIC SEED POD (Hidden Potential - Top Right) */}
      <div
        className="absolute z-10 pointer-events-none transition-all duration-1000 origin-top-right"
        style={{
          top: '8%',
          right: '4%',
          width: 'clamp(220px, 24vw, 380px)',
          ...layerTransform(0.28),
          opacity: entranceStep >= 5 ? 1 : 0,
          transform: `${layerTransform(0.28).transform || ''} scale(${entranceStep >= 5 ? 1 : 0.82}) rotate(12deg)`,
          filter: 'drop-shadow(0 25px 40px rgba(0,0,0,0.9)) drop-shadow(0 0 25px rgba(100,212,49,0.4))'
        }}
      >
        <img
          src={seedPodImg}
          alt="Realistic Seed Pod Specimen"
          className="w-full h-auto rounded-3xl object-contain mix-blend-screen"
        />
      </div>

      {/* 🌳 OBJECT 04 — REALISTIC TREE CROSS-SECTION (Growth/Memory/Time - Lower Left) */}
      <div
        className="absolute z-10 pointer-events-none transition-all duration-1000 origin-bottom-left"
        style={{
          bottom: '10%',
          left: '5%',
          width: 'clamp(200px, 22vw, 340px)',
          ...layerTransform(0.22),
          opacity: entranceStep >= 6 ? 1 : 0,
          transform: `${layerTransform(0.22).transform || ''} scale(${entranceStep >= 6 ? 1 : 0.85}) rotate(-6deg)`,
          filter: 'drop-shadow(0 30px 45px rgba(0,0,0,0.95)) drop-shadow(0 0 22px rgba(1,185,152,0.3))'
        }}
      >
        <img
          src={treeSliceImg}
          alt="Realistic Tree Cross-Section Specimen"
          className="w-full h-auto rounded-full object-contain mix-blend-screen"
        />
      </div>

      {/* 📜 OBJECT 05 — REALISTIC HERBARIUM SPECIMEN (Recorded Knowledge - Lower Right) */}
      <div
        className="absolute z-10 pointer-events-none transition-all duration-1000 origin-bottom-right"
        style={{
          bottom: '8%',
          right: '5%',
          width: 'clamp(240px, 26vw, 400px)',
          ...layerTransform(0.25),
          opacity: entranceStep >= 7 ? 1 : 0,
          transform: `${layerTransform(0.25).transform || ''} scale(${entranceStep >= 7 ? 1 : 0.85}) rotate(5deg)`,
          filter: 'drop-shadow(0 35px 55px rgba(0,0,0,0.9)) drop-shadow(0 0 25px rgba(174,229,21,0.25))'
        }}
      >
        <img
          src={herbariumImg}
          alt="Realistic Herbarium Specimen Sheet"
          className="w-full h-auto rounded-2xl object-contain border border-[#01B998]/35 shadow-2xl"
        />
      </div>

      {/* 🔍 OBJECT 02 — REALISTIC PHYSICAL MAGNIFYING LENS (Focus/Decode - Interactive Floating Lens) */}
      <div
        className="absolute z-20 pointer-events-none transition-all duration-700 ease-out"
        style={{
          top: '20%',
          left: '14%',
          width: 'clamp(200px, 22vw, 340px)',
          ...layerTransform(0.48),
          opacity: entranceStep >= 8 ? 1 : 0,
          transform: `${layerTransform(0.48).transform || ''} scale(${entranceStep >= 8 ? 1 : 0.8}) rotate(-16deg)`,
          filter: 'drop-shadow(0 30px 50px rgba(0,0,0,0.95)) drop-shadow(0 0 35px rgba(226,250,4,0.4))'
        }}
      >
        <img
          src={lensImg}
          alt="Realistic Physical Magnifying Lens Specimen"
          className="w-full h-auto object-contain mix-blend-screen"
        />
      </div>

      {/* ── CENTRAL DOMINANT EDITORIAL TYPOGRAPHY & BRANDING ── */}
      <div className="relative z-30 flex-1 flex flex-col items-center justify-center text-center px-4 max-w-5xl mx-auto w-full">
        
        {/* 1. RENDEZVOUS'26 Official Logo Mask Badge (Step 09) */}
        <div
          className="mb-4 sm:mb-6 transition-all duration-1000"
          style={{
            ...layerTransform(0.12),
            opacity: entranceStep >= 9 ? 1 : 0,
            transform: `${layerTransform(0.12).transform || ''} scale(${entranceStep >= 9 ? 1 : 0.92})`,
          }}
        >
          <div
            role="img"
            aria-label="ISRA Rendezvous'26 logo"
            className="hero-logo-mask w-full max-w-[260px] sm:max-w-md md:max-w-lg lg:max-w-xl h-14 sm:h-22 md:h-28 lg:h-36 mx-auto select-none"
            style={{
              backgroundColor: '#AEE515',
              filter: 'drop-shadow(0 0 20px rgba(100, 212, 49, 0.45))'
            }}
          />
        </div>

        {/* 2. Primary Concept Title: DECODING PHYTOLORE (Step 10 & 11) */}
        <div
          className="transition-all duration-1000 my-2"
          style={{
            ...layerTransform(0.16),
            opacity: entranceStep >= 10 ? 1 : 0,
            transform: `${layerTransform(0.16).transform || ''} translateY(${entranceStep >= 10 ? 0 : 25}px)`
          }}
        >
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black font-brand uppercase tracking-tight text-white leading-none drop-shadow-2xl">
            <span className="block text-white drop-shadow-[0_12px_24px_rgba(0,0,0,0.95)]">DECODING</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#01B998] via-[#64D431] to-[#AEE515] drop-shadow-[0_0_40px_rgba(100,212,49,0.45)]">
              PHYTOLORE
            </span>
          </h1>

          <p className="text-xs sm:text-sm md:text-base font-mono uppercase tracking-[0.35em] text-[#64D431] mt-3 sm:mt-4 opacity-95 drop-shadow-lg font-bold">
            OBSERVE &nbsp;·&nbsp; FOCUS &nbsp;·&nbsp; DECODE &nbsp;·&nbsp; REVEAL
          </p>
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

      {/* ── BOTTOM "LOOK CLOSER" SCROLL INDICATOR ── */}
      <div
        className="relative z-30 pb-6 sm:pb-8 flex flex-col items-center justify-center text-center transition-all duration-1000 pointer-events-auto"
        style={{
          opacity: entranceStep >= 11 ? 1 : 0,
          transform: `translateY(${entranceStep >= 11 ? 0 : 15}px)`
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
