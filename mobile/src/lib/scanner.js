import { apiClient, isNetworkError } from './api'
import {
  enqueueScan, getManifest, getQueue, getScannedKeys,
  markScanned, saveManifest, saveQueue, scanKey,
} from './storage'

/**
 * Télécharge le manifeste (jetons + noms des membres de l'org) pour la
 * vérification hors-ligne. À appeler quand on a du réseau (choix d'événement).
 */
export async function refreshManifest(eventId) {
  const res = await apiClient().get('/scan/manifest', { params: { event_id: eventId } })
  await saveManifest(res.data)
  return res.data
}

/**
 * Traite un scan de QR : online d'abord, repli hors-ligne sinon.
 * Retourne { status, title, message } pour le retour visuel :
 *  recorded | already | unknown | invalid | offline-recorded
 */
export async function processScan(token, eventId) {
  const key = scanKey(token, eventId)

  // Dédup locale immédiate (évite un aller-retour et couvre l'offline)
  const scanned = await getScannedKeys()
  const manifest = await getManifest()
  const known = manifest?.members?.find((m) => m.token === token)

  if (scanned[key]) {
    return { status: 'already', title: known?.full_name || 'Déjà pointé', message: 'Présence déjà enregistrée aujourd’hui.' }
  }

  // 1) Tentative en ligne (timeout court : sur le terrain, on ne bloque pas)
  try {
    const res = await apiClient(4000).post('/scan', { token, event_id: eventId })
    await markScanned(key)
    return {
      status: res.data.status, // recorded | already
      title: res.data.member?.full_name || 'Membre',
      message: res.data.message,
    }
  } catch (err) {
    if (!isNetworkError(err)) {
      const data = err.response?.data
      if (err.response?.status === 404) {
        return { status: 'unknown', title: 'Badge non reconnu', message: data?.message || 'Ce badge n’appartient pas à votre organisation.' }
      }
      if (err.response?.status === 422) {
        return { status: 'invalid', title: 'Scan invalide', message: data?.message || 'QR ou événement invalide.' }
      }
      return { status: 'invalid', title: 'Erreur', message: data?.message || 'Erreur serveur.' }
    }
  }

  // 2) Hors-ligne : vérification via le manifeste local + mise en file
  if (!known) {
    return { status: 'unknown', title: 'Badge non reconnu', message: 'Hors-ligne : badge absent du manifeste local.' }
  }

  await enqueueScan({ token, event_id: eventId, scanned_at: new Date().toISOString() })
  await markScanned(key)
  return {
    status: 'offline-recorded',
    title: known.full_name,
    message: 'Enregistré hors-ligne — sera synchronisé.',
  }
}

/**
 * Synchronise la file des scans hors-ligne. Retourne { synced, summary } ou
 * null si rien à faire / pas de réseau.
 */
export async function syncQueue() {
  const queue = await getQueue()
  if (!queue.length) return { synced: 0, summary: null }

  const res = await apiClient(15000).post('/scan/sync', { scans: queue })
  await saveQueue([]) // le backend a répondu : la file est traitée (résultat par scan)
  return { synced: queue.length, summary: res.data.summary }
}
