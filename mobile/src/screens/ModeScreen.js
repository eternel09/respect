import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { clearSession } from '../lib/storage'
import { colors } from '../theme'

/**
 * Choix de l'application — affiché uniquement si l'organisation a activé
 * plusieurs modules. Sinon l'app entre directement dans le seul module actif.
 */
export default function ModeScreen({ session, onModeSelected, onLogout }) {
  const logout = async () => { await clearSession(); onLogout() }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.org} numberOfLines={1}>{session.user.organization?.name || 'Signiq'}</Text>
          <Text style={s.who} numberOfLines={1}>{session.user.email}</Text>
        </View>
        <TouchableOpacity onPress={logout}><Text style={s.logout}>Déconnexion</Text></TouchableOpacity>
      </View>

      <Text style={s.title}>Que faites-vous ?</Text>
      <Text style={s.subtitle}>Choisissez l'application à utiliser sur le terrain.</Text>

      <TouchableOpacity style={[s.card, { backgroundColor: colors.brand }]} onPress={() => onModeSelected('presence')}>
        <Text style={s.cardIcon}>✓</Text>
        <Text style={s.cardTitle}>Gestion de présence</Text>
        <Text style={s.cardSub}>Pointer les membres via leur badge QR</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[s.card, { backgroundColor: colors.accentDark }]} onPress={() => onModeSelected('occasions')}>
        <Text style={s.cardIcon}>💍</Text>
        <Text style={s.cardTitle}>Accueil des invités</Text>
        <Text style={s.cardSub}>Scanner les invitations et orienter vers les tables</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sand, paddingHorizontal: 18, paddingTop: 54 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  org: { fontSize: 17, fontWeight: 'bold', color: colors.brand },
  who: { fontSize: 12, color: colors.muted },
  logout: { color: colors.muted, fontSize: 13 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 3, marginBottom: 22 },
  card: { borderRadius: 22, padding: 22, marginBottom: 14, elevation: 3 },
  cardIcon: { fontSize: 30, color: colors.white, marginBottom: 8 },
  cardTitle: { fontSize: 19, fontWeight: 'bold', color: colors.white },
  cardSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 3 },
})
