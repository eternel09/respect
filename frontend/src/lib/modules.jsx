/**
 * Registre des modules (applications) de la suite — pendant front du
 * `config/modules.php` backend. Les CLÉS doivent rester synchronisées.
 *
 * Ajouter un module : une entrée ici (nav + accueil + icône) + ses pages/routes.
 * La sidebar et la page « Applications » se construisent à partir de ce registre.
 */
import Icon from '../components/ui/Icon'

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
  occasions: {
    key: 'occasions',
    label: 'Invitations & événements',
    description: 'Mariages, galas, cérémonies : plan de salle, invités, invitations QR.',
    color: '#e08a3c',
    icon: OccasionIcon,
    home: '/events',
    nav: [
      { to: '/events', label: 'Événements', icon: OccasionIcon },
    ],
  },
}

/** Ordre d'affichage stable (nav + cartes). */
export const MODULE_ORDER = ['presence', 'occasions']

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

/* ── Icônes (Material Symbols) ──────────────────────────────────────── */
export const DashIcon = () => <Icon name="space_dashboard" />
export const AttendIcon = () => <Icon name="how_to_reg" />
export const MembersIcon = () => <Icon name="groups" />
export const RegIcon = () => <Icon name="event" />
export const OccasionIcon = () => <Icon name="celebration" />
export const PresenceIcon = () => <Icon name="fact_check" />
