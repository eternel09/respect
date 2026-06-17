import { useCallback, useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import Card from '../../components/ui/Card'
import api from '../../lib/axios'

function StatCard({ label, value, icon }) {
  return (
    <Card className="flex items-center gap-4">
      <div className="text-3xl">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      </div>
    </Card>
  )
}

export default function DashboardPage() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(() => {
    api.get('/admin/dashboard')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
          <p className="text-gray-500 text-sm mt-1">Mis à jour toutes les 30 secondes</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Membres inscrits"       value={data?.stats?.total_members}          icon="👥" />
              <StatCard label="Événements"             value={data?.stats?.total_events}           icon="📅" />
              <StatCard label="Présences aujourd'hui"  value={data?.stats?.today_attendance_count} icon="✅" />
              <StatCard label="Total présences"        value={data?.stats?.total_attendances}      icon="📊" />
            </div>

            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Présences du jour</h3>
              {data?.today_attendances?.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucune présence enregistrée aujourd'hui.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 pr-4 font-medium text-gray-600">Membre</th>
                        <th className="text-left py-2 pr-4 font-medium text-gray-600">Téléphone</th>
                        <th className="text-left py-2 pr-4 font-medium text-gray-600">Événement</th>
                        <th className="text-left py-2 font-medium text-gray-600">Heure</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.today_attendances?.map((a) => (
                        <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 pr-4 font-medium">{a.member?.full_name}</td>
                          <td className="py-2 pr-4 text-gray-500">{a.member?.phone}</td>
                          <td className="py-2 pr-4 text-gray-500">{a.event?.name}</td>
                          <td className="py-2 text-gray-500">{a.created_at?.slice(11, 16)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
