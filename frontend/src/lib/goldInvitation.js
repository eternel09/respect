/**
 * Constantes et utilitaires partagés par les modèles ivoire et or
 * (« Heure dorée », « Save the Date ») : courbe d'animation, dégradé doré,
 * QR recoloré, code d'invitation lisible.
 */

export const EASE = [0.22, 1, 0.36, 1]
export const GOLD_BG = 'linear-gradient(135deg,#B8924A 0%,#E6CF9A 45%,#C9A55C 55%,#9C7A3C 100%)'
/** Bordure dorée d'un cadre sur fond uni. */
export const goldBorder = (fill = '#FBF8F2') => ({ border: '1px solid transparent', background: `linear-gradient(${fill},${fill}) padding-box, ${GOLD_BG} border-box` })
export const pad = (n) => String(n).padStart(2, '0')

/** QR du serveur (marine sur blanc) recoloré aux tons du design : brun sur ivoire. */
export const warmQr = (src) => {
  const m = /^data:image\/svg\+xml;base64,(.+)$/.exec(src || '')
  if (!m) return src
  try {
    const svg = atob(m[1]).replace(/#1e3a5f/gi, '#2E2620').replace(/#ffffff/gi, '#FBF8F2')
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  } catch { return src }
}

/** Code lisible tiré du jeton de l'invité (ex. INV-09E5-D4). */
export const invitationCode = (token) => {
  const raw = (token || '').replace(/-/g, '')
  return raw ? `INV-${raw.slice(0, 4)}-${raw.slice(4, 6)}`.toUpperCase() : 'INV-XXXX-XX'
}

/** « 2 places · Table 3 » : places réservées (ou plafond) et table. */
export const accessDetails = (places, tableLabel) =>
  [places && `${places} place${places > 1 ? 's' : ''}`, tableLabel].filter(Boolean).join(' · ')

export const ACCESS_NOTE = 'Présentez ce code à l’entrée. Invitation strictement personnelle.'
