import { useCallback, useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import AdminLayout from '../../components/AdminLayout'
import PageShell from '../../components/PageShell'
import { useAuth } from '../../context/AuthContext'
import { exportNetworkExcel, exportNetworkPptx } from '../../lib/networkExport'
import api, { apiErrorMessage } from '../../lib/axios'

/** Rafraîchissement automatique — perçu comme « temps réel », sans WebSocket. */
const REFRESH_MS = 20000
const BRAND = '#1e3a5f'
const ACCENT = '#c9742b'

const tooltipStyle = { borderRadius: 10, border: 'none', boxShadow: '0 6px 18px rgba(0,0,0,0.12)', fontSize: 12 }
const nf = (n) => (n ?? 0).toLocaleString('fr-FR')

function freshness(at) {
  if (!at) return ''
  const s = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 1000))
  return s < 60 ? `il y a ${s} s` : `il y a ${Math.floor(s / 60)} min`
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

const addBtnClass =
  'inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand hover:bg-brand-dark rounded-xl px-4 py-2.5 shadow-lg shadow-brand/20 transition-colors'

function AddIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" /></svg>
}
function DownloadIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z" /></svg>
}
function Spinner() {
  return <span className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
}

export default function NetworkPage() {
  const { user, refreshUser } = useAuth()
  const [subOrgs, setSubOrgs] = useState(null) // null = chargement
  const [data, setData] = useState(null)         // analytics (si des enfants existent)
  const [unit, setUnit] = useState('month')
  const [error, setError] = useState(null)
  const [tick, setTick] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [exporting, setExporting] = useState(null) // 'xlsx' | 'pptx' | null
  const [inviteToken, setInviteToken] = useState(null)

  const loadSubOrgs = useCallback(async () => {
    try {
      const res = await api.get('/admin/sub-organizations')
      setSubOrgs(res.data.data || [])
      setInviteToken(res.data.invite_token || null)
    } catch (err) {
      setError(apiErrorMessage(err, 'Chargement impossible.'))
      setSubOrgs([])
    }
  }, [])

  const generateInvite = async () => {
    try { const res = await api.post('/admin/sub-organizations/invite'); setInviteToken(res.data.invite_token) }
    catch (err) { setError(apiErrorMessage(err, 'Génération impossible.')) }
  }
  const revokeInvite = async () => {
    try { await api.delete('/admin/sub-organizations/invite'); setInviteToken(null) }
    catch (err) { setError(apiErrorMessage(err, 'Révocation impossible.')) }
  }

  const loadAnalytics = useCallback(async (u) => {
    try {
      const res = await api.get('/admin/network', { params: { unit: u } })
      setData(res.data)
    } catch {
      // 403 tant qu'il n'y a aucune sous-organisation : l'état vide s'en charge.
    }
  }, [])

  useEffect(() => { loadSubOrgs() }, [loadSubOrgs])

  const hasChildren = Array.isArray(subOrgs) && subOrgs.length > 0
  useEffect(() => { if (hasChildren) loadAnalytics(unit) }, [unit, hasChildren, loadAnalytics])

  useEffect(() => {
    const poll = setInterval(() => { if (hasChildren) { loadAnalytics(unit); setTick((t) => t + 1) } }, REFRESH_MS)
    const clock = setInterval(() => setTick((t) => t + 1), 10000)
    return () => { clearInterval(poll); clearInterval(clock) }
  }, [unit, hasChildren, loadAnalytics])

  const onCreated = () => { setShowCreate(false); loadSubOrgs(); refreshUser?.() }

  const runExport = async (kind) => {
    if (!data) return
    setExporting(kind); setError(null)
    try {
      const name = user?.organization?.name || 'Réseau'
      if (kind === 'xlsx') await exportNetworkExcel(data, name)
      else await exportNetworkPptx(data, name)
    } catch (e) {
      setError(`Export impossible : ${e?.message || 'erreur inattendue'}.`)
    } finally {
      setExporting(null)
    }
  }

  // Métriques par organisation (analytics) indexées par id, pour enrichir la
  // liste de gestion (qui, elle, ne liste que les enfants).
  const metricsById = Object.fromEntries((data?.by_org || []).map((o) => [o.id, o]))
  const maxMembers = Math.max(1, ...(subOrgs || []).map((o) => o.members_count))
  const h = data?.headline

  return (
    <AdminLayout>
      <PageShell
        title="Réseau"
        subtitle={`${user?.organization?.name || 'Votre organisation'} et ses sous-organisations.`}
      >
        <div className="flex flex-wrap items-center justify-end gap-3 -mt-14 mb-6">
          {hasChildren && (
            <span className="inline-flex items-center gap-2 text-xs text-gray-500 bg-white rounded-full px-3 py-1.5 ring-1 ring-black/5">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="animate-ping absolute h-2 w-2 rounded-full bg-emerald-400 opacity-75" />
                <span className="relative rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span key={tick}>Actualisé {freshness(data?.generated_at)}</span>
            </span>
          )}
          {hasChildren && (
            <div className="inline-flex rounded-xl bg-white ring-1 ring-black/5 p-1">
              {[['week', 'Semaine'], ['month', 'Mois']].map(([k, l]) => (
                <button key={k} onClick={() => setUnit(k)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${unit === k ? 'bg-brand text-white' : 'text-gray-600 hover:bg-sand'}`}>
                  {l}
                </button>
              ))}
            </div>
          )}
          {hasChildren && data && (
            <>
              <button onClick={() => runExport('xlsx')} disabled={!!exporting}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 bg-white ring-1 ring-black/5 hover:bg-sand rounded-xl px-3.5 py-2.5 transition-colors disabled:opacity-60"
                title="Exporter les données en Excel">
                {exporting === 'xlsx' ? <Spinner /> : <DownloadIcon />} Excel
              </button>
              <button onClick={() => runExport('pptx')} disabled={!!exporting}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 bg-white ring-1 ring-black/5 hover:bg-sand rounded-xl px-3.5 py-2.5 transition-colors disabled:opacity-60"
                title="Générer une présentation PowerPoint">
                {exporting === 'pptx' ? <Spinner /> : <DownloadIcon />} PowerPoint
              </button>
            </>
          )}
          <button onClick={() => setShowCreate(true)} className={addBtnClass}>
            <AddIcon /> Sous-organisation
          </button>
        </div>

        {error && <div className="mb-5 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}

        {subOrgs !== null && <InviteBox token={inviteToken} onGenerate={generateInvite} onRevoke={revokeInvite} />}

        {subOrgs === null ? (
          <div className="py-16 text-center"><span className="inline-block animate-spin h-7 w-7 border-2 border-brand border-t-transparent rounded-full" /></div>
        ) : !hasChildren ? (
          /* ── État vide : aucune sous-organisation encore ── */
          <div className="bg-white rounded-2xl ring-1 ring-black/5 p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-4">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M9 2h6v5H9V2zM2 17h6v5H2v-5zm14 0h6v5h-6v-5zM11 7h2v4h5v3h-2v-1h-3v1h-2v-1H8v1H6v-3h5V7z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Créez votre première sous-organisation</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              Chaque sous-organisation a son propre administrateur, qui gère ses membres et sa présence en toute indépendance.
              Vous, vous verrez ici les chiffres consolidés de l'ensemble.
            </p>
            <button onClick={() => setShowCreate(true)} className={`${addBtnClass} mt-6`}>
              <AddIcon /> Créer une sous-organisation
            </button>
          </div>
        ) : (
          <>
            {/* KPIs (dès que l'analytics est chargée) */}
            {h && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 mb-5">
                <Kpi label="Sous-organisations" value={nf(h.organizations)} sub="rattachées au réseau" />
                <Kpi label="Membres (réseau)" value={nf(h.total_members)} sub="toutes organisations confondues" />
                <Kpi label="Nouveaux ce mois" value={nf(h.new_this_month)}
                  tone={h.growth_pct > 0 ? 'text-emerald-600' : h.growth_pct < 0 ? 'text-red-600' : 'text-gray-900'}
                  sub={h.growth_pct === null ? `vs ${nf(h.new_prev_month)} le mois dernier` : `${h.growth_pct > 0 ? '+' : ''}${h.growth_pct} % vs ${nf(h.new_prev_month)} le mois dernier`} />
                <Kpi label="Participation (30 j)" value={h.participation === null ? '—' : `${h.participation} %`} sub={`${nf(h.attendances_30d)} présences`} />
              </div>
            )}

            {/* Courbes d'évolution */}
            {data && (
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
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {/* Gestion + comparatif des sous-organisations */}
              <Card
                title="Sous-organisations"
                subtitle="Chaque sous-organisation est gérée par son propre admin"
                right={<button onClick={() => setShowCreate(true)} className="text-sm font-semibold text-brand hover:underline whitespace-nowrap">+ Ajouter</button>}
              >
                <div className="space-y-4">
                  {subOrgs.map((o) => {
                    const m = metricsById[o.id]
                    return (
                      <div key={o.id}>
                        <div className="flex items-baseline justify-between gap-3 mb-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{o.name}</p>
                          <p className="text-sm text-gray-500 whitespace-nowrap">
                            <span className="font-semibold text-gray-900">{nf(o.members_count)}</span> membres
                            {m?.new_this_month > 0 && <span className="text-emerald-600 font-medium"> · +{nf(m.new_this_month)}</span>}
                          </p>
                        </div>
                        <div className="h-2 bg-sand rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.round((o.members_count / maxMembers) * 100)}%`, background: BRAND }} />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 truncate">
                          Admin : {o.admin_email || '—'}
                          {m ? ` · ${nf(m.attendances_30d)} présences (30 j)` : ''}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* Nouveaux membres par événement */}
              <Card title="Nouveaux membres par événement" subtitle="Derniers événements du réseau">
                {(!data || !data.by_event || data.by_event.length === 0) ? (
                  <p className="py-8 text-center text-sm text-gray-400">Aucun événement récent.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(200, data.by_event.length * 38)}>
                    <BarChart data={data.by_event} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} interval={0}
                        tickFormatter={(v) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)} />
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

        {showCreate && <CreateSubOrgModal onClose={() => setShowCreate(false)} onCreated={onCreated} />}
      </PageShell>
    </AdminLayout>
  )
}

/** Lien d'invitation réseau : générer / copier / régénérer / révoquer. */
function InviteBox({ token, onGenerate, onRevoke }) {
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const url = token ? `${window.location.origin}/rejoindre/${token}` : ''

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* clipboard indispo */ }
  }
  const run = async (fn) => { setBusy(true); try { await fn() } finally { setBusy(false) } }

  return (
    <div className="bg-white rounded-2xl p-5 ring-1 ring-black/5 shadow-sm mb-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12a3.1 3.1 0 013.1-3.1h4V7h-4a5 5 0 100 10h4v-1.9h-4A3.1 3.1 0 013.9 12zM8 13h8v-2H8v2zm9-6h-4v1.9h4a3.1 3.1 0 010 6.2h-4V17h4a5 5 0 100-10z" /></svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-gray-900">Lien d'invitation</h3>
          <p className="text-xs text-gray-400 mt-0.5">Partagez-le : chaque responsable crée lui-même sa sous-organisation, automatiquement rattachée à votre réseau.</p>

          {token ? (
            <div className="mt-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input readOnly value={url} onFocus={(e) => e.target.select()}
                  className="flex-1 min-w-0 text-xs bg-sand rounded-xl px-3 py-2.5 text-gray-700 font-mono truncate" />
                <button onClick={copy} className="text-sm font-semibold text-white bg-brand hover:bg-brand-dark rounded-xl px-4 py-2.5 whitespace-nowrap transition-colors">
                  {copied ? 'Copié ✓' : 'Copier le lien'}
                </button>
              </div>
              <div className="flex gap-4 mt-2 text-xs">
                <button onClick={() => run(onGenerate)} disabled={busy} className="text-gray-500 hover:text-gray-800 disabled:opacity-50">Régénérer</button>
                <button onClick={() => run(onRevoke)} disabled={busy} className="text-red-500 hover:text-red-700 disabled:opacity-50">Révoquer</button>
              </div>
            </div>
          ) : (
            <button onClick={() => run(onGenerate)} disabled={busy}
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand hover:bg-brand-dark rounded-xl px-4 py-2.5 transition-colors disabled:opacity-60">
              {busy && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
              Générer un lien d'invitation
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Création d'une sous-organisation + son admin. Affiche les identifiants une fois. */
function CreateSubOrgModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', admin_name: '', admin_email: '' })
  const [created, setCreated] = useState(null) // { admin, temp_password, email_sent }
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const res = await api.post('/admin/sub-organizations', form)
      setCreated(res.data)
    } catch (err) {
      const d = err.response?.data
      setError(d?.errors ? Object.values(d.errors)[0][0] : apiErrorMessage(err, 'Création impossible.'))
      setSaving(false)
    }
  }

  const input = 'w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={created ? onCreated : onClose}>
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-6 sm:p-7" onClick={(e) => e.stopPropagation()}>
        {created ? (
          <>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Sous-organisation créée</h2>
            <p className="text-sm text-gray-500 mb-5">
              {created.email_sent
                ? `Les identifiants ont été envoyés à ${created.admin.email}.`
                : "L'email n'a pas pu être envoyé — communiquez ces identifiants à l'administrateur."}
            </p>
            <div className="rounded-2xl bg-sand p-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><span className="text-gray-500">Administrateur</span><span className="font-medium text-gray-900">{created.admin.name}</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-500">Email</span><span className="font-medium text-gray-900 truncate">{created.admin.email}</span></div>
              <div className="flex justify-between gap-3 items-center">
                <span className="text-gray-500">Mot de passe temporaire</span>
                <code className="font-mono font-bold text-brand bg-white px-2.5 py-1 rounded-lg">{created.temp_password}</code>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">À changer à la première connexion. Ce mot de passe ne sera plus affiché.</p>
            <button onClick={onCreated} className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-dark transition-colors">Terminé</button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900">Nouvelle sous-organisation</h2>
            <p className="text-sm text-gray-500 mb-5">Elle héritera de vos applications. Son admin gérera ensuite ses membres et sa présence.</p>
            {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de la sous-organisation</label>
                <input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Paroisse de Limete" autoFocus />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de l'admin</label>
                  <input className={input} value={form.admin_name} onChange={(e) => set('admin_name', e.target.value)} placeholder="Jean Mukendi" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email de l'admin</label>
                  <input type="email" className={input} value={form.admin_email} onChange={(e) => set('admin_email', e.target.value)} placeholder="admin@limete.cd" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Annuler</button>
                <button type="submit" disabled={saving} className="flex-[2] py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                  Créer la sous-organisation
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
