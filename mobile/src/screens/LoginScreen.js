import { useState } from 'react'
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { apiClient, apiErrorMessage, configureApi, defaultServerUrl } from '../lib/api'
import { saveSession } from '../lib/storage'
import { colors } from '../theme'

export default function LoginScreen({ onLoggedIn }) {
  // Serveur figé (prod en build autonome, auto-détecté en dev) — non modifiable.
  const server = defaultServerUrl()
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
          <Image source={require('../../assets/logo-full.png')} style={s.logoImg} />
          <Text style={s.sub}>Scanner de présence</Text>
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
  logoRow: { alignItems: 'flex-start', gap: 6, marginBottom: 24 },
  logoImg: { width: 150, height: 45, resizeMode: 'contain' },
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
