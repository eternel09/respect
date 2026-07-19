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
const fs = require('fs')
const path = require('path')
const express = require('express')
const puppeteer = require('puppeteer')
const QRCode = require('qrcode')
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js')
const { renderCard, renderInvitation, renderPrintPdf, warmUp } = require('./card')

const PORT = process.env.PORT || 3001
const API_KEY = process.env.API_KEY || 'signiq-dev-key'

// Au redémarrage du conteneur, le volume persistant peut garder des verrous
// Chromium résiduels ("SingletonLock/Cookie/Socket") d'une instance tuée →
// "profile appears to be in use" et échec de lancement. On les purge au boot.
function clearChromiumLocks(dir) {
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) clearChromiumLocks(p)
      else if (/^Singleton(Lock|Cookie|Socket)$/.test(entry.name)) fs.rmSync(p, { force: true })
    }
  } catch { /* dossier absent au premier démarrage : rien à nettoyer */ }
}
// ── Client WhatsApp ─────────────────────────────────────────
let state = 'starting'
let qrDataUri = null
let client = null

// Construit un client neuf avec ses gestionnaires. On RECRÉE un client à chaque
// (re)démarrage : whatsapp-web.js ne supporte pas un second initialize() sur la
// même instance — l'ancienne page Puppeteer survit ("binding already exists")
// et deux sessions se partagent le même profil, ce que WhatsApp sanctionne par
// un LOGOUT immédiat (d'où les déconnexions en boucle).
function buildClient() {
  const c = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      // Sur un serveur chargé, piloter la page WhatsApp Web (sendMessage →
      // Runtime.callFunctionOn) peut dépasser le protocolTimeout par défaut
      // (180 s) et faire échouer l'envoi. On élargit la marge.
      protocolTimeout: 300000,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu',
        '--disable-extensions', '--no-first-run', '--no-default-browser-check',
        '--disable-dev-shm-usage',
      ],
    },
  })

  c.on('qr', async (qr) => {
    state = 'qr'
    qrDataUri = await QRCode.toDataURL(qr, { margin: 1, width: 300 })
    console.log('[wa] QR de liaison prêt — à scanner depuis le back-office')
  })
  c.on('authenticated', () => console.log('[wa] authentifié ✓'))
  c.on('ready', () => { state = 'ready'; qrDataUri = null; console.log('[wa] connecté ✓') })
  c.on('auth_failure', (m) => { state = 'auth_failure'; console.error('[wa] échec auth:', m) })
  c.on('disconnected', async (reason) => {
    state = 'disconnected'
    qrDataUri = null
    console.warn('[wa] déconnecté:', reason, '— réinitialisation…')
    // Détruire proprement AVANT de recréer, sinon l'ancienne page Puppeteer
    // reste active et le prochain initialize() échoue ("binding already exists").
    try { await c.destroy() } catch { /* déjà fermée */ }
    // LOGOUT = session invalidée côté WhatsApp : on purge le profil local pour
    // repartir sur une liaison propre (nouveau QR).
    if (reason === 'LOGOUT') {
      try { fs.rmSync('./.wwebjs_auth', { recursive: true, force: true }) } catch { /* rien */ }
    }
    setTimeout(startClient, 3000)
  })

  return c
}

function startClient() {
  // Purge les verrous Chromium résiduels d'une instance tuée avant de relancer.
  clearChromiumLocks('./.wwebjs_auth')
  client = buildClient()
  client.initialize().catch((e) => { state = 'error'; console.error('[wa] init:', e.message) })
}

startClient()

// ── API ─────────────────────────────────────────────────────
const app = express()
app.use(express.json({ limit: '25mb' }))

// Sonde de santé (sans clé) — pour le healthcheck Docker / l'auto-redémarrage.
app.get('/health', (req, res) => res.json({ ok: true, state }))

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

app.post('/preview-invitation', async (req, res) => {
  try {
    const png = await renderInvitation(puppeteer, req.body)
    res.type('png').send(png)
  } catch (e) {
    console.error('[invitation] rendu:', e.message)
    res.status(500).json({ message: "Échec du rendu de l'invitation." })
  }
})

// Planche A4 de cartes (format carte de visite) — impression au même design
app.post('/print-cards', async (req, res) => {
  const { org, members } = req.body
  if (!Array.isArray(members) || members.length === 0) {
    return res.status(422).json({ message: 'Aucun membre à imprimer.' })
  }
  if (members.length > 100) {
    return res.status(422).json({ message: '100 cartes maximum par planche.' })
  }
  try {
    const pdf = await renderPrintPdf(puppeteer, { org, members })
    res.type('application/pdf').send(pdf)
  } catch (e) {
    console.error('[card] planche:', e.message)
    res.status(500).json({ message: 'Échec de la génération des cartes.' })
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

app.post('/send-invitation', async (req, res) => {
  if (state !== 'ready') {
    return res.status(409).json({ message: 'WhatsApp non connecté. Liez le compte depuis les Réglages.' })
  }

  const digits = String(req.body.phone || '').replace(/\D/g, '')
  if (digits.length < 9) return res.status(422).json({ message: 'Numéro de téléphone invalide.' })

  try {
    const numberId = await client.getNumberId(digits)
    if (!numberId) return res.status(404).json({ message: "Ce numéro n'est pas sur WhatsApp." })

    const png = await renderInvitation(puppeteer, req.body)
    const media = new MessageMedia('image/png', png.toString('base64'), 'invitation.png')
    const table = req.body.tableLabel ? `\n🍽️ Votre place : ${req.body.tableLabel}` : ''
    const caption =
      `💌 ${req.body.guestName}, vous êtes convié(e) à ${req.body.eventName}.\n` +
      `📅 ${req.body.dateText}${req.body.location ? ` · ${req.body.location}` : ''}${table}\n` +
      `Présentez ce QR à l'accueil le jour J. Au plaisir de vous y voir !`

    await client.sendMessage(numberId._serialized, media, { caption })
    console.log(`[wa] invitation envoyée → ${digits}`)
    res.json({ sent: true, message: `Invitation envoyée à ${req.body.guestName}.` })
  } catch (e) {
    console.error('[wa] invitation:', e.message)
    res.status(500).json({ message: "Échec de l'envoi WhatsApp." })
  }
})

app.listen(PORT, () => {
  console.log(`[wa] service Signiq WhatsApp sur http://127.0.0.1:${PORT}`)
  console.log('[wa] connexion à WhatsApp Web en cours (15-40 s la première fois)…')
  // Préchauffage du moteur de rendu en parallèle : l'impression des cartes
  // n'attend pas la connexion WhatsApp.
  warmUp(puppeteer).catch((e) => console.error('[card] préchauffage:', e.message))
})
