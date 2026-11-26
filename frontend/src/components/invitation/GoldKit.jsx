import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { API_BASE } from '../../lib/axios'
import { calendarHref } from '../../lib/invitationTheme'
import { downloadInvitationCard } from '../../lib/heureDoreeCard'
import { EASE, GOLD_BG, goldBorder } from '../../lib/goldInvitation'

/**
 * Briques communes aux modèles ivoire et or (« Heure dorée », « Save the
 * Date ») : apparitions au défilement, filet doré, titres, formulaire de
 * réponse (présence, nombre de personnes, boissons, mot) et cadre du QR.
 * Styles dans heure-doree.css (classes hd-*).
 */

/** Apparition au défilement : fondu + 24 px. */
export function Reveal({ still, delay = 0, y = 24, className, style, children, as = 'div' }) {
  const M = as === 'li' ? motion.li : as === 'p' ? motion.p : motion.div
  return (
    <M className={className} style={style} initial={still ? false : { opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.8, delay, ease: EASE }}>
      {children}
    </M>
  )
}

/** Filet doré et losange : les deux traits se déploient depuis le centre. */
export function Divider({ width = 56, still }) {
  const line = (left) => (
    <motion.span className="block h-px" style={{ width, transformOrigin: left ? 'right' : 'left',
      background: left ? 'linear-gradient(90deg, rgba(184,146,74,0) 0%, #C9A55C 100%)' : 'linear-gradient(90deg, #C9A55C 0%, rgba(184,146,74,0) 100%)' }}
      initial={still ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.1, ease: EASE }} />
  )
  return (
    <div className="flex items-center justify-center gap-3" aria-hidden>
      {line(true)}
      <motion.span className="block w-[5px] h-[5px] rotate-45" style={{ background: GOLD_BG }}
        initial={still ? false : { scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.4 }} />
      {line(false)}
    </div>
  )
}

/** Titre de section : surtitre en capitales, titre calligraphié doré. */
export function H2({ children, still, kicker, id }) {
  return (
    <Reveal still={still} className="text-center">
      {kicker && <p className="hd-caps m-0">{kicker}</p>}
      <h2 id={id} className="hd-script hd-gold inline-block m-0 mt-3 px-4 py-1.5" style={{ fontSize: 40, lineHeight: 1.2 }}>{children}</h2>
    </Reveal>
  )
}

/** Carte des boissons : groupes (« Locales »), catégories (« Bières »), choix multiples. */
function DrinkPicker({ menu, value, onChange }) {
  const toggle = (d) => onChange(value.includes(d) ? value.filter(x => x !== d) : [...value, d])
  // Titre de groupe (« Locales ») avant la première catégorie de chaque groupe.
  const headed = menu.map((cat, i) => !!cat.group && cat.group !== menu.slice(0, i).reverse().find(c => c.group)?.group)
  return (
    <div className="flex flex-col gap-3.5" data-testid="drink-picker">
      <p className="hd-caps m-0" style={{ textIndent: 0 }}>Choix des boissons</p>
      <div className="flex flex-col gap-6">
        {menu.map((cat, ci) => {
          const heading = headed[ci]
          return (
            <div key={`${cat.name}-${ci}`} className="contents">
              {heading && (
                <div className={`flex items-center gap-3 ${ci ? 'mt-2' : ''}`} aria-hidden>
                  <span className="flex-1 h-px" style={{ background: '#D9C9A3' }} />
                  <span className="hd-script hd-gold px-1.5" style={{ fontSize: 28, lineHeight: 1.2 }}>{cat.group}</span>
                  <span className="flex-1 h-px" style={{ background: '#D9C9A3' }} />
                </div>
              )}
              <div className="flex flex-col gap-3" role="group" aria-label={cat.group ? `${cat.group} · ${cat.name}` : cat.name}>
                <p className="hd-caps m-0" style={{ textIndent: 0, color: '#5B5146' }}>{cat.name}</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {cat.items.map(d => (
                    <motion.button key={d} type="button" role="checkbox" aria-checked={value.includes(d)} onClick={() => toggle(d)}
                      className="hd-pill hd-pill-sm" style={d.length > 14 ? { gridColumn: 'span 2' } : undefined} whileTap={{ scale: 0.95 }}>
                      {d}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <p className="m-0" style={{ fontSize: 13, lineHeight: 1.5, color: '#8A7F72' }}>Plusieurs choix possibles.</p>
    </div>
  )
}

/**
 * Formulaire de réponse : présence, nombre de personnes (plafonné), boissons
 * (si les hôtes ont une carte) et, au choix, un mot pour les mariés.
 */
export function RsvpForm({ guest, confirmed, declined, busy, err, respond, max, drinks = [], withMessage = true, still, preview, onConfirmed }) {
  const answered = confirmed || declined
  const [editing, setEditing] = useState(!answered)
  const [choice, setChoice] = useState(declined ? 'decline' : 'confirm')
  const [party, setParty] = useState(guest?.party_size || Math.min(max || 1, 2))
  const [message, setMessage] = useState(guest?.message || '')
  const [chosen, setChosen] = useState(guest?.drinks || [])
  const n = Math.min(Math.max(1, party), max || 1)
  const hasDrinks = drinks.length > 0

  if (answered && !editing) {
    return (
      <motion.div className="mt-10" data-testid="rsvp-done" role="status" initial={still ? false : { opacity: 0, scale: 0.94, filter: 'blur(6px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ duration: 0.9, ease: EASE }}>
        <p className={`hd-script m-0 inline-block px-2 ${confirmed ? 'hd-gold' : ''}`} style={{ fontSize: 40, lineHeight: 1.2 }}>
          {confirmed ? 'Merci, à très bientôt !' : 'Vous nous manquerez.'}
        </p>
        <p className="hd-caps m-0 mt-2">{confirmed ? `Présence confirmée${max ? ` · ${guest?.party_size || n} pers.` : ''}` : 'Réponse enregistrée'}</p>
        {confirmed && guest?.drinks?.length > 0 && <p className="m-0 mt-3 italic max-w-[300px] mx-auto" style={{ fontSize: 15, color: '#8A7F72' }}>{guest.drinks.join(' · ')}</p>}
        {guest?.message && <p className="m-0 mt-3 italic" style={{ fontSize: 16 }}>« {guest.message} »</p>}
        <button type="button" onClick={() => setEditing(true)} className="mt-4 italic underline underline-offset-4" style={{ fontSize: 15, color: '#8A7F72' }}>Modifier ma réponse</button>
      </motion.div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    const extra = {
      ...(withMessage ? { message } : {}),
      ...(max && choice === 'confirm' ? { party_size: n } : {}),
      ...(hasDrinks ? { drinks: choice === 'confirm' ? chosen : [] } : {}),
    }
    await respond(choice, extra)
    setEditing(false)
    if (choice === 'confirm') onConfirmed?.()
  }

  return (
    <form onSubmit={submit} className="mt-12 w-full max-w-[326px] flex flex-col gap-10 text-left" data-testid="rsvp-form">
      <Reveal still={still} delay={0.2} className="flex flex-col gap-3.5">
        <p className="hd-caps m-0" style={{ textIndent: 0 }} id="hd-answer">Votre réponse</p>
        <div className="flex gap-3" role="radiogroup" aria-labelledby="hd-answer">
          {[['confirm', 'Avec joie'], ['decline', 'À regret']].map(([k, label]) => (
            <motion.button key={k} type="button" role="radio" aria-checked={choice === k} className="hd-pill" onClick={() => setChoice(k)}
              whileTap={{ scale: 0.96 }}>{label}</motion.button>
          ))}
        </div>
      </Reveal>
      <AnimatePresence initial={false}>
        {max > 1 && choice === 'confirm' && (
          <motion.div key="party" className="flex flex-col gap-1.5 overflow-hidden" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <p className="hd-caps m-0" style={{ textIndent: 0 }} id="hd-party">Nombre de personnes</p>
            <div className="flex items-center justify-between h-11" style={{ borderBottom: '1px solid #C9A55C' }} role="group" aria-labelledby="hd-party">
              <button type="button" aria-label="Une personne de moins" disabled={n <= 1} onClick={() => setParty(n - 1)}
                className="w-11 h-11 flex items-center justify-start text-2xl" style={{ color: n <= 1 ? '#D9C9A3' : '#8A7F72' }}>−</button>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={n} className="text-2xl leading-none" aria-live="polite" initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>{n}</motion.span>
              </AnimatePresence>
              <button type="button" aria-label="Une personne de plus" disabled={n >= max} onClick={() => setParty(n + 1)}
                className="w-11 h-11 flex items-center justify-end text-2xl" style={{ color: n >= max ? '#D9C9A3' : '#8A7F72' }}>+</button>
            </div>
            <p className="m-0" style={{ fontSize: 13, lineHeight: 1.5, color: '#8A7F72' }}>Votre invitation est valable pour {max} personnes au plus.</p>
          </motion.div>
        )}
        {hasDrinks && choice === 'confirm' && (
          <motion.div key="drinks" className="overflow-hidden" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <DrinkPicker menu={drinks} value={chosen} onChange={setChosen} />
          </motion.div>
        )}
      </AnimatePresence>
      {withMessage && (
        <Reveal still={still} delay={0.3} className="flex flex-col gap-1.5">
          <label htmlFor="hd-msg" className="hd-caps" style={{ textIndent: 0 }}>Un mot pour les mariés</label>
          <textarea id="hd-msg" className="hd-field" rows={1} maxLength={500} value={message} placeholder="Votre message…"
            onChange={e => { setMessage(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px` }} />
        </Reveal>
      )}
      {err && <p className="m-0 text-sm" style={{ color: '#9b4a3e' }} role="alert">{err}</p>}
      <Reveal still={still} delay={0.4}>
        <button type="submit" className="hd-btn hd-btn-gold" disabled={busy || preview}>
          {busy ? <span className="h-4 w-4 rounded-full border-2 border-[#F8F4EC] border-t-transparent animate-spin" /> : choice === 'confirm' ? 'Confirmer ma présence' : 'Envoyer ma réponse'}
        </button>
      </Reveal>
    </form>
  )
}

/** Cadre doré du QR : losanges aux angles, équerres intérieures. */
export function QrFrame({ qr, code, cornerBg = '#FBF8F2', still, animated = false }) {
  const draw = animated && !still
  return (
    <div className="relative flex items-center justify-center" style={{ width: 'min(284px, 100%)', aspectRatio: '1', ...goldBorder() }}>
      {['-left-[7px] -top-[7px]', '-right-[7px] -top-[7px]', '-left-[7px] -bottom-[7px]', '-right-[7px] -bottom-[7px]'].map((pos, k) => (
        <motion.span key={pos} aria-hidden className={`absolute w-[13px] h-[13px] flex items-center justify-center ${pos}`} style={{ background: cornerBg }}
          initial={draw ? { scale: 0, rotate: -90 } : false} whileInView={{ scale: 1, rotate: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.5 + k * 0.1, ease: EASE }}>
          <span className="block w-[7px] h-[7px] rotate-45" style={{ background: GOLD_BG }} />
        </motion.span>
      ))}
      {['left-[5px] top-[5px] border-l border-t', 'right-[5px] top-[5px] border-r border-t', 'left-[5px] bottom-[5px] border-l border-b', 'right-[5px] bottom-[5px] border-r border-b'].map(p => (
        <span key={p} aria-hidden className={`absolute w-[18px] h-[18px] border-[#C9A55C] ${p}`} />
      ))}
      <motion.div className="p-6 w-full h-full" initial={draw ? { opacity: 0, filter: 'blur(8px)' } : false} whileInView={{ opacity: 1, filter: 'blur(0px)' }}
        viewport={{ once: true }} transition={{ duration: 1, delay: 0.3 }}>
        {qr ? <img src={qr} alt={`QR code ${code}`} className="w-full h-full block" style={{ imageRendering: 'pixelated' }} />
          : <div className="w-full h-full" style={{ background: 'repeating-conic-gradient(#2E2620 0 25%, #FBF8F2 0 50%) 0 0 / 22px 22px', opacity: 0.12 }} />}
      </motion.div>
    </div>
  )
}

/** « Enregistrer l'invitation » (PNG) et « Ajouter au calendrier ». */
export function CardActions({ card, token, still, preview, style }) {
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    try { await downloadInvitationCard(card) } finally { setSaving(false) }
  }
  return (
    <Reveal still={still} delay={0.2} className="relative flex flex-col gap-2.5" style={{ width: 'min(326px, 83.6%)', ...style }}>
      <button type="button" className="hd-btn hd-btn-gold" onClick={save} disabled={saving || preview}>
        {saving ? 'Préparation…' : 'Enregistrer l’invitation'}
      </button>
      {token && <a href={calendarHref(token, API_BASE)} className="hd-btn hd-btn-line">Ajouter au calendrier</a>}
    </Reveal>
  )
}
