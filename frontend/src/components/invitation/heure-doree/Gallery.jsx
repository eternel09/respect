import { useCallback, useEffect, useRef, useState } from 'react'
import { pick } from './config'
import { useReveal } from './hooks'

/** Visionneuse plein écran : glisser, flèches, Échap. */
function Lightbox({ photos, index, onClose, onGo, t, lang }) {
  const start = useRef(null)
  const closeRef = useRef(null)
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onGo(1)
      if (e.key === 'ArrowLeft') onGo(-1)
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', key)
    closeRef.current?.focus()
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = overflow }
  }, [onClose, onGo])
  const p = photos[index]
  return (
    <div className="hd-lightbox" role="dialog" aria-modal="true" aria-label={t('gallery.dialog')} data-testid="heure-doree-lightbox" onClick={onClose}
      onTouchStart={e => { start.current = e.touches[0].clientX }}
      onTouchEnd={e => { const dx = e.changedTouches[0].clientX - (start.current ?? 0); if (Math.abs(dx) > 50) onGo(dx < 0 ? 1 : -1) }}>
      <img src={p.src} alt={pick(p.alt, lang)} onClick={e => e.stopPropagation()} />
      <button ref={closeRef} type="button" aria-label={t('gallery.close')} style={{ top: 16, right: 16 }} onClick={onClose}>✕</button>
      {photos.length > 1 && (
        <>
          <button type="button" aria-label={t('gallery.prev')} style={{ left: 10, top: '50%' }} onClick={e => { e.stopPropagation(); onGo(-1) }}>‹</button>
          <button type="button" aria-label={t('gallery.next')} style={{ right: 10, top: '50%' }} onClick={e => { e.stopPropagation(); onGo(1) }}>›</button>
        </>
      )}
      <p className="hd-caps">{index + 1} / {photos.length}</p>
    </div>
  )
}

/**
 * « Un aperçu de nous » : carrousel horizontal (glisser, aimantation), la
 * photo centrale plus grande, les voisines à moitié visibles ; une
 * cantonnière dorée fait la transition vers « Notre histoire ».
 */
export default function Gallery({ config, t, lang, reduced, preview }) {
  const ref = useReveal(reduced)
  const track = useRef(null)
  const [active, setActive] = useState(0)
  const [shown, setShown] = useState(null)
  const photos = config.gallery
  const close = useCallback(() => setShown(null), [])
  const go = useCallback(d => setShown(i => (i + d + photos.length) % photos.length), [photos.length])

  // Échelle des diapositives selon leur distance au centre (via rAF, sans re-rendu).
  useEffect(() => {
    const el = track.current
    if (!el) return
    let raf = 0
    const update = () => {
      raf = 0
      const mid = el.scrollLeft + el.clientWidth / 2
      let best = 0, bestD = Infinity
      Array.from(el.children).forEach((c, i) => {
        const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid) / c.offsetWidth
        if (d < bestD) { bestD = d; best = i }
        if (!reduced) c.style.transform = `scale(${1 - Math.min(d, 1) * 0.14})`
        c.style.opacity = String(1 - Math.min(d, 1) * 0.35)
      })
      setActive(best)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    // Démarre sur la 2e photo s'il y en a au moins 3 (la centrale encadrée par deux voisines).
    if (photos.length >= 3) { const c = el.children[1]; el.scrollLeft = c.offsetLeft + c.offsetWidth / 2 - el.clientWidth / 2 }
    update()
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { el.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf) }
  }, [photos.length, reduced])

  if (!photos.length) return <img className="hd-valance" src={config.assets.valance} alt="" aria-hidden loading="lazy" />
  return (
    <section aria-labelledby="hd-gallery-title" style={{ paddingTop: 64 }}>
      <div ref={ref} className="hd-reveal">
        <h2 id="hd-gallery-title" className="hd-script hd-h2">{pick(config.texts.galleryTitle, lang) || t('gallery.title')}</h2>
      </div>
      <div ref={track} className="hd-carousel" data-testid="heure-doree-gallery">
        {photos.map((p, i) => (
          <button key={p.src + i} type="button" className="hd-slide" disabled={preview} onClick={() => setShown(i)}
            aria-label={t('gallery.open', { n: i + 1 })}>
            <img src={p.src} alt={pick(p.alt, lang)} loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
      {photos.length > 1 && <div className="hd-dots" aria-hidden>{photos.map((_, i) => <span key={i} className={i === active ? 'on' : ''} />)}</div>}
      <img className="hd-valance" src={config.assets.valance} alt="" aria-hidden loading="lazy" width="1200" height="280" />
      {shown !== null && <Lightbox photos={photos} index={shown} onClose={close} onGo={go} t={t} lang={lang} />}
    </section>
  )
}
