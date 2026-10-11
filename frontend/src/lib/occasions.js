// Modules activables par événement (occasion) + valeurs par défaut selon le type.
// L'interface n'affiche que les modules actifs → chaque type d'événement ne
// montre que ce qui le concerne. Miroir de backend/config/occasions.php.

// Types d'événement (libellé, emoji, couleur d'accent).
export const OCC_TYPES = {
  mariage:      { label: 'Mariage',      emoji: '💍', color: '#e08a3c' },
  gala:         { label: 'Gala',         emoji: '🥂', color: '#1e3a5f' },
  ceremonie:    { label: 'Cérémonie',    emoji: '🎓', color: '#059669' },
  anniversaire: { label: 'Anniversaire', emoji: '🎂', color: '#c9742b' },
  concert:      { label: 'Concert',      emoji: '🎵', color: '#7c3aed' },
  autre:        { label: 'Autre',        emoji: '📅', color: '#6b7280' },
}

export const OCC_MODULES = {
  guests:       { label: 'Invitations & invités', desc: 'Liste nominative, envoi WhatsApp, carton, RSVP', icon: 'mail' },
  tables:       { label: 'Plan de salle', desc: 'Tables et placement des invités', icon: 'table_restaurant' },
  couple_video: { label: 'Vidéo du couple', desc: 'Vidéo sur la page de confirmation (mariage)', icon: 'movie' },
  ticketing:    { label: 'Billetterie', desc: 'Billets payants, e-billets, contrôle à l’entrée', icon: 'confirmation_number' },
}

export const OCC_MODULE_DEFAULTS = {
  mariage:      ['guests', 'tables', 'couple_video'],
  gala:         ['guests', 'tables', 'ticketing'],
  ceremonie:    ['guests'],
  anniversaire: ['guests', 'tables'],
  concert:      ['ticketing'],
  autre:        ['guests', 'tables', 'ticketing'],
}

export const defaultModules = (type) => OCC_MODULE_DEFAULTS[type] || ['guests']
