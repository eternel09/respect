/**
 * Carte d'invitation personnelle du modèle « Heure dorée », dessinée dans un
 * canvas puis téléchargée en PNG (« Enregistrer l'invitation »).
 */
const GOLD = ['#B8924A', '#E6CF9A', '#C9A55C', '#9C7A3C']
const S = 2 // densité (×2 pour un rendu net)

function gold(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  g.addColorStop(0, GOLD[0]); g.addColorStop(0.45, GOLD[1]); g.addColorStop(0.55, GOLD[2]); g.addColorStop(1, GOLD[3])
  return g
}

/** Texte centré, avec espacement des lettres (petites capitales du design). */
function spaced(ctx, text, cx, y, spacing) {
  const chars = [...text]
  const widths = chars.map(c => ctx.measureText(c).width)
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1)
  let x = cx - total / 2
  chars.forEach((c, i) => { ctx.fillText(c, x, y); x += widths[i] + spacing })
}

function lines(ctx, text, max) {
  const words = text.split(' '), out = []
  let cur = ''
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w
    if (ctx.measureText(t).width > max && cur) { out.push(cur); cur = w } else cur = t
  }
  if (cur) out.push(cur)
  return out
}

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src
})

export async function downloadInvitationCard({ monogram, name, details, qr, code, note, fileName = 'invitation.png' }) {
  await Promise.all([
    document.fonts.load(`${36 * S}px "Pinyon Script"`), document.fonts.load(`500 ${12 * S}px "Cormorant Garamond"`),
  ]).catch(() => {})
  const W = 390, H = 720
  const c = document.createElement('canvas'); c.width = W * S; c.height = H * S
  const ctx = c.getContext('2d'); ctx.scale(S, S)
  ctx.fillStyle = '#F8F4EC'; ctx.fillRect(0, 0, W, H)
  // Carte
  const cx = 20, cy = 24, cw = 350, ch = 672
  ctx.save(); ctx.shadowColor = 'rgba(91,81,70,0.14)'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 16
  ctx.fillStyle = '#FBF8F2'; ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 4); ctx.fill(); ctx.restore()
  ctx.strokeStyle = gold(ctx, cx, cy, cx + cw, cy + ch); ctx.lineWidth = 1; ctx.strokeRect(cx + 8.5, cy + 8.5, cw - 17, ch - 17)
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  // Monogramme, mention, nom
  ctx.font = '34px "Pinyon Script"'; ctx.fillStyle = gold(ctx, 140, 60, 250, 100)
  ctx.textAlign = 'center'; ctx.fillText(monogram, W / 2, 96); ctx.textAlign = 'left'
  ctx.font = '500 11px "Cormorant Garamond"'; ctx.fillStyle = '#8A7F72'; spaced(ctx, 'INVITATION PERSONNELLE', W / 2, 126, 3.5)
  ctx.font = '36px "Pinyon Script"'; ctx.textAlign = 'center'
  const nameLines = lines(ctx, name, 290)
  nameLines.forEach((l, i) => { ctx.fillStyle = gold(ctx, 60, 140, 330, 220); ctx.fillText(l, W / 2, 172 + i * 40) })
  ctx.textAlign = 'left'
  let y = 172 + nameLines.length * 40
  if (details) { ctx.font = '500 12px "Cormorant Garamond"'; ctx.fillStyle = '#5B5146'; spaced(ctx, details.toUpperCase(), W / 2, y, 2.4); y += 18 }
  // QR encadré
  const q = 284, qx = (W - q) / 2, qy = y + 12
  ctx.strokeStyle = gold(ctx, qx, qy, qx + q, qy + q); ctx.strokeRect(qx + 0.5, qy + 0.5, q - 1, q - 1)
  ctx.fillStyle = gold(ctx, qx, qy, qx + q, qy + q)
  for (const [px, py] of [[qx, qy], [qx + q, qy], [qx, qy + q], [qx + q, qy + q]]) {
    ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#FBF8F2'; ctx.fillRect(-6.5, -6.5, 13, 13)
    ctx.fillStyle = gold(ctx, -4, -4, 4, 4); ctx.fillRect(-3.5, -3.5, 7, 7); ctx.restore()
  }
  if (qr) { try { const img = await loadImage(qr); ctx.drawImage(img, qx + 32, qy + 32, q - 64, q - 64) } catch { /* QR indisponible */ } }
  y = qy + q + 32
  ctx.font = '500 13px "Cormorant Garamond"'; ctx.fillStyle = '#5B5146'; spaced(ctx, code, W / 2, y, 4)
  ctx.font = '13px "Cormorant Garamond"'; ctx.fillStyle = '#8A7F72'; ctx.textAlign = 'center'
  lines(ctx, note, 260).forEach((l, i) => ctx.fillText(l, W / 2, y + 26 + i * 19))

  const blob = await new Promise(r => c.toBlob(r, 'image/png'))
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
