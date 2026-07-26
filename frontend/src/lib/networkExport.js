/**
 * Exports du tableau de bord réseau — Excel (.xlsx) et PowerPoint (.pptx).
 *
 * Générés côté navigateur : les librairies sont chargées à la demande (import
 * dynamique → chunks séparés, aucun impact sur le bundle initial) et rien ne
 * transite par le serveur. Les données proviennent du payload /admin/network
 * déjà chargé par la page.
 */

const BRAND = '1E3A5F'
const ACCENT = 'C9742B'

const stamp = () => new Date().toISOString().slice(0, 10)
const slug = (s) => (s || 'reseau').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/* ── Excel ────────────────────────────────────────────────────────────── */

export async function exportNetworkExcel(data, orgName) {
  const XLSX = await import('xlsx')
  const h = data.headline
  const unitLabel = data.growth_unit === 'week' ? 'Semaine' : 'Mois'
  const wb = XLSX.utils.book_new()

  const resume = [
    ['Rapport réseau', orgName],
    ['Généré le', new Date().toLocaleString('fr-FR')],
    [],
    ['Sous-organisations', h.organizations],
    ['Membres (réseau)', h.total_members],
    ['Nouveaux ce mois', h.new_this_month],
    ['Nouveaux le mois précédent', h.new_prev_month],
    ['Variation (%)', h.growth_pct],
    ['Participation 30 j (%)', h.participation],
    ['Présences (30 j)', h.attendances_30d],
  ]
  const wsResume = XLSX.utils.aoa_to_sheet(resume)
  wsResume['!cols'] = [{ wch: 28 }, { wch: 26 }]
  XLSX.utils.book_append_sheet(wb, wsResume, 'Résumé')

  const growth = [[unitLabel, 'Nouveaux membres', 'Effectif cumulé'],
    ...data.growth.map((g) => [g.label, g.new, g.cumulative])]
  const wsGrowth = XLSX.utils.aoa_to_sheet(growth)
  wsGrowth['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, wsGrowth, 'Évolution')

  const byOrg = [['Sous-organisation', 'Membres', 'Nouveaux ce mois', 'Présences (30 j)'],
    ...data.by_org.map((o) => [o.name, o.members, o.new_this_month, o.attendances_30d])]
  const wsOrg = XLSX.utils.aoa_to_sheet(byOrg)
  wsOrg['!cols'] = [{ wch: 28 }, { wch: 10 }, { wch: 18 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, wsOrg, 'Par sous-organisation')

  if (data.by_event?.length) {
    const byEvent = [['Événement', 'Date', 'Nouveaux membres'],
      ...data.by_event.map((e) => [e.name, e.date, e.new])]
    const wsEvent = XLSX.utils.aoa_to_sheet(byEvent)
    wsEvent['!cols'] = [{ wch: 32 }, { wch: 12 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, wsEvent, 'Par événement')
  }

  XLSX.writeFile(wb, `rapport-reseau-${slug(orgName)}-${stamp()}.xlsx`)
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

const fmt = (n) => (n ?? 0).toLocaleString('fr-FR')
