import { useEffect, useImperativeHandle, useRef } from 'react'

/**
 * Particules d'ambiance sur un canvas plein écran (pétales, confettis,
 * paillettes) + gerbes ponctuelles déclenchées par `ref.current.burst(x, y)`.
 * Léger : un seul canvas, requestAnimationFrame, mis en pause onglet caché.
 */
export default function ParticleField({ ref, kind = 'sparkles', colors = ['#fff'], density = 1, calm = false }) {
  const canvasRef = useRef(null)
  const state = useRef({ ambient: [], bursts: [], w: 0, h: 0 })

  useImperativeHandle(ref, () => ({
    burst(x, y, count = 90, spread = 1) {
      const s = state.current
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2
        const v = (2 + Math.random() * 7) * spread
        s.bursts.push(make(kind === 'petals' ? 'petals' : kind === 'sparkles' ? 'sparkles' : 'confetti', colors, {
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, life: 1, decay: 0.006 + Math.random() * 0.01, gravity: 0.12,
        }))
        // Paillettes de gerbe plus grosses que celles d'ambiance.
        const last = s.bursts[s.bursts.length - 1]
        if (last.kind === 'sparkles') last.size = 1.6 + Math.random() * 2.8
      }
    },
  }), [kind, colors])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const s = state.current
    let raf = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      s.w = window.innerWidth; s.h = window.innerHeight
      canvas.width = s.w * dpr; canvas.height = s.h * dpr
      canvas.style.width = s.w + 'px'; canvas.style.height = s.h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const target = calm ? 0 : Math.round((s.w * s.h) / 22000 * density)
      s.ambient = Array.from({ length: target }, () => make(kind, colors, { x: Math.random() * s.w, y: Math.random() * s.h }))
    }
    resize()
    window.addEventListener('resize', resize)

    const tick = () => {
      ctx.clearRect(0, 0, s.w, s.h)
      for (const p of s.ambient) {
        step(p, s)
        if (p.y > s.h + 20) { Object.assign(p, make(kind, colors, { x: Math.random() * s.w, y: -20 })) }
        if (p.x < -20) p.x = s.w + 20; else if (p.x > s.w + 20) p.x = -20
        draw(ctx, p)
      }
      s.bursts = s.bursts.filter(p => p.life > 0)
      for (const p of s.bursts) { step(p, s); p.life -= p.decay; draw(ctx, p) }
      raf = requestAnimationFrame(tick)
    }
    const onVis = () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    document.addEventListener('visibilitychange', onVis)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVis) }
  }, [kind, colors, density, calm])

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[1]" />
}

function make(kind, colors, o = {}) {
  const color = colors[Math.floor(Math.random() * colors.length)]
  const base = { kind, color, rot: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.06, t: Math.random() * 100, life: 1, gravity: 0, ...o }
  if (kind === 'petals') return { size: 6 + Math.random() * 7, vx: o.vx ?? (Math.random() - 0.5) * 0.6, vy: o.vy ?? 0.5 + Math.random() * 0.9, sway: 0.6 + Math.random(), ...base }
  if (kind === 'confetti') return { size: 5 + Math.random() * 6, vx: o.vx ?? (Math.random() - 0.5) * 0.8, vy: o.vy ?? 0.8 + Math.random() * 1.2, sway: 0.4, ...base }
  return { size: 0.8 + Math.random() * 2.2, vx: o.vx ?? (Math.random() - 0.5) * 0.25, vy: o.vy ?? 0.15 + Math.random() * 0.35, sway: 0.2, ...base }
}

function step(p) {
  p.t += 0.02
  p.vy += p.gravity
  if (p.gravity) { p.vx *= 0.985; p.vy = Math.min(p.vy, 4) }
  p.x += p.vx + Math.sin(p.t * 2) * p.sway * 0.4
  p.y += p.vy
  p.rot += p.spin
}

function draw(ctx, p) {
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, p.life))
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rot)
  ctx.fillStyle = p.color
  if (p.kind === 'petals') {
    ctx.scale(1, 0.55 + Math.abs(Math.sin(p.t * 3)) * 0.45) // pétale qui tournoie
    ctx.beginPath()
    ctx.moveTo(0, -p.size)
    ctx.bezierCurveTo(p.size, -p.size * 0.6, p.size * 0.7, p.size * 0.7, 0, p.size)
    ctx.bezierCurveTo(-p.size * 0.7, p.size * 0.7, -p.size, -p.size * 0.6, 0, -p.size)
    ctx.fill()
  } else if (p.kind === 'confetti') {
    ctx.scale(1, Math.cos(p.t * 4)) // retournement
    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
  } else {
    const tw = 0.45 + Math.abs(Math.sin(p.t * 2.5)) * 0.55 // scintillement
    ctx.globalAlpha *= tw
    ctx.shadowColor = p.color; ctx.shadowBlur = 8
    ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill()
    if (p.size > 2) { ctx.fillRect(-p.size * 3, -0.4, p.size * 6, 0.8); ctx.fillRect(-0.4, -p.size * 3, 0.8, p.size * 6) }
  }
  ctx.restore()
}
