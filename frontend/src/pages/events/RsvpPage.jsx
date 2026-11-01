import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react'
import api, { API_BASE, apiErrorMessage } from '../../lib/axios'
import Icon from '../../components/ui/Icon'
import Envelope from '../../components/invitation/Envelope'
import InviteCard from '../../components/invitation/InviteCard'
import CartonCard from '../../components/invitation/CartonCard'
import PhotoBackdrop from '../../components/invitation/PhotoBackdrop'
import Countdown from '../../components/invitation/Countdown'
import ParticleField from '../../components/invitation/ParticleField'
import { calendarHref, eventNames, googleCalendarUrl, hashtag, isAndroid, loadInvitationFonts, longDate, mapsUrl, resolveTheme, sealOf, startOf } from '../../lib/invitationTheme'

const seenKey = (token) => `inv-open:${token}`
const readSeen = (token) => { try { return localStorage.getItem(seenKey(token)) === '1' } catch { return false } }
const writeSeen = (token) => { try { localStorage.setItem(seenKey(token), '1') } catch { /* stockage indisponible */ } }

const BOKEH = [
  [8, 12, 180, 0], [72, 6, 220, 2], [40, 38, 160, 4], [85, 55, 200, 1], [12, 70, 240, 3], [55, 88, 190, 5],
]

/**
 * Invitation en ligne de l'invité, ouverte via le lien reçu sur WhatsApp
 * (`/confirmer/{token}`) : enveloppe scellée à ouvrir, carte d'invitation qui
 * en sort, puis le faire-part (date, lieu, compte à rebours), la confirmation
 * de présence, le pass d'accès (QR) et l'ajout à l'agenda du téléphone.
 * Aucun compte requis — le jeton fait foi.
 */
export default function RsvpPage() {
  const { token } = useParams()
  const reduced = useReducedMotion()
  const [data, setData] = useState(null)      // { guest, occasion }
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)  // { status, table, message }
  const [stage, setStage] = useState(() => (readSeen(token) ? 'revealed' : 'sealed'))
  const fx = useRef(null)
  const envRef = useRef(null)
  const rsvpRef = useRef(null)

  // Carton du client (s'il remplace la carte) : préchargé pour connaître ses
  // proportions ; en cas d'échec, la carte Signiq reprend sa place.
  const [carton, setCarton] = useState(null) // { src, ratio } | 'failed'

  const fontKey = data?.occasion?.theme?.font
  useEffect(() => { loadInvitationFonts(fontKey) }, [fontKey])

  const hasCarton = !!data?.occasion?.carton
  useEffect(() => {
    if (!hasCarton) return
    const src = `${API_BASE}/rsvp/${token}/carton`
    const img = new Image()
    img.onload = () => setCarton({ src, ratio: img.naturalWidth / img.naturalHeight })
    img.onerror = () => setCarton('failed')
    img.src = src
    return () => { img.onload = null; img.onerror = null }
  }, [hasCarton, token])

  const load = useCallback(() => {
    api.get(`/rsvp/${token}`)
      .then(res => { setData(res.data); setResult({ status: res.data.guest.status, table: res.data.guest.table }) })
      .catch(e => setErr(apiErrorMessage(e, 'Cette invitation est introuvable ou a expiré.')))
      .finally(() => setLoading(false))
  }, [token])
  useEffect(load, [load])

  const burstAt = (el, fx_, rx = 0.5, ry = 0.5, count = 110) => {
    const r = el?.getBoundingClientRect()
    if (r) fx_?.burst(r.left + r.width * rx, r.top + r.height * ry, count)
  }

  const open = () => {
    if (stage !== 'sealed') return
    if (reduced) { setStage('revealed'); writeSeen(token); return }
    setStage('opening')
    setTimeout(() => burstAt(envRef.current, fx.current, 0.5, 0.6, 120), 140)
    setTimeout(() => burstAt(envRef.current, fx.current, 0.5, -0.1, 60), 1300)
    setTimeout(() => { setStage('revealed'); writeSeen(token) }, 2300)
  }

  const respond = async (status) => {
    setBusy(true)
    try {
      const res = await api.post(`/rsvp/${token}`, { status })
      setResult({ status: res.data.status, table: res.data.table, message: res.data.message })
      if (status === 'confirm' && !reduced) {
        burstAt(rsvpRef.current, fx.current, 0.5, 0.3, 160)
        setTimeout(() => burstAt(rsvpRef.current, fx.current, 0.2, 0.2, 70), 250)
        setTimeout(() => burstAt(rsvpRef.current, fx.current, 0.8, 0.2, 70), 420)
      }
    } catch (e) {
      setErr(apiErrorMessage(e, "Impossible d'enregistrer votre réponse. Réessayez."))
    } finally { setBusy(false) }
  }

  if (loading) return (
    <div className="min-h-svh flex items-center justify-center" style={{ background: '#f7f0e6' }}>
      <span className="inline-block animate-spin h-8 w-8 border-2 border-[#c99a3e] border-t-transparent rounded-full" />
    </div>
  )

  if (err && !data) return (
    <div className="min-h-svh flex items-center justify-center p-6" style={{ background: '#f7f0e6' }}>
      <div className="max-w-sm w-full bg-white/80 rounded-2xl ring-1 ring-black/5 shadow-sm p-8 text-center">
        <div className="text-4xl mb-3">💌</div>
        <p className="text-gray-600">{err}</p>
      </div>
    </div>
  )

  const { guest, occasion } = data
  const t = resolveTheme(occasion)
  const { title, couple } = eventNames(occasion.name)
  const confirmed = result?.status === 'confirmed'
  const declined = result?.status === 'declined'
  const tableLabel = result?.table ? (/^\d+$/.test(result.table) ? `Table ${result.table}` : result.table) : null
  const phrase = couple
    ? (occasion.type === 'mariage' ? 'ont la joie de vous convier à leur mariage' : 'ont le plaisir de vous convier')
    : `${occasion.organization} a le plaisir de vous convier`
  const noCard = occasion.theme?.card === 'none'
  const sparkles = occasion.theme?.sparkles !== false
  const photoMode = occasion.theme?.photo || 'arch'
  const photoBg = !!occasion.cover_url && photoMode !== 'arch'
  const photoArch = !!occasion.cover_url && photoMode !== 'background'
  const showCarton = occasion.carton && carton !== 'failed'
  const card = (full) => showCarton
    ? <CartonCard src={carton?.src || `${API_BASE}/rsvp/${token}/carton`} ratio={carton?.ratio} full={full} theme={t}
        onError={() => setCarton('failed')} />
    : <InviteCard occasion={occasion} guest={guest} theme={t} />

  // Apparition en cascade du faire-part, puis au défilement.
  const rise = (i) => reduced ? {} : {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.55 + i * 0.16, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  }
  const onView = reduced ? {} : {
    initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' }, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  }

  return (
    <div className="relative min-h-svh overflow-x-hidden"
      style={{ background: `radial-gradient(130% 80% at 50% 0%, #fbf7f1 0%, ${t.ivory} 55%, #efe3d3 100%)`, color: t.ink, ...t.fontVars }}>
      {/* Photo du couple en fond (si l'organisateur l'a choisie) */}
      {photoBg && <PhotoBackdrop src={occasion.cover_url} ivory={t.ivory} />}
      {/* Bokeh doré */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {BOKEH.map(([x, y, s, d], i) => (
          <span key={i} className="absolute rounded-full blur-2xl"
            style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, marginLeft: -s / 2,
              background: 'radial-gradient(circle, rgba(222,184,110,.38), rgba(222,184,110,0) 70%)',
              animation: reduced ? 'none' : `inv-bokeh ${9 + d}s ease-in-out ${-d * 1.7}s infinite` }} />
        ))}
      </div>
      {sparkles && <ParticleField ref={fx} kind="sparkles" colors={t.sparkles} density={0.9} calm={!!reduced} />}

      <LayoutGroup>
        <AnimatePresence mode="popLayout" initial={false}>
          {stage !== 'revealed' ? (
            <motion.section key="intro" className="relative z-10 min-h-svh flex flex-col items-center justify-center px-4 pb-10"
              exit={{ opacity: 0, transition: { duration: 0.5 } }}>
              <motion.div className="text-center mb-14"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: stage === 'opening' ? 0 : 1, y: 0 }}
                transition={{ duration: stage === 'opening' ? 0.6 : 1, delay: stage === 'opening' ? 0.5 : 0.2 }}>
                <p className="inv-jost text-[12px] font-medium tracking-[0.42em] uppercase" style={{ color: t.ink }}>Une lettre pour vous</p>
                <h1 className="inv-script text-[44px] sm:text-[52px] leading-tight mt-2" style={{ color: t.ink }}>{guest.name}</h1>
              </motion.div>

              <motion.div ref={envRef}
                initial={{ opacity: 0, y: 40, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ y: 420, opacity: 0, transition: { duration: 0.75, ease: [0.55, 0, 0.75, 0.2] } }}
                transition={{ duration: 1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}>
                <Envelope theme={t} mono={sealOf(occasion)} opening={stage === 'opening'} onOpen={open}>
                  {!noCard && <motion.div layoutId="invite-card">{card(false)}</motion.div>}
                </Envelope>
              </motion.div>

              <motion.p className="mt-16 inv-jost text-[12px] tracking-[0.3em] uppercase flex items-center gap-2"
                style={{ color: t.muted }}
                animate={stage === 'opening' ? { opacity: 0 } : { opacity: [0.45, 1, 0.45] }}
                transition={stage === 'opening' ? { duration: 0.3 } : { duration: 2.4, repeat: Infinity }}>
                <Icon name="touch_app" size={16} /> Touchez le sceau pour ouvrir
              </motion.p>
            </motion.section>
          ) : (
            <motion.main key="content" className="relative z-10 mx-auto max-w-md px-4 pt-8 pb-12 text-center">
              {!noCard && (
                <motion.div layoutId="invite-card" className="mx-auto" style={{ width: 'min(92vw, 384px)' }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
                  <Tilt disabled={reduced}>{card(true)}</Tilt>
                </motion.div>
              )}

              {photoArch && (
                <motion.div {...rise(0)} className="mx-auto mt-10 rounded-t-full p-[3px]"
                  style={{ width: 'min(64vw, 240px)', background: t.gold, boxShadow: '0 18px 40px -18px rgba(60,10,20,.45)' }}>
                  <img src={occasion.cover_url} alt="" className="block w-full aspect-[3/4] object-cover rounded-t-full" />
                </motion.div>
              )}

              <motion.p {...rise(0)} className="mt-9 inv-jost text-[11.5px] font-medium tracking-[0.34em] uppercase" style={{ color: t.ink }}>
                {couple && occasion.type === 'mariage' ? 'Avec leurs familles' : t.label}
              </motion.p>
              <motion.h1 {...rise(1)} className="inv-script text-[54px] leading-[1.05] mt-3" style={{ color: t.ink }}>
                {couple ? (<>{couple[0]} &amp;<br /><span className="pl-10">{couple[1]}</span></>) : title}
              </motion.h1>
              <motion.p {...rise(2)} className="inv-serif italic text-[20px] mt-4" style={{ color: t.muted }}>{phrase}</motion.p>

              <motion.div {...rise(3)}>
                <Ornament color={t.goldInk} />
                <p className="inv-jost font-medium text-[15px] tracking-[0.16em] uppercase" style={{ color: t.ink }}>{longDate(occasion)}</p>
                {occasion.location && <p className="inv-jost text-[14px] mt-1.5" style={{ color: t.muted }}>{occasion.location}</p>}
                {occasion.message && (
                  <p className="inv-serif italic text-[18px] leading-relaxed mt-6 px-2 whitespace-pre-line" style={{ color: t.ink }}>« {occasion.message} »</p>
                )}
              </motion.div>

              {!occasion.is_expired && (
                <motion.div {...rise(4)} className="mt-9"><Countdown target={startOf(occasion)} theme={t} /></motion.div>
              )}

              {/* Réponse */}
              <motion.div {...rise(5)} ref={rsvpRef} className="mt-10">
                {occasion.is_expired ? (
                  <p className="inv-serif italic text-lg" style={{ color: t.muted }}>Cet événement est passé. Merci d'en avoir fait partie.</p>
                ) : confirmed ? (
                  <div>
                    <CheckMark theme={t} />
                    <p className="inv-script text-[34px] mt-1" style={{ color: t.ink }}>Merci, à très bientôt !</p>
                    <p className="inv-jost text-[13px] tracking-[0.16em] uppercase mt-1" style={{ color: t.muted }}>
                      Présence confirmée{tableLabel && <> · <b style={{ color: t.ink }}>{tableLabel}</b></>}
                    </p>
                    <button onClick={() => respond('decline')} disabled={busy} className="mt-4 inv-jost text-xs underline underline-offset-4 disabled:opacity-50" style={{ color: t.muted }}>
                      Finalement, je ne pourrai pas venir
                    </button>
                  </div>
                ) : declined ? (
                  <div>
                    <p className="inv-serif italic text-xl" style={{ color: t.ink }}>Vous nous manquerez. Merci pour votre réponse.</p>
                    <button onClick={() => respond('confirm')} disabled={busy}
                      className="mt-4 inv-jost text-[12px] font-semibold tracking-[0.22em] uppercase underline underline-offset-4 disabled:opacity-50" style={{ color: t.main }}>
                      Je serai finalement présent(e)
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <motion.button onClick={() => respond('confirm')} disabled={busy} whileTap={{ scale: 0.96 }}
                      className="relative overflow-hidden rounded-full px-8 py-3.5 inv-jost text-[12.5px] font-semibold tracking-[0.24em] uppercase text-white disabled:opacity-70 flex items-center gap-2"
                      style={{ background: `linear-gradient(180deg, ${t.light}, ${t.main})`, boxShadow: `0 10px 24px -8px ${t.main}` }}>
                      {busy && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                      Je serai présent(e)
                      <span aria-hidden className="absolute inset-0 inv-holo rounded-full" />
                    </motion.button>
                    <button onClick={() => respond('decline')} disabled={busy}
                      className="inv-jost text-[12px] tracking-[0.12em] underline underline-offset-4 disabled:opacity-50" style={{ color: t.muted }}>
                      Je ne pourrai pas venir
                    </button>
                  </div>
                )}
                {err && <p className="mt-4 text-sm text-red-700">{err}</p>}
              </motion.div>

              <motion.p {...rise(6)} className="mt-8 inv-jost text-[12px] font-semibold tracking-[0.2em]" style={{ color: t.goldInk }}>{hashtag(occasion.name)}</motion.p>

              {/* Pass d'accès + carton */}
              {!occasion.is_expired && (
                <motion.section {...onView} data-testid="invitation-access"
                  className="mt-14 rounded-[28px] bg-white/75 backdrop-blur-sm px-6 py-8"
                  style={{ boxShadow: '0 20px 50px -24px rgba(90,18,32,.35)', border: '1px solid rgba(201,154,62,.35)' }}>
                  <p className="inv-jost text-[11.5px] font-medium tracking-[0.34em] uppercase" style={{ color: t.goldInk }}>Votre pass d'accès</p>
                  {guest.qr && (
                    <div className="relative mx-auto mt-5 w-52 rounded-2xl p-[3px]" style={{ background: t.gold }}>
                      <div className="rounded-[14px] bg-white p-3"><img src={guest.qr} alt="Votre QR d'accès" className="w-full aspect-square" /></div>
                    </div>
                  )}
                  <p className="inv-serif italic text-[17px] mt-4" style={{ color: t.muted }}>À présenter à l'accueil le jour J.</p>
                  <p className="inv-jost text-[14px] font-medium mt-1" style={{ color: t.ink }}>{guest.name}{tableLabel && ` · ${tableLabel}`}</p>

                  <div className={`mt-6 grid gap-3 ${occasion.location ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <a href={calendarHref(token, API_BASE)}
                      aria-label="Ajouter l'événement à mon agenda"
                      className="rounded-full py-3 inv-jost text-[11.5px] font-semibold tracking-[0.14em] uppercase flex items-center justify-center gap-1.5 text-white"
                      style={{ background: `linear-gradient(180deg, ${t.light}, ${t.main})` }}>
                      <Icon name="event" size={17} /> Agenda
                    </a>
                    {occasion.location ? (
                      <a href={mapsUrl(occasion.location)} target="_blank" rel="noreferrer"
                        className="rounded-full py-3 inv-jost text-[11.5px] font-semibold tracking-[0.14em] uppercase flex items-center justify-center gap-1.5"
                        style={{ color: t.ink, border: `1px solid ${t.goldInk}66` }}>
                        <Icon name="near_me" size={17} /> Itinéraire
                      </a>
                    ) : null}
                  </div>
                  {isAndroid() && (
                    <p className="mt-4 inv-jost text-[12px] leading-relaxed" style={{ color: t.muted }}>
                      Appuyez sur « Ouvrir » une fois le fichier téléchargé : votre agenda s'ouvre avec l'événement.{' '}
                      <a href={googleCalendarUrl(occasion, { inviteUrl: window.location.href, table: tableLabel })}
                        target="_blank" rel="noreferrer" className="underline underline-offset-4 font-medium" style={{ color: t.main }}>
                        Ou ajouter à Google Agenda
                      </a>
                    </p>
                  )}
                </motion.section>
              )}

              {occasion.video_url && (
                <motion.section {...onView} className="mt-12">
                  <p className="inv-jost text-[11.5px] font-medium tracking-[0.34em] uppercase" style={{ color: t.goldInk }}>Un mot pour vous</p>
                  <div className="mt-4 mx-auto max-w-[300px] rounded-[26px] overflow-hidden bg-black aspect-[9/16] p-[3px]" style={{ background: t.gold }}>
                    <video src={occasion.video_url} className="w-full h-full object-cover rounded-[23px] bg-black" autoPlay muted loop playsInline controls />
                  </div>
                </motion.section>
              )}

              <footer className="mt-14 flex flex-col items-center gap-2">
                {!reduced && (
                  <button onClick={() => { setStage('sealed'); window.scrollTo({ top: 0 }) }}
                    className="inv-jost text-[11px] tracking-[0.22em] uppercase flex items-center gap-1.5" style={{ color: t.muted }}>
                    <Icon name="replay" size={15} /> Revoir l'ouverture
                  </button>
                )}
                <p className="inv-jost text-[11px]" style={{ color: `${t.muted}aa` }}>Propulsé par Signiq</p>
              </footer>
            </motion.main>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  )
}

/** Inclinaison 3D de la carte au doigt / à la souris. */
function Tilt({ children, disabled }) {
  const rx = useSpring(useMotionValue(0), { stiffness: 160, damping: 16 })
  const ry = useSpring(useMotionValue(0), { stiffness: 160, damping: 16 })
  const move = (e) => {
    if (disabled) return
    const r = e.currentTarget.getBoundingClientRect()
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 16)
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 12)
  }
  const reset = () => { rx.set(0); ry.set(0) }
  return (
    <div style={{ perspective: 900 }} onPointerMove={move} onPointerLeave={reset} onPointerUp={reset}>
      <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
        animate={disabled ? undefined : { y: [0, -5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
        {children}
      </motion.div>
    </div>
  )
}

/** Filet doré avec losange central. */
function Ornament({ color }) {
  return (
    <svg viewBox="0 0 160 14" className="w-40 mx-auto my-5" aria-hidden>
      <path d="M4 7H66M94 7H156" stroke={color} strokeWidth="1" strokeLinecap="round" opacity=".7" />
      <path d="M80 1L86 7L80 13L74 7Z" fill="none" stroke={color} strokeWidth="1.1" />
      <circle cx="80" cy="7" r="1.6" fill={color} />
    </svg>
  )
}

/** Coche dorée dessinée à la confirmation. */
function CheckMark({ theme: t }) {
  return (
    <motion.svg viewBox="0 0 52 52" className="w-16 h-16 mx-auto" initial="hidden" animate="shown" aria-hidden>
      <motion.circle cx="26" cy="26" r="24" fill="none" stroke={t.goldInk} strokeWidth="2"
        variants={{ hidden: { pathLength: 0 }, shown: { pathLength: 1, transition: { duration: 0.7 } } }} />
      <motion.path d="M15 27l7 7 15-16" fill="none" stroke={t.main} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        variants={{ hidden: { pathLength: 0 }, shown: { pathLength: 1, transition: { delay: 0.5, duration: 0.5 } } }} />
    </motion.svg>
  )
}
