import { useState } from 'react'
import { motion } from 'motion/react'
import Icon from '../ui/Icon'
import MusicButton from './MusicButton'
import { API_BASE } from '../../lib/axios'
import useMusic from '../../lib/useMusic'
import { PROGRAM_ICONS, calendarHref, eventNames, googleCalendarUrl, isAndroid, mapsUrl, startOf } from '../../lib/invitationTheme'

/**
 * Modèle « Bohème » de l'invitation en ligne : un faire-part aquarelle aux
 * fleurs séchées (monstera, pampas, fleurettes poudrées) — monogramme dans un
 * cercle olive, ligne au nom de l'invité, photo du couple en arche, « Save the
 * Date » et calendrier, programme illustré avec les salles, table de
 * l'invité, réponse et pass d'accès, photo finale dans un cadre décalé.
 * Bouquets dessinés en SVG.
 */

const OLIVE = '#4f5a2b'
const TERRA = '#c07c5c'
const BLUSH = '#ead0c3'
const SAND = '#d8c3a2'
const BROWN = '#4b302a'
const WOOD = '#7c4536'
const PAPER = '#fbf9f6'
const DAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']
const caps = { letterSpacing: '0.18em', textTransform: 'uppercase' }
const view = (reduced, delay = 0) => reduced ? {} : {
  initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' }, transition: { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] },
}

/* ── Fleurs séchées ──────────────────────────────────────────── */

/** Feuille de monstera (découpée). */
const Monstera = ({ x, y, r = 0, s = 1, fill = TERRA }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <path d="M0 0 C-22 -6 -34 -30 -24 -52 C-12 -70 14 -70 26 -52 C36 -30 22 -6 0 0 Z" fill={fill} opacity=".9" />
    {[-44, -34, -24, -14].map((yy, i) => (
      <g key={i} stroke={PAPER} strokeWidth="3" strokeLinecap="round">
        <path d={`M0 ${yy + 4} L${-18 + i * 2} ${yy - 4}`} /><path d={`M0 ${yy + 4} L${18 - i * 2} ${yy - 4}`} />
      </g>
    ))}
    <path d="M0 0 V-58" stroke={PAPER} strokeWidth="1.2" opacity=".6" />
  </g>
)

/** Plumeau de pampa. */
const Pampas = ({ x, y, r = 0, s = 1, color = SAND }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} stroke={color} strokeLinecap="round" fill="none">
    <path d="M0 0 C2 -30 4 -60 2 -90" strokeWidth="1.2" />
    {Array.from({ length: 16 }, (_, i) => {
      const yy = -30 - i * 4
      return <g key={i}><path d={`M${1 + i * 0.05} ${yy} q-8 -4 -12 -12`} strokeWidth=".9" opacity=".8" /><path d={`M${1 + i * 0.05} ${yy} q8 -4 12 -12`} strokeWidth=".9" opacity=".8" /></g>
    })}
  </g>
)

/** Éventail de palmier séché. */
const PalmFan = ({ x, y, r = 0, s = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    {[-60, -40, -20, 0, 20, 40, 60].map(a => (
      <path key={a} d="M0 0 L-4 -42 L0 -46 L4 -42 Z" fill="#e2c9a6" transform={`rotate(${a})`} opacity=".9" />
    ))}
    <path d="M0 0 V22" stroke="#c9a77c" strokeWidth="1.6" />
  </g>
)

const Blossom = ({ x, y, s = 1, color = BLUSH }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="0" cy="-6" rx="4.5" ry="6.5" fill={color} stroke="#d8b2a2" strokeWidth=".5" transform={`rotate(${a})`} />)}
    <circle r="2.6" fill="#b98a5e" />
  </g>
)

/** Bouquet bohème complet (coin de cadre). */
function Bouquet({ className, style, flip }) {
  return (
    <svg viewBox="0 0 160 140" className={className} style={{ ...style, transform: `${style?.transform || ''} ${flip ? 'scaleX(-1)' : ''}` }} aria-hidden>
      <Pampas x={70} y={110} r={-55} s={1} /><Pampas x={66} y={112} r={-20} s={.9} color="#e6d6bc" />
      <PalmFan x={96} y={92} r={30} s={.9} />
      <Monstera x={58} y={112} r={-40} s={1} />
      <Monstera x={90} y={110} r={20} s={.7} fill="#d69a7c" />
      <Blossom x={74} y={84} s={1.3} /><Blossom x={92} y={74} s={1} color="#f2ddd2" /><Blossom x={60} y={70} s={.9} />
      <Blossom x={104} y={98} s={.8} color="#e8c2b0" />
      {[[80, 60], [110, 80], [50, 92]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="2.2" fill={SAND} />)}
    </svg>
  )
}

/** Brins sur les bords de page (léger balancement). */
function EdgeSpray({ side, top, reduced }) {
  return (
    <motion.svg viewBox="0 0 60 200" aria-hidden className={`absolute w-14 ${side === 'left' ? 'left-0' : 'right-0'} pointer-events-none`}
      style={{ top, transform: side === 'right' ? 'scaleX(-1)' : undefined, transformOrigin: side === 'left' ? 'left bottom' : 'right bottom' }}
      animate={reduced ? {} : { rotate: [0, 1.5, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
      <Pampas x={6} y={190} r={12} s={1.4} color="#e2d3bb" />
      <Monstera x={4} y={150} r={30} s={.6} fill="#d9a084" />
      <Blossom x={16} y={110} s={.9} /><Blossom x={8} y={86} s={.7} color="#f0dcd1" />
    </motion.svg>
  )
}

/* ── Sections ────────────────────────────────────────────────── */

function Monogram({ occasion, reduced }) {
  const { couple, title } = eventNames(occasion.name)
  return (
    <motion.div className="relative mx-auto w-[210px] h-[210px]" initial={reduced ? false : { scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}>
      <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center text-center px-6"
        style={{ background: `radial-gradient(circle at 40% 35%, #5e6a34, ${OLIVE} 70%)`, color: '#f6efe2', boxShadow: '0 16px 30px -18px rgba(60,60,20,.6)' }}>
        {couple ? (
          <>
            <span className="inv-jost text-[24px] font-light leading-none" style={{ letterSpacing: '0.08em' }}>{couple[0].toUpperCase()}</span>
            <span className="inv-script text-[30px] leading-none my-0.5" style={{ color: '#e7c98f' }}>and</span>
            <span className="inv-jost text-[24px] font-light leading-none" style={{ letterSpacing: '0.08em' }}>{couple[1].toUpperCase()}</span>
          </>
        ) : <span className="inv-script text-[34px] leading-tight">{title}</span>}
      </div>
      <Bouquet className="absolute -left-12 -bottom-10 w-[150px]" />
    </motion.div>
  )
}

function ArchPhoto({ src, reduced }) {
  if (!src) return null
  return (
    <div className="relative mx-auto w-[78%] max-w-[330px] mt-10">
      <div aria-hidden className="absolute -inset-x-3 -top-3 bottom-8 rounded-t-full" style={{ border: `2.5px solid ${OLIVE}`, borderBottom: 'none' }} />
      <motion.div className="relative overflow-hidden rounded-t-full aspect-[3/4]"
        initial={reduced ? false : { clipPath: 'inset(100% 0 0 0)' }} whileInView={{ clipPath: 'inset(0% 0 0 0)' }}
        viewport={{ once: true, margin: '-60px' }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}>
        <img src={src} alt="" className="w-full h-full object-cover" />
      </motion.div>
      <Bouquet className="absolute -left-14 -top-8 w-[170px]" style={{ transform: 'rotate(-12deg)' }} />
      <Bouquet className="absolute -right-10 bottom-10 w-[120px]" style={{ transform: 'rotate(170deg)' }} flip />
    </div>
  )
}

function Calendar({ date, reduced }) {
  const monday = new Date(date); monday.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  const days = DAYS.map((_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d })
  return (
    <div className="mt-3 max-w-[330px] mx-auto">
      <p className="inv-jost text-[15px] font-medium" style={caps}>{date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center inv-jost">
        {DAYS.map(d => <span key={d} className="text-[14px] opacity-80">{d}</span>)}
        {days.map(d => {
          const on = d.toDateString() === date.toDateString()
          return (
            <span key={d.toISOString()} className="relative h-10 flex items-center justify-center text-[15px]">
              {on && <motion.span aria-hidden className="absolute h-9 w-9 rounded-full" style={{ background: BROWN }}
                initial={reduced ? false : { scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.3 }} />}
              <span className="relative" style={{ color: on ? '#fff' : BROWN, fontWeight: on ? 600 : 400 }}>{d.getDate()}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

const ScriptTitle = ({ children, size = 58 }) => (
  <h2 className="inv-script leading-none" style={{
    fontSize: size, backgroundImage: `linear-gradient(180deg, ${WOOD}, #b07a64 70%, ${WOOD})`,
    WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', paddingBottom: 6,
  }}>{children}</h2>
)

export default function Boheme({ occasion, guest, token, tableLabel, confirmed, declined, busy, err, respond, rsvpRef, reduced, preview = false }) {
  const [message, setMessage] = useState(guest.message || '')
  const [editing, setEditing] = useState(!(confirmed || declined))
  const music = useMusic(preview ? null : occasion.music_url)
  const c = occasion.content || {}
  const photos = occasion.photos || []
  const hero = occasion.cover_url || photos[0]
  const closingPhoto = photos.filter(p => p !== hero).slice(-1)[0] || null
  const { couple, title } = eventNames(occasion.name)
  const families = c.families || (couple ? `${couple[0]} & ${couple[1]}` : title)
  const date = startOf(occasion)
  const hosts = occasion.type === 'mariage' ? 'les mariés' : 'les hôtes'

  const answer = async (status) => { music.play(); await respond(status, { message }); setEditing(false) }

  return (
    <div className="relative overflow-hidden text-center inv-jost" data-testid="boheme"
      style={{
        color: BROWN,
        background: `radial-gradient(55% 30% at 0% 12%, rgba(150,140,130,.10), transparent 70%),
          radial-gradient(50% 25% at 100% 40%, rgba(150,140,130,.09), transparent 70%),
          radial-gradient(60% 30% at 10% 70%, rgba(150,140,130,.08), transparent 70%),
          radial-gradient(50% 30% at 100% 92%, rgba(150,140,130,.10), transparent 70%), ${PAPER}`,
      }}>
      <MusicButton url={music.url} playing={music.playing} onToggle={music.toggle} audioRef={music.attach} color={BROWN} background={PAPER} border={OLIVE} />
      <EdgeSpray side="left" top={40} reduced={reduced} /><EdgeSpray side="right" top={520} reduced={reduced} />
      <EdgeSpray side="left" top={1250} reduced={reduced} /><EdgeSpray side="right" top={1900} reduced={reduced} />

      <div className="relative px-7 pt-12 pb-10">
        <Monogram occasion={occasion} reduced={reduced} />

        {/* Ligne au nom de l'invité */}
        <motion.div {...view(reduced, 0.2)} className="mt-12">
          <p className="text-[15px]">Mme, Mlle, M., Couple</p>
          <p className="inv-script text-[38px] leading-tight mt-1" style={{ color: WOOD }}>{guest.name}</p>
          <div className="mx-auto mt-1 h-px w-[85%]" style={{ background: `${BROWN}66` }} />
        </motion.div>

        <motion.div {...view(reduced)} className="mt-6 text-[14.5px] leading-relaxed space-y-3 max-w-[360px] mx-auto">
          <p className="font-medium">{c.subtitle || 'Deux cœurs, un même chemin.'}</p>
          <p className="whitespace-pre-line">
            {c.intro || <>C’est avec une immense joie que <b className="font-semibold">{families}</b> vous invitent à partager le bonheur de leur union, reflet d’une promesse faite pour la vie.</>}
          </p>
          {c.verse && <p className="italic">« {c.verse} »{c.verse_ref && <span className="not-italic font-semibold"> — {c.verse_ref}</span>}</p>}
        </motion.div>

        <ArchPhoto src={hero} reduced={reduced} />

        {/* Save the date */}
        <motion.div {...view(reduced)} className="mt-6">
          <ScriptTitle>Save the Date</ScriptTitle>
          <Calendar date={date} reduced={reduced} />
        </motion.div>

        {/* Programme */}
        <motion.div {...view(reduced)} className="mt-8"><ScriptTitle size={50}>Programme</ScriptTitle></motion.div>
        {c.program?.length > 0 ? (
          <ol className="mt-4 space-y-7 max-w-[340px] mx-auto">
            {c.program.map((p, i) => {
              const [icon] = PROGRAM_ICONS[p.icon] || PROGRAM_ICONS.start
              return (
                <motion.li key={i} {...view(reduced, 0.04 * i)}>
                  <Icon name={icon} size={36} weight={200} style={{ color: BROWN }} />
                  <p className="text-[14.5px] mt-1 font-semibold">{p.time}</p>
                  {p.label && <p className="text-[14.5px] font-semibold leading-snug">{p.label}</p>}
                  {p.note && <p className="text-[14px] leading-relaxed whitespace-pre-line mt-1 opacity-90">{p.note}</p>}
                </motion.li>
              )
            })}
          </ol>
        ) : occasion.location && (
          <motion.p {...view(reduced)} className="mt-4 text-[14.5px]"><b className="font-semibold">{occasion.location}</b></motion.p>
        )}

        {/* Mot de la fin */}
        <motion.div {...view(reduced)} className="mt-8 max-w-[340px] mx-auto">
          <Icon name="schedule" size={34} weight={200} style={{ color: BROWN }} />
          <p className="text-[14px] leading-relaxed mt-1 whitespace-pre-line">
            {c.closing || 'La beauté d’un moment tient aussi à l’harmonie de ceux qui le vivent. Merci d’avance pour votre ponctualité et votre bienveillance.'}
          </p>
        </motion.div>

        {/* Votre table */}
        <motion.div {...view(reduced)} className="mt-8">
          <p className="text-[15px] font-semibold">Votre table</p>
          <p className="inv-script text-[34px] leading-tight min-h-[40px]" style={{ color: WOOD }}>{tableLabel || ' '}</p>
          <div className="mx-auto h-px w-[55%]" style={{ background: `${BROWN}88` }} />
        </motion.div>

        {/* Réponse */}
        <motion.section {...view(reduced)} ref={rsvpRef} className="mt-12 max-w-[340px] mx-auto">
          <ScriptTitle size={46}>Votre réponse</ScriptTitle>
          {occasion.is_expired ? (
            <p className="mt-3 italic">Cet événement est passé. Merci d’en avoir fait partie.</p>
          ) : !editing ? (
            <div className="mt-3">
              <p className="text-[16px] font-medium">{confirmed ? 'Merci, à très bientôt !' : 'Merci pour votre réponse, vous nous manquerez.'}</p>
              {guest.message && <p className="mt-2 italic text-[14.5px]">« {guest.message} »</p>}
              <button type="button" onClick={() => setEditing(true)} className="mt-3 text-[12.5px] underline underline-offset-4 opacity-75">Modifier ma réponse</button>
            </div>
          ) : (
            <div className="mt-4 space-y-3" data-testid="rsvp-form">
              <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={500} rows={3}
                placeholder={`Un mot pour ${hosts} (facultatif)`} aria-label={`Un mot pour ${hosts}`}
                className="w-full rounded-2xl px-4 py-3 text-[14.5px] outline-none resize-none" style={{ background: '#f3ece4', color: BROWN }} />
              <div className="grid grid-cols-2 gap-2">
                <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => answer('confirm')} disabled={busy}
                  className="rounded-full py-3 text-[12px] text-white disabled:opacity-60" style={{ ...caps, background: OLIVE }}>
                  Je serai là
                </motion.button>
                <button type="button" onClick={() => answer('decline')} disabled={busy}
                  className="rounded-full py-3 text-[12px] disabled:opacity-60" style={{ ...caps, boxShadow: `inset 0 0 0 1px ${BROWN}55` }}>
                  Je ne pourrai pas
                </button>
              </div>
              {err && <p className="text-sm text-red-700">{err}</p>}
            </div>
          )}
        </motion.section>

        {/* Pass d'accès */}
        {!occasion.is_expired && (
          <motion.section {...view(reduced)} className="mt-10" data-testid="invitation-access">
            <p className="text-[12.5px] font-semibold" style={caps}>Votre pass d’accès</p>
            {guest.qr && <div className="mx-auto mt-3 w-44 rounded-2xl bg-white p-3" style={{ boxShadow: `0 0 0 2px ${OLIVE}` }}><img src={guest.qr} alt="Votre QR d'accès" className="w-full aspect-square" /></div>}
            <div className={`mt-4 grid gap-2 max-w-[300px] mx-auto ${occasion.location ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <a href={calendarHref(token, API_BASE)} aria-label="Ajouter l'événement à mon agenda"
                className="rounded-full py-2.5 text-[11.5px] flex items-center justify-center gap-1.5" style={{ ...caps, boxShadow: `inset 0 0 0 1px ${BROWN}55` }}>
                <Icon name="event" size={15} /> Agenda
              </a>
              {occasion.location && (
                <a href={mapsUrl(occasion.location)} target="_blank" rel="noreferrer"
                  className="rounded-full py-2.5 text-[11.5px] flex items-center justify-center gap-1.5" style={{ ...caps, boxShadow: `inset 0 0 0 1px ${BROWN}55` }}>
                  <Icon name="near_me" size={15} /> Itinéraire
                </a>
              )}
            </div>
            {isAndroid() && (
              <a href={googleCalendarUrl(occasion, { inviteUrl: window.location.href, table: tableLabel })} target="_blank" rel="noreferrer"
                className="inline-block mt-2 text-[12.5px] underline underline-offset-4 opacity-75">Ou ajouter à Google Agenda</a>
            )}
          </motion.section>
        )}

        {occasion.video_url && (
          <motion.video {...view(reduced)} src={occasion.video_url} className="mt-10 mx-auto w-full max-w-[280px] aspect-[9/16] object-cover rounded-2xl bg-black" autoPlay muted loop playsInline controls />
        )}
      </div>

      {/* Photo finale, cadre olive décalé */}
      {closingPhoto && (
        <motion.div {...view(reduced)} className="relative mx-auto w-[80%] max-w-[340px] mb-12">
          <div aria-hidden className="absolute -left-4 -top-4 right-4 bottom-4" style={{ border: `8px solid ${OLIVE}`, borderRight: 'none', borderBottom: 'none' }} />
          <img src={closingPhoto} alt="" className="relative w-full aspect-[4/5] object-cover" />
          <Bouquet className="absolute -right-12 -bottom-10 w-[140px]" flip />
        </motion.div>
      )}
      <p className="pb-6 text-[11px] opacity-60">Propulsé par Signiq</p>
    </div>
  )
}
