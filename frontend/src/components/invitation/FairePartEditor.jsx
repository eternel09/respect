import { useRef, useState } from 'react'
import api, { apiErrorMessage } from '../../lib/axios'
import Icon from '../ui/Icon'
import { PROGRAM_ICONS } from '../../lib/invitationTheme'

const MAX_PHOTOS = 8
const MAX_STORY = 6
const MAX_FAQ = 6
const field = 'rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30'
const input = `w-full ${field}`
const Label = ({ children, hint }) => (
  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
    {children}{hint && <span className="normal-case tracking-normal font-normal text-gray-400"> · {hint}</span>}
  </p>
)
const Group = ({ title, children }) => (
  <div className="space-y-4 pt-4 border-t border-gray-100 first:pt-0 first:border-0">
    {title && <p className="text-sm font-bold text-gray-800">{title}</p>}
    {children}
  </div>
)

const DeleteBtn = ({ onClick, label }) => (
  <button type="button" onClick={onClick} aria-label={label}
    className="h-9 w-9 flex-shrink-0 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center">
    <Icon name="delete" size={18} />
  </button>
)
const AddBtn = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="mt-2 text-sm font-semibold text-brand flex items-center gap-1 hover:underline">
    <Icon name="add" size={17} /> {children}
  </button>
)

/** Programmes types, proposés en un clic. */
const SAMPLE_PROGRAM = {
  default: [
    { time: '19h00', label: 'Arrivée et installation des invités', icon: 'start', note: '' },
    { time: '20h00', label: 'Entrée des mariés', icon: 'entree', note: '' },
    { time: '20h20', label: 'Présentation des mariés', icon: 'presentation', note: '' },
    { time: '20h35', label: 'Ouverture de bal', icon: 'bal', note: '' },
    { time: '21h00', label: 'Remise des cadeaux', icon: 'cadeaux', note: '' },
    { time: '21h45', label: 'Buffet', icon: 'buffet', note: '' },
    { time: '23h00', label: 'Musique et danse', icon: 'danse', note: '' },
  ],
  boheme: [
    { time: 'De 11h00 à 14h00', label: 'Mariage civil et bénédiction nuptiale', icon: 'alliances', note: 'Salle …\nAdresse …' },
    { time: '19h00', label: 'Soirée dansante', icon: 'danse', note: 'Salle de fête …\nAdresse …' },
  ],
}
const SAMPLE_STORY = [
  { year: '2022', title: 'Notre rencontre', text: 'Le jour où nos chemins se sont croisés.' },
  { year: '2024', title: 'L’aventure', text: 'Les voyages et les épreuves qui nous ont rapprochés.' },
  { year: '2025', title: 'Le oui', text: 'Une question, une bague, et une évidence.' },
]

/** Champs proposés pour chaque modèle (un modèle n'affiche que ce qu'il utilise). */
const FIELDS = {
  'faire-part':  ['photos', 'families', 'ceremony', 'verse', 'program', 'icons', 'dress', 'intro', 'closing'],
  'heure-doree': ['photos', 'ceremony', 'reception', 'verse', 'program', 'notes', 'dress', 'rsvp', 'intro'],
  porcelaine:    ['subtitle', 'ceremony', 'reception', 'travel', 'program', 'notes', 'dress', 'gift', 'faq', 'intro', 'closing'],
  boheme:        ['photos', 'subtitle', 'families', 'verse', 'program', 'icons', 'notes', 'intro', 'closing'],
}

/** Libellés et exemples qui changent d'un modèle à l'autre. */
const COPY = {
  photos: { 'faire-part': '3 en tête, la 4ᵉ en bas de page', 'heure-doree': 'la 1ʳᵉ dans l’arche d’accueil (sans photo d’ouverture), les suivantes dans la galerie animée : 5 photos donnent l’éventail et deux photos pleine largeur', boheme: 'la 1ʳᵉ dans l’arche (sans photo en arche), la dernière en bas de page' },
  verse: { 'heure-doree': ['Citation', 'Et ils choisirent de s’aimer pour toujours.'] },
  subtitle: { porcelaine: ['Ligne sous les prénoms', 'Kinshasa · Gombe'], boheme: ['Phrase d’ouverture', 'Deux cœurs, un même chemin.'] },
  intro: {
    'heure-doree': ['Mot d’accueil (sous la photo)', 'Cher(e) [nom de l’invité], nous serions honorés de votre présence.'],
    porcelaine: ['Mot de la réponse (RSVP)', 'Votre présence compte énormément pour nous. Merci de nous répondre.'],
    boheme: ['Texte d’invitation', 'Sous le regard de Celui qui unit et bénit, … ont choisi de marcher ensemble…'],
  },
  closing: {
    porcelaine: ['Signature', 'Avec amour'],
    boheme: ['Mot de la fin', 'La beauté d’un moment tient aussi à l’harmonie de ceux qui le vivent…'],
  },
  ceremony: { porcelaine: ['Lieu principal', 'ex. Cérémonie civile'] },
}

/**
 * Textes et photos des modèles « site » (faire-part, heure dorée, porcelaine,
 * bohème) : chaque modèle ne montre que les champs qu'il utilise.
 */
export default function FairePartEditor({ occasion: o, template = 'faire-part', content, setContent, savedContent, onSaved, setFlash }) {
  const has = (k) => (FIELDS[template] || FIELDS['faire-part']).includes(k)
  const copy = (k, fallback) => COPY[k]?.[template] || fallback
  const [saving, setSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const fileRef = useRef(null)
  const set = (patch) => setContent(c => ({ ...c, ...patch }))
  const setIn = (key, i, patch) => set({ [key]: content[key].map((s, j) => (j === i ? { ...s, ...patch } : s)) })
  const dirty = JSON.stringify(content) !== JSON.stringify(savedContent)
  const photos = o.invitation_photos || []
  const [verseLabel, versePh] = copy('verse', ['Verset ou citation', 'Ainsi ils ne sont plus deux, mais une seule chair…'])
  const [subLabel, subPh] = copy('subtitle', ['Sous-titre', ''])
  const [introLabel, introPh] = copy('intro', ["Mot d'invitation", "Un jour mémorable, venez célébrer avec nous ; nous avons dit oui à l'amour."])
  const [closingLabel, closingPh] = copy('closing', ['Mot de la fin', 'Nous sommes ravis de vous convier… Votre soutien et votre amour sont essentiels pour nous.'])
  const [ceremonyLabel, ceremonyPh] = copy('ceremony', ['Cérémonie', 'ex. Mariage religieux'])

  const save = async () => {
    setSaving(true); setFlash(null)
    try {
      const res = await api.put(`/occasions/${o.id}/invitation-content`, {
        ...content,
        program: content.program.filter(s => s.time.trim() || s.label.trim()),
        story: content.story.filter(s => s.title.trim() || s.text.trim() || s.year.trim()),
        faq: content.faq.filter(s => s.q.trim() || s.a.trim()),
        rsvp_deadline: content.rsvp_deadline || null,
        party_max: content.party_max === '' || content.party_max == null ? null : Number(content.party_max),
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
      {has('photos') && (
        <div>
          <Label hint={COPY.photos[template]}>Photos du couple</Label>
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
      )}

      {(has('subtitle') || has('families') || has('ceremony')) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {has('subtitle') && (
            <div>
              <Label>{subLabel}</Label>
              <input className={input} value={content.subtitle} maxLength={80} onChange={e => set({ subtitle: e.target.value })} placeholder={subPh} />
            </div>
          )}
          {has('families') && (
            <div>
              <Label hint="ex. Grâce Iyambe & Dorcas Ekofo">Noms complets</Label>
              <input className={input} value={content.families} maxLength={160} onChange={e => set({ families: e.target.value })} placeholder="Prénoms et noms du couple" />
            </div>
          )}
          {has('ceremony') && (
            <div>
              <Label>{ceremonyLabel}</Label>
              <input className={input} value={content.ceremony} maxLength={60} onChange={e => set({ ceremony: e.target.value })} placeholder={ceremonyPh} />
            </div>
          )}
        </div>
      )}

      {has('verse') && (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
          <div>
            <Label hint={template === 'heure-doree' ? 'vide : texte par défaut' : 'facultatif'}>{verseLabel}</Label>
            <textarea className={input} rows={2} value={content.verse} maxLength={400} onChange={e => set({ verse: e.target.value })} placeholder={versePh} />
          </div>
          <div>
            <Label>Référence</Label>
            <input className={input} value={content.verse_ref} maxLength={60} onChange={e => set({ verse_ref: e.target.value })} placeholder="Matthieu 19 : 6" />
          </div>
        </div>
      )}

      {has('reception') && (
        <Group title="Réception (second lieu, facultatif)">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_100px]">
            <input className={input} value={content.reception.name} maxLength={80} placeholder="Nom de la salle" aria-label="Nom de la salle de réception"
              onChange={e => set({ reception: { ...content.reception, name: e.target.value } })} />
            <input className={input} value={content.reception.time} maxLength={20} placeholder="19h00" aria-label="Heure de la réception"
              onChange={e => set({ reception: { ...content.reception, time: e.target.value } })} />
          </div>
          <input className={input} value={content.reception.address} maxLength={160} placeholder="Adresse (pour la carte)" aria-label="Adresse de la réception"
            onChange={e => set({ reception: { ...content.reception, address: e.target.value } })} />
        </Group>
      )}

      {has('travel') && (
        <div>
          <Label hint="facultatif">Comment venir</Label>
          <textarea className={input} rows={3} value={content.travel} maxLength={800} onChange={e => set({ travel: e.target.value })}
            placeholder={'En voiture : parking sur place.\nEn taxi : …'} />
        </div>
      )}

      {has('story') && (
        <div>
          <div className="flex items-center justify-between">
            <Label hint="facultatif">Notre histoire</Label>
            {!content.story.length && (
              <button type="button" onClick={() => set({ story: SAMPLE_STORY })} className="text-xs font-semibold text-brand hover:underline mb-1.5">Partir d'un exemple</button>
            )}
          </div>
          <div className="space-y-3">
            {content.story.map((s, i) => (
              <div key={i} className="rounded-xl bg-gray-50 p-2.5 space-y-2" data-testid="story-step">
                <div className="flex gap-2 items-center">
                  <input className={`${field} w-20 flex-shrink-0 bg-white`} value={s.year} maxLength={12} placeholder="2022" aria-label={`Année de l'étape ${i + 1} de l'histoire`}
                    onChange={e => setIn('story', i, { year: e.target.value })} />
                  <input className={`${field} flex-1 min-w-0 bg-white`} value={s.title} maxLength={60} placeholder="Notre rencontre" aria-label={`Titre de l'étape ${i + 1} de l'histoire`}
                    onChange={e => setIn('story', i, { title: e.target.value })} />
                  <DeleteBtn onClick={() => set({ story: content.story.filter((_, j) => j !== i) })} label={`Supprimer l'étape ${i + 1} de l'histoire`} />
                </div>
                <textarea className={`${input} bg-white`} rows={2} value={s.text} maxLength={400} placeholder="Racontez ce moment en quelques lignes."
                  aria-label={`Récit de l'étape ${i + 1} de l'histoire`} onChange={e => setIn('story', i, { text: e.target.value })} />
              </div>
            ))}
          </div>
          {content.story.length < MAX_STORY && <AddBtn onClick={() => set({ story: [...content.story, { year: '', title: '', text: '' }] })}>Ajouter un moment</AddBtn>}
        </div>
      )}

      {has('program') && (
        <div>
          <div className="flex items-center justify-between">
            <Label hint="facultatif">{template === 'heure-doree' ? 'Le déroulé' : template === 'porcelaine' ? 'Le jour J' : 'Programme'}</Label>
            {!content.program.length && (
              <button type="button" onClick={() => set({ program: SAMPLE_PROGRAM[template] || SAMPLE_PROGRAM.default })} className="text-xs font-semibold text-brand hover:underline mb-1.5">
                Partir d'un programme type
              </button>
            )}
          </div>
          <div className="space-y-2">
            {content.program.map((s, i) => (
              <div key={i} className={has('notes') && has('icons') ? 'rounded-xl bg-gray-50 p-2.5 space-y-2' : ''} data-testid="program-step">
                <div className="flex gap-2 items-center">
                  <input className={`${field} w-28 flex-shrink-0 bg-white`} value={s.time} maxLength={24} placeholder="19h00" aria-label={`Heure de l'étape ${i + 1}`}
                    onChange={e => setIn('program', i, { time: e.target.value })} />
                  <input className={`${field} flex-1 min-w-0 bg-white`} value={s.label} maxLength={60} placeholder="Entrée des mariés" aria-label={`Étape ${i + 1}`}
                    onChange={e => setIn('program', i, { label: e.target.value })} />
                  {has('icons') && (
                    <select className={`${field} w-32 flex-shrink-0 px-2 bg-white`} value={s.icon} aria-label={`Pictogramme de l'étape ${i + 1}`}
                      onChange={e => setIn('program', i, { icon: e.target.value })}>
                      {Object.entries(PROGRAM_ICONS).map(([k, [, label]]) => <option key={k} value={k}>{label}</option>)}
                    </select>
                  )}
                  {has('notes') && !has('icons') && (
                    <input className={`${field} w-40 flex-shrink-0 bg-white`} value={s.note || ''} maxLength={200} placeholder="Sous-titre (facultatif)" aria-label={`Sous-titre de l'étape ${i + 1}`}
                      onChange={e => setIn('program', i, { note: e.target.value })} />
                  )}
                  <DeleteBtn onClick={() => set({ program: content.program.filter((_, j) => j !== i) })} label={`Supprimer l'étape ${i + 1}`} />
                </div>
                {has('notes') && has('icons') && (
                  <textarea className={`${input} bg-white`} rows={2} value={s.note || ''} maxLength={200} placeholder={'Salle …\nAdresse …'}
                    aria-label={`Lieu et adresse de l'étape ${i + 1}`} onChange={e => setIn('program', i, { note: e.target.value })} />
                )}
              </div>
            ))}
          </div>
          {content.program.length < 12 && <AddBtn onClick={() => set({ program: [...content.program, { time: '', label: '', icon: 'start', note: '' }] })}>Ajouter une étape</AddBtn>}
        </div>
      )}

      {has('dress') && (
        <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
          <div>
            <Label>Thème</Label>
            <input className={input} value={content.dress_title} maxLength={60} onChange={e => set({ dress_title: e.target.value })} placeholder="Black & Gold" />
          </div>
          <div>
            <Label hint="facultatif">Dress code</Label>
            <textarea className={input} rows={2} value={content.dress_text} maxLength={600} onChange={e => set({ dress_text: e.target.value })} placeholder="Tenue noire rehaussée d'une touche d'or." />
          </div>
        </div>
      )}

      {has('rsvp') && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label hint="facultatif">Répondre avant le</Label>
            <input type="date" className={input} value={content.rsvp_deadline} onChange={e => set({ rsvp_deadline: e.target.value })} aria-label="Date limite de réponse" />
          </div>
          <div>
            <Label hint="vide : non précisé">Places par invitation</Label>
            <input type="number" min={1} max={20} inputMode="numeric" className={input} value={content.party_max}
              onChange={e => set({ party_max: e.target.value })} placeholder="2" aria-label="Nombre de personnes par invitation" />
          </div>
        </div>
      )}

      {has('gift') && (
        <Group title="Liste de cadeaux (facultatif)">
          <textarea className={input} rows={2} value={content.gift_text} maxLength={600} onChange={e => set({ gift_text: e.target.value })}
            placeholder="Votre présence est notre plus beau cadeau. Pour ceux qui souhaitent nous gâter…" aria-label="Mot de la liste de cadeaux" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={input} value={content.gift_holder} maxLength={80} onChange={e => set({ gift_holder: e.target.value })} placeholder="Titulaire du compte" aria-label="Titulaire du compte" />
            <input className={input} value={content.gift_iban} maxLength={64} onChange={e => set({ gift_iban: e.target.value })} placeholder="IBAN / numéro de compte" aria-label="IBAN ou numéro de compte" />
          </div>
        </Group>
      )}

      {has('faq') && (
        <div>
          <Label hint="facultatif">Questions fréquentes</Label>
          <div className="space-y-2">
            {content.faq.map((f, i) => (
              <div key={i} className="rounded-xl bg-gray-50 p-2.5 space-y-2" data-testid="faq-item">
                <div className="flex gap-2 items-center">
                  <input className={`${field} flex-1 min-w-0 bg-white`} value={f.q} maxLength={120} placeholder="Où dormir à proximité ?" aria-label={`Question ${i + 1}`}
                    onChange={e => setIn('faq', i, { q: e.target.value })} />
                  <DeleteBtn onClick={() => set({ faq: content.faq.filter((_, j) => j !== i) })} label={`Supprimer la question ${i + 1}`} />
                </div>
                <textarea className={`${input} bg-white`} rows={2} value={f.a} maxLength={600} placeholder="La réponse…" aria-label={`Réponse ${i + 1}`}
                  onChange={e => setIn('faq', i, { a: e.target.value })} />
              </div>
            ))}
          </div>
          {content.faq.length < MAX_FAQ && <AddBtn onClick={() => set({ faq: [...content.faq, { q: '', a: '' }] })}>Ajouter une question</AddBtn>}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {has('intro') && (
          <div>
            <Label hint="vide : texte par défaut">{introLabel}</Label>
            <textarea className={input} rows={2} value={content.intro} maxLength={600} onChange={e => set({ intro: e.target.value })} placeholder={introPh} />
          </div>
        )}
        {has('closing') && (
          <div>
            <Label hint="vide : texte par défaut">{closingLabel}</Label>
            <textarea className={input} rows={2} value={content.closing} maxLength={600} onChange={e => set({ closing: e.target.value })} placeholder={closingPh} />
          </div>
        )}
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
