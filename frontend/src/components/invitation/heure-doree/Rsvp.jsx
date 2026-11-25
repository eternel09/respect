import { useMemo, useState } from 'react'
import { fmtDate, pick } from './config'
import { useReveal } from './hooks'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Gerbe de paillettes d'or (CSS) à la confirmation. */
function Burst() {
  const dots = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const a = (i / 30) * Math.PI * 2, d = 70 + ((i * 37) % 11) * 9
    return { x: `${Math.cos(a) * d}px`, y: `${Math.sin(a) * d + 30}px`, s: 3 + (i % 4) * 1.5, delay: (i % 5) * 0.03 }
  }), [])
  return (
    <span className="hd-burst" aria-hidden>
      {dots.map((p, i) => <i key={i} style={{ '--x': p.x, '--y': p.y, width: p.s, height: p.s, animationDelay: `${p.delay}s` }} />)}
    </span>
  )
}

/**
 * RSVP : date limite et places, frise d'invités, formulaire (nom, contact,
 * présence, nombre de personnes, message). Envoi en POST JSON vers
 * `config.rsvp.endpoint` ; `onAnswered(réponse)` informe la page parente.
 */
export default function Rsvp({ config, t, lang, reduced, preview, onAnswered }) {
  const head = useReveal(reduced)
  const { rsvp, assets, kind } = config
  const g = rsvp.guest || {}
  const [status, setStatus] = useState(g.status || 'pending')
  const [editing, setEditing] = useState(!['confirmed', 'declined'].includes(g.status))
  const [celebrate, setCelebrate] = useState(0)
  const [form, setForm] = useState({
    name: g.name || '', contact: g.email || g.phone || '',
    attending: g.status === 'confirmed' ? 'yes' : g.status === 'declined' ? 'no' : '',
    party: g.partySize || 1, message: g.message || '',
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(null)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const max = rsvp.maxGuests

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = t('rsvp.err.name')
    const c = form.contact.trim()
    if (!c) e.contact = t('rsvp.err.contact')
    else if (c.includes('@') && !EMAIL.test(c)) e.contact = t('rsvp.err.email')
    if (!form.attending) e.attending = t('rsvp.err.attending')
    return e
  }

  const submit = async (ev) => {
    ev.preventDefault()
    const e = validate(); setErrors(e); setFailure(null)
    if (Object.keys(e).length) { document.getElementById(`hd-${Object.keys(e)[0]}`)?.focus(); return }
    const c = form.contact.trim(), yes = form.attending === 'yes'
    const payload = {
      status: yes ? 'confirm' : 'decline', name: form.name.trim(), message: form.message.trim(),
      email: c.includes('@') ? c : '', phone: c.includes('@') ? '' : c, lang,
      ...(max ? { party_size: yes ? Math.min(Math.max(1, +form.party || 1), max) : null } : {}),
    }
    setBusy(true)
    try {
      const res = await fetch(rsvp.endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const first = json.errors && Object.values(json.errors)[0]
        throw new Error((Array.isArray(first) ? first[0] : first) || json.message || t('rsvp.err.network'))
      }
      setStatus(yes ? 'confirmed' : 'declined'); setEditing(false)
      if (yes && !reduced) setCelebrate(Date.now())
      onAnswered?.({ ...json, payload })
    } catch (err) {
      setFailure(err.message && err.message !== 'Failed to fetch' ? err.message : t('rsvp.err.network'))
    } finally { setBusy(false) }
  }

  const answered = status === 'confirmed' || status === 'declined'
  return (
    <section className="hd-section" aria-labelledby="hd-rsvp-title" style={{ paddingTop: 84 }}>
      <div ref={head} className="hd-reveal">
        <p className="hd-caps hd-kicker hd-p">{t('rsvp.kicker')}</p>
        <h2 id="hd-rsvp-title" className="hd-script hd-gold" style={{ fontSize: 64, margin: 0, display: 'inline-block' }}>{t('rsvp.title')}</h2>
        <img className="hd-ornament-img" src={assets.rsvpOrnament} alt="" aria-hidden width="120" height="70" loading="lazy" />
        <p className="hd-p" style={{ fontSize: 17, maxWidth: 330, margin: '0 auto' }}>
          {pick(config.texts.rsvpIntro, lang) && <>{pick(config.texts.rsvpIntro, lang)} </>}
          {rsvp.deadline && t('rsvp.deadline', { date: fmtDate(rsvp.deadline, lang) })}{' '}
          {max && t(max === 1 ? 'rsvp.seats.one' : 'rsvp.seats.many', { n: max })}
        </p>
      </div>
      <img className="hd-frieze" src={assets.guestsFrieze} alt="" aria-hidden loading="lazy" width="1200" height="360" />

      {config.event.expired ? (
        <p className="hd-p" style={{ marginTop: 22, fontStyle: 'italic' }}>{t('rsvp.expired')}</p>
      ) : answered && !editing ? (
        <div className="hd-thanks" data-testid="rsvp-done" role="status">
          {celebrate > 0 && <Burst key={celebrate} />}
          <p className={`hd-script${status === 'confirmed' ? ' hd-gold' : ''}`} style={{ fontSize: 40, margin: 0, display: 'inline-block' }}>
            {t(status === 'confirmed' ? 'rsvp.thanks.yes' : 'rsvp.thanks.no')}
          </p>
          <p className="hd-caps hd-p" style={{ marginTop: 6 }}>
            {t(status === 'confirmed' ? 'rsvp.done.yes' : 'rsvp.done.no')}
            {status === 'confirmed' && max && max > 1 && <> · {t('rsvp.done.party', { n: form.party })}</>}
          </p>
          {form.message.trim() && <p className="hd-p" style={{ fontStyle: 'italic', marginTop: 10 }}>« {form.message.trim()} »</p>}
          <button type="button" className="hd-link" style={{ marginTop: 10 }} onClick={() => setEditing(true)}>{t('rsvp.edit')}</button>
        </div>
      ) : (
        <form className="hd-form" onSubmit={submit} noValidate data-testid="rsvp-form">
          <div>
            <label className="hd-label" htmlFor="hd-name">{t('rsvp.name')} <em aria-hidden>*</em></label>
            <input id="hd-name" className="hd-field" value={form.name} onChange={set('name')} readOnly={!!g.name} autoComplete="name"
              required aria-invalid={!!errors.name} aria-describedby={errors.name ? 'hd-name-err' : undefined} />
            {errors.name && <p id="hd-name-err" className="hd-error">{errors.name}</p>}
          </div>
          <div>
            <label className="hd-label" htmlFor="hd-contact">{t('rsvp.contact')} <em aria-hidden>*</em></label>
            <input id="hd-contact" className="hd-field" value={form.contact} onChange={set('contact')} inputMode="email" autoComplete="email"
              required aria-invalid={!!errors.contact} aria-describedby={errors.contact ? 'hd-contact-err' : 'hd-contact-hint'} />
            {errors.contact ? <p id="hd-contact-err" className="hd-error">{errors.contact}</p>
              : <p id="hd-contact-hint" className="hd-hint">{t('rsvp.contact.hint')}</p>}
          </div>
          <fieldset className="hd-choices" aria-describedby={errors.attending ? 'hd-attending-err' : undefined}>
            <legend className="hd-label" style={{ gridColumn: '1 / -1' }}>{t('rsvp.attending')} <em aria-hidden>*</em></legend>
            {[['yes', 'rsvp.yes'], ['no', 'rsvp.no']].map(([v, k], i) => (
              <label key={v} className="hd-choice">
                <input id={i === 0 ? 'hd-attending' : undefined} type="radio" name="hd-attending" value={v}
                  checked={form.attending === v} onChange={set('attending')} />
                <span>{t(k)}</span>
              </label>
            ))}
            {errors.attending && <p id="hd-attending-err" className="hd-error" style={{ gridColumn: '1 / -1' }}>{errors.attending}</p>}
          </fieldset>
          {max > 1 && form.attending === 'yes' && (
            <div>
              <label className="hd-label" htmlFor="hd-party">{t('rsvp.party')}</label>
              <select id="hd-party" className="hd-field" value={form.party} onChange={set('party')}>
                {Array.from({ length: max }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="hd-label" htmlFor="hd-message">{t(kind === 'wedding' ? 'rsvp.message.wedding' : 'rsvp.message.event')}</label>
            <textarea id="hd-message" className="hd-field" value={form.message} onChange={set('message')} maxLength={500} rows={4}
              placeholder={t('rsvp.placeholder')} />
          </div>
          {failure && <p className="hd-error" role="alert">{failure}</p>}
          <button type="submit" className="hd-btn hd-btn-solid" disabled={busy || preview} aria-busy={busy}>
            {busy ? t('rsvp.sending') : t('rsvp.submit')}
          </button>
        </form>
      )}
    </section>
  )
}
