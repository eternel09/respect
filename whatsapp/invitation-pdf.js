/**
 * Composition d'une invitation PDF personnalisée à partir d'un modèle téléversé.
 *
 * Le modèle contient une « carte d'accès » avec des repères texte :
 *   - « MR, MME, COUPLE » → où poser le nom de l'invité
 *   - « TABLE N° »        → où poser le numéro de table
 *   - « QR »              → où poser le QR code d'entrée
 *
 * On localise ces repères (pdfjs, coordonnées PDF origine bas-gauche, comme
 * pdf-lib), puis on tamponne les valeurs par-dessus (pdf-lib). Le reste du PDF
 * — vectoriel — est conservé intact.
 */

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib')

// pdfjs-dist v4 est distribué en ESM : import dynamique depuis ce module CJS.
let _pdfjs = null
async function pdfjs() {
  if (!_pdfjs) _pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  return _pdfjs
}

const norm = (s) => String(s || '').toUpperCase().replace(/\s+/g, '')

/** Regroupe les items texte d'une page en lignes (y proche), triés par x. */
function groupLines(items) {
  const lines = []
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue
    const x = it.transform[4]
    const y = it.transform[5]
    let line = lines.find((l) => Math.abs(l.y - y) < 4)
    if (!line) { line = { y, items: [] }; lines.push(line) }
    line.items.push({ x, y, w: it.width || 0, str: it.str })
  }
  for (const l of lines) l.items.sort((a, b) => a.x - b.x)
  return lines
}
const lineText = (l) => norm(l.items.map((i) => i.str).join(''))
const lineLeft = (l) => Math.min(...l.items.map((i) => i.x))

/** Localise les repères de la carte d'accès sur la 1re page (ou null). */
async function detectMarkers(pdfBytes) {
  const lib = await pdfjs()
  const doc = await lib.getDocument({
    data: new Uint8Array(pdfBytes),
    isEvalSupported: false,
    useSystemFonts: false,
  }).promise
  try {
    const page = await doc.getPage(1)
    const content = await page.getTextContent()
    const lines = groupLines(content.items)

    const nameLine =
      lines.find((l) => { const t = lineText(l); return t.includes('MME') && t.includes('COUPLE') }) ||
      lines.find((l) => lineText(l).includes('MR,MME'))
    const tableLine = lines.find((l) => lineText(l).includes('TABLEN'))

    let qr = null
    for (const l of lines) {
      const it = l.items.find((i) => norm(i.str) === 'QR')
      if (it) { qr = { cx: it.x + (it.w || 0) / 2, cy: it.y }; break }
    }

    return {
      width: page.view[2],
      height: page.view[3],
      name: nameLine ? { x: lineLeft(nameLine), y: nameLine.y } : null,
      table: tableLine ? { x: lineLeft(tableLine), y: tableLine.y } : null,
      qr,
    }
  } finally {
    await doc.destroy().catch(() => {})
  }
}

// pdf-lib (StandardFonts, WinAnsi) ne couvre pas tout l'Unicode : on retombe
// sur un texte latin-1 sûr pour éviter une exception sur un caractère exotique.
function safeText(s) {
  return String(s ?? '').replace(/[^\x20-\x7E -ÿ]/g, '')
}

/**
 * Retourne le PDF (Buffer) personnalisé, ou null si le modèle ne contient pas
 * les repères attendus (l'appelant retombe alors sur le mode image).
 */
async function composeInvitationPdf(templateBytes, { guestName, tableLabel, qrPng }) {
  const m = await detectMarkers(templateBytes)
  if (!m.name && !m.qr) return null

  const pdf = await PDFDocument.load(templateBytes)
  const page = pdf.getPages()[0]
  const serif = await pdf.embedFont(StandardFonts.TimesRoman)
  const sans = await pdf.embedFont(StandardFonts.Helvetica)
  const ink = rgb(0.93, 0.93, 0.9)
  const GAP = 24
  const SIZE = 17

  if (m.name && guestName) {
    page.drawText(safeText(guestName), { x: m.name.x + 4, y: m.name.y - GAP, size: SIZE, font: serif, color: ink })
  }
  if (m.table && tableLabel) {
    page.drawText(safeText(tableLabel), { x: m.table.x + 4, y: m.table.y - GAP, size: SIZE, font: sans, color: ink })
  }
  if (m.qr && qrPng) {
    const img = await pdf.embedPng(qrPng)
    const S = Math.min(140, page.getWidth() * 0.16)
    page.drawImage(img, { x: m.qr.cx - S / 2, y: m.qr.cy - S / 2, width: S, height: S })
  }

  return Buffer.from(await pdf.save())
}

/** Emballe une image PNG en un PDF d'une page (mode « tout en PDF »). */
async function pngToPdf(pngBuffer) {
  const pdf = await PDFDocument.create()
  const img = await pdf.embedPng(pngBuffer)
  const page = pdf.addPage([img.width, img.height])
  page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
  return Buffer.from(await pdf.save())
}

module.exports = { composeInvitationPdf, detectMarkers, pngToPdf }
