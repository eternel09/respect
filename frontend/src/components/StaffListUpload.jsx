import { useMemo, useRef, useState } from 'react'
import Icon from './ui/Icon'
import { MAX_STAFF, STAFF_FIELDS, buildStaff, detectColumns, downloadStaffTemplate, readSheet } from '../lib/staffSheet'

const selectCls =
  'w-full px-3 py-2 rounded-xl text-sm bg-white border border-gray-200 ' +
  'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand'

/**
 * Dépôt de la liste du personnel (Excel / CSV) sur le portail public.
 * Lecture dans le navigateur, colonnes devinées puis ajustables, aperçu.
 * `onChange(staff | null)` remonte les lignes prêtes à envoyer.
 */
export default function StaffListUpload({ term, onChange, serverError }) {
  const [sheet, setSheet] = useState(null) // { name, headers, rows }
  const [map, setMap] = useState({})
  const [error, setError] = useState(null)
  const [parsing, setParsing] = useState(false)
  const fileRef = useRef(null)

  const staff = useMemo(() => (sheet ? buildStaff(sheet.rows, map) : []), [sheet, map])

  const apply = (nextSheet, nextMap) => {
    setSheet(nextSheet); setMap(nextMap)
    onChange(nextSheet ? buildStaff(nextSheet.rows, nextMap) : null)
  }

  const onFile = async file => {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    setError(null); setParsing(true)
    try {
      const { headers, rows } = await readSheet(file)
      if (rows.length > MAX_STAFF) {
        setError(`Le fichier compte ${rows.length} lignes : ${MAX_STAFF} au maximum par demande.`)
        return
      }
      apply({ name: file.name, headers, rows }, detectColumns(headers))
    } catch (e) {
      setError(e.message === 'empty'
        ? 'Le fichier semble vide : une ligne d’entêtes puis une ligne par personne.'
        : 'Impossible de lire ce fichier. Utilisez un .xlsx, .xls ou .csv.')
    } finally { setParsing(false) }
  }

  if (!sheet) {
    return (
      <div>
        <input ref={fileRef} type="file" className="hidden" onChange={e => onFile(e.target.files?.[0])}
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={parsing}
          className="w-full py-5 rounded-2xl border-2 border-dashed border-gray-200 hover:border-brand hover:bg-white text-gray-500 flex flex-col items-center gap-1.5 transition-colors disabled:opacity-60">
          {parsing
            ? <span className="animate-spin h-6 w-6 border-2 border-brand border-t-transparent rounded-full" />
            : <Icon name="upload_file" size={26} className="text-gray-400" />}
          <span className="text-sm font-medium text-gray-700">{parsing ? 'Lecture…' : `Joindre la liste des ${term.lowerMany}`}</span>
          <span className="text-xs text-gray-400">Excel ou CSV · nom, fonction, service, matricule…</span>
        </button>
        <button type="button" onClick={() => downloadStaffTemplate()} className="mt-2 text-xs text-brand font-medium hover:underline">
          Télécharger un modèle Excel
        </button>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-2xl ring-1 ring-black/5 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <Icon name="group" size={18} className="text-brand" />
            {staff.length} {staff.length > 1 ? term.lowerMany : term.lowerOne} détecté{staff.length > 1 ? 's' : ''}
          </p>
          <p className="text-xs text-gray-400 truncate">{sheet.name}</p>
        </div>
        <button type="button" onClick={() => { apply(null, {}); setError(null) }}
          className="text-xs font-medium text-gray-500 hover:text-gray-800 shrink-0">Retirer</button>
      </div>

      <details className="mt-3 group">
        <summary className="text-xs font-medium text-brand cursor-pointer select-none">Vérifier les colonnes</summary>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {STAFF_FIELDS.map(f => (
            <label key={f.key} className="block">
              <span className="block text-xs font-medium text-gray-600 mb-1">{f.label}{f.optional ? '' : ' *'}</span>
              <select className={selectCls} value={map[f.key] ?? -1}
                onChange={e => apply(sheet, { ...map, [f.key]: Number(e.target.value) })}>
                {f.optional && <option value={-1}>— aucune</option>}
                {sheet.headers.map((h, i) => <option key={i} value={i}>{h || `Colonne ${i + 1}`}</option>)}
              </select>
            </label>
          ))}
        </div>
      </details>

      {staff.length > 0 && (
        <div className="mt-3 rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-cream text-gray-400 uppercase">
              <th className="text-left px-2.5 py-1.5 font-semibold">Nom</th>
              <th className="text-left px-2.5 py-1.5 font-semibold">Fonction</th>
              <th className="text-left px-2.5 py-1.5 font-semibold">Matricule</th>
            </tr></thead>
            <tbody>
              {staff.slice(0, 4).map((s, i) => (
                <tr key={i} className="border-t border-gray-50">
                  <td className="px-2.5 py-1.5 text-gray-800">{[s.first_name, s.last_name].filter(Boolean).join(' ')}</td>
                  <td className="px-2.5 py-1.5 text-gray-500">{s.job_title || '—'}</td>
                  <td className="px-2.5 py-1.5 text-gray-500">{s.staff_id || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {staff.length > 4 && <p className="px-2.5 py-1.5 text-xs text-gray-400">…et {staff.length - 4} autre(s)</p>}
        </div>
      )}
      {staff.length === 0 && <p className="text-xs text-red-600 mt-2">Aucune ligne avec un nom : vérifiez la colonne « Nom ».</p>}
      {serverError && <p className="text-xs text-red-600 mt-2">{serverError}</p>}
    </div>
  )
}
