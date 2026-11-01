/**
 * Texte du message WhatsApp d'une invitation, selon le mode d'envoi choisi
 * pour l'événement :
 *  - pdf  : le carton en pièce jointe, ce texte en légende (historique) ;
 *  - link : un message texte seul avec le lien personnel de l'invité, où il
 *           retrouve son carton, son QR d'accès et la confirmation ;
 *  - both : le carton en pièce jointe ET le lien dans la légende.
 * Module sans dépendance : testable sans WhatsApp ni Chromium.
 */
const MODES = ['pdf', 'link', 'both']

function deliveryMode(body) {
  return MODES.includes(body.delivery) ? body.delivery : 'pdf'
}

/** Mode → { text, withMedia }. */
function buildInvitationMessage(body) {
  const mode = deliveryMode(body)
  // Ancien nom du champ (backend non encore mis à jour) accepté en repli.
  const url = body.invitationUrl || body.rsvpUrl || ''
  const custom = String(body.customMessage || '').trim()
  const where = body.location ? ` · ${body.location}` : ''
  const table = body.tableLabel ? `\n🍽️ Votre place : ${body.tableLabel}` : ''

  const lines = [
    `💌 ${body.guestName}, vous êtes convié(e) à ${body.eventName}.`,
    `📅 ${body.dateText}${where}${table}`,
  ]

  if (mode === 'link') {
    // Sans lien, un message « lien » n'a pas de sens : le backend bloque
    // l'envoi en amont ; on refuse aussi ici par sécurité.
    if (!url) return { text: null, withMedia: false }
    lines.push(
      `📩 Votre invitation personnelle : ${url}`,
      `Ouvrez-la pour découvrir votre invitation, confirmer votre présence et retrouver votre QR d'accès à présenter à l'accueil le jour J. Au plaisir de vous y voir !`,
    )
  } else {
    if (url) {
      lines.push(mode === 'both'
        ? `📩 Votre invitation en ligne et la confirmation de présence : ${url}`
        : `✅ Confirmez votre présence : ${url}`)
    }
    lines.push(`Présentez ce QR à l'accueil le jour J. Au plaisir de vous y voir !`)
  }

  return { text: (custom ? `${custom}\n\n` : '') + lines.join('\n'), withMedia: mode !== 'link' }
}

/**
 * Rappel du jour J (envoyé le matin de l'événement) : texte seul avec le
 * lien de l'invitation, où l'invité retrouve son QR d'accès et l'itinéraire.
 * Null sans lien : le rappel n'a de sens qu'avec lui.
 */
function buildReminderMessage(body) {
  const url = String(body.invitationUrl || '').trim()
  if (!url) return null
  const when = body.timeText ? `aujourd'hui à ${body.timeText}` : "aujourd'hui"
  const where = body.location ? ` · ${body.location}` : ''
  const table = body.tableLabel ? `\n🍽️ Votre place : ${body.tableLabel}` : ''

  return [
    `🔔 C'est le grand jour ! ${body.guestName}, ${body.eventName} vous attend.`,
    `📅 ${when.charAt(0).toUpperCase() + when.slice(1)}${where}${table}`,
    `📩 Votre invitation et votre QR d'accès : ${url}`,
    `Présentez votre QR à l'accueil. À tout à l'heure !`,
  ].join('\n')
}

module.exports = { buildInvitationMessage, buildReminderMessage, deliveryMode }
