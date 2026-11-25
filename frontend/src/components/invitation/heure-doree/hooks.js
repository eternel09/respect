import { useEffect, useRef, useState } from 'react'

/**
 * Apparition au défilement : ajoute la classe `is-in` quand l'élément entre
 * dans l'écran (une seule fois). Ses enfants directs s'animent en cascade
 * (fondu + 24 px, 700 ms, décalage 120 ms — voir heure-doree.css).
 */
export function useReveal(disabled = false) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (disabled || typeof IntersectionObserver === 'undefined') { el.classList.add('is-in'); return }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('is-in'); io.disconnect() }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 })
    io.observe(el)
    return () => io.disconnect()
  }, [disabled])
  return ref
}

/** Heure courante, rafraîchie à l'intervalle donné. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id) }, [ms])
  return now
}

/** prefers-reduced-motion, suivi en direct. */
export function usePrefersReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const on = () => setReduced(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return reduced
}
