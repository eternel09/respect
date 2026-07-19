import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import { apiClient, apiErrorMessage } from '../lib/api'
import { clearSession } from '../lib/storage'
import { colors } from '../theme'

/** Types d'occasion — libellés alignés sur le back-office web. */
const OCC_TYPES = {
  mariage:      { label: 'Mariage',      emoji: '💍' },
  gala:         { label: 'Gala',         emoji: '🥂' },
  ceremonie:    { label: 'Cérémonie',    emoji: '🎓' },
  anniversaire: { label: 'Anniversaire', emoji: '🎂' },
  concert:      { label: 'Concert',      emoji: '🎵' },
  autre:        { label: 'Autre',        emoji: '📅' },
}

/** Choix de l'événement dont l'agent d'accueil va scanner les invités. */
export default function OccasionsScreen({ session, onOccasionSelected, onLogout, onBack }) {
  const [occasions, setOccasions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await apiClient().get('/occasion-scan/occasions')
      setOccasions(res.data.data || [])
    } catch (err) {
      setError(apiErrorMessage(err, 'Impossible de charger les événements.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

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

      {onBack && (
        <TouchableOpacity onPress={onBack} style={s.backLink}>
          <Text style={s.backLinkText}>← Changer d'application</Text>
        </TouchableOpacity>
      )}

      <Text style={s.title}>Accueil des invités</Text>
      <Text style={s.subtitle}>Choisissez l'événement dont vous scannez les invitations.</Text>

      {error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand} size="large" />
      ) : (
        <FlatList
          data={occasions}
          keyExtractor={(o) => String(o.id)}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.brand} />}
          ListEmptyComponent={<Text style={s.empty}>Aucun événement à venir. Créez-en un depuis le back-office.</Text>}
          renderItem={({ item }) => {
            const t = OCC_TYPES[item.type] || OCC_TYPES.autre
            return (
              <TouchableOpacity style={s.card} onPress={() => onOccasionSelected(item)}>
                <View style={s.cardBadge}>
                  <Text style={s.cardBadgeText}>{t.emoji} {t.label}</Text>
                </View>
                <Text style={s.cardName}>{item.name}</Text>
                <Text style={s.cardMeta}>
                  {String(item.date).slice(0, 10)}
                  {item.location ? ` · ${item.location}` : ''}
                </Text>
                <Text style={s.cardGuests}>{item.guests} invité(s)</Text>
              </TouchableOpacity>
            )
          }}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sand, paddingHorizontal: 18, paddingTop: 54 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  org: { fontSize: 17, fontWeight: 'bold', color: colors.brand },
  who: { fontSize: 12, color: colors.muted },
  logout: { color: colors.muted, fontSize: 13 },
  backLink: { marginBottom: 10 },
  backLinkText: { color: colors.muted, fontSize: 13 },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 12, color: colors.muted, marginTop: 2, marginBottom: 16 },
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 12, padding: 12, marginBottom: 10 },
  errorText: { color: colors.danger, fontSize: 13 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 12, elevation: 2 },
  cardBadge: {
    alignSelf: 'flex-start', backgroundColor: '#fdf1e3', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8,
  },
  cardBadgeText: { fontSize: 11, color: colors.accentDark, fontWeight: '700' },
  cardName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  cardGuests: { fontSize: 12, color: colors.brand, marginTop: 6, fontWeight: '600' },
})
