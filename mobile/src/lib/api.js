import axios from 'axios'
import Constants from 'expo-constants'

/**
 * URL du backend. En développement Expo, on la dérive automatiquement de
 * l'hôte Metro (le PC qui sert l'app) : même machine, port 8000 → zéro config
 * sur le réseau local. Reste modifiable depuis l'écran de connexion.
 */
export function defaultServerUrl() {
  const hostUri = Constants.expoConfig?.hostUri // ex. "192.168.1.20:8081"
  const host = hostUri ? hostUri.split(':')[0] : 'localhost'
  return `http://${host}:8000`
}

let baseUrl = defaultServerUrl()
let authToken = null

export function configureApi({ serverUrl, token }) {
  if (serverUrl) baseUrl = serverUrl.replace(/\/+$/, '')
  authToken = token ?? authToken
}

export function apiClient(timeout = 8000) {
  return axios.create({
    baseURL: `${baseUrl}/api`,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  })
}

export const isNetworkError = (err) => !err.response

export function apiErrorMessage(err, fallback = 'Une erreur est survenue.') {
  if (!err.response) return 'Serveur injoignable. Vérifiez le réseau et l’adresse du serveur.'
  const { status, data } = err.response
  if (status === 401) return 'Identifiants incorrects.'
  if (status === 403) return data?.message || 'Accès non autorisé pour ce rôle.'
  return data?.message || fallback
}
