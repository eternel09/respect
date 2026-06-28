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
/**
 * Télécharge un fichier protégé via navigation native (iframe cachée).
 * Le token est passé en query (?token=) : pas de requête XHR/blob, pas d'URL
 * signée, pas d'await → robuste derrière le proxy de dev. `path` est relatif
 * à /api (ex. '/download/badge/9').
 */
export function downloadFile(path, filename) {
  const token = localStorage.getItem('token')
  const sep = path.includes('?') ? '&' : '?'
  const href = `/api${path}${sep}token=${encodeURIComponent(token || '')}`

  // Vrai lien de téléchargement (navigation native). Un éventuel gestionnaire
  // de téléchargement (IDM…) l'intercepte et télécharge le fichier ; contrairement
  // à fetch/blob qu'il vide (réponse 204 côté JS).
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
