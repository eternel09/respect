/**
 * Cartes de membre Signiq — design glassmorphism rendu par Puppeteer.
 *  - Portrait  (900×1400)  : envoi WhatsApp, plein écran sur téléphone.
 *  - Paysage   (1000×620)  : format carte de visite (impression).
 *  - Planche A4 (PDF)      : cartes paysage au format CR80 (85,6×54 mm), 8/page.
 */

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
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
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand-box { border-radius: 10px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.35);
               display: flex; align-items: center; justify-content: center; font-weight: 800; }
  .brand-name { font-weight: 700; letter-spacing: 1px; color: rgba(255,255,255,0.75); }
  .label { letter-spacing: 4px; text-transform: uppercase; color: rgba(255,255,255,0.55); }
  .name { font-weight: 800; text-shadow: 0 2px 14px rgba(0,0,0,0.25); }
  .no { display: inline-block; border-radius: 999px; background: rgba(224,138,60,0.28);
        border: 1px solid rgba(224,138,60,0.6); font-weight: 700; letter-spacing: 2px; }
  .qrwrap { background: rgba(255,255,255,0.95); display: flex; align-items: center; justify-content: center; }
  .serial { font-family: 'Consolas', monospace; letter-spacing: 3px; color: rgba(255,255,255,0.65); }
  .hint { color: rgba(255,255,255,0.65); }
`

/** Portrait 900×1400 — WhatsApp / écrans de téléphone. */
function cardPortraitHtml({ org, name, memberNo, serial, qrDataUri }) {
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
  .brand-box { width: 42px; height: 42px; font-size: 18px; }
  .brand-name { font-size: 19px; }
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
      <div class="brand"><div class="brand-box">▍▍</div><div class="brand-name">SIGNIQ</div></div>
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
function cardLandscapeHtml({ org, name, memberNo, serial, qrDataUri }) {
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
  .brand-box { width: 34px; height: 34px; font-size: 15px; }
  .brand-name { font-size: 16px; }
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
      <div class="brand"><div class="brand-box">▍▍</div><div class="brand-name">SIGNIQ</div></div>
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

// ── Rendu ───────────────────────────────────────────────────
let rendererBrowser = null

async function browser(puppeteer) {
  if (!rendererBrowser || !rendererBrowser.connected) {
    rendererBrowser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  }
  return rendererBrowser
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

/**
 * Planche A4 (PDF Buffer) de cartes paysage au format carte de visite :
 * chaque carte est capturée (fidélité totale au design) puis posée sur la
 * grille en 85,6×54 mm avec repères de découpe — 8 cartes par page.
 */
async function renderPrintPdf(puppeteer, { org, members }) {
  const b = await browser(puppeteer)

  // 1) Capture de chaque carte (JPEG q88 : PDF léger, rendu identique)
  const page = await b.newPage()
  const shots = []
  try {
    await page.setViewport({ width: 1000, height: 620, deviceScaleFactor: 2 })
    page.setDefaultTimeout(120000)
    for (const m of members) {
      await page.setContent(cardLandscapeHtml({ ...m, org }), { waitUntil: 'load', timeout: 60000 })
      const jpg = Buffer.from(await page.screenshot({ type: 'jpeg', quality: 88 }))
      shots.push(`data:image/jpeg;base64,${jpg.toString('base64')}`)
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

module.exports = { renderCard, renderPrintPdf }
