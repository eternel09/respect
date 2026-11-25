import { API_BASE } from '../../lib/axios'
import HeureDoreeInvitation from './heure-doree/HeureDoreeInvitation'
import { configFromOccasion } from './heure-doree/fromOccasion'

/**
 * Modèle « Heure dorée » pour un événement Signiq : construit la
 * configuration depuis l'événement et l'invité, puis rend le modèle
 * (voir heure-doree/). Utilisé par l'aperçu du back-office et la page de
 * l'invité.
 */
export default function HeureDoree({ occasion, guest, token, tableLabel, confirmed, declined, reduced, preview = false, onAnswered }) {
  const status = confirmed ? 'confirmed' : declined ? 'declined' : undefined
  const config = configFromOccasion({ occasion, guest, status, token, tableLabel, apiBase: API_BASE })
  return <HeureDoreeInvitation config={config} preview={preview} reduced={reduced || undefined} storageKey={token || 'preview'} onAnswered={onAnswered} />
}
