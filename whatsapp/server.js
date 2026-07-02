/**
 * Service WhatsApp Signiq — whatsapp-web.js (WhatsApp Web automatisé).
 *
 * Endpoints (protégés par X-Api-Key) :
 *  GET  /status        → { state: starting|qr|ready|disconnected, qr: dataURI|null }
 *  POST /send-card     → { phone, org, name, memberNo, serial, qrDataUri } → envoie la carte
 *  POST /preview-card  → même payload → renvoie le PNG (test/aperçu sans envoyer)
 *
 * Première liaison : ouvrir les Réglages du back-office et scanner le QR
 * avec le WhatsApp de l'organisation (WhatsApp → Appareils connectés).
 */
const express = require('express')
const puppeteer = require('puppeteer')
const QRCode = require('qrcode')
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js')
const { renderCard } = require('./card')

const PORT = process.env.PORT || 3001
const API_KEY = process.env.API_KEY || 'signiq-dev-key'

// ── Client WhatsApp ─────────────────────────────────────────
let state = 'starting'
let qrDataUri = null

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
})

client.on('qr', async (qr) => {
  state = 'qr'
  qrDataUri = await QRCode.toDataURL(qr, { margin: 1, width: 300 })
  console.log('[wa] QR de liaison prêt — à scanner depuis le back-office')
})
client.on('ready', () => { state = 'ready'; qrDataUri = null; console.log('[wa] connecté ✓') })
client.on('auth_failure', (m) => { state = 'auth_failure'; console.error('[wa] échec auth:', m) })
client.on('disconnected', (reason) => {
  state = 'disconnected'
  console.warn('[wa] déconnecté:', reason, '— réinitialisation…')
  client.initialize().catch((e) => console.error('[wa] reinit:', e.message))
})
client.initialize().catch((e) => { state = 'error'; console.error('[wa] init:', e.message) })

// ── API ─────────────────────────────────────────────────────
const app = express()
app.use(express.json({ limit: '2mb' }))

app.use((req, res, next) => {
  if (req.get('x-api-key') !== API_KEY) return res.status(401).json({ message: 'Clé API invalide.' })
  next()
})

app.get('/status', (req, res) => res.json({ state, qr: qrDataUri }))

app.post('/preview-card', async (req, res) => {
  try {
    const png = await renderCard(puppeteer, req.body)
    res.type('png').send(png)
  } catch (e) {
    console.error('[card] rendu:', e.message)
    res.status(500).json({ message: 'Échec du rendu de la carte.' })
  }
})

app.post('/send-card', async (req, res) => {
  if (state !== 'ready') {
    return res.status(409).json({ message: 'WhatsApp non connecté. Liez le compte depuis les Réglages.' })
  }

  const digits = String(req.body.phone || '').replace(/\D/g, '')
  if (digits.length < 9) return res.status(422).json({ message: 'Numéro de téléphone invalide.' })

  try {
    const numberId = await client.getNumberId(digits)
    if (!numberId) return res.status(404).json({ message: "Ce numéro n'est pas sur WhatsApp." })

    const png = await renderCard(puppeteer, req.body)
    const media = new MessageMedia('image/png', png.toString('base64'), 'carte-membre.png')
    const caption =
      `🪪 ${req.body.name} — votre carte de membre ${req.body.org}.\n` +
      `Présentez ce code QR à l'entrée de chaque événement. Bienvenue !`

    await client.sendMessage(numberId._serialized, media, { caption })
    console.log(`[wa] carte envoyée → ${digits}`)
    res.json({ sent: true, message: `Carte envoyée à ${req.body.name} sur WhatsApp.` })
  } catch (e) {
    console.error('[wa] envoi:', e.message)
    res.status(500).json({ message: "Échec de l'envoi WhatsApp." })
  }
})

app.listen(PORT, () => console.log(`[wa] service Signiq WhatsApp sur http://127.0.0.1:${PORT}`))
