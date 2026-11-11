/**
 * Exports du tableau de bord réseau — Excel (.xlsx) et PowerPoint (.pptx).
 *
 * Générés côté navigateur : les librairies sont chargées à la demande (import
 * dynamique → chunks séparés, aucun impact sur le bundle initial) et rien ne
 * transite par le serveur. Les données proviennent du payload /admin/network
 * déjà chargé par la page.
 *
 * L'export Excel reproduit une mise en page A4 « éditoriale » (en-tête + titre,
 * bloc de 4 indicateurs, encadré de synthèse, barres de répartition, tableaux
 * détaillés) via exceljs — le vrai moteur de style de cellules. exceljs ne sait
 * pas créer de graphiques natifs : les « barres » du modèle sont rendues en
 * data-bars conditionnelles (natif Excel), fidèles à l'esprit de la maquette.
 */

const BRAND = '1E3A5F'
const ACCENT = 'C9742B'

/* Palette (ARGB : préfixe FF = opaque) */
const INK = 'FF1F2933'
const NAVY = 'FF1E3A5F'
const MUTED = 'FF8A94A0'
const MUTED2 = 'FF6B7280'
const RED = 'FFB0452F'
const GREEN = 'FF2E7D46'
const SAND = 'FFF9F0E9'
const TRACK = 'FFEEF1F4'
const RULE_LIGHT = 'FFDDE1E6'

const stamp = () => new Date().toISOString().slice(0, 10)
const slug = (s) => (s || 'reseau').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const fmt = (n) => (n ?? 0).toLocaleString('fr-FR')
const isTest = (name) => /\btest\b/i.test(name || '')

/* ── Excel ────────────────────────────────────────────────────────────── */

export async function exportNetworkExcel(data, orgName) {
  const ExcelJS = (await import('exceljs')).default
  const h = data.headline || {}
  const week = data.growth_unit === 'week'
  const orgs = data.by_org || []
  const events = data.by_event || []
  const now = new Date()

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Signiq'
  wb.title = `Rapport réseau — ${orgName}`
  const ws = wb.addWorksheet('Rapport réseau', {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.35, right: 0.35, top: 0.4, bottom: 0.55, header: 0.2, footer: 0.25 },
    },
  })
  ws.headerFooter = {
    oddFooter: `&L&"Consolas"&8&K8A94A0${orgName} · rapport réseau&R&"Consolas"&8&K8A94A0Page &P / &N`,
  }

  const W = { A: 2.5, B: 22, C: 6, D: 9, E: 9, F: 9, G: 9, H: 8, I: 13, J: 2.5 }
  Object.entries(W).forEach(([col, w]) => { ws.getColumn(col).width = w })
  const CONTENT = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']

  /* Fonts */
  const cap = (color = MUTED) => ({ name: 'Consolas', size: 9, color: { argb: color } })
  const bodyF = { name: 'Calibri', size: 10, color: { argb: INK } }
  const subF = { name: 'Calibri', size: 9, color: { argb: MUTED2 } }
  const numF = { name: 'Calibri', size: 11, color: { argb: INK } }
  const AL = { L: { vertical: 'middle', horizontal: 'left' }, LI: { vertical: 'middle', horizontal: 'left', indent: 1 }, R: { vertical: 'middle', horizontal: 'right' }, C: { vertical: 'middle', horizontal: 'center' }, SUB: { vertical: 'top', horizontal: 'left', indent: 1, wrapText: true }, WRAP: { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 } }

  /** Écrit dans une (éventuelle) plage fusionnée. */
  const put = (range, value, { font, align, fill, border, height } = {}) => {
    const first = range.includes(':') ? range.split(':')[0] : range
    if (range.includes(':')) ws.mergeCells(range)
    const c = ws.getCell(first)
    c.value = value
    if (font) c.font = font
    if (align) c.alignment = align
    if (fill) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }
    if (border) c.border = border
    if (height) ws.getRow(parseInt(first.match(/\d+/)[0], 10)).height = height
    return c
  }
  /** Filet horizontal (bordure basse) sur toute la largeur de contenu. */
  const rule = (row, color = RULE_LIGHT, style = 'thin') => {
    CONTENT.forEach((col) => { ws.getCell(`${col}${row}`).border = { ...(ws.getCell(`${col}${row}`).border || {}), bottom: { style, color: { argb: color } } } })
  }
  /** % en rich-text : gros nombre + petit signe %. */
  const pct = (text, color) => ({ richText: [
    { font: { name: 'Calibri', size: 24, bold: true, color: { argb: color } }, text },
    { font: { name: 'Calibri', size: 13, bold: true, color: { argb: color } }, text: ' %' },
  ] })

  let r = 2

  /* ── En-tête ───────────────────────────────────────────────────────── */
  const genStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const period = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  put(`B${r}:E${r}`, `RAPPORT RÉSEAU — ${week ? 'HEBDOMADAIRE' : 'MENSUEL'}`, { font: cap(), align: AL.L, height: 16 })
  put(`F${r}:I${r}`, `Généré le ${genStr}`, { font: cap(), align: AL.R })
  r++
  put(`B${r}:E${r}`, orgName, { font: { name: 'Calibri', size: 20, bold: true, color: { argb: INK } }, align: AL.L, height: 28 })
  put(`F${r}:I${r}`, `Période de référence : ${period}`, { font: cap(), align: AL.R })
  r++
  ws.getRow(r).height = 4
  rule(r, INK, 'medium')
  r += 2

  /* ── Bloc KPI (4 colonnes) ─────────────────────────────────────────── */
  const kpiCols = [['B', 'C'], ['D', 'E'], ['F', 'G'], ['H', 'I']]
  const gp = h.growth_pct
  const diff = (h.new_this_month ?? 0) - (h.new_prev_month ?? 0)
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('fr-FR', { month: 'long' })
  const varColor = gp == null ? MUTED2 : gp < 0 ? RED : GREEN
  const kpis = [
    {
      cap: 'MEMBRES RÉSEAU',
      big: fmt(h.total_members), bigColor: INK,
      sub: `réparti sur ${orgs.length} organisation${orgs.length > 1 ? 's' : ''}`,
    },
    {
      cap: `NOUVEAUX ${week ? 'CETTE SEMAINE' : 'CE MOIS'}`,
      big: fmt(h.new_this_month), bigColor: INK,
      sub: `${fmt(h.new_prev_month)} ${week ? 'la semaine précédente' : 'le mois précédent'}`,
    },
    {
      cap: 'PARTICIPATION 30 J',
      pct: h.participation == null ? null : pct(fmt(h.participation), INK), big: h.participation == null ? '—' : null, bigColor: INK,
      sub: `${fmt(h.attendances_30d)} présence${(h.attendances_30d ?? 0) > 1 ? 's' : ''} enregistrée${(h.attendances_30d ?? 0) > 1 ? 's' : ''}`,
    },
    {
      cap: `VARIATION ${week ? 'HEBDOMADAIRE' : 'MENSUELLE'}`,
      pct: gp == null ? null : pct(`${gp < 0 ? '−' : '+'}${Math.abs(gp).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}`, varColor),
      big: gp == null ? '—' : null, bigColor: varColor,
      sub: diff === 0 ? 'stable sur la période' : `${Math.abs(diff)} recrue${Math.abs(diff) > 1 ? 's' : ''} de ${diff < 0 ? 'moins' : 'plus'} qu'${week ? 'à la période précédente' : `en ${prevMonth}`}`,
      subColor: varColor,
    },
  ]
  const rowCap = r, rowBig = r + 1, rowSub = r + 2
  ws.getRow(rowSub).height = 26
  kpis.forEach((k, i) => {
    const [a, b] = kpiCols[i]
    const sep = i > 0 ? { left: { style: 'thin', color: { argb: RULE_LIGHT } } } : undefined
    put(`${a}${rowCap}:${b}${rowCap}`, k.cap, { font: { name: 'Consolas', size: 8, color: { argb: MUTED } }, align: AL.LI, border: sep, height: 16 })
    put(`${a}${rowBig}:${b}${rowBig}`, k.pct || k.big, { font: { name: 'Calibri', size: 24, bold: true, color: { argb: k.bigColor } }, align: AL.LI, border: sep, height: 30 })
    put(`${a}${rowSub}:${b}${rowSub}`, k.sub, { font: { name: 'Calibri', size: 9, color: { argb: k.subColor || MUTED2 } }, align: AL.SUB, border: sep })
  })
  r = rowSub + 1
  ws.getRow(r).height = 4
  rule(r)
  r += 2

  /* ── Encadré de synthèse « À surveiller » ──────────────────────────── */
  const dir = diff < 0 ? 'recule' : diff > 0 ? 'progresse' : 'reste stable'
  const synth = `Le recrutement ${dir} : ${fmt(h.new_this_month)} nouveau${(h.new_this_month ?? 0) > 1 ? 'x' : ''} membre${(h.new_this_month ?? 0) > 1 ? 's' : ''} sur la période contre ${fmt(h.new_prev_month)} la précédente${gp != null ? ` (${gp < 0 ? '−' : '+'}${Math.abs(gp).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %)` : ''}. La participation à 30 jours s'établit à ${fmt(h.participation)} %, soit ${fmt(h.attendances_30d)} présence${(h.attendances_30d ?? 0) > 1 ? 's' : ''} pour ${fmt(h.total_members)} membres.`
  const cRow = r
  for (let i = 0; i < 4; i++) ws.getRow(r + i).height = 15
  ws.mergeCells(`B${cRow}:I${cRow + 3}`)
  const cc = ws.getCell(`B${cRow}`)
  cc.value = { richText: [
    { font: { name: 'Consolas', size: 9, color: { argb: RED } }, text: 'À SURVEILLER\n\n' },
    { font: bodyF, text: synth },
  ] }
  cc.alignment = AL.WRAP
  cc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SAND } }
  cc.border = { left: { style: 'thick', color: { argb: RED } } }
  r = cRow + 5

  /* ── Section : Nouveaux membres par période ────────────────────────── */
  const sectionHead = (title, right) => {
    put(`B${r}:E${r}`, title, { font: { name: 'Calibri', size: 13, bold: true, color: { argb: INK } }, align: AL.L, height: 22 })
    if (right) put(`F${r}:I${r}`, right, { font: cap(), align: AL.R })
    r++
    rule(r - 1 + 0)
    ws.getRow(r).height = 4
    rule(r)
    r++
  }
  sectionHead('Nouveaux membres par période', `${data.growth?.length || 0} ${week ? 'dernières semaines' : 'derniers mois'} · effectif cumulé ${fmt(h.total_members)}`)
  const growth = data.growth || []
  const gStart = r
  growth.forEach((g) => {
    put(`B${r}:C${r}`, g.label, { font: subF, align: AL.L, height: 17 })
    const bar = put(`D${r}:H${r}`, g.new, { align: AL.L })
    bar.numFmt = ';;;' // valeur présente (pour la data-bar) mais masquée
    put(`I${r}`, fmt(g.new), { font: numF, align: AL.R })
    r++
  })
  if (growth.length) {
    ws.addConditionalFormatting({
      ref: `D${gStart}:D${r - 1}`,
      rules: [{ type: 'dataBar', gradient: false, showValue: false, border: false, cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: NAVY } }],
    })
  }
  ws.getRow(r).height = 8
  r++

  /* ── Section : Répartition par sous-organisation ───────────────────── */
  sectionHead('Répartition par sous-organisation', "part de l'effectif total")
  const dist = [...orgs].sort((a, b) => (b.members || 0) - (a.members || 0))
  const dStart = r
  dist.forEach((o) => {
    const label = isTest(o.name) ? `${o.name}   ▪ TEST` : o.name
    put(`B${r}:C${r}`, label, { font: bodyF, align: AL.L, height: 18 })
    const bar = put(`D${r}:H${r}`, o.members, { align: AL.L, fill: TRACK })
    bar.numFmt = ';;;'
    put(`I${r}`, fmt(o.members), { font: numF, align: AL.R })
    r++
  })
  if (dist.length) {
    ws.addConditionalFormatting({
      ref: `D${dStart}:D${r - 1}`,
      rules: [{ type: 'dataBar', gradient: false, showValue: false, border: false, cfvo: [{ type: 'num', value: 0 }, { type: 'max' }], color: { argb: NAVY } }],
    })
  }

  /* ── Saut de page → page 2 ─────────────────────────────────────────── */
  try { ws.getRow(r).addPageBreak() } catch { /* ignoré si non supporté */ }
  ws.getRow(r).height = 10
  r += 2

  /* ── Page 2 : Détail par sous-organisation (tableau) ───────────────── */
  put(`B${r}:E${r}`, 'Détail par sous-organisation', { font: { name: 'Calibri', size: 13, bold: true, color: { argb: INK } }, align: AL.L, height: 24 })
  put(`F${r}:I${r}`, period, { font: cap(), align: AL.R })
  r++
  ws.getRow(r).height = 4
  rule(r, INK, 'medium')
  r += 2
  // en-têtes de colonnes
  put(`B${r}:C${r}`, 'SOUS-ORGANISATION', { font: cap(), align: AL.L, height: 18 })
  put(`D${r}:E${r}`, 'MEMBRES', { font: cap(), align: AL.R })
  put(`F${r}:G${r}`, 'NOUVEAUX', { font: cap(), align: AL.R })
  put(`H${r}:I${r}`, 'PRÉSENCES 30 J', { font: cap(), align: AL.R })
  rule(r)
  r++
  let tM = 0, tN = 0, tP = 0
  dist.forEach((o) => {
    tM += o.members || 0; tN += o.new_this_month || 0; tP += o.attendances_30d || 0
    const label = isTest(o.name) ? `${o.name}   ▪ TEST` : o.name
    put(`B${r}:C${r}`, label, { font: bodyF, align: AL.L, height: 19 })
    put(`D${r}:E${r}`, fmt(o.members), { font: numF, align: AL.R })
    put(`F${r}:G${r}`, fmt(o.new_this_month), { font: numF, align: AL.R })
    put(`H${r}:I${r}`, fmt(o.attendances_30d), { font: numF, align: AL.R })
    rule(r)
    r++
  })
  // ligne Total
  const totalFont = { name: 'Calibri', size: 11, bold: true, color: { argb: INK } }
  put(`B${r}:C${r}`, 'Total réseau', { font: totalFont, align: AL.L, height: 20 })
  put(`D${r}:E${r}`, fmt(tM), { font: totalFont, align: AL.R })
  put(`F${r}:G${r}`, fmt(tN), { font: totalFont, align: AL.R })
  put(`H${r}:I${r}`, fmt(tP), { font: totalFont, align: AL.R })
  CONTENT.forEach((col) => { ws.getCell(`${col}${r}`).border = { ...(ws.getCell(`${col}${r}`).border || {}), top: { style: 'medium', color: { argb: INK } } } })
  r += 2

  /* ── Page 2 : Recrutement par événement ────────────────────────────── */
  if (events.length) {
    const totRec = events.reduce((s, e) => s + (e.new || 0), 0)
    put(`B${r}:E${r}`, 'Recrutement par événement', { font: { name: 'Calibri', size: 13, bold: true, color: { argb: INK } }, align: AL.L, height: 24 })
    put(`F${r}:I${r}`, `${events.length} événement${events.length > 1 ? 's' : ''} · ${totRec} recrue${totRec > 1 ? 's' : ''}`, { font: cap(), align: AL.R })
    r++
    ws.getRow(r).height = 4
    rule(r, INK, 'medium')
    r += 2
    put(`B${r}:C${r}`, 'ÉVÉNEMENT', { font: cap(), align: AL.L, height: 18 })
    put(`D${r}:E${r}`, 'DATE', { font: cap(), align: AL.L })
    put(`F${r}:H${r}`, 'CONTRIBUTION', { font: cap(), align: AL.L })
    put(`I${r}`, 'NOUVEAUX', { font: cap(), align: AL.R })
    rule(r)
    r++
    const eStart = r
    events.forEach((e) => {
      const label = isTest(e.name) ? `${e.name}   ▪ TEST` : e.name
      put(`B${r}:C${r}`, label, { font: bodyF, align: AL.L, height: 19 })
      put(`D${r}:E${r}`, e.date || '', { font: subF, align: AL.L })
      const bar = put(`F${r}:H${r}`, e.new, { align: AL.L, fill: TRACK })
      bar.numFmt = ';;;'
      put(`I${r}`, fmt(e.new), { font: numF, align: AL.R })
      rule(r)
      r++
    })
    ws.addConditionalFormatting({
      ref: `F${eStart}:F${r - 1}`,
      rules: [{ type: 'dataBar', gradient: false, showValue: false, border: false, cfvo: [{ type: 'num', value: 0 }, { type: 'max' }], color: { argb: NAVY } }],
    })
  }
  r += 1

  /* ── Notes de bas de page (2 colonnes) ─────────────────────────────── */
  const top = dist[0]
  const lecture = top
    ? `${top.name} regroupe ${fmt(top.members)} des ${fmt(h.total_members)} membres du réseau. Les présences se concentrent sur les organisations disposant d'événements réguliers.`
    : `Le réseau ne compte pas encore de sous-organisation active.`
  const methodo = `Participation à 30 jours = présences uniques rapportées à l'effectif. Un nouveau membre est rattaché à l'événement de son inscription. Les lignes « TEST » sont des données de démonstration, incluses dans les totaux.`
  const nRow = r
  ws.getRow(nRow).height = 16
  for (let i = 1; i <= 6; i++) ws.getRow(nRow + i).height = 14
  put(`B${nRow}:E${nRow}`, 'LECTURE', { font: cap(), align: AL.L })
  put(`F${nRow}:I${nRow}`, 'NOTE MÉTHODOLOGIQUE', { font: cap(), align: AL.L })
  ws.mergeCells(`B${nRow + 1}:E${nRow + 6}`)
  const lc = ws.getCell(`B${nRow + 1}`); lc.value = lecture; lc.font = subF; lc.alignment = { vertical: 'top', horizontal: 'left', wrapText: true }
  ws.mergeCells(`F${nRow + 1}:I${nRow + 6}`)
  const mc = ws.getCell(`F${nRow + 1}`); mc.value = methodo; mc.font = subF; mc.alignment = { vertical: 'top', horizontal: 'left', wrapText: true }

  ws.getColumn('J').width = W.J
  const buf = await wb.xlsx.writeBuffer()
  download(buf, `rapport-reseau-${slug(orgName)}-${stamp()}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

/** Déclenche le téléchargement d'un ArrayBuffer côté navigateur. */
function download(buffer, filename, mime) {
  const blob = new Blob([buffer], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ── PowerPoint ───────────────────────────────────────────────────────── */

export async function exportNetworkPptx(data, orgName) {
  const PptxGenJS = (await import('pptxgenjs')).default
  const pptx = new PptxGenJS()
  pptx.author = 'Signiq'
  pptx.title = `Rapport réseau — ${orgName}`

  const h = data.headline
  const unitLabel = data.growth_unit === 'week' ? 'semaine' : 'mois'
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  // 1) Couverture
  const cover = pptx.addSlide()
  cover.background = { color: BRAND }
  cover.addText('RAPPORT RÉSEAU', { x: 0.6, y: 2.0, w: 8.8, h: 0.5, fontSize: 16, color: 'FFFFFF', bold: true, charSpacing: 3 })
  cover.addText(orgName, { x: 0.6, y: 2.5, w: 8.8, h: 1.0, fontSize: 40, color: 'FFFFFF', bold: true })
  cover.addText(`Consolidé de toutes les sous-organisations · ${dateStr}`, { x: 0.6, y: 3.5, w: 8.8, h: 0.4, fontSize: 14, color: 'DCE3EC' })

  // 2) Indicateurs clés
  const kpiSlide = pptx.addSlide()
  slideTitle(kpiSlide, 'Indicateurs clés')
  const kpis = [
    ['Sous-organisations', fmt(h.organizations)],
    ['Membres (réseau)', fmt(h.total_members)],
    ['Nouveaux ce mois', (h.growth_pct != null ? `${fmt(h.new_this_month)}  (${h.growth_pct > 0 ? '+' : ''}${h.growth_pct} %)` : fmt(h.new_this_month))],
    ['Participation 30 j', h.participation == null ? '—' : `${h.participation} %`],
  ]
  kpis.forEach(([label, value], i) => {
    const x = 0.6 + (i % 2) * 4.5
    const y = 1.5 + Math.floor(i / 2) * 1.9
    kpiSlide.addShape(pptx.ShapeType.roundRect, { x, y, w: 4.2, h: 1.6, fill: { color: 'F6F2EA' }, line: { color: 'E7E1D6' }, rectRadius: 0.1 })
    kpiSlide.addText(value, { x: x + 0.2, y: y + 0.25, w: 3.8, h: 0.7, fontSize: 30, bold: true, color: BRAND })
    kpiSlide.addText(label, { x: x + 0.2, y: y + 1.0, w: 3.8, h: 0.4, fontSize: 13, color: '6B7280' })
  })

  // 3) Évolution de l'effectif (courbe cumul) — une échelle, jamais de double axe
  const growthSlide = pptx.addSlide()
  slideTitle(growthSlide, `Évolution de l'effectif`)
  growthSlide.addChart(pptx.ChartType.line, [{
    name: 'Effectif cumulé',
    labels: data.growth.map((g) => g.label),
    values: data.growth.map((g) => g.cumulative),
  }], {
    x: 0.6, y: 1.3, w: 8.8, h: 5.0, color: BRAND, lineSize: 3, lineSmooth: true,
    showLegend: false, showTitle: false, chartColors: [BRAND],
    catAxisLabelColor: '9CA3AF', valAxisLabelColor: '9CA3AF', valGridLine: { color: 'F0F0F0' },
  })

  // 4) Nouveaux membres par période — barres
  const newSlide = pptx.addSlide()
  slideTitle(newSlide, `Nouveaux membres par ${unitLabel}`)
  newSlide.addChart(pptx.ChartType.bar, [{
    name: 'Nouveaux',
    labels: data.growth.map((g) => g.label),
    values: data.growth.map((g) => g.new),
  }], {
    x: 0.6, y: 1.3, w: 8.8, h: 5.0, barDir: 'col', chartColors: [ACCENT],
    showLegend: false, showTitle: false, showValue: true, dataLabelColor: '6B7280', dataLabelFontSize: 9,
    catAxisLabelColor: '9CA3AF', valAxisLabelColor: '9CA3AF', valGridLine: { color: 'F0F0F0' },
  })

  // 5) Comparatif par sous-organisation
  const orgSlide = pptx.addSlide()
  slideTitle(orgSlide, 'Par sous-organisation')
  orgSlide.addChart(pptx.ChartType.bar, [{
    name: 'Membres',
    labels: data.by_org.map((o) => o.name),
    values: data.by_org.map((o) => o.members),
  }], {
    x: 0.6, y: 1.3, w: 8.8, h: 5.0, barDir: 'bar', chartColors: [BRAND],
    showLegend: false, showTitle: false, showValue: true, dataLabelColor: '6B7280', dataLabelFontSize: 9,
    catAxisLabelColor: '6B7280', valAxisLabelColor: '9CA3AF', valGridLine: { color: 'F0F0F0' },
  })

  // 6) Nouveaux membres par événement
  if (data.by_event?.length) {
    const evSlide = pptx.addSlide()
    slideTitle(evSlide, 'Nouveaux membres par événement')
    evSlide.addChart(pptx.ChartType.bar, [{
      name: 'Nouveaux membres',
      labels: data.by_event.map((e) => e.name),
      values: data.by_event.map((e) => e.new),
    }], {
      x: 0.6, y: 1.3, w: 8.8, h: 5.0, barDir: 'bar', chartColors: [ACCENT],
      showLegend: false, showTitle: false, showValue: true, dataLabelColor: '6B7280', dataLabelFontSize: 9,
      catAxisLabelColor: '6B7280', valAxisLabelColor: '9CA3AF', valGridLine: { color: 'F0F0F0' },
    })
  }

  await pptx.writeFile({ fileName: `rapport-reseau-${slug(orgName)}-${stamp()}.pptx` })
}

function slideTitle(slide, text) {
  slide.background = { color: 'FFFFFF' }
  slide.addText(text, { x: 0.6, y: 0.5, w: 8.8, h: 0.6, fontSize: 22, bold: true, color: '1F2937' })
  slide.addShape('line', { x: 0.6, y: 1.15, w: 1.2, h: 0, line: { color: ACCENT, width: 3 } })
}
