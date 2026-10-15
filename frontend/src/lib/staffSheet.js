/**
 * Lecture d'une liste du personnel (Excel / CSV) dans le navigateur : le fichier
 * ne quitte pas le poste, seules les lignes reconnues sont envoyées à l'API.
 * Les colonnes sont reconnues automatiquement d'après les entêtes (pas de choix
 * manuel) ; la détection couvre les listes telles que les entreprises les tiennent.
 */

// Champs d'une ligne, dans l'ordre d'affichage.
export const STAFF_FIELDS = [
  { key: 'first_name', label: 'Prénom' },
  { key: 'last_name',  label: 'Nom' },
  { key: 'phone',      label: 'Téléphone' },
  { key: 'job_title',  label: 'Fonction' },
  { key: 'department', label: 'Service' },
  { key: 'staff_id',   label: 'Matricule' },
]

export const MAX_STAFF = 5000

// Lignes parcourues pour trouver l'entête (titres, logos, dates au-dessus).
const HEADER_SCAN = 15

const norm = h => String(h ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const words = h => norm(h).split(/[^a-z0-9]+/).filter(Boolean)
const hasAny = (ws, list) => ws.some(w => list.includes(w))

// Mots-clés par champ, comparés mot à mot (« prénom » ne passe pas pour « nom »).
const FIRST = ['prenom', 'prenoms', 'firstname', 'first']
const NAME = ['nom', 'noms', 'name', 'names', 'lastname', 'last', 'surname', 'nomcomplet', 'agent', 'agents', 'employe', 'employes']
const POSTNOM = ['postnom', 'postnoms', 'postname']
const KEYWORDS = {
  phone:      ['tel', 'telephone', 'phone', 'whatsapp', 'gsm', 'mobile', 'portable', 'cellulaire', 'contact'],
  job_title:  ['fonction', 'fonctions', 'poste', 'titre', 'job', 'grade', 'qualification', 'emploi', 'role'],
  department: ['service', 'services', 'departement', 'department', 'dept', 'direction', 'division', 'unite', 'section', 'site', 'affectation', 'bureau'],
  // Pas « n° » / « numéro » : souvent un simple numéro de ligne ou de téléphone.
  staff_id:   ['matricule', 'mat', 'id', 'badge', 'identifiant'],
}

// Colonne « nom complet » : « Nom et prénom », « Nom, postnom et prénom », « Noms
// complets », « Full name »… (mais pas « First name », qui n'est que le prénom).
const isFullName = ws => hasAny(ws, ['nomcomplet', 'fullname'])
  || (hasAny(ws, ['nom', 'noms']) && hasAny(ws, ['prenom', 'prenoms', ...POSTNOM, 'complet', 'complets']))
  || (hasAny(ws, ['name', 'names']) && hasAny(ws, ['full', 'complete']))

/**
 * Colonne de chaque champ (-1 si absente) + `postnom` éventuel, accolé au nom.
 * Une colonne ne sert qu'une fois.
 */
export function detectColumns(headers) {
  const W = headers.map(words)
  const used = new Set()
  const pick = test => {
    const i = W.findIndex((ws, idx) => !used.has(idx) && ws.length && test(ws))
    if (i >= 0) used.add(i)
    return i
  }

  const map = { first_name: -1, last_name: -1, postnom: -1 }
  const full = pick(isFullName)
  if (full >= 0) {
    map.last_name = full // nom complet : le prénom y figure déjà
  } else {
    map.first_name = pick(ws => hasAny(ws, FIRST))
    map.postnom = pick(ws => hasAny(ws, POSTNOM))
  }
  // Matricule et téléphone avant fonction/service, nom en dernier : « Fonction de
  // l'agent » reste une fonction, « Nom de l'agent » un nom.
  for (const key of ['staff_id', 'phone', 'job_title', 'department']) map[key] = pick(ws => hasAny(ws, KEYWORDS[key]))
  if (map.last_name < 0) map.last_name = pick(ws => hasAny(ws, NAME))
  return map
}

/** Libellés des champs reconnus (affichés au client pour transparence). */
export function recognizedFields(map) {
  return STAFF_FIELDS.filter(f => map[f.key] >= 0).map(f => f.label)
}

/**
 * Lit la première feuille. L'entête est la première ligne (parmi les premières)
 * qui contient une colonne de nom ; les lignes au-dessus (titre, date…) sont ignorées.
 * @returns {{ headers: string[], rows: any[][], map: object }}
 */
export async function readSheet(file) {
  const XLSX = await import('xlsx')
  const bytes = new Uint8Array(await file.arrayBuffer())
  const wb = isSpreadsheetBinary(bytes)
    ? XLSX.read(bytes, { type: 'array' })
    : XLSX.read(decodeText(bytes), { type: 'string' }) // CSV : accents décodés nous-mêmes
  const ws = wb.Sheets[wb.SheetNames[0]]
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
  const nonEmpty = aoa.filter(r => r.some(c => String(c).trim() !== ''))
  if (nonEmpty.length < 2) throw new Error('empty')

  for (let i = 0; i < Math.min(HEADER_SCAN, nonEmpty.length - 1); i++) {
    const headers = nonEmpty[i].map(h => String(h).trim())
    const map = detectColumns(headers)
    if (map.last_name >= 0) return { headers, rows: nonEmpty.slice(i + 1), map }
  }
  throw new Error('no-name-column')
}

// .xlsx (zip « PK ») ou .xls (OLE D0 CF 11 E0) ; tout le reste est lu comme du texte (CSV).
function isSpreadsheetBinary(b) {
  return (b[0] === 0x50 && b[1] === 0x4b) || (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0)
}

// CSV en UTF-8 (avec ou sans BOM), sinon Windows-1252 (export « CSV » d'Excel en français).
function decodeText(bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '')
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

/** Lignes prêtes à envoyer (lignes sans nom et entêtes répétées écartées). */
export function buildStaff(rows, map, headers = []) {
  const cell = (r, idx) => (idx >= 0 ? String(r[idx] ?? '').trim() : '')
  const headerName = norm(headers[map.last_name])
  return rows
    .filter(r => norm(cell(r, map.last_name)) !== headerName) // entête répétée (export paginé)
    .map(r => ({
      first_name: cell(r, map.first_name) || null,
      last_name:  [cell(r, map.last_name), cell(r, map.postnom)].filter(Boolean).join(' ') || null,
      phone:      cell(r, map.phone) || null,
      job_title:  cell(r, map.job_title) || null,
      department: cell(r, map.department) || null,
      staff_id:   cell(r, map.staff_id) || null,
    }))
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
