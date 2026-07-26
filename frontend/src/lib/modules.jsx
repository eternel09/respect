/**
 * Registre des modules (applications) de la suite — pendant front du
 * `config/modules.php` backend. Les CLÉS doivent rester synchronisées.
 *
 * Ajouter un module : une entrée ici (nav + accueil + icône) + ses pages/routes.
 * La sidebar et la page « Applications » se construisent à partir de ce registre.
 */

export const MODULES = {
  presence: {
    key: 'presence',
    label: 'Gestion de présence',
    description: 'Membres, pointage par QR code, rapports et statistiques.',
    color: '#1e3a5f',
    icon: PresenceIcon,
    home: '/admin/dashboard',
    nav: [
      { to: '/admin/dashboard',  label: 'Tableau de bord', icon: DashIcon },
      { to: '/admin/attendance', label: 'Présences',       icon: AttendIcon },
      { to: '/admin/members',    label: 'Membres',         icon: MembersIcon },
      { to: '/admin/events',     label: 'Activités',       icon: RegIcon },
    ],
  },
  // Module « occasions » (mariages/événementiel) retiré temporairement — voir
  // config/modules.php côté backend. Réactivation : rétablir cette entrée + la clé
  // dans MODULE_ORDER. Les pages/routes /events restent en place (inaccessibles
  // tant que le module n'est pas au catalogue).
  // occasions: {
  //   key: 'occasions',
  //   label: 'Invitations & événements',
  //   description: 'Mariages, galas, cérémonies : plan de salle, invités, invitations QR.',
  //   color: '#e08a3c',
  //   icon: OccasionIcon,
  //   home: '/events',
  //   nav: [
  //     { to: '/events', label: 'Événements', icon: OccasionIcon },
  //   ],
  // },
}

/** Ordre d'affichage stable (nav + cartes). */
export const MODULE_ORDER = ['presence']

/** Entrées de navigation à plat pour les modules activés. */
export function navForModules(enabled = []) {
  return MODULE_ORDER
    .filter((k) => enabled.includes(k))
    .flatMap((k) => MODULES[k].nav)
}

/** Page d'accueil = accueil du premier module actif (repli : Applications). */
export function homeForModules(enabled = []) {
  const first = MODULE_ORDER.find((k) => enabled.includes(k))
  return first ? MODULES[first].home : '/admin/modules'
}

/* ── Icônes ─────────────────────────────────────────────────────────── */
export function DashIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" /></svg>
}
export function AttendIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" /></svg>
}
export function MembersIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
}
export function RegIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" /></svg>
}
export function OccasionIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" /></svg>
}
export function PresenceIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
}
