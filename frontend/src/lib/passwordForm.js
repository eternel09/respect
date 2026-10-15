// Aides partagées des écrans de mot de passe.

export const PASSWORD_RULE = '8 caractères minimum, avec des lettres et des chiffres.'

export const authInputCls =
  'w-full px-4 py-3 rounded-xl text-[15px] bg-white text-gray-900 placeholder:text-gray-400 ' +
  'border border-gray-200 shadow-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all'

/** Erreurs de validation Laravel → { champ: premier message }. */
export function fieldErrors(err) {
  const e = err?.response?.data?.errors
  return e ? Object.fromEntries(Object.entries(e).map(([k, v]) => [k, v[0]])) : {}
}

/** Page d'accueil selon le rôle (après connexion ou changement de mot de passe). */
export function homeFor(user) {
  if (user?.role === 'super_admin') return '/admin/organizations'
  if (user?.role === 'operator') return '/admin/print-requests'
  if (user?.occasion_id) return `/events/${user.occasion_id}`
  return '/admin/dashboard'
}
