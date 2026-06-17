import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import api from '../../lib/axios'

export default function MembersPage() {
  const [members, setMembers] = useState([])
  const [meta, setMeta]       = useState(null)
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/admin/members', { params: { search, page } })
      .then((res) => { setMembers(res.data.data); setMeta(res.data.meta) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search, page])

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Membres</h2>
          <div className="w-72">
            <Input
              placeholder="Rechercher par nom ou téléphone…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
        </div>

        <Card>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 pr-4 font-medium text-gray-600">Nom complet</th>
                      <th className="text-left py-2 pr-4 font-medium text-gray-600">Téléphone</th>
                      <th className="text-left py-2 pr-4 font-medium text-gray-600">Présences</th>
                      <th className="text-left py-2 font-medium text-gray-600">Inscrit le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.length === 0 ? (
                      <tr><td colSpan={4} className="py-8 text-center text-gray-400">Aucun membre trouvé.</td></tr>
                    ) : members.map((m) => (
                      <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 pr-4 font-medium">{m.full_name}</td>
                        <td className="py-2 pr-4 text-gray-500">{m.phone}</td>
                        <td className="py-2 pr-4">
                          <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            {m.attendance_count ?? 0}
                          </span>
                        </td>
                        <td className="py-2 text-gray-500">{m.created_at?.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {meta && meta.last_page > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-40"
                  >
                    ← Précédent
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-500">
                    Page {meta.current_page} / {meta.last_page}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                    disabled={page === meta.last_page}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-40"
                  >
                    Suivant →
                  </button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </AdminLayout>
  )
}
