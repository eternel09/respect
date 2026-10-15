/**
 * Lecture d'une liste du personnel (Excel / CSV) dans le navigateur : le fichier
 * ne quitte pas le poste, seules les lignes reconnues sont envoyées à l'API.
 */

// Champs d'une ligne, dans l'ordre d'affichage.
export const STAFF_FIELDS = [
  { key: 'first_name', label: 'Prénom',    optional: true },
  { key: 'last_name',  label: 'Nom',       optional: false },
  { key: 'phone',      label: 'Téléphone', optional: true },
  { key: 'job_title',  label: 'Fonction',  optional: true },
  { key: 'department', label: 'Service',   optional: true },
  { key: 'staff_id',   label: 'Matricule', optional: true },
]

export const MAX_STAFF = 5000

const norm = h => String(h ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const words = h => norm(h).split(/[^a-z0-9]+/).filter(Boolean)

// Mots-clés par champ (comparés mot à mot, pour que « prénom » ne passe pas pour « nom »).
const KEYWORDS = {
  first_name: ['prenom', 'prenoms', 'firstname', 'first'],
  last_name:  ['nom', 'noms', 'name', 'lastname', 'last', 'postnom', 'agent', 'employe', 'personnel'],
  phone:      ['tel', 'telephone', 'phone', 'whatsapp', 'gsm', 'mobile', 'portable', 'contact'],
  job_title:  ['fonction', 'poste', 'titre', 'job', 'grade', 'qualification'],
  department: ['service', 'departement', 'direction', 'division', 'unite', 'section', 'site'],
  // Pas « n° » / « numéro » : souvent un simple numéro de ligne ou de téléphone.
  staff_id:   ['matricule', 'mat', 'id', 'badge'],
}

/** Devine la colonne de chaque champ ; une colonne ne sert qu'une fois. */
export function detectColumns(headers) {
  const used = new Set()
  const map = {}
  // Prénom avant nom, matricule avant téléphone : lève les ambiguïtés courantes.
  for (const key of ['first_name', 'staff_id', 'phone', 'job_title', 'department', 'last_name']) {
    const idx = headers.findIndex((h, i) => !used.has(i) && words(h).some(w => KEYWORDS[key].includes(w)))
    map[key] = idx
    if (idx >= 0) used.add(idx)
  }
  // Sans colonne « nom » reconnue : première colonne libre.
  if (map.last_name < 0) map.last_name = headers.findIndex((_, i) => !used.has(i))
  return map
}

/** Lit la première feuille : { headers, rows } (lignes vides écartées). */
export async function readSheet(file) {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
  const nonEmpty = aoa.filter(r => r.some(c => String(c).trim() !== ''))
  if (nonEmpty.length < 2) throw new Error('empty')
  return { headers: nonEmpty[0].map(h => String(h).trim()), rows: nonEmpty.slice(1) }
}

/** Lignes prêtes à envoyer, selon le choix des colonnes (lignes sans nom écartées). */
export function buildStaff(rows, map) {
  const cell = (r, key) => (map[key] >= 0 ? String(r[map[key]] ?? '').trim() : '')
  return rows.map(r => Object.fromEntries(STAFF_FIELDS.map(f => [f.key, cell(r, f.key) || null])))
    .filter(s => s.last_name)
}

export async function downloadStaffTemplate(filename = 'modele-personnel.xlsx') {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.aoa_to_sheet([
    STAFF_FIELDS.map(f => f.label),
    ['Jean', 'Kabila', '+243 81 234 5678', 'Infirmier', 'Urgences', 'H-001'],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Personnel')
  XLSX.writeFile(wb, filename)
}
