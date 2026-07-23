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

/** Portrait 900×1400 — WhatsApp / écrans de téléphone. */
function cardPortraitHtml({ org, orgLogo, name, memberNo, serial, qrDataUri }) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>
  ${SHARED_CSS}
  html, body { width: 900px; height: 1400px; }
  .orb1 { width: 420px; height: 420px; top: -140px; left: -120px;
          background: radial-gradient(circle at 35% 35%, rgba(224,138,60,0.55), rgba(224,138,60,0.05)); }
  .orb2 { width: 360px; height: 360px; bottom: -130px; right: -100px;
          background: radial-gradient(circle at 40% 40%, rgba(96,150,220,0.5), rgba(96,150,220,0.04)); }
  .orb3 { width: 160px; height: 160px; top: 420px; right: 60px;
          background: radial-gradient(circle at 40% 40%, rgba(255,255,255,0.25), rgba(255,255,255,0.02)); }
  .glass { width: 780px; height: 1280px; border-radius: 48px; padding: 60px 56px; }
  .head { display: flex; align-items: center; justify-content: space-between; }
  .org { font-size: 26px; max-width: 480px; }
  .brand-logo { height: 44px; }
  .label { font-size: 19px; margin-top: 64px; }
  .name { font-size: 68px; line-height: 1.1; margin-top: 14px; }
  .no { margin-top: 28px; padding: 14px 30px; font-size: 26px; }
  .qrzone { flex: 1; display: flex; align-items: center; justify-content: center; }
  .qrwrap { width: 480px; height: 480px; border-radius: 40px;
            box-shadow: 0 24px 50px rgba(0,0,0,0.35), inset 0 0 0 12px #ffffff; }
  .qrwrap img { width: 420px; height: 420px; }
  .foot { border-top: 1px solid rgba(255,255,255,0.22); padding-top: 26px;
          display: flex; flex-direction: column; gap: 10px; align-items: center; text-align: center; }
  .serial { font-size: 21px; }
  .hint { font-size: 20px; }
</style></head><body>
  <div class="orb orb1"></div><div class="orb orb2"></div><div class="orb orb3"></div>
  <div class="glass">
    <div class="head">
      <div class="org">${escapeHtml(org)}</div>
      ${brandMark(orgLogo)}
    </div>
    <div class="label">Carte de membre</div>
    <div class="name">${escapeHtml(name)}</div>
    <div><span class="no">MEMBRE N° ${escapeHtml(memberNo)}</span></div>
    <div class="qrzone"><div class="qrwrap"><img src="${qrDataUri}" alt="QR"></div></div>
    <div class="foot">
      <div class="serial">ID ${escapeHtml(serial)}</div>
      <div class="hint">Présentez ce code QR à l'entrée de chaque événement</div>
    </div>
  </div>
</body></html>`
}

/** Paysage 1000×620 — proportions carte de visite (85,6×54 mm ≈ 1,585). */
function cardLandscapeHtml({ org, orgLogo, name, memberNo, serial, qrDataUri }) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>
  ${SHARED_CSS}
  html, body { width: 1000px; height: 620px; }
  .orb1 { width: 340px; height: 340px; top: -110px; left: -80px;
          background: radial-gradient(circle at 35% 35%, rgba(224,138,60,0.55), rgba(224,138,60,0.05)); }
  .orb2 { width: 260px; height: 260px; bottom: -90px; right: -60px;
          background: radial-gradient(circle at 40% 40%, rgba(96,150,220,0.5), rgba(96,150,220,0.04)); }
  .orb3 { width: 130px; height: 130px; top: 70px; right: 200px;
          background: radial-gradient(circle at 40% 40%, rgba(255,255,255,0.28), rgba(255,255,255,0.02)); }
  .glass { width: 880px; height: 500px; border-radius: 34px; padding: 44px 52px; }
  .head { display: flex; align-items: center; justify-content: space-between; }
  .org { font-size: 22px; }
  .brand-logo { height: 30px; }
  .bodyrow { flex: 1; display: flex; align-items: center; gap: 48px; margin-top: 20px; }
  .identity { flex: 1; }
  .label { font-size: 15px; }
  .name { font-size: 52px; line-height: 1.12; margin-top: 10px; }
  .no { margin-top: 22px; padding: 10px 22px; font-size: 20px; }
  .qrwrap { width: 250px; height: 250px; border-radius: 26px;
            box-shadow: 0 18px 40px rgba(0,0,0,0.35), inset 0 0 0 8px #ffffff; }
  .qrwrap img { width: 218px; height: 218px; }
  .foot { display: flex; align-items: center; justify-content: space-between;
          border-top: 1px solid rgba(255,255,255,0.22); padding-top: 18px; }
  .serial { font-size: 16px; }
  .hint { font-size: 15px; }
</style></head><body>
  <div class="orb orb1"></div><div class="orb orb2"></div><div class="orb orb3"></div>
  <div class="glass">
    <div class="head">
      <div class="org">${escapeHtml(org)}</div>
      ${brandMark(orgLogo)}
    </div>
    <div class="bodyrow">
      <div class="identity">
        <div class="label">Carte de membre</div>
        <div class="name">${escapeHtml(name)}</div>
        <div><span class="no">MEMBRE N° ${escapeHtml(memberNo)}</span></div>
      </div>
      <div class="qrwrap"><img src="${qrDataUri}" alt="QR"></div>
    </div>
    <div class="foot">
      <div class="serial">ID ${escapeHtml(serial)}</div>
      <div class="hint">Présentez ce code QR à l'entrée de chaque événement</div>
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

/** Carte portrait en PNG retina (1800×2800) — pour WhatsApp. */
async function renderCard(puppeteer, data) {
  const page = await (await browser(puppeteer)).newPage()
  try {
    await page.setViewport({ width: 900, height: 1400, deviceScaleFactor: 2 })
    await page.setContent(cardPortraitHtml(data), { waitUntil: 'networkidle0' })
    // Buffer.from : puppeteer récent renvoie un Uint8Array (Express le
    // sérialiserait en JSON au lieu de l'envoyer en binaire)
    return Buffer.from(await page.screenshot({ type: 'png' }))
  } finally {
    await page.close().catch(() => {})
  }
}

/** Invitation portrait en PNG retina — pour WhatsApp. */
async function renderInvitation(puppeteer, data) {
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
