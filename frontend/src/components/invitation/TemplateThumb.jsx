import { useEffect, useRef, useState } from 'react'

/**
 * Vignette d'un modèle : la page rendue à sa largeur réelle (390 px), réduite
 * à la largeur de la carte du catalogue. Aucune interaction à l'intérieur.
 */
export default function TemplateThumb({ children, background = '#f6f2ea' }) {
  const box = useRef(null)
  const [scale, setScale] = useState(0.4)
  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / 390))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={box} className="relative w-full aspect-[9/14] overflow-hidden rounded-lg" style={{ background }} aria-hidden>
      <div className="absolute left-0 top-0 w-[390px] origin-top-left pointer-events-none select-none" style={{ transform: `scale(${scale})` }} inert>
        {children}
      </div>
    </div>
  )
}
