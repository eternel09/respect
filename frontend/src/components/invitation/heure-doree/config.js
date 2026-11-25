/**
 * Modèle « Heure dorée » — configuration.
 *
 * Tout le contenu de l'invitation vient d'un seul objet (voir
 * invitation.config.example.json). Les textes peuvent être une chaîne ou un
 * objet par langue : { "fr": "…", "en": "…", "ln": "…" }.
 * Les ornements sont des images (WebP transparents) remplaçables : chemins
 * par défaut ci-dessous, surchargeables dans `assets`.
 */

export const LANGS = ['fr', 'en', 'ln']
export const LOCALES = { fr: 'fr-FR', en: 'en-GB', ln: 'ln-CD' }

const BASE = '/invitations/heure-doree'
export const DEFAULT_ASSETS = {
  paper: '/invitations/textures/paper-ivory.webp',
  goldLeaf: '/invitations/textures/gold-leaf.webp',
  heroIllustration: `${BASE}/hero-illustration.webp`,
  columnLeft: `${BASE}/column-left.webp`,
  columnRight: `${BASE}/column-right.webp`,
  valance: `${BASE}/valance.webp`,
  curtainLeft: `${BASE}/curtain-left.webp`,
  curtainRight: `${BASE}/curtain-right.webp`,
  frameArch: `${BASE}/frame-arch.webp`,
  frameCorner: `${BASE}/frame-corner.webp`,
  chandelier: `${BASE}/chandelier.webp`,
  divider: `${BASE}/divider.webp`,
  rsvpOrnament: `${BASE}/rsvp-ornament.webp`,
  guestsFrieze: `${BASE}/guests-frieze.webp`,
  envelopeFloralTop: '/invitations/florals/rose-china.webp',
  envelopeFloralBottom: '/invitations/florals/rose-white.webp',
}

/** Texte localisé : chaîne telle quelle, ou valeur de la langue (repli : français). */
export const pick = (v, lang) => {
  if (v == null) return ''
  if (typeof v !== 'object') return String(v)
  return v[lang] ?? v.fr ?? Object.values(v)[0] ?? ''
}

const arr = (v) => (Array.isArray(v) ? v : [])

/** Configuration complète, valeurs par défaut comprises. */
export function normalizeConfig(raw = {}) {
  const couple = raw.couple || {}
  const event = raw.event || {}
  const rsvp = raw.rsvp || {}
  const names = [couple.groom, couple.bride].filter(Boolean)
  return {
    kind: raw.kind === 'event' ? 'event' : 'wedding',
    lang: LANGS.includes(raw.lang) ? raw.lang : 'fr',
    languages: arr(raw.languages).filter(l => LANGS.includes(l)).length ? raw.languages.filter(l => LANGS.includes(l)) : LANGS,
    title: raw.title || names.join(' & '),
    couple: {
      groom: couple.groom || '', bride: couple.bride || '',
      monogram: arr(couple.monogram).length ? couple.monogram : monogramOf(couple, raw.title),
    },
    event: {
      date: event.date || '', start: event.start || '', end: event.end || '',
      ceremony: event.ceremony || null, venue: event.venue || '', address: event.address || '',
      mapsUrl: event.mapsUrl || (event.venue || event.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.venue, event.address].filter(Boolean).join(', '))}` : ''),
      calendarUrl: event.calendarUrl || '',
      dress: event.dress || null,
      expired: !!event.expired,
    },
    texts: raw.texts || {},
    hero: { image: raw.hero?.image || null, alt: raw.hero?.alt || null },
    gallery: arr(raw.gallery).map(g => (typeof g === 'string' ? { src: g, alt: '' } : g)).filter(g => g?.src),
    story: arr(raw.story).filter(s => s && (s.title || s.text)),
    schedule: arr(raw.schedule).filter(s => s && (s.title || s.time)),
    rsvp: {
      endpoint: rsvp.endpoint || '/api/rsvp',
      deadline: rsvp.deadline || null,
      maxGuests: Number.isInteger(rsvp.maxGuests) && rsvp.maxGuests > 0 ? rsvp.maxGuests : null,
      guest: rsvp.guest || null,
    },
    pass: raw.pass?.qr ? raw.pass : null,
    music: raw.music?.src ? raw.music : null,
    video: raw.video?.src ? raw.video : null,
    assets: { ...DEFAULT_ASSETS, ...(raw.assets || {}) },
    app: { name: raw.app?.name || 'Signiq', url: raw.app?.url || null },
  }
}

/** Monogramme du sceau : initiales des deux prénoms, sinon la première lettre du titre. */
export function monogramOf(couple = {}, title = '') {
  const a = (couple.groom || '').trim()[0], b = (couple.bride || '').trim()[0]
  if (a && b) return [a.toUpperCase(), b.toUpperCase()]
  const t = (title || couple.groom || couple.bride || '?').trim()
  return [t[0]?.toUpperCase() || '?']
}

/** Début de l'événement, en heure locale « murale » (sans fuseau). */
export function eventStart(event) {
  const [y, m, d] = (event.date || '').split('-').map(Number)
  if (!y) return null
  const [h, mi] = (event.start || '').split(':').map(Number)
  return new Date(y, m - 1, d, Number.isFinite(h) ? h : 0, Number.isFinite(mi) ? mi : 0)
}

const localeFor = (lang) => {
  const l = LOCALES[lang] || 'fr-FR'
  try { return Intl.DateTimeFormat.supportedLocalesOf([l]).length ? l : 'fr-FR' } catch { return 'fr-FR' }
}

// Lingala : peu de navigateurs connaissent la locale « ln » ; noms des mois et des jours écrits ici.
const LN_NUM = ['yambo', 'míbalé', 'mísáto', 'mínei', 'mítáno', 'motóbá', 'nsambo', 'mwambe', 'libwa', 'zómi', 'zómi na mɔ̌kɔ́', 'zómi na míbalé']
const LN_DAYS = ['eyenga', 'mokɔlɔ mwa yambo', 'mokɔlɔ mwa míbalé', 'mokɔlɔ mwa mísáto', 'mokɔlɔ ya mínéi', 'mokɔlɔ ya mítáno', 'mpɔ́sɔ']

/** « 22 novembre 2026 » (ou avec le jour : « Samedi 22 novembre 2026 »). */
export function fmtDate(iso, lang, withWeekday = false) {
  const [y, m, d] = (iso || '').split('-').map(Number)
  if (!y) return ''
  const date = new Date(y, m - 1, d)
  let s
  if (lang === 'ln') {
    s = `${withWeekday ? `${LN_DAYS[date.getDay()]}, ` : ''}${d} sánzá ya ${LN_NUM[m - 1]} ${y}`
  } else {
    s = date.toLocaleDateString(localeFor(lang), { ...(withWeekday ? { weekday: 'long' } : {}), day: 'numeric', month: 'long', year: 'numeric' })
  }
  return withWeekday ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/** « 16:00 » → « 16 h » (fr), « 4 pm » (en), « 16:00 » (ln). */
export function fmtTime(hhmm, lang) {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '')
  if (!m) return hhmm || ''
  const h = +m[1], mi = +m[2]
  if (lang === 'fr') return mi ? `${h} h ${String(mi).padStart(2, '0')}` : `${h} h`
  if (lang === 'en') { const hh = h % 12 || 12; return `${hh}${mi ? `:${String(mi).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}` }
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
}

/** Fichier .ics généré dans le navigateur (quand aucun lien d'agenda n'est fourni). */
export function icsDataUrl(config) {
  const start = eventStart(config.event)
  if (!start) return null
  const p = (n) => String(n).padStart(2, '0')
  const stamp = (d) => `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`
  let end = new Date(start.getTime() + 5 * 3600e3)
  const em = /^(\d{1,2}):(\d{2})/.exec(config.event.end || '')
  if (em) { end = new Date(start); end.setHours(+em[1], +em[2]); if (end <= start) end.setDate(end.getDate() + 1) }
  const esc = (s) => String(s).replace(/([\\;,])/g, '\\$1').replace(/\n/g, '\\n')
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Signiq//Heure doree//FR', 'BEGIN:VEVENT',
    `UID:${stamp(start)}-${encodeURIComponent(config.title)}@signiq`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${esc(config.title)}`,
    ...(config.event.venue || config.event.address ? [`LOCATION:${esc([config.event.venue, config.event.address].filter(Boolean).join(', '))}`] : []),
    'END:VEVENT', 'END:VCALENDAR',
  ]
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`
}
