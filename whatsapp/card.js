/**
 * Cartes de membre Signiq — design glassmorphism rendu par Puppeteer.
 *  - Portrait  (900×1400)  : envoi WhatsApp, plein écran sur téléphone.
 *  - Paysage   (1000×620)  : format carte de visite (impression).
 *  - Planche A4 (PDF)      : cartes paysage au format CR80 (85,6×54 mm), 8/page.
 */

const fs = require('fs')

// Logo blanc embarqué en data-URI (rendu fiable dans Puppeteer, aucun réseau)
const LOGO_WHITE = `data:image/png;base64,${fs.readFileSync(__dirname + '/assets/logo-white.png').toString('base64')}`

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
}

// Marque en haut de carte : le logo de l'organisation (posé sur une pastille
// blanche pour rester lisible quelles que soient ses couleurs sur le fond navy)
// ou, à défaut, le logo Signiq blanc.
function brandMark(orgLogo) {
  return orgLogo
    ? `<span class="brand-logo brand-logo--org"><img src="${orgLogo}" alt=""></span>`
    : `<img class="brand-logo" src="${LOGO_WHITE}" alt="Signiq">`
}

const SHARED_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: linear-gradient(135deg, #0d1b2e 0%, #1e3a5f 45%, #2f4f78 75%, #c9742b 130%);
    position: relative; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    color: #ffffff;
  }
  .orb { position: absolute; border-radius: 50%; filter: blur(2px); }
  .glass {
    position: relative;
    background: linear-gradient(120deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06));
    backdrop-filter: blur(22px);
    -webkit-backdrop-filter: blur(22px);
    border: 1.5px solid rgba(255,255,255,0.32);
    box-shadow: 0 30px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.35);
    display: flex; flex-direction: column;
  }
  .org { font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.92); }
  .brand-logo { opacity: 0.92; }
  .brand-logo--org { opacity: 1; background: #ffffff; border-radius: 10px; padding: 6px 10px;
                     display: inline-flex; align-items: center; box-shadow: 0 6px 16px rgba(0,0,0,0.22); }
  .brand-logo--org img { height: 100%; width: auto; max-width: 170px; display: block; }
  .label { letter-spacing: 4px; text-transform: uppercase; color: rgba(255,255,255,0.55); }
  .name { font-weight: 800; text-shadow: 0 2px 14px rgba(0,0,0,0.25); }
  .no { display: inline-block; border-radius: 999px; background: rgba(224,138,60,0.28);
        border: 1px solid rgba(224,138,60,0.6); font-weight: 700; letter-spacing: 2px; }
  .qrwrap { background: rgba(255,255,255,0.95); display: flex; align-items: center; justify-content: center; }
  .serial { font-family: 'Consolas', monospace; letter-spacing: 3px; color: rgba(255,255,255,0.65); }
  .hint { color: rgba(255,255,255,0.65); }
`

/**
 * Carte de membre — paysage 1000×620 (format carte CR80 ≈ 85,6×54 mm).
 * Design plat : liseré arc-en-ciel, fond navy, logo de l'organisation sur
 * pastille blanche, QR encadré, ID + téléphone. Utilisée à l'impression ET
 * pour l'envoi WhatsApp.
 */
function cardLandscapeHtml({ org, orgLogo, name, memberNo, serial, qrDataUri, phone }) {
  const logo = orgLogo
    ? `<span class="logo-chip"><img src="${orgLogo}" alt=""></span>`
    : `<img class="logo-plain" src="${LOGO_WHITE}" alt="Signiq">`
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1000px; height: 620px; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #ffffff;
         background: linear-gradient(155deg, #0c1a2c 0%, #12273f 55%, #16324f 100%);
         position: relative; overflow: hidden; }
  .bar { display: flex; height: 12px; }
  .bar > i { flex: 1; }
  .stage { height: calc(100% - 12px); padding: 40px 48px 34px; display: flex; flex-direction: column; }
  .head { display: flex; align-items: center; gap: 22px; }
  .logo-chip { width: 84px; height: 84px; background: #ffffff; border-radius: 18px; flex-shrink: 0;
               display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 24px rgba(0,0,0,0.30); }
  .logo-chip img { max-width: 64px; max-height: 64px; width: auto; height: auto; display: block; }
  .logo-plain { height: 60px; width: auto; opacity: 0.95; }
  .org { font-size: 30px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase; }
  .body { flex: 1; display: flex; align-items: center; gap: 34px; }
  .identity { flex: 1; min-width: 0; }
  .label { font-size: 16px; letter-spacing: 5px; text-transform: uppercase; color: rgba(255,255,255,0.5); }
  .name { font-size: 54px; font-weight: 800; line-height: 1.08; margin-top: 10px; text-shadow: 0 2px 14px rgba(0,0,0,0.3); }
  .no { display: inline-block; margin-top: 22px; padding: 12px 30px; border-radius: 999px;
        font-size: 23px; font-weight: 700; letter-spacing: 2px; color: #2a1a08;
        background: linear-gradient(90deg, #d8944a, #c9742b); border: 1px solid rgba(255,220,180,0.45);
        box-shadow: 0 8px 20px rgba(201,116,43,0.35); }
  .qrwrap { width: 300px; height: 300px; background: #ffffff; border-radius: 28px; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center; box-shadow: 0 18px 42px rgba(0,0,0,0.38); }
  .qrwrap img { width: 262px; height: 262px; }
  .foot { display: flex; flex-direction: column; gap: 5px; }
  .serial { font-family: 'Consolas', 'Courier New', monospace; font-size: 24px; letter-spacing: 4px; font-weight: 700; color: rgba(255,255,255,0.82); }
  .phone { font-size: 19px; color: rgba(255,255,255,0.5); letter-spacing: 1px; }
</style></head><body>
  <div class="bar"><i style="background:#e0322f"></i><i style="background:#2f9bd4"></i><i style="background:#79b93c"></i><i style="background:#f4c020"></i><i style="background:#9b34a8"></i></div>
  <div class="stage">
    <div class="head">${logo}<div class="org">${escapeHtml(org)}</div></div>
    <div class="body">
      <div class="identity">
        <div class="label">Carte de membre</div>
        <div class="name">${escapeHtml(name)}</div>
        <div><span class="no">MEMBRE N° ${escapeHtml(memberNo)}</span></div>
      </div>
      <div class="qrwrap"><img src="${qrDataUri}" alt="QR"></div>
    </div>
    <div class="foot">
      <div class="serial">ID ${escapeHtml(serial)}</div>
      ${phone ? `<div class="phone">${escapeHtml(phone)}</div>` : ''}
    </div>
  </div>
</body></html>`
}

/** Invitation portrait 900×1400 — WhatsApp. Carte d'accueil pour une occasion. */
function invitationPortraitHtml({ org, orgLogo, eventType, eventName, guestName, dateText, location, tableLabel, qrDataUri }) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>
  ${SHARED_CSS}
  html, body { width: 900px; height: 1400px; }
  body { background: linear-gradient(135deg, #1a1030 0%, #3a1f47 40%, #7c3a2e 80%, #e08a3c 130%); }
  .orb1 { width: 440px; height: 440px; top: -150px; right: -120px;
          background: radial-gradient(circle at 35% 35%, rgba(224,138,60,0.6), rgba(224,138,60,0.05)); }
  .orb2 { width: 380px; height: 380px; bottom: -140px; left: -110px;
          background: radial-gradient(circle at 40% 40%, rgba(201,116,43,0.5), rgba(201,116,43,0.04)); }
  .orb3 { width: 160px; height: 160px; top: 380px; left: 70px;
          background: radial-gradient(circle at 40% 40%, rgba(255,255,255,0.22), rgba(255,255,255,0.02)); }
  .glass { width: 780px; height: 1280px; border-radius: 48px; padding: 56px 52px; align-items: center; text-align: center; }
  .head { width: 100%; display: flex; align-items: center; justify-content: space-between; }
  .org { font-size: 24px; max-width: 460px; text-align: left; }
  .brand-logo { height: 40px; }
  .type { letter-spacing: 6px; text-transform: uppercase; color: rgba(255,255,255,0.6); font-size: 18px; margin-top: 40px; }
  .invited { font-size: 22px; color: rgba(255,255,255,0.8); margin-top: 30px; }
  .guest { font-size: 60px; font-weight: 800; line-height: 1.1; margin-top: 10px; text-shadow: 0 2px 14px rgba(0,0,0,0.3); }
  .rule { width: 120px; height: 2px; background: rgba(255,255,255,0.35); margin: 30px 0; }
  .event { font-size: 40px; font-weight: 700; line-height: 1.15; }
  .meta { margin-top: 18px; display: flex; flex-direction: column; gap: 8px; font-size: 23px; color: rgba(255,255,255,0.85); }
  .table { margin-top: 26px; display: inline-block; padding: 16px 34px; border-radius: 999px;
           background: rgba(224,138,60,0.3); border: 1.5px solid rgba(224,138,60,0.7);
           font-size: 26px; font-weight: 700; letter-spacing: 1px; }
  .qrzone { flex: 1; display: flex; align-items: center; justify-content: center; }
  .qrwrap { width: 400px; height: 400px; border-radius: 34px;
            box-shadow: 0 24px 50px rgba(0,0,0,0.35), inset 0 0 0 10px #ffffff; }
  .qrwrap img { width: 350px; height: 350px; }
  .hint { font-size: 20px; color: rgba(255,255,255,0.65); }
</style></head><body>
  <div class="orb orb1"></div><div class="orb orb2"></div><div class="orb orb3"></div>
  <div class="glass">
    <div class="head">
      <div class="org">${escapeHtml(org)}</div>
      ${brandMark(orgLogo)}
    </div>
    <div class="type">${escapeHtml(eventType || 'Invitation')}</div>
    <div class="invited">Vous êtes convié(e) à</div>
    <div class="guest">${escapeHtml(guestName)}</div>
    <div class="rule"></div>
    <div class="event">${escapeHtml(eventName)}</div>
    <div class="meta">
      <div>📅 ${escapeHtml(dateText)}</div>
      ${location ? `<div>📍 ${escapeHtml(location)}</div>` : ''}
    </div>
    <div><span class="table">${escapeHtml(tableLabel || 'Placement libre')}</span></div>
    <div class="qrzone"><div class="qrwrap"><img src="${qrDataUri}" alt="QR"></div></div>
    <div class="hint">Présentez ce QR à l'accueil le jour J</div>
  </div>
</body></html>`
}

/**
 * Invitation sur carton PERSONNALISÉ (option A) : l'organisation téléverse son
 * image de fond ; on superpose seulement le QR de l'invité et son nom. Le même
 * carton sert à tous les invités de l'événement. Le rendu épouse le format de
 * l'image téléversée (portrait, paysage, carré) — les unités `vw` calent les
 * incrustations en proportion de la largeur, quelle que soit la taille.
 */
function customInvitationHtml({ backgroundDataUri, guestName, qrDataUri }) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; }
  #wrap { position: relative; width: 100%; line-height: 0; }
  #bg { display: block; width: 100%; height: auto; }
  .overlay {
    position: absolute; inset: 0; line-height: normal;
    display: flex; flex-direction: column; justify-content: flex-end;
    padding: 4vw; gap: 0;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  }
  .strip { display: flex; align-items: flex-end; gap: 3vw; }
  .namewrap {
    flex: 1 1 auto; min-width: 0;
    background: rgba(12, 18, 32, 0.55);
    border-radius: 3vw; padding: 3vw 3.6vw; color: #fff;
    box-shadow: 0 1.5vw 4vw rgba(0,0,0,0.28);
  }
  .namelabel { font-size: 2.3vw; letter-spacing: 0.35vw; text-transform: uppercase; opacity: 0.82; }
  .name { font-size: 5.4vw; font-weight: 800; line-height: 1.06; margin-top: 0.6vw; overflow-wrap: break-word; text-shadow: 0 0.3vw 1.2vw rgba(0,0,0,0.35); }
  .qrplate { flex: 0 0 auto; background: #fff; border-radius: 3vw; padding: 2.2vw; box-shadow: 0 1.5vw 4vw rgba(0,0,0,0.28); }
  .qrplate img { display: block; width: 22vw; height: 22vw; }
</style></head><body>
  <div id="wrap">
    <img id="bg" src="${backgroundDataUri}" alt="">
    <div class="overlay">
      <div class="strip">
        <div class="namewrap">
          <div class="namelabel">Invitation</div>
          <div class="name">${escapeHtml(guestName)}</div>
        </div>
        <div class="qrplate"><img src="${qrDataUri}" alt="QR"></div>
      </div>
    </div>
  </div>
</body></html>`
}

// ── Rendu ───────────────────────────────────────────────────
const LAUNCH_ARGS = [
  '--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu',
  '--disable-extensions', '--no-first-run', '--no-default-browser-check',
  '--disable-dev-shm-usage',
]

let rendererBrowser = null

async function browser(puppeteer) {
  if (!rendererBrowser || !rendererBrowser.connected) {
    // protocolTimeout élargi : sur un serveur chargé, le rendu (setContent /
    // screenshot) peut dépasser les 180 s par défaut et échouer.
    rendererBrowser = await puppeteer.launch({ headless: true, protocolTimeout: 300000, args: LAUNCH_ARGS })
  }
  return rendererBrowser
}

/** Préchauffe le navigateur de rendu au démarrage (impression dispo aussitôt). */
async function warmUp(puppeteer) {
  const t = Date.now()
  await browser(puppeteer)
  console.log(`[card] moteur de rendu prêt en ${((Date.now() - t) / 1000).toFixed(1)}s`)
}

/** Carte de membre en PNG retina (2000×1240) — pour WhatsApp. */
async function renderCard(puppeteer, data) {
  const page = await (await browser(puppeteer)).newPage()
  try {
    await page.setViewport({ width: 1000, height: 620, deviceScaleFactor: 2 })
    await page.setContent(cardLandscapeHtml(data), { waitUntil: 'networkidle0' })
    // Buffer.from : puppeteer récent renvoie un Uint8Array (Express le
    // sérialiserait en JSON au lieu de l'envoyer en binaire)
    return Buffer.from(await page.screenshot({ type: 'png' }))
  } finally {
    await page.close().catch(() => {})
  }
}

/** Invitation portrait en PNG retina — pour WhatsApp. */
async function renderInvitation(puppeteer, data) {
  // Carton personnalisé téléversé (option A) → on superpose QR + nom dessus.
  if (data && data.backgroundDataUri) {
    return renderCustomInvitation(puppeteer, data)
  }
  const page = await (await browser(puppeteer)).newPage()
  try {
    await page.setViewport({ width: 900, height: 1400, deviceScaleFactor: 2 })
    await page.setContent(invitationPortraitHtml(data), { waitUntil: 'networkidle0' })
    return Buffer.from(await page.screenshot({ type: 'png' }))
  } finally {
    await page.close().catch(() => {})
  }
}

/**
 * Invitation sur carton personnalisé : le rendu épouse les dimensions natives
 * de l'image téléversée (plafonnées), puis superpose QR + nom.
 */
async function renderCustomInvitation(puppeteer, data) {
  const page = await (await browser(puppeteer)).newPage()
  try {
    await page.setContent(customInvitationHtml(data), { waitUntil: 'networkidle0' })
    // Dimensions natives du carton téléversé (repli 900×1400 si illisible).
    const dims = await page.evaluate(() => {
      const img = document.getElementById('bg')
      return { w: img?.naturalWidth || 900, h: img?.naturalHeight || 1400 }
    })
    // On plafonne le plus grand côté (poids du PNG / limite JSON du service).
    const MAX = 1440
    const scale = Math.min(1, MAX / Math.max(dims.w, dims.h))
    const width = Math.round(dims.w * scale)
    const height = Math.round(dims.h * scale)
    await page.setViewport({ width, height, deviceScaleFactor: 2 })
    return Buffer.from(await page.screenshot({ type: 'png' }))
  } finally {
    await page.close().catch(() => {})
  }
}

/**
 * Planche A4 (PDF Buffer) de cartes paysage au format carte de visite :
 * chaque carte est capturée (fidélité totale au design) puis posée sur la
 * grille en 85,6×54 mm avec repères de découpe — 8 cartes par page.
 */
async function renderPrintPdf(puppeteer, { org, orgLogo, members }) {
  const b = await browser(puppeteer)

  // 1) Capture séquentielle des cartes — fiable même quand le Chromium de
  //    WhatsApp consomme le CPU (sa sync initiale). dsf 1,5 ≈ 450 DPI au
  //    format 85,6 mm : net à l'impression et ~35 % plus rapide que le 2×.
  const shots = []
  const page = await b.newPage()
  try {
    await page.setViewport({ width: 1000, height: 620, deviceScaleFactor: 1.5 })
    page.setDefaultTimeout(120000)
    for (let i = 0; i < members.length; i++) {
      await page.setContent(cardLandscapeHtml({ ...members[i], org, orgLogo }), { waitUntil: 'load', timeout: 60000 })
      const jpg = Buffer.from(await page.screenshot({ type: 'jpeg', quality: 85 }))
      shots.push(`data:image/jpeg;base64,${jpg.toString('base64')}`)
      if ((i + 1) % 5 === 0 || i === members.length - 1) console.log(`[card] ${i + 1}/${members.length}`)
    }
  } finally {
    await page.close().catch(() => {})
  }

  // 2) Assemblage en planche A4 (format d'impression carte de visite CR80)
  const sheet = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 10mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: sans-serif; }
    .grid { display: flex; flex-wrap: wrap; gap: 6mm 8mm; }
    .cell { width: 85.6mm; height: 54mm; outline: 0.2mm dashed #c9ced6; border-radius: 2.5mm;
            overflow: hidden; page-break-inside: avoid; }
    .cell img { width: 100%; height: 100%; display: block; }
  </style></head><body>
    <div class="grid">
      ${shots.map((src) => `<div class="cell"><img src="${src}"></div>`).join('')}
    </div>
  </body></html>`

  const pdfPage = await b.newPage()
  try {
    // Tout est inline (data-URIs) : 'load' suffit ; timeout large pour les gros lots.
    await pdfPage.setContent(sheet, { waitUntil: 'load', timeout: 120000 })
    return Buffer.from(await pdfPage.pdf({ format: 'A4', printBackground: true, timeout: 120000 }))
  } finally {
    await pdfPage.close().catch(() => {})
  }
}

module.exports = { renderCard, renderInvitation, renderPrintPdf, warmUp }
