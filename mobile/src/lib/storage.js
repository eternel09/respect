import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Persistance locale (offline-first) :
 *  - session (token + user + URL serveur)
 *  - manifeste des membres (vérification hors-ligne)
 *  - file des scans en attente de synchronisation
 *  - clés déjà scannées (dédup locale, online + offline)
 */
const KEYS = {
  session: 'signiq.session',
  manifest: 'signiq.manifest',
  queue: 'signiq.queue',
  scanned: 'signiq.scanned',
}

async function read(key, fallback = null) {
  try {
    const raw = await AsyncStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const write = (key, value) => AsyncStorage.setItem(key, JSON.stringify(value))

// ── Session ──────────────────────────────────────────────
export const getSession = () => read(KEYS.session)
export const saveSession = (session) => write(KEYS.session, session)
export const clearSession = () => AsyncStorage.multiRemove([KEYS.session, KEYS.manifest])

// ── Manifeste hors-ligne ─────────────────────────────────
export const getManifest = () => read(KEYS.manifest)
export const saveManifest = (manifest) => write(KEYS.manifest, manifest)

// ── File de synchronisation ──────────────────────────────
export const getQueue = () => read(KEYS.queue, [])
export const saveQueue = (queue) => write(KEYS.queue, queue)

export async function enqueueScan(scan) {
  const queue = await getQueue()
  queue.push(scan)
  await saveQueue(queue)
  return queue.length
}

// ── Dédup locale (token+event+date → statut) ─────────────
export const getScannedKeys = () => read(KEYS.scanned, {})

export async function markScanned(key) {
  const keys = await getScannedKeys()
  keys[key] = Date.now()
  await write(KEYS.scanned, keys)
}

export const scanKey = (token, eventId) =>
  `${eventId}:${token}:${new Date().toISOString().slice(0, 10)}`
