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

/* ── Icônes (Material Symbols) ──────────────────────────────────────────
 * Déclarations de fonctions (hoistées) : l'objet MODULES ci-dessus les
 * référence avant cette ligne. Des `const` (non hoistées) déclencheraient
 * une ReferenceError « Cannot access … before initialization » (TDZ) à
 * l'évaluation du module — ne pas convertir en fonctions fléchées. */
export function DashIcon() { return <Icon name="space_dashboard" /> }
export function AttendIcon() { return <Icon name="how_to_reg" /> }
export function MembersIcon() { return <Icon name="groups" /> }
export function RegIcon() { return <Icon name="event" /> }
export function OccasionIcon() { return <Icon name="celebration" /> }
export function PresenceIcon() { return <Icon name="fact_check" /> }
