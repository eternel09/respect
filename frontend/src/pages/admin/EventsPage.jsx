import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import PageShell from '../../components/PageShell'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import api from '../../lib/axios'

const TYPE_LABELS = { reunion: 'Réunion', priere: 'Prière', autre: 'Autre' }

export default function EventsPage() {
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [alert, setAlert]     = useState(null)
  const [form, setForm]       = useState({ name: '', type: 'reunion', date: '', description: '' })
  const [errors, setErrors]   = useState({})
  const [showForm, setShowForm] = useState(false)

  const fetchEvents = () => {
    setLoading(true)
    api.get('/admin/events')
      .then((res) => setEvents(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchEvents() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      await api.post('/admin/events', form)
      setAlert({ type: 'success', message: 'Événement créé avec succès.' })
      setForm({ name: '', type: 'reunion', date: '', description: '' })
      setShowForm(false)
      fetchEvents()
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(Object.fromEntries(Object.entries(err.response.data.errors).map(([k, v]) => [k, v[0]])))
      } else {
        setAlert({ type: 'error', message: "Erreur lors de la création." })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cet événement et toutes ses présences ?")) return
    await api.delete(`/admin/events/${id}`)
    fetchEvents()
  }

  return (
    <AdminLayout>
      <PageShell
        title="Événements"
        subtitle="Créez et gérez les rencontres de la communauté."
        actions={
          <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? 'secondary' : 'primary'}>
            {showForm ? 'Annuler' : '+ Nouvel événement'}
          </Button>
        }
      >
       <div className="space-y-6">
        {alert && <Alert type={alert.type}>{alert.message}</Alert>}

        {showForm && (
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Créer un événement</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input label="Nom de l'événement" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} error={errors.name} placeholder="Réunion du dimanche" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="mt-1 w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                >
                  <option value="reunion">Réunion</option>
                  <option value="priere">Prière</option>
                  <option value="autre">Autre</option>
                </select>
                {errors.type && <p className="text-xs text-red-600 mt-1">{errors.type}</p>}
              </div>
              <div>
                <Input label="Date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} error={errors.date} />
              </div>
              <div className="col-span-2">
                <Input label="Description (optionnel)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Notes sur l'événement…" />
              </div>
              <div className="col-span-2 flex justify-end">
                <Button type="submit" loading={saving}>Créer</Button>
              </div>
            </form>
          </Card>
        )}

        <Card>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Nom</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Type</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Présences</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-400">Aucun événement.</td></tr>
                ) : events.map((ev) => (
                  <tr key={ev.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium">{ev.name}</td>
                    <td className="py-2 pr-4">
                      <span className="bg-accent-soft text-accent-dark px-2 py-0.5 rounded-full text-xs">{TYPE_LABELS[ev.type]}</span>
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{ev.date}</td>
                    <td className="py-2 pr-4 text-gray-500">{ev.attendance_count ?? 0}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => handleDelete(ev.id)} className="text-red-500 hover:text-red-700 text-xs">Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </Card>
       </div>
      </PageShell>
    </AdminLayout>
  )
}
