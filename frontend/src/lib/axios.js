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
    }
    return Promise.reject(err)
  }
)

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
  if (status === 429) return "Trop de tentatives. Patientez un instant avant de réessayer."
  if (status === 404) return data?.message || "Service introuvable. Contactez un responsable si le problème persiste."
  if (status >= 500) return "Le serveur rencontre un problème technique. Veuillez réessayer dans quelques instants."

  return data?.message || fallback
}

export default api
