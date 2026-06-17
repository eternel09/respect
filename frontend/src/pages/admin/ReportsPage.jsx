import { useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import api from '../../lib/axios'

export default function ReportsPage() {
  const [mode, setMode]       = useState('date') // 'date' | 'period'
  const [date, setDate]       = useState('')
  const [from, setFrom]       = useState('')
  const [to, setTo]           = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const handleDownload = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = mode === 'date' ? { date } : { from, to }
      const res = await api.get('/admin/reports', { params, responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a   = document.createElement('a')
      const filename = mode === 'date'
        ? `presences-${date}.pdf`
        : `presences-${from}-au-${to}.pdf`
      a.href = url
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      setError("Erreur lors de la génération du rapport.")
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = mode === 'date' ? !!date : (!!from && !!to)

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-lg">
        <h2 className="text-2xl font-bold text-gray-900">Rapports PDF</h2>

        {error && <Alert type="error">{error}</Alert>}

        <Card>
          <div className="flex gap-2 mb-6">
            {['date', 'period'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${mode === m ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {m === 'date' ? 'Par date' : 'Par période'}
              </button>
            ))}
          </div>

          {mode === 'date' ? (
            <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Du" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input label="Au" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          )}

          <Button
            onClick={handleDownload}
            loading={loading}
            disabled={!canSubmit}
            className="w-full mt-6"
          >
            Télécharger le PDF
          </Button>
        </Card>
      </div>
    </AdminLayout>
  )
}
