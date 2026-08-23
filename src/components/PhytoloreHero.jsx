import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

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

  // 9-step entrance animation state (1 to 9)
  const [entranceStep, setEntranceStep] = useState(1)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, targetX: 0, targetY: 0, canvasX: 0, canvasY: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
    []
  )

  // 9-Step Entrance Sequence Timers
  useEffect(() => {
    if (prefersReducedMotion) {
      setEntranceStep(9)
      return
    }

    const t1 = setTimeout(() => setEntranceStep(2), 200)   // Faint deep blue/green glow
    const t2 = setTimeout(() => setEntranceStep(3), 600)   // Botanical atmosphere & cellular shapes
    const t3 = setTimeout(() => setEntranceStep(4), 1100)  // Object 01: Large Botanical Leaf
    const t4 = setTimeout(() => setEntranceStep(5), 1600)  // Objects 03, 04, 05: Seed Pod, Tree Slice, Herbarium
    const t5 = setTimeout(() => setEntranceStep(6), 2100)  // Object 02: Botanical Magnifying Lens
    const t6 = setTimeout(() => setEntranceStep(7), 2600)  // RENDEZVOUS'26 Logo
    const t7 = setTimeout(() => setEntranceStep(8), 3100)  // Title: DECODING PHYTOLORE
    const t8 = setTimeout(() => setEntranceStep(9), 3700)  // Continuous idle & interactive focus decode

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      clearTimeout(t5); clearTimeout(t6); clearTimeout(t7); clearTimeout(t8);
    }
  }, [prefersReducedMotion])

  // Mouse & Touch Tracking for Parallax & Lens Proximity
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

  // Canvas 2D / 3D Specimen Rendering Engine
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId = 0
    let width = 0
    let height = 0
    let time = 0

    // Smooth Lerp Offsets
    let lerpX = 0
    let lerpY = 0

    // Lens Smooth Physics Positioning
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

    // Micro-spores / Pollen Particles
    const pollen = Array.from({ length: 28 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2 + 1,
      speedY: Math.random() * 0.0003 + 0.0001,
      swaySpeed: Math.random() * 0.001 + 0.0005,
      phase: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.4 + 0.2,
    }))

    // Main 60fps Render Loop
    const render = () => {
      time += 0.012

      // Lerp mouse
      lerpX += (mousePos.targetX - lerpX) * 0.05
      lerpY += (mousePos.targetY - lerpY) * 0.05

      // Target position for Object 02 (Magnifying Lens)
      const leafCenterX = width * 0.26 + lerpX * 25
      const leafCenterY = height * 0.36 + lerpY * 18

      // Idle lens target vs active mouse target
      const targetLensX = isHovered && mousePos.canvasX ? mousePos.canvasX : width * 0.32 + Math.sin(time * 0.5) * 15
      const targetLensY = isHovered && mousePos.canvasY ? mousePos.canvasY : height * 0.45 + Math.cos(time * 0.4) * 15

      // Smooth inertia lerp for physical floating lens
      lensX += (targetLensX - lensX) * 0.06
      lensY += (targetLensY - lensY) * 0.06

      // Distance from lens to leaf center for optical reveal intensity
      const distToLeaf = Math.hypot(lensX - leafCenterX, lensY - leafCenterY)
      const revealIntensity = Math.max(0, 1 - distToLeaf / (width * 0.35))

      // Clear Canvas
      ctx.clearRect(0, 0, width, height)

      // ── 1. BACKGROUND ATMOSPHERE (Layer 01) ──
      const bgGrad = ctx.createRadialGradient(
        width * 0.5 + lerpX * 20,
        height * 0.4 + lerpY * 15,
        width * 0.1,
        width * 0.5,
        height * 0.5,
        width * 0.85
      )
      bgGrad.addColorStop(0, '#031D28')
      bgGrad.addColorStop(0.55, '#011724')
      bgGrad.addColorStop(1, '#02090D')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // ── 2. ORGANIC VASCULAR GRADIENT RIBBON (Layer 04) ──
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
        ctx.lineWidth = Math.min(width * 0.02, 20)
        ctx.lineCap = 'round'
        ctx.shadowColor = '#64D431'
        ctx.shadowBlur = 16
        ctx.globalAlpha = 0.75
        ctx.stroke()
        ctx.restore()
      }

      // ── 3. OBJECT 01 — LARGE BOTANICAL LEAF (Top Left) ──
      if (entranceStep >= 4) {
        ctx.save()
        const leafX = leafCenterX
        const leafY = leafCenterY
        const leafScale = Math.min(width, height) * 0.32
        const leafAngle = Math.sin(time * 0.3) * 0.04 + lerpX * 0.05

        ctx.translate(leafX, leafY)
        ctx.rotate(leafAngle)

        // Leaf Outer Silhouette
        ctx.beginPath()
        ctx.moveTo(0, -leafScale * 0.8)
        ctx.bezierCurveTo(leafScale * 0.6, -leafScale * 0.4, leafScale * 0.7, leafScale * 0.4, 0, leafScale * 0.8)
        ctx.bezierCurveTo(-leafScale * 0.7, leafScale * 0.4, -leafScale * 0.6, -leafScale * 0.4, 0, -leafScale * 0.8)

        // Dark Organic Leaf Surface Fill with Cyan/Green Rim Lighting
        const leafGrad = ctx.createLinearGradient(-leafScale * 0.5, -leafScale * 0.5, leafScale * 0.5, leafScale * 0.5)
        leafGrad.addColorStop(0, '#011F2D')
        leafGrad.addColorStop(0.5, '#013157')
        leafGrad.addColorStop(0.85, '#017D8B')
        leafGrad.addColorStop(1, '#19BB47')

        ctx.fillStyle = leafGrad
        ctx.globalAlpha = 0.85
        ctx.shadowColor = '#01B998'
        ctx.shadowBlur = 20
        ctx.fill()
        ctx.strokeStyle = '#01B998'
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Primary Leaf Mid-Rib & Vein Network
        ctx.beginPath()
        ctx.moveTo(0, -leafScale * 0.75)
        ctx.lineTo(0, leafScale * 0.75)
        ctx.strokeStyle = 'rgba(25, 187, 71, 0.45)'
        ctx.lineWidth = 2.5
        ctx.stroke()

        // Lateral Veins
        const veinCount = 7
        for (let v = 1; v <= veinCount; v++) {
          const vy = -leafScale * 0.6 + (v * leafScale * 1.2) / (veinCount + 1)
          const vWidth = (1 - Math.abs(vy) / leafScale) * leafScale * 0.55

          // Left lateral vein
          ctx.beginPath()
          ctx.moveTo(0, vy)
          ctx.quadraticCurveTo(-vWidth * 0.5, vy - 15, -vWidth, vy - 25)
          ctx.strokeStyle = 'rgba(100, 212, 49, 0.3)'
          ctx.lineWidth = 1.2
          ctx.stroke()

          // Right lateral vein
          ctx.beginPath()
          ctx.moveTo(0, vy)
          ctx.quadraticCurveTo(vWidth * 0.5, vy - 15, vWidth, vy - 25)
          ctx.strokeStyle = 'rgba(100, 212, 49, 0.3)'
          ctx.lineWidth = 1.2
          ctx.stroke()
        }

        ctx.restore()
      }

      // ── 4. OBJECT 03 — SEED / SEED POD (Top Right) ──
      if (entranceStep >= 5) {
        ctx.save()
        const podX = width * 0.76 + lerpX * 30
        const podY = height * 0.28 + Math.sin(time * 0.45) * 12 + lerpY * 20
        const podRadius = Math.min(width, height) * 0.08
        const podRot = time * 0.2 + lerpX * 0.1

        ctx.translate(podX, podY)
        ctx.rotate(podRot)

        // Seed Pod Ribbed Shell
        const podGrad = ctx.createRadialGradient(-podRadius * 0.3, -podRadius * 0.3, 5, 0, 0, podRadius)
        podGrad.addColorStop(0, '#017D8B')
        podGrad.addColorStop(0.6, '#013157')
        podGrad.addColorStop(1, '#02090D')

        ctx.beginPath()
        ctx.ellipse(0, 0, podRadius * 0.7, podRadius, Math.PI / 6, 0, Math.PI * 2)
        ctx.fillStyle = podGrad
        ctx.shadowColor = '#64D431'
        ctx.shadowBlur = 15
        ctx.globalAlpha = 0.9
        ctx.fill()
        ctx.strokeStyle = '#64D431'
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Internal Seed Rib Annotations
        for (let r = -2; r <= 2; r++) {
          ctx.beginPath()
          ctx.ellipse(r * 8, 0, podRadius * 0.2, podRadius * 0.8, Math.PI / 6, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(174, 229, 21, 0.35)'
          ctx.lineWidth = 1
          ctx.stroke()
        }

        ctx.restore()
      }

      // ── 5. OBJECT 04 — TREE CROSS-SECTION (Lower Left) ──
      if (entranceStep >= 5) {
        ctx.save()
        const treeX = width * 0.22 + lerpX * 18
        const treeY = height * 0.78 + Math.cos(time * 0.35) * 8 + lerpY * 15
        const treeRadius = Math.min(width, height) * 0.095

        ctx.translate(treeX, treeY)

        // Outer Rough Bark
        ctx.beginPath()
        ctx.arc(0, 0, treeRadius, 0, Math.PI * 2)
        const barkGrad = ctx.createRadialGradient(0, 0, treeRadius * 0.7, 0, 0, treeRadius)
        barkGrad.addColorStop(0, '#011724')
        barkGrad.addColorStop(0.85, '#013157')
        barkGrad.addColorStop(1, '#017D8B')
        ctx.fillStyle = barkGrad
        ctx.shadowColor = '#01B998'
        ctx.shadowBlur = 12
        ctx.fill()
        ctx.strokeStyle = '#01B998'
        ctx.lineWidth = 2
        ctx.stroke()

        // Concentric Growth Rings
        const ringCount = 6
        const distToLens = Math.hypot(treeX - lensX, treeY - lensY)
        const ringGlow = Math.max(0, 1 - distToLens / 180)

        for (let ring = 1; ring <= ringCount; ring++) {
          const rRadius = (treeRadius * 0.85 * ring) / ringCount
          ctx.beginPath()
          ctx.arc(0, 0, rRadius, 0, Math.PI * 2)
          ctx.strokeStyle = ringGlow > 0.3 ? '#AEE515' : 'rgba(25, 187, 71, 0.4)'
          ctx.lineWidth = ringGlow > 0.3 ? 1.5 : 1
          if (ringGlow > 0.3) {
            ctx.shadowColor = '#E2FA04'
            ctx.shadowBlur = 8
          }
          ctx.stroke()
        }

        ctx.restore()
      }

      // ── 6. OBJECT 05 — BOTANICAL HERBARIUM SPECIMEN SHEET (Lower Right) ──
      if (entranceStep >= 5) {
        ctx.save()
        const sheetX = width * 0.78 + lerpX * 22
        const sheetY = height * 0.74 + Math.sin(time * 0.3) * 10 + lerpY * 18
        const sheetW = Math.min(width * 0.22, 170)
        const sheetH = sheetW * 1.3
        const sheetAngle = -0.05 + Math.sin(time * 0.25) * 0.02

        ctx.translate(sheetX, sheetY)
        ctx.rotate(sheetAngle)

        // Dark Paper Sheet Background & Frame
        ctx.fillStyle = '#011724'
        ctx.shadowColor = 'rgba(1, 185, 152, 0.3)'
        ctx.shadowBlur = 14
        ctx.fillRect(-sheetW / 2, -sheetH / 2, sheetW, sheetH)

        ctx.strokeStyle = 'rgba(1, 125, 139, 0.6)'
        ctx.lineWidth = 1
        ctx.strokeRect(-sheetW / 2, -sheetH / 2, sheetW, sheetH)

        // Inner Border Line
        ctx.strokeStyle = 'rgba(25, 187, 71, 0.25)'
        ctx.strokeRect(-sheetW / 2 + 8, -sheetH / 2 + 8, sheetW - 16, sheetH - 16)

        // Pressed Leaf Specimen Illustration
        ctx.beginPath()
        ctx.moveTo(0, -sheetH * 0.3)
        ctx.bezierCurveTo(sheetW * 0.25, -sheetH * 0.1, sheetW * 0.2, sheetH * 0.15, 0, sheetH * 0.25)
        ctx.bezierCurveTo(-sheetW * 0.2, sheetH * 0.15, -sheetW * 0.25, -sheetH * 0.1, 0, -sheetH * 0.3)
        ctx.fillStyle = 'rgba(25, 187, 71, 0.25)'
        ctx.fill()
        ctx.strokeStyle = '#64D431'
        ctx.lineWidth = 1
        ctx.stroke()

        // Scientific Annotation Text Lines
        ctx.fillStyle = '#AEE515'
        ctx.font = '9px monospace'
        ctx.fillText('SPECIMEN #042', -sheetW / 2 + 14, sheetH / 2 - 24)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.font = '8px sans-serif'
        ctx.fillText('Phytolore Folium', -sheetW / 2 + 14, sheetH / 2 - 12)

        ctx.restore()
      }

      // ── 7. OBJECT 02 — BOTANICAL MAGNIFYING LENS (Floating Interactive Lens) ──
      if (entranceStep >= 6) {
        ctx.save()
        const lensRadius = Math.min(width * 0.18, 140)

        // 1. Lens Optical Glass Magnification / Reveal Zone inside Leaf Focus
        if (entranceStep >= 9 && revealIntensity > 0) {
          ctx.save()
          ctx.beginPath()
          ctx.arc(lensX, lensY, lensRadius - 4, 0, Math.PI * 2)
          ctx.clip()

          // Illumination Radial Glow inside Glass Lens
          const lensGlow = ctx.createRadialGradient(lensX, lensY, 0, lensX, lensY, lensRadius)
          lensGlow.addColorStop(0, 'rgba(226, 250, 4, 0.25)')
          lensGlow.addColorStop(0.6, 'rgba(174, 229, 21, 0.15)')
          lensGlow.addColorStop(1, 'rgba(1, 185, 152, 0)')
          ctx.fillStyle = lensGlow
          ctx.fillRect(lensX - lensRadius, lensY - lensRadius, lensRadius * 2, lensRadius * 2)

          // Sharpened Luminous Vein Structures inside Lens
          ctx.translate(leafCenterX, leafCenterY)
          const leafScale = Math.min(width, height) * 0.32

          ctx.beginPath()
          ctx.moveTo(0, -leafScale * 0.75)
          ctx.lineTo(0, leafScale * 0.75)
          ctx.strokeStyle = '#E2FA04'
          ctx.lineWidth = 3.5
          ctx.shadowColor = '#AEE515'
          ctx.shadowBlur = 14
          ctx.stroke()

          const veinCount = 7
          for (let v = 1; v <= veinCount; v++) {
            const vy = -leafScale * 0.6 + (v * leafScale * 1.2) / (veinCount + 1)
            const vWidth = (1 - Math.abs(vy) / leafScale) * leafScale * 0.55

            ctx.beginPath()
            ctx.moveTo(0, vy)
            ctx.quadraticCurveTo(-vWidth * 0.5, vy - 15, -vWidth, vy - 25)
            ctx.strokeStyle = '#AEE515'
            ctx.lineWidth = 2
            ctx.stroke()

            ctx.beginPath()
            ctx.moveTo(0, vy)
            ctx.quadraticCurveTo(vWidth * 0.5, vy - 15, vWidth, vy - 25)
            ctx.strokeStyle = '#AEE515'
            ctx.lineWidth = 2
            ctx.stroke()
          }

          ctx.restore()
        }

        // 2. Physical 3D Lens Rim & Metallic Frame with Brand Gradient Reflection
        ctx.beginPath()
        ctx.arc(lensX, lensY, lensRadius, 0, Math.PI * 2)
        const frameGrad = ctx.createLinearGradient(lensX - lensRadius, lensY - lensRadius, lensX + lensRadius, lensY + lensRadius)
        frameGrad.addColorStop(0, '#017D8B')
        frameGrad.addColorStop(0.5, '#64D431')
        frameGrad.addColorStop(1, '#AEE515')

        ctx.strokeStyle = frameGrad
        ctx.lineWidth = 6
        ctx.shadowColor = '#64D431'
        ctx.shadowBlur = 18
        ctx.stroke()

        // Inner Glass Rim Specular Highlight
        ctx.beginPath()
        ctx.arc(lensX, lensY, lensRadius - 4, Math.PI * 1.2, Math.PI * 1.8)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)'
        ctx.lineWidth = 2
        ctx.stroke()

        // Metallic Handle Stem
        ctx.beginPath()
        ctx.moveTo(lensX + lensRadius * 0.7, lensY + lensRadius * 0.7)
        ctx.lineTo(lensX + lensRadius * 1.25, lensY + lensRadius * 1.25)
        ctx.strokeStyle = '#013157'
        ctx.lineWidth = 8
        ctx.lineCap = 'round'
        ctx.stroke()
        ctx.strokeStyle = '#017D8B'
        ctx.lineWidth = 4
        ctx.stroke()

        ctx.restore()
      }

      // ── 8. POLLEN & SPORE PARTICLES ──
      if (entranceStep >= 4) {
        ctx.save()
        pollen.forEach((p) => {
          p.y -= p.speedY
          if (p.y < -0.05) p.y = 1.05
          p.phase += p.swaySpeed

          let px = (p.x + Math.sin(p.phase) * 0.02) * width + lerpX * 30
          let py = p.y * height + lerpY * 20

          // Drift towards lens focus
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
      {/* 2D/3D Specimen Interactive Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Atmospheric Radial Gradient Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-1000"
        style={{
          background: 'radial-gradient(circle at 50% 45%, rgba(1, 125, 139, 0.16) 0%, rgba(2, 9, 13, 0.85) 75%)',
          opacity: entranceStep >= 2 ? 1 : 0
        }}
      />

      {/* Top Curatorial Badge */}
      <div className="relative z-20 pt-20 sm:pt-24 px-4 text-center pointer-events-none">
        <span className="inline-block text-[10px] sm:text-xs font-mono uppercase tracking-[0.35em] text-[#01B998] opacity-85">
          ISRA Rendezvous’26 · Curatorial Edition
        </span>
      </div>

      {/* ── CENTRAL DOMINANT TYPOGRAPHY & BRANDING ── */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-4 max-w-5xl mx-auto w-full">
        
        {/* 1. RENDEZVOUS'26 Official Logo Asset (Step 07) */}
        <div
          className="mb-4 sm:mb-6 transition-all duration-1000"
          style={{
            ...layerTransform(0.18),
            opacity: entranceStep >= 7 ? 1 : 0,
            transform: `${layerTransform(0.18).transform || ''} scale(${entranceStep >= 7 ? 1 : 0.92})`,
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

        {/* 2. Primary Concept Title: DECODING PHYTOLORE (Step 08) */}
        <div
          className="transition-all duration-1000 my-2"
          style={{
            ...layerTransform(0.22),
            opacity: entranceStep >= 8 ? 1 : 0,
            transform: `${layerTransform(0.22).transform || ''} translateY(${entranceStep >= 8 ? 0 : 25}px)`
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

        {/* 3. Action Buttons (Step 09) */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8 transition-all duration-1000"
          style={{
            ...layerTransform(0.25),
            opacity: entranceStep >= 9 ? 1 : 0,
            transform: `${layerTransform(0.25).transform || ''} translateY(${entranceStep >= 9 ? 0 : 20}px)`
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

      {/* ── BOTTOM "LOOK CLOSER" SCROLL INDICATOR ── */}
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
          <div className="w-5 h-8 rounded-full border border-[#01B998]/40 flex items-start justify-center p-1 group-hover:border-[#64D431] transition-colors">
            <div className="w-1 h-2 rounded-full bg-[#64D431] animate-bounce mt-1" />
          </div>
        </button>
      </div>

    </section>
  )
}
