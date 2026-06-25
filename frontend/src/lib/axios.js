import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/admin/login'
    } else if (!err.response && err.code !== 'ERR_CANCELED' && typeof window !== 'undefined') {
      // Pas de réponse HTTP = problème réseau (serveur injoignable / connexion instable)
      window.dispatchEvent(new CustomEvent('connection-issue'))
    }
    return Promise.reject(err)
  }
)

/**
 * Télécharge un fichier (PDF, etc.) depuis un endpoint authentifié et
 * déclenche l'enregistrement côté navigateur.
 */
export async function downloadFile(url, filename) {
  // L'endpoint renvoie une URL signée temporaire.
  const res = await api.get(url)
  const signedUrl = res.data?.url
  if (!signedUrl) throw new Error('URL de téléchargement indisponible.')

  // On l'utilise en chemin RELATIF (même origine, via le proxy) : ainsi
  // l'attribut `download` est respecté (un lien cross-origin l'ignorerait) et
  // la signature reste valide. Le téléchargement est natif (pas de blob/XHR).
  let href = signedUrl
  try {
    const u = new URL(signedUrl)
    href = u.pathname + u.search
  } catch { /* garde l'URL telle quelle si parsing impossible */ }

  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * Traduit une erreur axios en message clair pour l'utilisateur.
 * Couvre les cas sans réponse HTTP (serveur injoignable, timeout)
 * et les statuts serveur courants.
 */
export function apiErrorMessage(err, fallback = 'Une erreur inattendue est survenue. Veuillez réessayer.') {
  // Aucune réponse reçue : serveur éteint, coupure réseau ou CORS
  if (!err.response) {
    if (err.code === 'ECONNABORTED') {
      return "Le serveur met trop de temps à répondre. Vérifiez votre connexion et réessayez."
    }
    return "Impossible de joindre le serveur. Vérifiez votre connexion internet, puis réessayez."
  }

  const { status, data } = err.response
  if (status === 403) return data?.message || "Accès non autorisé pour votre rôle."
  if (status === 429) return "Trop de tentatives. Patientez un instant avant de réessayer."
  if (status === 404) return data?.message || "Service introuvable. Contactez un responsable si le problème persiste."
  if (status >= 500) return "Le serveur rencontre un problème technique. Veuillez réessayer dans quelques instants."

  return data?.message || fallback
}

export default api
