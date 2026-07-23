import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import AdminLayout from '../../components/AdminLayout'
import PageShell from '../../components/PageShell'
import { useAuth } from '../../context/AuthContext'
import api, { apiErrorMessage } from '../../lib/axios'

/** Rafraîchissement automatique — perçu comme « temps réel », sans WebSocket. */
const REFRESH_MS = 20000

const BRAND = '#1e3a5f'
const ACCENT = '#c9742b'

const tooltipStyle = {
  borderRadius: 10,
  border: 'none',
  boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
  fontSize: 12,
}

const nf = (n) => (n ?? 0).toLocaleString('fr-FR')

/** « il y a 8 s » — fraîcheur de la donnée. */
function freshness(at) {
  if (!at) return ''
  const s = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 1000))
  if (s < 60) return `il y a ${s} s`
  return `il y a ${Math.floor(s / 60)} min`
}

function Kpi({ label, value, sub, tone = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-2xl p-5 ring-1 ring-black/5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${tone}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="bg-white rounded-2xl p-5 ring-1 ring-black/5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

export default function NetworkPage() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [unit, setUnit] = useState('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tick, setTick] = useState(0) // relance l'affichage de la fraîcheur
  const timer = useRef(null)

  const load = useCallback(async (u) => {
    try {
      const res = await api.get('/admin/network', { params: { unit: u } })
      setData(res.data)
      setError(null)
    } catch (err) {
      setError(apiErrorMessage(err, 'Chargement impossible.'))
    } finally {
      setLoading(false)
    }
  }, [])

  // `loading` ne sert qu'au tout premier rendu : changer de granularité met les
  // graphiques à jour en place, sans faire clignoter la page.
  useEffect(() => { load(unit) }, [unit, load])

  // Rafraîchissement périodique + horloge de fraîcheur
  useEffect(() => {
    timer.current = setInterval(() => { load(unit); setTick((t) => t + 1) }, REFRESH_MS)
    const clock = setInterval(() => setTick((t) => t + 1), 10000)
    return () => { clearInterval(timer.current); clearInterval(clock) }
  }, [unit, load])

  const h = data?.headline
  const byOrg = data?.by_org || []
  const maxOrg = Math.max(1, ...byOrg.map((o) => o.members))

  return (
    <AdminLayout>
      <PageShell
        title="Réseau"
        subtitle={`Vue consolidée de ${user?.organization?.name || 'votre réseau'} et de ses sous-organisations.`}
      >
        {/* Barre d'état : fraîcheur + granularité */}
        <div className="flex flex-wrap items-center justify-between gap-3 -mt-14 mb-6">
          <span className="inline-flex items-center gap-2 text-xs text-gray-500 bg-white rounded-full px-3 py-1.5 ring-1 ring-black/5">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="animate-ping absolute h-2 w-2 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            {/* tick force le recalcul */}
            <span key={tick}>Actualisé {freshness(data?.generated_at)}</span>
          </span>

          <div className="inline-flex rounded-xl bg-white ring-1 ring-black/5 p-1">
            {[['week', 'Semaine'], ['month', 'Mois']].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setUnit(k)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  unit === k ? 'bg-brand text-white' : 'text-gray-600 hover:bg-sand'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>
        )}

        {loading && !data ? (
          <div className="py-16 text-center">
            <span className="inline-block animate-spin h-7 w-7 border-2 border-brand border-t-transparent rounded-full" />
          </div>
        ) : data && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 mb-5">
              <Kpi label="Sous-organisations" value={nf(h.organizations)} sub="rattachées au réseau" />
              <Kpi label="Membres (réseau)" value={nf(h.total_members)} sub="toutes organisations confondues" />
              <Kpi
                label="Nouveaux ce mois"
                value={nf(h.new_this_month)}
                tone={h.growth_pct > 0 ? 'text-emerald-600' : h.growth_pct < 0 ? 'text-red-600' : 'text-gray-900'}
                sub={h.growth_pct === null
                  ? `vs ${nf(h.new_prev_month)} le mois dernier`
                  : `${h.growth_pct > 0 ? '+' : ''}${h.growth_pct} % vs ${nf(h.new_prev_month)} le mois dernier`}
              />
              <Kpi
                label="Participation (30 j)"
                value={h.participation === null ? '—' : `${h.participation} %`}
                sub={`${nf(h.attendances_30d)} présences`}
              />
            </div>

            {/* Évolution de l'effectif (cumul) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-5">
              <Card title="Évolution de l'effectif" subtitle={`Membres cumulés · ${unit === 'week' ? '12 dernières semaines' : '12 derniers mois'}`}>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={data.growth} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BRAND} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={BRAND} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip formatter={(v) => [nf(v), 'Effectif']} contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="cumulative" stroke={BRAND} strokeWidth={2} fill="url(#netFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* Nouveaux membres par période — échelle propre, jamais en double axe */}
              <Card title="Nouveaux membres" subtitle={`Par ${unit === 'week' ? 'semaine' : 'mois'}`}>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.growth} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#f6f2ea' }} formatter={(v) => [nf(v), 'Nouveaux']} contentStyle={tooltipStyle} />
                    <Bar dataKey="new" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={34} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Comparatif par sous-organisation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              <Card title="Par sous-organisation" subtitle="Effectif, nouveaux du mois et présences (30 j)">
                {byOrg.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">Aucune sous-organisation.</p>
                ) : (
                  <div className="space-y-3">
                    {byOrg.map((o) => (
                      <div key={o.id}>
                        <div className="flex items-baseline justify-between gap-3 mb-1">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {o.name}
                            {o.is_parent && (
                              <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-brand bg-brand/10 rounded-full px-2 py-0.5">
                                Mère
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500 whitespace-nowrap">
                            <span className="font-semibold text-gray-900">{nf(o.members)}</span> membres
                            {o.new_this_month > 0 && (
                              <span className="text-emerald-600 font-medium"> · +{nf(o.new_this_month)}</span>
                            )}
                          </p>
                        </div>
                        <div className="h-2 bg-sand rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.round((o.members / maxOrg) * 100)}%`, background: BRAND }}
                          />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">{nf(o.attendances_30d)} présences sur 30 j</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Nouveaux membres par événement */}
              <Card title="Nouveaux membres par événement" subtitle="Derniers événements du réseau">
                {(!data.by_event || data.by_event.length === 0) ? (
                  <p className="py-8 text-center text-sm text-gray-400">Aucun événement récent.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(200, data.by_event.length * 38)}>
                    <BarChart
                      data={data.by_event}
                      layout="vertical"
                      margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={150}
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        // Les noms d'événements sont libres : on tronque plutôt
                        // que de laisser le libellé se casser en plein mot.
                        tickFormatter={(v) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
                      />
                      <Tooltip cursor={{ fill: '#f6f2ea' }} formatter={(v) => [nf(v), 'Nouveaux membres']} contentStyle={tooltipStyle} />
                      <Bar dataKey="new" radius={[0, 4, 4, 0]} maxBarSize={18}>
                        {data.by_event.map((e) => <Cell key={e.id} fill={ACCENT} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>
          </>
        )}
      </PageShell>
    </AdminLayout>
  )
}
