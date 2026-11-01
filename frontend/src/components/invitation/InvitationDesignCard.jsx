import { useEffect, useMemo, useRef, useState } from 'react'
import api, { API_BASE, apiErrorMessage } from '../../lib/axios'
import Icon from '../ui/Icon'
import Envelope from './Envelope'
import InviteCard from './InviteCard'
import CartonCard from './CartonCard'
import PhotoBackdrop from './PhotoBackdrop'
import { FONT_SETS, PALETTES, eventNames, loadInvitationFonts, monogram, resolveTheme, sealOf, themeFor } from '../../lib/invitationTheme'

const draftFrom = (o) => {
  const th = o.invitation_theme || {}
  return {
    palette: th.palette || 'auto',
    color: th.color || PALETTES.bordeaux.main,
    font: th.font || 'classique',
    seal: th.seal || '',
    // « auto » = le carton s'il y en a un : on affiche le choix effectif.
    card: th.card && th.card !== 'auto' ? th.card : (o.invitation_bg_url ? 'carton' : 'signiq'),
    photo: th.photo || 'arch',
    sparkles: th.sparkles !== false,
  }
}

const Label = ({ children }) => <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{children}</p>

/**
 * Design de l'invitation en ligne, propre à l'événement : palette (ou couleur
 * libre), style de polices, texte du cachet, carte affichée (carte Signiq ou
 * carton du client), photo de couverture — avec aperçu en direct.
 */
export default function InvitationDesignCard({ occasion: o, guests, onSaved, setFlash }) {
  const [draft, setDraft] = useState(() => draftFrom(o))
  const [saving, setSaving] = useState(false)
  const [coverBusy, setCoverBusy] = useState(false)
  const coverRef = useRef(null)
  const set = (patch) => setDraft(d => ({ ...d, ...patch }))

  // Réglage enregistré : on repart de lui quand il change (pas à chaque
  // rechargement de l'événement, pour ne pas perdre un brouillon en cours).
  const savedKey = JSON.stringify(draftFrom(o))
  const saved = useMemo(() => JSON.parse(savedKey), [savedKey])
  const [lastSaved, setLastSaved] = useState(savedKey)
  if (lastSaved !== savedKey) { setLastSaved(savedKey); setDraft(saved) }
  const dirty = savedKey !== JSON.stringify(draft)

  // Toutes les polices proposées : les boutons s'affichent dans leur style.
  useEffect(() => { Object.keys(FONT_SETS).forEach(k => loadInvitationFonts(k)) }, [])

  const sample = guests[0]
  const preview = { ...o, theme: { ...draft, color: draft.palette === 'custom' ? draft.color : null } }
  const t = resolveTheme(preview)
  const { title, couple } = eventNames(o.name)
  const hasCarton = !!o.invitation_bg_url
  const cartonSrc = !hasCarton ? null
    : o.invitation_is_pdf ? (sample?.token ? `${API_BASE}/rsvp/${sample.token}/carton` : null)
    : o.invitation_bg_url
  const card = draft.card === 'none' ? null
    : draft.card === 'carton' && cartonSrc
    ? <CartonCard src={cartonSrc} full={false} theme={t} />
    : <InviteCard occasion={o} guest={{ name: sample?.name || 'Marie Exemple', table: null, qr: null }} theme={t} />

  const save = async () => {
    setSaving(true); setFlash(null)
    try {
      const res = await api.put(`/occasions/${o.id}/invitation-theme`, {
        palette: draft.palette,
        color: draft.palette === 'custom' ? draft.color : null,
        font: draft.font,
        seal: draft.seal.trim() || null,
        card: draft.card,
        photo: draft.photo,
        sparkles: draft.sparkles,
      })
      onSaved({ invitation_theme: res.data.invitation_theme })
      setFlash({ ok: true, text: res.data.message })
    } catch (e) {
      setFlash({ ok: false, text: apiErrorMessage(e, 'Enregistrement impossible.') })
    } finally { setSaving(false) }
  }

  const uploadCover = async (file) => {
    if (coverRef.current) coverRef.current.value = ''
    if (!file) return
    setCoverBusy(true); setFlash(null)
    try {
      const fd = new FormData(); fd.append('cover', file)
      const res = await api.post(`/occasions/${o.id}/invitation-cover`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      onSaved({ invitation_cover_url: res.data.invitation_cover_url })
      setFlash({ ok: true, text: res.data.message })
    } catch (e) {
      setFlash({ ok: false, text: apiErrorMessage(e, 'Échec du téléversement.') })
    } finally { setCoverBusy(false) }
  }

  const removeCover = async () => {
    setCoverBusy(true); setFlash(null)
    try {
      const res = await api.delete(`/occasions/${o.id}/invitation-cover`)
      onSaved({ invitation_cover_url: null })
      setFlash({ ok: true, text: res.data.message })
    } catch (e) {
      setFlash({ ok: false, text: apiErrorMessage(e, 'Échec du retrait.') })
    } finally { setCoverBusy(false) }
  }

  const swatch = (key, color, label) => {
    const active = draft.palette === key
    return (
      <button key={key} type="button" onClick={() => set({ palette: key })} aria-pressed={active} title={label}
        className={`flex flex-col items-center gap-1 w-16 text-[11px] ${active ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
        <span className={`h-9 w-9 rounded-full ring-offset-2 transition ${active ? 'ring-2 ring-brand' : 'ring-1 ring-black/10'}`}
          style={{ background: `linear-gradient(135deg, ${color} 55%, #d9b45a 56%)` }} />
        <span className="leading-tight text-center">{label}</span>
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-5 mb-6" data-testid="design-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900">Design de l'invitation en ligne</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Ce que voient vos invités en ouvrant leur lien : couleurs, polices, cachet de l'enveloppe, carte qui en sort et photo.
          </p>
        </div>
        {sample?.token && (
          <a href={`/confirmer/${sample.token}`} target="_blank" rel="noreferrer"
            className="text-sm font-semibold text-brand flex items-center gap-1 hover:underline">
            <Icon name="open_in_new" size={16} /> Voir l'invitation en ligne
          </a>
        )}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-5 min-w-0">
          <div>
            <Label>Couleurs</Label>
            <div className="flex flex-wrap gap-2">
              {swatch('auto', themeFor(o.type).main, 'Selon le type')}
              {Object.entries(PALETTES).map(([k, p]) => swatch(k, p.main, p.label))}
              <label className={`flex flex-col items-center gap-1 w-16 text-[11px] cursor-pointer ${draft.palette === 'custom' ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                <span className={`relative h-9 w-9 rounded-full overflow-hidden ring-offset-2 ${draft.palette === 'custom' ? 'ring-2 ring-brand' : 'ring-1 ring-black/10'}`}
                  style={{ background: draft.palette === 'custom' ? draft.color : 'conic-gradient(#e11d48, #f59e0b, #16a34a, #2563eb, #9333ea, #e11d48)' }}>
                  <input type="color" value={draft.color} aria-label="Couleur personnalisée"
                    onChange={e => set({ palette: 'custom', color: e.target.value })}
                    className="absolute inset-0 opacity-0 cursor-pointer" />
                </span>
                <span className="leading-tight text-center">Ma couleur</span>
              </label>
            </div>
            {draft.palette === 'custom' && t.main !== draft.color.toLowerCase() && (
              <p className="text-xs text-gray-500 mt-2">Couleur un peu foncée pour que les textes blancs restent lisibles.</p>
            )}
          </div>

          <div>
            <Label>Polices</Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(FONT_SETS).map(([k, f]) => {
                const active = draft.font === k
                return (
                  <button key={k} type="button" onClick={() => set({ font: k })} aria-pressed={active}
                    className={`rounded-xl border px-2 py-2.5 text-center transition ${active ? 'border-brand ring-2 ring-brand/30 bg-brand/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className="block text-[22px] leading-tight text-gray-900 truncate"
                      style={{ fontFamily: f.script, fontStyle: f.italic ? 'italic' : 'normal' }}>
                      {couple ? `${couple[0]} & ${couple[1]}` : title}
                    </span>
                    <span className="block text-[11px] text-gray-500 mt-1">{f.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label>Cachet de l'enveloppe</Label>
              <input value={draft.seal} maxLength={3} onChange={e => set({ seal: e.target.value.toUpperCase() })}
                placeholder={monogram(o.name).join('')}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-brand/30" />
              <p className="text-xs text-gray-400 mt-1">1 à 3 caractères. Vide : les initiales.</p>
            </div>
            <div>
              <Label>Carte qui sort de l'enveloppe</Label>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Carte affichée">
                {[['signiq', 'credit_card', 'Carte Signiq'], ['carton', 'image', 'Votre carton'], ['none', 'block', 'Aucune']].map(([k, icon, label]) => {
                  const active = draft.card === k
                  const disabled = k === 'carton' && !hasCarton
                  return (
                    <button key={k} type="button" role="radio" aria-checked={active} disabled={disabled}
                      onClick={() => set({ card: k })}
                      className={`rounded-xl border px-1.5 py-2 text-xs font-medium flex flex-col items-center justify-center gap-0.5 text-center leading-tight transition disabled:opacity-40 disabled:cursor-not-allowed ${active ? 'border-brand ring-2 ring-brand/30 bg-brand/5 text-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <Icon name={icon} size={17} className={active ? 'text-brand' : 'text-gray-400'} /> {label}
                    </button>
                  )
                })}
              </div>
              {!hasCarton && <p className="text-xs text-gray-400 mt-1">Téléversez votre carton (plus haut) pour l'utiliser ici.</p>}
            </div>
          </div>

          <div>
            <Label>Photo de couverture</Label>
            <div className="flex items-center gap-3">
              {o.invitation_cover_url
                ? <img src={o.invitation_cover_url} alt="" className="h-20 w-16 object-cover rounded-t-full ring-1 ring-black/10" />
                : <div className="h-20 w-16 rounded-t-full border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300"><Icon name="add_a_photo" size={20} /></div>}
              <div className="flex flex-wrap gap-2">
                <label className={`px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50 cursor-pointer flex items-center gap-1.5 ${coverBusy ? 'opacity-60 pointer-events-none' : ''}`}>
                  {coverBusy ? <span className="animate-spin h-4 w-4 border-2 border-brand border-t-transparent rounded-full" /> : <Icon name="upload" size={16} />}
                  {o.invitation_cover_url ? 'Changer' : 'Ajouter une photo'}
                  <input ref={coverRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={e => uploadCover(e.target.files?.[0])} />
                </label>
                {o.invitation_cover_url && (
                  <button type="button" onClick={removeCover} disabled={coverBusy}
                    className="px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">Retirer</button>
                )}
              </div>
            </div>
            {o.invitation_cover_url ? (
              <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Affichage de la photo">
                {[['arch', 'Arche sous la carte'], ['background', 'Fond de page'], ['both', 'Les deux']].map(([k, label]) => {
                  const active = draft.photo === k
                  return (
                    <button key={k} type="button" role="radio" aria-checked={active} onClick={() => set({ photo: k })}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${active ? 'border-brand bg-brand/10 text-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {label}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-1">La photo du couple : en arche sous la carte, en fond de page, ou les deux.</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3.5">
            <div>
              <p className="font-semibold text-sm text-gray-900">Paillettes dorées</p>
              <p className="text-xs text-gray-500 mt-0.5">Étoiles qui flottent sur la page et gerbes à l'ouverture de l'enveloppe et à la confirmation.</p>
            </div>
            <button type="button" role="switch" aria-checked={draft.sparkles} aria-label="Paillettes dorées"
              onClick={() => set({ sparkles: !draft.sparkles })}
              className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${draft.sparkles ? 'bg-brand' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${draft.sparkles ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={save} disabled={!dirty || saving}
              className="px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
              {saving && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
              Enregistrer le design
            </button>
            {dirty && !saving && (
              <button type="button" onClick={() => setDraft(saved)} className="text-sm text-gray-500 hover:underline">Annuler</button>
            )}
          </div>
        </div>

        {/* Aperçu en direct */}
        <div className="rounded-2xl overflow-hidden flex flex-col items-center justify-center px-4 pt-6 pb-10"
          data-testid="design-preview"
          style={{ background: `radial-gradient(130% 80% at 50% 0%, #fbf7f1 0%, ${t.ivory} 55%, #efe3d3 100%)`, color: t.ink, ...t.fontVars, position: 'relative', isolation: 'isolate' }}>
          {o.invitation_cover_url && draft.photo !== 'arch' && <PhotoBackdrop src={o.invitation_cover_url} ivory={t.ivory} fixed={false} />}
          <p className="inv-jost text-[10.5px] font-medium tracking-[0.42em] uppercase">Une lettre pour vous</p>
          <p className="inv-script text-[34px] leading-tight mt-1 mb-8 text-center">{sample?.name || 'Marie Exemple'}</p>
          <div className="pointer-events-none" style={{ width: 'min(80vw, 330px)' }}>
            <div style={{ zoom: 0.87 }}>
              <Envelope theme={t} mono={sealOf(preview)} opening={false} onOpen={() => {}}>{card}</Envelope>
            </div>
          </div>
          <p className="inv-script text-[30px] leading-tight mt-10 text-center">
            {couple ? <>{couple[0]} &amp; {couple[1]}</> : title}
          </p>
          <p className="inv-serif italic text-[15px] mt-1" style={{ color: t.muted }}>vous convient avec joie</p>
        </div>
      </div>
    </div>
  )
}
