const test = require('node:test')
const assert = require('node:assert')
const { buildInvitationMessage } = require('./invitation-message')

const base = {
  guestName: 'Marie', eventName: 'Mariage de Ana & Paul', dateText: 'samedi 12 décembre 2026 à 18h00',
  location: 'Salle Bella', tableLabel: 'Table 3', invitationUrl: 'https://signiq.cd/confirmer/abc',
}

test('pdf (par défaut) : pièce jointe, lien de confirmation en légende', () => {
  const m = buildInvitationMessage({ ...base, delivery: undefined })
  assert.equal(m.withMedia, true)
  assert.match(m.text, /✅ Confirmez votre présence : https:\/\/signiq\.cd\/confirmer\/abc/)
  assert.match(m.text, /Présentez ce QR/)
})

test('link : texte seul avec le lien personnel', () => {
  const m = buildInvitationMessage({ ...base, delivery: 'link', customMessage: 'Chers amis,' })
  assert.equal(m.withMedia, false)
  assert.ok(m.text.startsWith('Chers amis,\n\n💌 Marie'))
  assert.match(m.text, /📩 Votre invitation personnelle : https:\/\/signiq\.cd\/confirmer\/abc/)
  assert.match(m.text, /🍽️ Votre place : Table 3/)
})

test('link sans lien : refusé (rien à envoyer)', () => {
  const m = buildInvitationMessage({ ...base, delivery: 'link', invitationUrl: null })
  assert.equal(m.text, null)
})

test('both : pièce jointe + lien', () => {
  const m = buildInvitationMessage({ ...base, delivery: 'both' })
  assert.equal(m.withMedia, true)
  assert.match(m.text, /📩 Votre invitation en ligne/)
})

test('ancien champ rsvpUrl accepté', () => {
  const m = buildInvitationMessage({ ...base, invitationUrl: undefined, rsvpUrl: 'https://x.cd/confirmer/1' })
  assert.match(m.text, /https:\/\/x\.cd\/confirmer\/1/)
})
