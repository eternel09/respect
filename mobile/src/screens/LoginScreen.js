import { useState } from 'react'
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { apiClient, apiErrorMessage, configureApi, defaultServerUrl } from '../lib/api'
import { saveSession } from '../lib/storage'
import { colors } from '../theme'

export default function LoginScreen({ onLoggedIn }) {
  const [server, setServer] = useState(defaultServerUrl())
  const [showServer, setShowServer] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    setError(null)
    try {
      configureApi({ serverUrl: server })
      const res = await apiClient().post('/admin/login', { email: email.trim(), password })
      const { token, user } = res.data
      if (!['admin', 'scanner'].includes(user.role)) {
        setError('Ce compte n’a pas le rôle scanner.')
        return
      }
      configureApi({ token })
      const session = { token, user, serverUrl: server }
      await saveSession(session)
      onLoggedIn(session)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.card}>
        <View style={s.logoRow}>
          <View style={s.logoBox}><Text style={s.logoGlyph}>▍▍</Text></View>
          <View>
            <Text style={s.brand}>Signiq</Text>
            <Text style={s.sub}>Scanner de présence</Text>
          </View>
        </View>

        {error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

        <Text style={s.label}>Email</Text>
        <TextInput
          style={s.input} value={email} onChangeText={setEmail}
          placeholder="staff@organisation.cd" placeholderTextColor={colors.muted}
          autoCapitalize="none" keyboardType="email-address"
        />

        <Text style={s.label}>Mot de passe</Text>
        <TextInput
          style={s.input} value={password} onChangeText={setPassword}
          placeholder="••••••••" placeholderTextColor={colors.muted} secureTextEntry
        />

        {showServer ? (
          <>
            <Text style={s.label}>Adresse du serveur</Text>
            <TextInput
              style={s.input} value={server} onChangeText={setServer}
              autoCapitalize="none" placeholder="http://192.168.x.x:8000" placeholderTextColor={colors.muted}
            />
          </>
        ) : (
          <TouchableOpacity onPress={() => setShowServer(true)}>
            <Text style={s.serverHint}>Serveur : {server} · modifier</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[s.button, loading && s.buttonDisabled]} onPress={submit} disabled={loading}>
          {loading
            ? <ActivityIndicator color={colors.white} />
            : <Text style={s.buttonText}>Se connecter</Text>}
        </TouchableOpacity>
      </View>
      <Text style={s.footer}>© 2026 Signiq</Text>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sand, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 24, elevation: 3 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  logoBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  logoGlyph: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  brand: { fontSize: 20, fontWeight: 'bold', color: colors.brand },
  sub: { fontSize: 12, color: colors.muted },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text,
  },
  serverHint: { fontSize: 12, color: colors.muted, marginTop: 14 },
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 12, padding: 12, marginBottom: 4 },
  errorText: { color: colors.danger, fontSize: 13 },
  button: {
    backgroundColor: colors.brand, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 22,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontWeight: 'bold', fontSize: 15 },
  footer: { textAlign: 'center', color: colors.muted, fontSize: 11, marginTop: 18 },
})
