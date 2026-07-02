import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native'
import { apiClient, apiErrorMessage } from '../lib/api'
import { refreshManifest, syncQueue } from '../lib/scanner'
import { clearSession, getQueue } from '../lib/storage'
import { colors } from '../theme'

const TYPE_LABELS = { reunion: 'Réunion', priere: 'Prière', autre: 'Autre' }

export default function EventsScreen({ session, onEventSelected, onLogout }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [preparing, setPreparing] = useState(null) // id de l'événement en préparation

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await apiClient().get('/scan/events')
      setEvents(res.data.data || [])
    } catch (err) {
      setError(apiErrorMessage(err, 'Impossible de charger les événements.'))
    } finally {
      setLoading(false)
    }
    setPending((await getQueue()).length)
  }, [])

  useEffect(() => {
    load()
    // Sync automatique des scans hors-ligne au retour sur cet écran
    syncQueue()
      .then(async (r) => { if (r?.synced) { Alert.alert('Synchronisation', `${r.synced} scan(s) hors-ligne synchronisé(s).`); setPending(0) } })
      .catch(() => {})
  }, [load])

  const select = async (event) => {
    setPreparing(event.id)
    try {
      await refreshManifest(event.id) // manifeste frais pour l'offline
    } catch {
      // pas de réseau : on garde le manifeste existant s'il y en a un
    }
    setPreparing(null)
    onEventSelected(event)
  }

  const doSync = async () => {
    setSyncing(true)
    try {
      const r = await syncQueue()
      Alert.alert('Synchronisation', r.synced ? `${r.synced} scan(s) synchronisé(s).` : 'Aucun scan en attente.')
      setPending((await getQueue()).length)
    } catch (err) {
      Alert.alert('Synchronisation impossible', apiErrorMessage(err))
    } finally {
      setSyncing(false)
    }
  }

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

      {pending > 0 && (
        <TouchableOpacity style={s.syncBanner} onPress={doSync} disabled={syncing}>
          {syncing
            ? <ActivityIndicator color={colors.warning} size="small" />
            : <Text style={s.syncText}>⇪ {pending} scan(s) hors-ligne en attente — appuyer pour synchroniser</Text>}
        </TouchableOpacity>
      )}

      <Text style={s.title}>Choisir un événement</Text>
      <Text style={s.subtitle}>Le manifeste hors-ligne sera téléchargé automatiquement.</Text>

      {error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand} size="large" />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => String(e.id)}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.brand} />}
          ListEmptyComponent={<Text style={s.empty}>Aucun événement. Créez-en un depuis le back-office.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => select(item)} disabled={preparing !== null}>
              <View style={s.cardBadge}><Text style={s.cardBadgeText}>{TYPE_LABELS[item.type] || item.type}</Text></View>
              <Text style={s.cardName}>{item.name}</Text>
              <Text style={s.cardDate}>{String(item.date).slice(0, 10)}</Text>
              {preparing === item.id && <ActivityIndicator style={s.cardSpinner} color={colors.brand} size="small" />}
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sand, paddingHorizontal: 18, paddingTop: 54 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  org: { fontSize: 17, fontWeight: 'bold', color: colors.brand },
  who: { fontSize: 12, color: colors.muted },
  logout: { color: colors.muted, fontSize: 13 },
  syncBanner: { backgroundColor: colors.warningBg, borderRadius: 14, padding: 12, marginBottom: 14, alignItems: 'center' },
  syncText: { color: colors.warning, fontSize: 13, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 12, color: colors.muted, marginBottom: 16, marginTop: 2 },
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 12, padding: 12, marginBottom: 10 },
  errorText: { color: colors.danger, fontSize: 13 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  card: {
    backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 12, elevation: 2,
  },
  cardBadge: { alignSelf: 'flex-start', backgroundColor: '#eef2f7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8 },
  cardBadgeText: { fontSize: 11, color: colors.brand, fontWeight: '600' },
  cardName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  cardDate: { fontSize: 12, color: colors.muted, marginTop: 2 },
  cardSpinner: { position: 'absolute', right: 16, top: 22 },
})
