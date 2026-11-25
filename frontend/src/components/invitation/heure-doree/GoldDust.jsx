import { useEffect, useRef } from 'react'

/**
 * Poussière d'or qui flotte par-dessus la page : un canvas léger (une
 * quarantaine de particules, densité de pixels plafonnée, pause quand
 * l'onglet est masqué). Désactivée en mouvement réduit.
 */
export default function GoldDust({ count = 40 }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let w = 0, h = 0, raf = 0, last = performance.now()
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const n = w < 500 ? Math.round(count * 0.8) : count
    const P = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h, r: 0.6 + Math.random() * 1.6,
      vy: -(4 + Math.random() * 10), vx: (Math.random() - 0.5) * 4, ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.4,
    }))
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      ctx.clearRect(0, 0, w, h)
      for (const p of P) {
        p.y += p.vy * dt; p.x += (p.vx + Math.sin(now / 1800 + p.ph) * 3) * dt
        if (p.y < -6) { p.y = h + 6; p.x = Math.random() * w }
        const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(now / 1000 * p.sp + p.ph))
        ctx.globalAlpha = a
        ctx.fillStyle = p.r > 1.6 ? '#f6e2a1' : '#d9b45a'
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick) } }
    raf = requestAnimationFrame(tick)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', vis)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', vis) }
  }, [count])
  return <canvas ref={ref} className="hd-dust" aria-hidden />
}
