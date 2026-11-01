/**
 * Invitation en ligne : couleurs par type d'événement (fond ivoire et or
 * communs, couleur principale de l'enveloppe et de la carte) et textes
 * dérivés de l'événement (prénoms du couple, monogramme, date « carte »).
 */
const GOLD = 'linear-gradient(135deg, #8a6420 0%, #d9b45a 22%, #f6e2a1 45%, #c99a3e 62%, #f1d78f 80%, #9a7228 100%)'

const base = {
  gold: GOLD, goldInk: '#b8862f', goldLight: '#e9cf8a',
  ivory: '#f7f0e6', ink: '#5a1220', muted: '#8a6d68',
  sparkles: ['#d4a64a', '#e8c56f', '#c99a3e', '#f3dc9a'],
}

export const THEMES = {
  mariage:      { ...base, main: '#7a1626', dark: '#560c19', light: '#8e1d30', label: 'Invitation de mariage' },
  gala:         { ...base, main: '#1d1a17', dark: '#0d0b0a', light: '#2c2722', ink: '#2b2118', label: 'Soirée de gala' },
  anniversaire: { ...base, main: '#5b2a86', dark: '#3e1a61', light: '#6d379d', ink: '#3e1a61', label: "Invitation d'anniversaire" },
  concert:      { ...base, main: '#1e1b4b', dark: '#121033', light: '#2a2667', ink: '#1e1b4b', label: 'Concert' },
  ceremonie:    { ...base, main: '#1e3a5f', dark: '#132741', light: '#284a75', ink: '#1e3a5f', label: 'Cérémonie' },
  autre:        { ...base, main: '#1e3a5f', dark: '#132741', light: '#284a75', ink: '#1e3a5f', label: 'Invitation' },
}
export const themeFor = (type) => THEMES[type] || THEMES.autre

const TYPE_PREFIX = /^(mariage|gala|soirée|anniversaire|concert|cérémonie|ceremonie)\s+(de\s+|du\s+|des\s+|d['’]\s*)?/i

/** « Mariage Ana & Paul » → { title: 'Ana & Paul', couple: ['Ana', 'Paul'] }. */
export function eventNames(name = '') {
  const title = name.replace(TYPE_PREFIX, '').trim() || name
  const m = /^(.+?)\s*(?:&|\set\s)\s*(.+)$/i.exec(title)
  return { title, couple: m ? [m[1].trim(), m[2].trim()] : null }
}

/** Monogramme du cachet : « A|P » pour un couple, sinon l'initiale. */
export function monogram(name) {
  const { title, couple } = eventNames(name)
  return couple ? [couple[0][0], couple[1][0]].map(c => c.toUpperCase()) : [(title[0] || '✦').toUpperCase()]
}

export function hashtag(name) {
  const { title, couple } = eventNames(name)
  const raw = couple ? `${couple[0].split(/\s/)[0]}&${couple[1].split(/\s/)[0]}` : title.replace(/\s+/g, '')
  return '#' + raw.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w&]/g, '').toUpperCase().slice(0, 22)
}

/** Début de l'événement (date + heure si connue). */
export function startOf(occasion) {
  return occasion.starts_at ? new Date(occasion.starts_at) : new Date(occasion.date + 'T00:00:00')
}

const pad = (n, l = 2) => String(n).padStart(l, '0')
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

/** Date façon « numéro de carte » : 0010 0012 2026 1800 + libellés. */
export function cardDate(occasion) {
  const d = startOf(occasion)
  const time = occasion.starts_at ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : null
  return [
    { digits: pad(d.getDate(), 4), label: 'Jour', value: cap(d.toLocaleDateString('fr-FR', { weekday: 'long' })) + ' ' + d.getDate() },
    { digits: pad(d.getMonth() + 1, 4), label: 'Mois', value: cap(d.toLocaleDateString('fr-FR', { month: 'long' })) },
    { digits: String(d.getFullYear()), label: 'Année', value: String(d.getFullYear()) },
    { digits: time ? time.replace(':', '') : '····', label: 'Heure', value: time ? time.replace(':', 'h') : '—' },
  ]
}

export function longDate(occasion) {
  const d = startOf(occasion)
  const day = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return occasion.starts_at ? `${day} · ${pad(d.getHours())}h${pad(d.getMinutes())}` : day
}

const icsDate = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
const icsText = (s = '') => String(s).replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n')
const ymd = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`

/** Fichier .ics (ajout à l'agenda du téléphone). */
export function calendarFile(occasion, url) {
  const start = startOf(occasion)
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Signiq//Invitation//FR', 'BEGIN:VEVENT',
    `UID:${start.getTime()}-${Math.random().toString(36).slice(2)}@signiq`, `DTSTAMP:${icsDate(new Date())}`]
  if (occasion.starts_at) {
    lines.push(`DTSTART:${icsDate(start)}`, `DTEND:${icsDate(new Date(start.getTime() + 5 * 3600e3))}`)
  } else {
    lines.push(`DTSTART;VALUE=DATE:${ymd(start)}`, `DTEND;VALUE=DATE:${ymd(new Date(start.getTime() + 864e5))}`)
  }
  lines.push(`SUMMARY:${icsText(occasion.name)}`)
  if (occasion.location) lines.push(`LOCATION:${icsText(occasion.location)}`)
  lines.push(`DESCRIPTION:${icsText(`Votre invitation : ${url}`)}`, 'END:VEVENT', 'END:VCALENDAR')
  return new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
}

export const mapsUrl = (location) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`

/** Polices de l'invitation, chargées seulement sur cette page. */
export function loadInvitationFonts() {
  if (document.getElementById('inv-fonts')) return
  const link = document.createElement('link')
  link.id = 'inv-fonts'; link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400;1,500&family=Great+Vibes&family=Jost:wght@400;500;600&display=swap'
  document.head.appendChild(link)
}
