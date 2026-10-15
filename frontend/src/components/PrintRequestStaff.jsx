import { useEffect, useState } from 'react'
import api, { apiErrorMessage } from '../lib/axios'

/** Aperçu de la liste du personnel jointe à une demande (équipe plateforme). */
export default function PrintRequestStaff({ requestId }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get(`/admin/print-requests/${requestId}/staff`)
      .then(res => setRows(res.data.data))
      .catch(err => setError(apiErrorMessage(err, 'Impossible de charger la liste.')))
  }, [requestId])

  if (error) return <p className="mt-3 text-sm text-red-600">{error}</p>
  if (!rows) return <div className="mt-3 py-4 flex justify-center"><span className="animate-spin h-5 w-5 border-2 border-brand border-t-transparent rounded-full" /></div>

  const shown = rows.slice(0, 50)
  return (
    <div className="mt-3 rounded-xl border border-gray-100 overflow-x-auto">
      <table className="w-full text-sm min-w-[560px]">
        <thead>
          <tr className="bg-cream">
            {['Nom', 'Téléphone', 'Fonction', 'Service', 'Matricule'].map(h => (
              <th key={h} className="text-left px-3 py-2 text-[11px] font-bold text-gray-400 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((s, i) => (
            <tr key={i} className="border-t border-gray-50">
              <td className="px-3 py-1.5 text-gray-800">{[s.first_name, s.last_name].filter(Boolean).join(' ')}</td>
              <td className="px-3 py-1.5 text-gray-500">{s.phone || '—'}</td>
              <td className="px-3 py-1.5 text-gray-500">{s.job_title || '—'}</td>
              <td className="px-3 py-1.5 text-gray-500">{s.department || '—'}</td>
              <td className="px-3 py-1.5 text-gray-500">{s.staff_id || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > shown.length && <p className="px-3 py-2 text-xs text-gray-400">…et {rows.length - shown.length} autre(s)</p>}
    </div>
  )
}
