import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import Card from '../../components/ui/Card'
import api from '../../lib/axios'

function QrCard({ title, subtitle, base64 }) {
  const download = () => {
    const a = document.createElement('a')
    a.href = `data:image/png;base64,${base64}`
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.png`
    a.click()
  }

  return (
    <Card className="flex flex-col items-center text-center">
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mb-4">{subtitle}</p>}
      {base64 ? (
        <>
          <img src={`data:image/png;base64,${base64}`} alt={title} className="w-48 h-48 mb-4" />
          <button
            onClick={download}
            className="text-sm text-violet-600 hover:text-violet-800 font-medium"
          >
            ↓ Télécharger
          </button>
        </>
      ) : (
        <div className="w-48 h-48 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">
          Chargement…
        </div>
      )}
    </Card>
  )
}

export default function QrCodesPage() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/qrcodes')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">QR Codes</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Onboarding</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <QrCard title="QR Inscription" subtitle="Scanner pour s'inscrire" base64={data?.onboarding} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Présence par événement</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data?.events?.length === 0 ? (
                  <p className="text-gray-400 text-sm col-span-full">Aucun événement créé.</p>
                ) : data?.events?.map((ev) => (
                  <QrCard
                    key={ev.event_id}
                    title={ev.event_name}
                    subtitle={ev.event_date}
                    base64={ev.qr_base64}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
