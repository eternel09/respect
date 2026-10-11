import { useCallback, useEffect, useState } from 'react'
import api, { apiErrorMessage } from '../lib/axios'
import Icon from './ui/Icon'

const EVENT = {
  created:  { icon: 'add_circle',      cls: 'text-gray-400' },
  status:   { icon: 'flag',            cls: 'text-blue-500' },
  assigned: { icon: 'assignment_ind',  cls: 'text-violet-500' },
  note:     { icon: 'sticky_note_2',   cls: 'text-accent-dark' },
}

/**
 * Historique d'une demande d'impression : fil chronologique (création, statuts,
 * affectations, notes) + ajout d'une note interne. Chargé à l'ouverture.
 */
export default function PrintRequestHistory({ requestId }) {
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [note, setNote]       = useState('')
  const [saving, setSaving]   = useState(false)

  const load = useCallback(() => {
    setLoading(true); setError(null)
    api.get(`/admin/print-requests/${requestId}/events`)
      .then(res => setEvents(res.data.data))
      .catch(err => setError(apiErrorMessage(err, "Impossible de charger l'historique.")))
      .finally(() => setLoading(false))
  }, [requestId])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const addNote = async e => {
    e.preventDefault()
    if (!note.trim()) return
    setSaving(true); setError(null)
    try {
      const res = await api.post(`/admin/print-requests/${requestId}/notes`, { message: note.trim() })
      setEvents(list => [res.data.event, ...list])
      setNote('')
    } catch (err) {
      setError(apiErrorMessage(err, "Impossible d'ajouter la note."))
    } finally { setSaving(false) }
  }

  const fmt = iso => iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <div className="mt-4 pt-4 border-t border-black/5">
      <form onSubmit={addNote} className="flex items-start gap-2 mb-4">
        <input
          type="text" value={note} onChange={e => setNote(e.target.value)}
          placeholder="Ajouter une note de suivi (appel, devis, échange client…)"
          className="flex-1 px-3 py-2 text-sm bg-sand border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
        />
        <button
          type="submit" disabled={saving || !note.trim()}
          className="flex items-center gap-1.5 text-sm font-semibold text-white rounded-xl px-3 py-2 bg-brand hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Icon name="add" size={16} />}
          Noter
        </button>
      </form>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {loading ? (
        <div className="py-4 flex justify-center"><span className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-transparent rounded-full" /></div>
      ) : events.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">Aucun évènement.</p>
      ) : (
        <ul className="space-y-3">
          {events.map(ev => {
            const e = EVENT[ev.type] || EVENT.status
            return (
              <li key={ev.id} className="flex items-start gap-2.5">
                <Icon name={e.icon} size={16} className={`${e.cls} mt-0.5 shrink-0`} />
                <div className="min-w-0">
                  <p className={`text-sm ${ev.type === 'note' ? 'text-gray-800' : 'text-gray-600'}`}>{ev.message}</p>
                  <p className="text-xs text-gray-400">
                    {fmt(ev.created_at)}{ev.author ? ` · ${ev.author}` : ''}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
