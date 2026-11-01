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

/** Palettes proposées à l'organisateur (couleur principale ; le reste en découle). */
export const PALETTES = {
  bordeaux:   { label: 'Bordeaux',    main: '#7a1626' },
  emeraude:   { label: 'Émeraude',    main: '#1f5c4a' },
  nuit:       { label: 'Bleu nuit',   main: '#1e3a5f' },
  rose:       { label: 'Rose poudré', main: '#a85a6e' },
  noir:       { label: 'Noir & or',   main: '#1d1a17' },
  violet:     { label: 'Prune',       main: '#5b2a86' },
  terracotta: { label: 'Terracotta',  main: '#9c4a2c' },
}

/** Styles de polices : titres (script) et textes (serif). */
export const FONT_SETS = {
  classique:  { label: 'Classique',  script: "'Great Vibes'",       serif: "'Cormorant Garamond'", family: 'Great+Vibes' },
  romantique: { label: 'Romantique', script: "'Pinyon Script'",     serif: "'Cormorant Garamond'", family: 'Pinyon+Script' },
  moderne:    { label: 'Moderne',    script: "'Playfair Display'",  serif: "'Playfair Display'",   family: 'Playfair+Display:ital,wght@0,400;0,500;1,400;1,500', italic: true },
}

const hexToRgb = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
const rgbToHex = (rgb) => '#' + rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
const scale = (hex, k) => rgbToHex(hexToRgb(hex).map(v => v * k))
const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Couleurs dérivées d'une couleur principale. Une couleur trop claire est
 * assombrie jusqu'à rester lisible en blanc (carte, enveloppe, boutons).
 */
export function paletteFrom(main) {
  let m = /^#[0-9a-f]{6}$/i.test(main || '') ? main.toLowerCase() : '#7a1626'
  for (let i = 0; i < 12 && luminance(m) > 0.2; i++) m = scale(m, 0.88)
  return { main: m, dark: scale(m, 0.7), light: scale(m, 1.17), ink: scale(m, 0.74) }
}

/**
 * Thème complet d'une invitation : couleur du type d'événement par défaut,
 * remplacée par la palette ou la couleur choisies par l'organisateur, et
 * style de polices (variables CSS à poser sur la page).
 */
export function resolveTheme(occasion) {
  const base = themeFor(occasion.type)
  const custom = occasion.theme || {}
  const main = custom.palette === 'custom' ? custom.color : PALETTES[custom.palette]?.main
  const fonts = FONT_SETS[custom.font] || FONT_SETS.classique
  return {
    ...base,
    ...(main ? paletteFrom(main) : {}),
    fontVars: {
      '--inv-script': fonts.script,
      '--inv-serif': fonts.serif,
      '--inv-script-style': fonts.italic ? 'italic' : 'normal',
    },
  }
}

/** Monogramme du cachet : texte choisi par l'organisateur, sinon les initiales. */
export function sealOf(occasion) {
  const seal = (occasion.theme?.seal || '').trim()
  if (!seal) return monogram(occasion.name)
  return seal.length === 2 ? [seal[0], seal[1]] : [seal]
}

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

/**
 * Début de l'événement (date + heure si connue), en heure locale « murale » :
 * l'organisateur saisit l'heure du lieu (18h00) et le serveur la stocke sans
 * fuseau. On ignore donc le décalage de l'ISO pour afficher 18h00 partout.
 */
export function startOf(occasion) {
  const [y, mo, d] = occasion.date.split('-').map(Number)
  const t = occasion.starts_at && /T(\d{2}):(\d{2})/.exec(occasion.starts_at)
  return t ? new Date(y, mo - 1, d, +t[1], +t[2]) : new Date(y, mo - 1, d)
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

const stamp = (d, withTime) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` + (withTime ? `T${pad(d.getHours())}${pad(d.getMinutes())}00` : '')

export const isAndroid = () => /Android/i.test(navigator.userAgent)

/**
 * Lien du bouton « Agenda » : le fichier .ics du serveur, sur tous les
 * appareils. iPhone / iPad l'affichent directement (« Ajouter au
 * calendrier ») ; Android le télécharge puis l'ouvre avec l'application
 * d'agenda du téléphone (Samsung Agenda…), événement pré-rempli ; Outlook et
 * Calendrier l'ouvrent sur ordinateur.
 *
 * Android interdit à une page web d'ouvrir directement l'écran « nouvel
 * événement » d'une application (Chrome n'ouvre que les écrans déclarés
 * ouvrables depuis le web) : le fichier est la seule voie vers l'application
 * native.
 */
export const calendarHref = (token, apiBase) => `${apiBase}/rsvp/${token}/calendar.ics`

/**
 * Repli Android : création d'événement Google Agenda pré-remplie. Le chemin
 * /calendar/event est celui que l'application Google Agenda revendique, ce
 * qui lui laisse l'occasion de s'ouvrir à la place du site.
 */
export function googleCalendarUrl(occasion, { inviteUrl, table }) {
  const start = startOf(occasion)
  const timed = !!occasion.starts_at
  const end = new Date(start.getTime() + (timed ? 5 * 3600e3 : 864e5))
  const details = [table && `Votre place : ${table}`, `Votre invitation : ${inviteUrl}`].filter(Boolean).join('\n')
  const enc = encodeURIComponent

  return 'https://calendar.google.com/calendar/event?action=TEMPLATE'
    + `&text=${enc(occasion.name)}&dates=${stamp(start, timed)}/${stamp(end, timed)}`
    + (occasion.location ? `&location=${enc(occasion.location)}` : '')
    + `&details=${enc(details)}`
}

export const mapsUrl = (location) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`

/** Polices de l'invitation, chargées seulement sur ces pages (+ le style choisi). */
export function loadInvitationFonts(fontKey) {
  const add = (id, href) => {
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id; link.rel = 'stylesheet'; link.href = href
    document.head.appendChild(link)
  }
  add('inv-fonts', 'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400;1,500&family=Great+Vibes&family=Jost:wght@400;500;600&display=swap')
  const set = FONT_SETS[fontKey]
  if (set && fontKey !== 'classique') add(`inv-fonts-${fontKey}`, `https://fonts.googleapis.com/css2?family=${set.family}&display=swap`)
}
