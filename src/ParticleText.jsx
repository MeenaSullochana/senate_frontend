import { useEffect, useRef } from 'react'
import './ParticleText.css'

const hexToRgb = (hex) => {
  const n = hex.replace('#', '')
  const v = n.length === 3 ? n.split('').map((c) => c + c).join('') : n
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  }
}

const easeOutCubic = (t) => 1 - (1 - t) ** 3

const ParticleText = ({
  text = 'Particle Text',
  particleSize = 2.2,
  density = 4,
  color = '#f8fafc',
  highlightColor = '#8b5cf6',
  scatter = 190,
  gatherDuration = 1600,
  stagger = 420,
  pointerRepel = 42,
  repelRadius = 120,
  idleDrift = 0.8,
  trigger = 'mount',
  fontSize = 'clamp(3.5rem, 13vw, 9rem)',
  fontWeight = 800,
  fontFamily = 'inherit',
  glow = false,
  className = '',
}) => {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return undefined

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return undefined

    const base = hexToRgb(color)
    const hi = hexToRgb(highlightColor)
    const pointer = { x: -9999, y: -9999, active: false }
    let particles = []
    let raf = 0
    let started = trigger === 'mount'
    let startAt = started ? performance.now() : 0
    let running = true

    const resolveFont = () => {
      const probe = document.createElement('span')
      probe.style.cssText = `position:absolute;visibility:hidden;font-size:${fontSize};font-weight:${fontWeight};font-family:${fontFamily}`
      probe.textContent = 'M'
      wrap.appendChild(probe)
      const size = parseFloat(getComputedStyle(probe).fontSize)
      const family = getComputedStyle(probe).fontFamily
      probe.remove()
      return { size, family }
    }

    const sample = () => {
      const { width, height } = wrap.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const { size: startSize, family } = resolveFont()
      const off = document.createElement('canvas')
      off.width = Math.max(1, Math.floor(width))
      off.height = Math.max(1, Math.floor(height))
      const octx = off.getContext('2d')
      octx.clearRect(0, 0, off.width, off.height)
      octx.fillStyle = '#fff'
      octx.textAlign = 'left'
      octx.textBaseline = 'top'

      const lines = String(text).split('\n')
      const padX = Math.max(18, particleSize * 5 + (glow ? 14 : 0))
      const padY = Math.max(12, particleSize * 4 + (glow ? 10 : 0))
      const fitW = Math.max(40, width - padX * 2)
      const fitH = Math.max(40, height - padY * 2)

      const measure = (s) => {
        octx.font = `${fontWeight} ${s}px ${family}`
        const metrics = lines.map((line) => octx.measureText(line).width)
        const lineH = s * 1.14
        return {
          metrics,
          blockW: Math.max(...metrics, 0),
          lineH,
          blockH: lineH * lines.length,
        }
      }

      let size = startSize
      let m = measure(size)
      while ((m.blockW > fitW || m.blockH > fitH) && size > 10) {
        const sx = m.blockW > 0 ? fitW / m.blockW : 1
        const sy = m.blockH > 0 ? fitH / m.blockH : 1
        size = Math.max(10, size * Math.min(sx, sy, 0.97))
        m = measure(size)
      }

      const ox = padX
      const oy = padY + Math.max(0, (fitH - m.blockH) / 2)

      lines.forEach((line, i) => {
        octx.fillText(line, ox, oy + i * m.lineH)
      })

      const data = octx.getImageData(0, 0, off.width, off.height).data
      const step = Math.max(2, Math.round(density))
      const next = []
      for (let y = 0; y < off.height; y += step) {
        for (let x = 0; x < off.width; x += step) {
          if (data[(y * off.width + x) * 4 + 3] > 140) {
            const angle = Math.random() * Math.PI * 2
            const dist = (0.35 + Math.random() * 0.65) * scatter
            next.push({
              hx: x,
              hy: y,
              x: x + Math.cos(angle) * dist,
              y: y + Math.sin(angle) * dist,
              delay: Math.random() * stagger,
              seed: Math.random() * Math.PI * 2,
              mix: Math.random(),
            })
          }
        }
      }
      particles = next
    }

    const draw = (now) => {
      if (!running) return
      raf = requestAnimationFrame(draw)
      const { width, height } = wrap.getBoundingClientRect()
      ctx.clearRect(0, 0, width, height)
      if (glow) {
        ctx.shadowColor = color
        ctx.shadowBlur = 4
      } else {
        ctx.shadowBlur = 0
      }

      const t0 = started ? now - startAt : 0
      particles.forEach((p) => {
        const local = Math.max(0, Math.min(1, (t0 - p.delay) / gatherDuration))
        const gather = started ? easeOutCubic(local) : 0
        let x = p.x + (p.hx - p.x) * gather
        let y = p.y + (p.hy - p.y) * gather

        if (gather > 0.85) {
          const drift = idleDrift * (1 - Math.abs(gather - 1))
          x += Math.sin(now * 0.0012 + p.seed) * drift
          y += Math.cos(now * 0.001 + p.seed) * drift
        }

        if (pointer.active) {
          const dx = x - pointer.x
          const dy = y - pointer.y
          const d = Math.hypot(dx, dy)
          if (d < repelRadius && d > 0.001) {
            const f = ((repelRadius - d) / repelRadius) * pointerRepel
            x += (dx / d) * f
            y += (dy / d) * f
          }
        }

        const k = p.mix * 0.18
        ctx.fillStyle = `rgb(${Math.round(base.r + (hi.r - base.r) * k)},${Math.round(
          base.g + (hi.g - base.g) * k,
        )},${Math.round(base.b + (hi.b - base.b) * k)})`
        ctx.beginPath()
        ctx.arc(x, y, particleSize, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    const onMove = (e) => {
      const rect = wrap.getBoundingClientRect()
      const point = e.touches ? e.touches[0] : e
      pointer.x = point.clientX - rect.left
      pointer.y = point.clientY - rect.top
      pointer.active = true
    }
    const onLeave = () => {
      pointer.active = false
    }
    const start = () => {
      if (started) return
      started = true
      startAt = performance.now()
    }

    sample()
    raf = requestAnimationFrame(draw)
    const ro = new ResizeObserver(() => sample())
    ro.observe(wrap)
    wrap.addEventListener('pointermove', onMove)
    wrap.addEventListener('pointerleave', onLeave)
    wrap.addEventListener('touchmove', onMove, { passive: true })
    if (trigger === 'hover') wrap.addEventListener('pointerenter', start)
    if (trigger === 'inview') {
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) start()
        },
        { threshold: 0.35 },
      )
      io.observe(wrap)
      wrap._io = io
    }

    return () => {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      wrap.removeEventListener('pointermove', onMove)
      wrap.removeEventListener('pointerleave', onLeave)
      wrap.removeEventListener('touchmove', onMove)
      wrap.removeEventListener('pointerenter', start)
      wrap._io?.disconnect()
    }
  }, [
    text,
    particleSize,
    density,
    color,
    highlightColor,
    scatter,
    gatherDuration,
    stagger,
    pointerRepel,
    repelRadius,
    idleDrift,
    trigger,
    fontSize,
    fontWeight,
    fontFamily,
    glow,
  ])

  return (
    <span ref={wrapRef} className={`particle-text${className ? ` ${className}` : ''}`}>
      <canvas ref={canvasRef} className="particle-text__canvas" />
      <span className="particle-text__sr">{text}</span>
    </span>
  )
}

export default ParticleText
