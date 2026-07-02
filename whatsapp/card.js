/**
 * Carte de membre Signiq — design glassmorphism, rendue en PNG via Puppeteer.
 * Le QR (SVG data-URI) et l'identité du membre sont injectés dans le gabarit.
 */

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
}

function cardHtml({ org, name, memberNo, serial, qrDataUri }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1000px; height: 620px; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: linear-gradient(135deg, #0d1b2e 0%, #1e3a5f 45%, #2f4f78 75%, #c9742b 130%);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  /* Orbes lumineux flottants (profondeur du glassmorphism) */
  .orb { position: absolute; border-radius: 50%; filter: blur(2px); }
  .orb1 { width: 340px; height: 340px; top: -110px; left: -80px;
          background: radial-gradient(circle at 35% 35%, rgba(224,138,60,0.55), rgba(224,138,60,0.05)); }
  .orb2 { width: 260px; height: 260px; bottom: -90px; right: -60px;
          background: radial-gradient(circle at 40% 40%, rgba(96,150,220,0.5), rgba(96,150,220,0.04)); }
  .orb3 { width: 130px; height: 130px; top: 70px; right: 200px;
          background: radial-gradient(circle at 40% 40%, rgba(255,255,255,0.28), rgba(255,255,255,0.02)); }

  /* Panneau de verre */
  .card {
    position: relative;
    width: 880px;
    height: 500px;
    border-radius: 34px;
    background: linear-gradient(120deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06));
    backdrop-filter: blur(22px);
    -webkit-backdrop-filter: blur(22px);
    border: 1.5px solid rgba(255,255,255,0.32);
    box-shadow: 0 30px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.35);
    padding: 44px 52px;
    display: flex;
    flex-direction: column;
    color: #ffffff;
  }
  .head { display: flex; align-items: center; justify-content: space-between; }
  .org { font-size: 22px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;
         color: rgba(255,255,255,0.92); }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand-box { width: 34px; height: 34px; border-radius: 10px; background: rgba(255,255,255,0.2);
               border: 1px solid rgba(255,255,255,0.35); display: flex; align-items: center; justify-content: center;
               font-weight: 800; font-size: 15px; }
  .brand-name { font-size: 16px; font-weight: 700; letter-spacing: 1px; color: rgba(255,255,255,0.75); }

  .body { flex: 1; display: flex; align-items: center; gap: 48px; margin-top: 20px; }
  .identity { flex: 1; }
  .label { font-size: 15px; letter-spacing: 4px; text-transform: uppercase; color: rgba(255,255,255,0.55); }
  .name { font-size: 52px; font-weight: 800; line-height: 1.12; margin-top: 10px;
          text-shadow: 0 2px 14px rgba(0,0,0,0.25); }
  .no { display: inline-block; margin-top: 22px; padding: 10px 22px; border-radius: 999px;
        background: rgba(224,138,60,0.28); border: 1px solid rgba(224,138,60,0.6);
        font-size: 20px; font-weight: 700; letter-spacing: 2px; }

  .qrwrap {
    width: 250px; height: 250px; border-radius: 26px; background: rgba(255,255,255,0.95);
    box-shadow: 0 18px 40px rgba(0,0,0,0.35), inset 0 0 0 8px #ffffff;
    display: flex; align-items: center; justify-content: center;
  }
  .qrwrap img { width: 218px; height: 218px; }

  .foot { display: flex; align-items: center; justify-content: space-between;
          border-top: 1px solid rgba(255,255,255,0.22); padding-top: 18px; }
  .serial { font-family: 'Consolas', monospace; font-size: 16px; letter-spacing: 3px;
            color: rgba(255,255,255,0.65); }
  .hint { font-size: 15px; color: rgba(255,255,255,0.65); }
</style>
</head>
<body>
  <div class="orb orb1"></div>
  <div class="orb orb2"></div>
  <div class="orb orb3"></div>
  <div class="card">
    <div class="head">
      <div class="org">${escapeHtml(org)}</div>
      <div class="brand"><div class="brand-box">▍▍</div><div class="brand-name">SIGNIQ</div></div>
    </div>
    <div class="body">
      <div class="identity">
        <div class="label">Carte de membre</div>
        <div class="name">${escapeHtml(name)}</div>
        <div class="no">MEMBRE N° ${escapeHtml(memberNo)}</div>
      </div>
      <div class="qrwrap"><img src="${qrDataUri}" alt="QR"></div>
    </div>
    <div class="foot">
      <div class="serial">ID ${escapeHtml(serial)}</div>
      <div class="hint">Présentez ce code QR à l'entrée de chaque événement</div>
    </div>
  </div>
</body>
</html>`
}

let rendererBrowser = null

/** Rend la carte en PNG (retina ×2 → 2000×1240) et retourne un Buffer. */
async function renderCard(puppeteer, data) {
  if (!rendererBrowser || !rendererBrowser.connected) {
    rendererBrowser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  }
  const page = await rendererBrowser.newPage()
  try {
    await page.setViewport({ width: 1000, height: 620, deviceScaleFactor: 2 })
    await page.setContent(cardHtml(data), { waitUntil: 'networkidle0' })
    return await page.screenshot({ type: 'png' })
  } finally {
    await page.close().catch(() => {})
  }
}

module.exports = { renderCard }
