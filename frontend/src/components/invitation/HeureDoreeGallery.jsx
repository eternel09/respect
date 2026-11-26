import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useScroll, useTransform } from 'motion/react'

/**
 * Galerie « Un aperçu de nous » du modèle « Heure dorée ».
 *
 * - Éventail 3D : la photo centrale encadrée d'or, ses voisines inclinées
 *   de part et d'autre. À l'entrée dans l'écran les cartes, d'abord
 *   empilées, se déploient ; puis l'éventail tourne seul (pause au toucher),
 *   se balaie au doigt, et un reflet doré traverse la photo qui arrive au
 *   centre. Toucher la photo centrale l'ouvre en plein écran.
 * - Photos en pleine largeur : révélées en rideau, l'image se pose
 *   (effet Ken Burns) puis suit le défilement en légère parallaxe.
 */

const EASE = [0.22, 1, 0.36, 1]
const SPRING = { type: 'spring', stiffness: 120, damping: 20, mass: 0.9 }
const wrap = (i, n) => ((i % n) + n) % n

/** Position d'une carte selon son écart à la carte centrale (-1, 0, 1 ; au-delà : cachée derrière). */
function slot(offset, width, reduced) {
  const side = Math.sign(offset), far = Math.abs(offset) > 1
  if (offset === 0) return { x: 0, y: 0, scale: 1, rotateY: 0, rotateZ: 0, opacity: 1, zIndex: 3, filter: 'brightness(1)' }
  return {
    x: side * width * (far ? 0.3 : 0.505), y: far ? 30 : 34, scale: far ? 0.6 : 0.76,
    rotateY: reduced ? 0 : -side * 16, rotateZ: side * 2.5,
    opacity: far ? 0 : 1, zIndex: far ? 0 : 2, filter: 'brightness(.93)',
  }
}

function Fan({ photos, reduced, preview, onOpen, paused }) {
  const box = useRef(null)
  const inView = useInView(box, { amount: 0.45 })
  const [entered, setEntered] = useState(preview || reduced)
  const [index, setIndex] = useState(0)
  const [width, setWidth] = useState(390)
  const [hold, setHold] = useState(false)
  const n = photos.length
  if (inView && !entered) setEntered(true)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Rotation automatique (pas en aperçu, ni en mouvement réduit, ni pendant un toucher).
  useEffect(() => {
    if (!entered || !inView || preview || reduced || paused || hold || n < 2) return
    const id = setTimeout(() => setIndex(i => i + 1), 4200)
    return () => clearTimeout(id)
  }, [entered, inView, preview, reduced, paused, hold, n, index])

  const go = (d) => setIndex(i => i + d)
  const current = wrap(index, n)

  return (
    <div className="relative w-full" style={{ aspectRatio: '390 / 306', perspective: 1100 }}>
      <motion.div ref={box} className="absolute inset-0 touch-pan-y" aria-roledescription="carrousel" aria-label="Photos du couple"
        onPanStart={() => setHold(true)}
        onPanEnd={(_, info) => { setHold(false); if (Math.abs(info.offset.x) > 40) go(info.offset.x < 0 ? 1 : -1) }}
        onPointerDown={() => setHold(true)} onPointerUp={() => setHold(false)} onPointerCancel={() => setHold(false)}>
        {photos.map((src, j) => {
          let off = wrap(j - index, n)
          if (off > n / 2) off -= n
          const target = entered ? slot(off, width, reduced) : { x: 0, y: 50, scale: 0.55, rotateY: 0, rotateZ: (j % 3 - 1) * 5, opacity: 0, zIndex: 1, filter: 'brightness(1)' }
          const center = off === 0
          return (
            <motion.button key={src + j} type="button" tabIndex={center ? 0 : -1}
              aria-label={center ? `Agrandir la photo ${current + 1} sur ${n}` : `Voir la photo ${j + 1}`}
              className="hd-frame absolute left-1/2 top-0 p-2 cursor-pointer"
              style={{ width: '52.3%', height: '100%', marginLeft: '-26.15%', transformStyle: 'preserve-3d', boxShadow: '0 22px 40px -22px rgba(91,81,70,.55)' }}
              initial={false} animate={target}
              transition={entered && !reduced ? { ...SPRING, delay: preview ? 0 : center ? 0 : 0.12 } : { duration: 0 }}
              onClick={() => { if (preview) return; if (center) onOpen(src); else go(off) }}>
              <span className="block w-full h-full overflow-hidden relative">
                <motion.img src={src} alt="" draggable={false} loading="lazy" decoding="async" className="w-full h-full object-cover pointer-events-none"
                  style={{ objectPosition: 'center 30%' }}
                  animate={center && !reduced && !preview ? { scale: [1.0, 1.07] } : { scale: 1 }}
                  transition={center ? { duration: 6, ease: 'easeOut' } : { duration: 0.6 }} />
                {center && entered && !preview && <span key={index} className="hd-sheen" />}
              </span>
            </motion.button>
          )
        })}
      </motion.div>
      {n > 1 && (
        <div className="absolute -bottom-9 left-0 right-0 flex justify-center items-center gap-2.5" aria-hidden>
          {photos.map((_, j) => (
            <motion.span key={j} className="block h-[5px]"
              animate={{ width: j === current ? 14 : 5, opacity: j === current ? 1 : 0.4 }} transition={{ duration: 0.4 }}
              style={{ background: 'linear-gradient(135deg,#B8924A,#E6CF9A 45%,#C9A55C 55%,#9C7A3C)', transform: j === current ? 'none' : 'rotate(45deg)' }} />
          ))}
        </div>
      )}
    </div>
  )
}

/** Photo pleine largeur : rideau, Ken Burns puis parallaxe. */
function Curtained({ src, ratio, from = 'top', reduced, preview, onOpen, objectPosition }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-7%', '7%'])
  const hidden = { top: 'inset(0% 0% 100% 0%)', left: 'inset(0% 100% 0% 0%)', right: 'inset(0% 0% 0% 100%)' }[from]
  const still = reduced || preview
  return (
    <motion.button ref={ref} type="button" onClick={() => !preview && onOpen(src)} aria-label="Agrandir la photo"
      className="hd-frame block w-full relative cursor-pointer" style={{ aspectRatio: ratio, boxShadow: '0 22px 40px -26px rgba(91,81,70,.5)' }}
      // Le cadre (visible) déclenche tout : un élément entièrement masqué par clip-path n'est jamais « dans l'écran ».
      initial={still ? false : 'hidden'} whileInView="shown" viewport={{ once: true, margin: '-60px' }}
      variants={{ hidden: { opacity: 0, y: 28 }, shown: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } } }}>
      <motion.span className="block w-full h-full overflow-hidden relative"
        variants={{ hidden: { clipPath: hidden }, shown: { clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: 1.3, delay: 0.15, ease: [0.77, 0, 0.18, 1] } } }}>
        <motion.img src={src} alt="" loading="lazy" decoding="async" draggable={false}
          className="absolute left-0 w-full object-cover pointer-events-none" style={{ top: '-8%', height: '116%', objectPosition, y: still ? 0 : y }}
          variants={{ hidden: { scale: 1.25 }, shown: { scale: 1, transition: { duration: 2.4, delay: 0.15, ease: EASE } } }} />
        {!still && <motion.span className="absolute inset-0 pointer-events-none"
          variants={{ hidden: { opacity: 0 }, shown: { opacity: 1, transition: { delay: 1.1 } } }}><span className="hd-sheen" /></motion.span>}
      </motion.span>
    </motion.button>
  )
}

/** Visionneuse plein écran : glisser, flèches, Échap ; zoom depuis la photo touchée. */
function Lightbox({ photos, start, onClose }) {
  const [i, setI] = useState(start)
  const [dir, setDir] = useState(0)
  const n = photos.length
  const go = useCallback((d) => { setDir(d); setI(v => wrap(v + d, n)) }, [n])
  const closeBtn = useRef(null)
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1) }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', key)
    closeBtn.current?.focus()
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = overflow }
  }, [go, onClose])
  // Précharge les voisines.
  useEffect(() => { [1, -1].forEach(d => { const im = new Image(); im.src = photos[wrap(i + d, n)] }) }, [i, n, photos])

  const btn = 'absolute h-11 w-11 rounded-full flex items-center justify-center text-[22px] leading-none'
  const btnStyle = { background: 'rgba(248,244,236,.1)', border: '1px solid rgba(201,165,92,.6)', color: '#E6CF9A' }
  return (
    <motion.div className="fixed inset-0 z-[80] flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Galerie photo"
      data-testid="hd-lightbox" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(46,36,26,.95), rgba(18,14,10,.98))' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} onClick={onClose}>
      <AnimatePresence initial={false} custom={dir} mode="popLayout">
        <motion.img key={i} src={photos[i]} alt="" draggable={false} custom={dir}
          className="max-h-[80svh] max-w-[90vw] object-contain cursor-grab active:cursor-grabbing"
          style={{ boxShadow: '0 0 0 1px #C9A55C, 0 0 0 7px rgba(18,14,10,.7), 0 0 0 8px rgba(230,207,154,.45), 0 40px 80px -30px #000' }}
          variants={{
            enter: (d) => ({ opacity: 0, x: d * 120, scale: d ? 0.94 : 0.86, rotateZ: d * 2 }),
            center: { opacity: 1, x: 0, scale: 1, rotateZ: 0 },
            exit: (d) => ({ opacity: 0, x: d * -120, scale: 0.94, rotateZ: d * -2 }),
          }}
          initial="enter" animate="center" exit="exit" transition={{ ...SPRING, opacity: { duration: 0.25 } }}
          drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.55}
          onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 60) go(info.offset.x < 0 ? 1 : -1) }}
          onClick={e => e.stopPropagation()} />
      </AnimatePresence>
      <button ref={closeBtn} type="button" aria-label="Fermer" className={`${btn} top-4 right-4`} style={btnStyle} onClick={onClose}>×</button>
      {n > 1 && (
        <>
          <button type="button" aria-label="Photo précédente" className={`${btn} left-3 top-1/2 -translate-y-1/2`} style={btnStyle} onClick={e => { e.stopPropagation(); go(-1) }}>‹</button>
          <button type="button" aria-label="Photo suivante" className={`${btn} right-3 top-1/2 -translate-y-1/2`} style={btnStyle} onClick={e => { e.stopPropagation(); go(1) }}>›</button>
        </>
      )}
      <p className="absolute bottom-6 inset-x-0 text-center hd-caps" style={{ color: '#E6CF9A' }}>{i + 1} / {n}</p>
    </motion.div>
  )
}

export default function HeureDoreeGallery({ photos, reduced, preview }) {
  const [open, setOpen] = useState(null)
  const close = useCallback(() => setOpen(null), [])
  if (!photos.length) return null
  const fan = photos.length >= 5 ? photos.slice(0, -2) : photos.length >= 3 ? photos : []
  const stacked = photos.length >= 5 ? photos.slice(-2) : photos.length < 3 ? photos : []
  const show = (src) => setOpen(Math.max(0, photos.indexOf(src)))
  return (
    <div data-testid="hd-gallery">
      {fan.length > 0 && <div className="mt-10 mb-12"><Fan photos={fan} reduced={reduced} preview={preview} onOpen={show} paused={open !== null} /></div>}
      {stacked.length > 0 && (
        <div className="mx-auto mt-5 flex flex-col gap-5" style={{ width: '83.6%' }}>
          {stacked.map((src, k) => (
            <Curtained key={src} src={src} ratio={k % 2 ? '326 / 226' : '326 / 403'} from={k % 2 ? 'left' : 'top'}
              objectPosition={k % 2 ? '52% center' : 'center 20%'} reduced={reduced} preview={preview} onOpen={show} />
          ))}
        </div>
      )}
      <AnimatePresence>{open !== null && <Lightbox photos={photos} start={open} onClose={close} />}</AnimatePresence>
    </div>
  )
}
