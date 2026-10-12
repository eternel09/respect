import { useAuth } from '../context/AuthContext'

/**
 * Vocabulaire du membre selon l'organisation (réglage `member_term`).
 * Pilote les libellés du back-office présence : « Membre » (associatif, défaut),
 * « Agent » ou « Employé » (entreprise).
 */
const TERMS = {
  membre:  { one: 'Membre',  many: 'Membres',  lowerOne: 'membre',  lowerMany: 'membres' },
  agent:   { one: 'Agent',   many: 'Agents',   lowerOne: 'agent',   lowerMany: 'agents' },
  employe: { one: 'Employé', many: 'Employés', lowerOne: 'employé', lowerMany: 'employés' },
}

export const MEMBER_TERM_OPTIONS = [
  { key: 'membre',  label: 'Membre',  hint: 'Associatif / communautaire' },
  { key: 'agent',   label: 'Agent',   hint: 'Entreprise — personnel de terrain' },
  { key: 'employe', label: 'Employé', hint: 'Entreprise — salariés' },
]

export function memberTerm(key) {
  return TERMS[key] || TERMS.membre
}

/** Terme du membre pour l'organisation de l'utilisateur connecté. */
export function useMemberTerm() {
  const { user } = useAuth()
  return memberTerm(user?.organization?.member_term)
}
