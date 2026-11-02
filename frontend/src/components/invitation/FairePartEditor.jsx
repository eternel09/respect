import { useRef, useState } from 'react'
import api, { apiErrorMessage } from '../../lib/axios'
import Icon from '../ui/Icon'
import { PROGRAM_ICONS } from '../../lib/invitationTheme'

const MAX_PHOTOS = 4
const field = 'rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30'
const input = `w-full ${field}`
const Label = ({ children, hint }) => (
  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
    {children}{hint && <span className="normal-case tracking-normal font-normal text-gray-400"> · {hint}</span>}
  </p>
)

/** Programme type d'un mariage, proposé en un clic. */
const SAMPLE_PROGRAM = [
  { time: '19h00', label: 'Arrivée et installation des invités', icon: 'start' },
  { time: '20h00', label: 'Entrée des mariés', icon: 'entree' },
  { time: '20h20', label: 'Présentation des mariés', icon: 'presentation' },
  { time: '20h35', label: 'Ouverture de bal', icon: 'bal' },
  { time: '21h00', label: 'Remise des cadeaux', icon: 'cadeaux' },
  { time: '21h45', label: 'Buffet', icon: 'buffet' },
  { time: '23h00', label: 'Musique et danse', icon: 'danse' },
]

/**
 * Modèle « faire-part » : textes (familles, verset, cérémonie, programme,
 * thème / dress code, mots d'accueil et de fin) et photos du couple.
 */
export default function FairePartEditor({ occasion: o, content, setContent, savedContent, onSaved, setFlash }) {
  const [saving, setSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const fileRef = useRef(null)
  const set = (patch) => setContent(c => ({ ...c, ...patch }))
  const setStep = (i, patch) => set({ program: content.program.map((s, j) => (j === i ? { ...s, ...patch } : s)) })
  const dirty = JSON.stringify(content) !== JSON.stringify(savedContent)
  const photos = o.invitation_photos || []

  const save = async () => {
    setSaving(true); setFlash(null)
    try {
      const res = await api.put(`/occasions/${o.id}/invitation-content`, {
        ...content,
        program: content.program.filter(s => s.time.trim() || s.label.trim()),
      })
      onSaved({ invitation_content: res.data.invitation_content })
      setFlash({ ok: true, text: res.data.message })
    } catch (e) {
      setFlash({ ok: false, text: apiErrorMessage(e, 'Enregistrement impossible.') })
    } finally { setSaving(false) }
  }

  const addPhoto = async (file) => {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    setPhotoBusy(true); setFlash(null)
    try {
      const fd = new FormData(); fd.append('photo', file)
      const res = await api.post(`/occasions/${o.id}/invitation-photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      onSaved({ invitation_photos: res.data.invitation_photos })
      setFlash({ ok: true, text: res.data.message })
    } catch (e) {
      setFlash({ ok: false, text: apiErrorMessage(e, 'Échec du téléversement.') })
    } finally { setPhotoBusy(false) }
  }

  const removePhoto = async (i) => {
    setPhotoBusy(true); setFlash(null)
    try {
      const res = await api.delete(`/occasions/${o.id}/invitation-photos/${i}`)
      onSaved({ invitation_photos: res.data.invitation_photos })
    } catch (e) {
      setFlash({ ok: false, text: apiErrorMessage(e, 'Échec du retrait.') })
    } finally { setPhotoBusy(false) }
  }

  return (
    <div className="space-y-5 rounded-2xl border border-gray-200 p-4" data-testid="faire-part-editor">
      <div>
        <Label hint="3 en tête, la 4ᵉ en bas de page">Photos du couple</Label>
        <div className="flex flex-wrap gap-2">
          {photos.map((src, i) => (
            <div key={src} className="relative">
              <img src={src} alt="" className="h-20 w-16 object-cover rounded-lg ring-1 ring-black/10" />
              <button type="button" onClick={() => removePhoto(i)} disabled={photoBusy} aria-label={`Retirer la photo ${i + 1}`}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-white shadow ring-1 ring-black/10 flex items-center justify-center text-gray-500 hover:text-red-600">
                <Icon name="close" size={13} />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className={`h-20 w-16 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 cursor-pointer hover:border-gray-300 ${photoBusy ? 'opacity-60 pointer-events-none' : ''}`}
              aria-label="Ajouter une photo du couple">
              {photoBusy ? <span className="animate-spin h-4 w-4 border-2 border-brand border-t-transparent rounded-full" /> : <Icon name="add_a_photo" size={20} />}
              <input ref={fileRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={e => addPhoto(e.target.files?.[0])} />
            </label>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label hint="ex. Grâce Iyambe & Dorcas Ekofo">Noms complets</Label>
          <input className={input} value={content.families} maxLength={160} onChange={e => set({ families: e.target.value })} placeholder="Prénoms et noms du couple" />
        </div>
        <div>
          <Label>Cérémonie</Label>
          <input className={input} value={content.ceremony} maxLength={60} onChange={e => set({ ceremony: e.target.value })} placeholder="ex. Mariage religieux" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
        <div>
          <Label hint="facultatif">Verset ou citation</Label>
          <textarea className={input} rows={2} value={content.verse} maxLength={400} onChange={e => set({ verse: e.target.value })}
            placeholder="Ainsi ils ne sont plus deux, mais une seule chair…" />
        </div>
        <div>
          <Label>Référence</Label>
          <input className={input} value={content.verse_ref} maxLength={60} onChange={e => set({ verse_ref: e.target.value })} placeholder="Matthieu 19 : 6" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label hint="facultatif">Programme</Label>
          {!content.program.length && (
            <button type="button" onClick={() => set({ program: SAMPLE_PROGRAM })} className="text-xs font-semibold text-brand hover:underline mb-1.5">
              Partir d'un programme type
            </button>
          )}
        </div>
        <div className="space-y-2">
          {content.program.map((s, i) => (
            <div key={i} className="flex gap-2 items-center" data-testid="program-step">
              <input className={`${field} w-20 flex-shrink-0`} value={s.time} maxLength={12} placeholder="19h00" aria-label={`Heure de l'étape ${i + 1}`}
                onChange={e => setStep(i, { time: e.target.value })} />
              <input className={`${field} flex-1 min-w-0`} value={s.label} maxLength={60} placeholder="Entrée des mariés" aria-label={`Étape ${i + 1}`}
                onChange={e => setStep(i, { label: e.target.value })} />
              <select className={`${field} w-36 flex-shrink-0 px-2`} value={s.icon} aria-label={`Pictogramme de l'étape ${i + 1}`}
                onChange={e => setStep(i, { icon: e.target.value })}>
                {Object.entries(PROGRAM_ICONS).map(([k, [, label]]) => <option key={k} value={k}>{label}</option>)}
              </select>
              <button type="button" onClick={() => set({ program: content.program.filter((_, j) => j !== i) })}
                className="h-9 w-9 flex-shrink-0 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center" aria-label={`Supprimer l'étape ${i + 1}`}>
                <Icon name="delete" size={18} />
              </button>
            </div>
          ))}
        </div>
        {content.program.length < 12 && (
          <button type="button" onClick={() => set({ program: [...content.program, { time: '', label: '', icon: 'start' }] })}
            className="mt-2 text-sm font-semibold text-brand flex items-center gap-1 hover:underline">
            <Icon name="add" size={17} /> Ajouter une étape
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
        <div>
          <Label>Thème</Label>
          <input className={input} value={content.dress_title} maxLength={60} onChange={e => set({ dress_title: e.target.value })} placeholder="Black & Gold" />
        </div>
        <div>
          <Label hint="facultatif">Dress code</Label>
          <textarea className={input} rows={2} value={content.dress_text} maxLength={600} onChange={e => set({ dress_text: e.target.value })}
            placeholder="Tenue noire rehaussée d'une touche d'or." />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label hint="vide : texte par défaut">Mot d'invitation</Label>
          <textarea className={input} rows={2} value={content.intro} maxLength={600} onChange={e => set({ intro: e.target.value })}
            placeholder="Un jour mémorable, venez célébrer avec nous ; nous avons dit oui à l'amour." />
        </div>
        <div>
          <Label hint="vide : texte par défaut">Mot de la fin</Label>
          <textarea className={input} rows={2} value={content.closing} maxLength={600} onChange={e => set({ closing: e.target.value })}
            placeholder="Nous sommes ravis de vous convier… Votre soutien et votre amour sont essentiels pour nous." />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={!dirty || saving}
          className="px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
          {saving && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
          Enregistrer les textes
        </button>
        {dirty && !saving && (
          <button type="button" onClick={() => setContent(savedContent)} className="text-sm text-gray-500 hover:underline">Annuler</button>
        )}
      </div>
    </div>
  )
}
