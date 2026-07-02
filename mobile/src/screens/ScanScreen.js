import { CameraView, useCameraPermissions } from 'expo-camera'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, Vibration, View,
} from 'react-native'
import { onboardScan, processScan } from '../lib/scanner'
import { getQueue } from '../lib/storage'
import { colors } from '../theme'

const FEEDBACK = {
  recorded:           { bg: colors.success, icon: '✓', label: 'PRÉSENCE ENREGISTRÉE', vibrate: 90 },
  'offline-recorded': { bg: colors.success, icon: '✓', label: 'ENREGISTRÉ HORS-LIGNE', vibrate: 90 },
  already:            { bg: colors.warning, icon: '↻', label: 'DÉJÀ POINTÉ', vibrate: [0, 70, 80, 70] },
  unknown:            { bg: colors.danger, icon: '✕', label: 'BADGE NON RECONNU', vibrate: 400 },
  invalid:            { bg: colors.danger, icon: '!', label: 'SCAN INVALIDE', vibrate: 400 },
  'blank-offline':    { bg: colors.warning, icon: '⇄', label: 'CONNEXION REQUISE', vibrate: [0, 70, 80, 70] },
}

export default function ScanScreen({ event, onBack }) {
  const [permission, requestPermission] = useCameraPermissions()
  const [feedback, setFeedback] = useState(null) // { status, title, message }
  const [onboarding, setOnboarding] = useState(null) // { token } → formulaire ouvert
  const [pending, setPending] = useState(0)
  const [count, setCount] = useState(0)
  const busy = useRef(false)

  useEffect(() => { getQueue().then((q) => setPending(q.length)) }, [])

  const showFeedback = (result) => {
    const fb = FEEDBACK[result.status] || FEEDBACK.invalid
    Vibration.vibrate(fb.vibrate)
    setFeedback(result)
    if (result.status === 'recorded' || result.status === 'offline-recorded') setCount((c) => c + 1)
    if (result.status === 'offline-recorded') setPending((p) => p + 1)
    setTimeout(() => { setFeedback(null); busy.current = false }, 1600)
  }

  const onScanned = async ({ data }) => {
    if (busy.current || !data) return
    busy.current = true

    const result = await processScan(String(data).trim(), event.id)

    // Badge vierge : on ouvre l'onboarding express (la caméra reste en pause)
    if (result.status === 'unassigned') {
      Vibration.vibrate([0, 60, 60, 60])
      setOnboarding({ token: result.token })
      return
    }

    showFeedback(result)
  }

  const closeOnboarding = () => { setOnboarding(null); busy.current = false }

  const submitOnboarding = async (form) => {
    const result = await onboardScan(onboarding.token, event.id, form)
    if (result.keepForm) return result // erreur de validation → reste dans le formulaire
    setOnboarding(null)
    showFeedback(result)
    return null
  }

  if (!permission) return <View style={s.root} />

  if (!permission.granted) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.permTitle}>Accès caméra requis</Text>
        <Text style={s.permText}>Le scanner a besoin de la caméra pour lire les badges QR.</Text>
        <TouchableOpacity style={s.permButton} onPress={requestPermission}>
          <Text style={s.permButtonText}>Autoriser la caméra</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack}><Text style={s.backLink}>← Retour</Text></TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={s.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={feedback || onboarding ? undefined : onScanned}
      />

      {/* Bandeau haut */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backBtnText}>←</Text></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.eventName} numberOfLines={1}>{event.name}</Text>
          <Text style={s.counters}>{count} scanné(s){pending > 0 ? ` · ${pending} hors-ligne` : ''}</Text>
        </View>
      </View>

      {/* Cadre de visée */}
      {!feedback && !onboarding && (
        <View style={s.frameWrap} pointerEvents="none">
          <View style={s.frame} />
          <Text style={s.hint}>Visez le QR du badge</Text>
        </View>
      )}

      {/* Feedback plein écran */}
      {feedback && (
        <View style={[s.feedback, { backgroundColor: FEEDBACK[feedback.status]?.bg || colors.danger }]}>
          <Text style={s.fbIcon}>{FEEDBACK[feedback.status]?.icon}</Text>
          <Text style={s.fbLabel}>{FEEDBACK[feedback.status]?.label}</Text>
          <Text style={s.fbName} numberOfLines={1}>{feedback.title}</Text>
          <Text style={s.fbMessage} numberOfLines={2}>{feedback.message}</Text>
        </View>
      )}

      {/* Onboarding express (badge vierge) */}
      {onboarding && <OnboardForm onSubmit={submitOnboarding} onCancel={closeOnboarding} />}
    </View>
  )
}

/** Formulaire éclair : créer et lier le membre au badge fraîchement scanné. */
function OnboardForm({ onSubmit, onCancel }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Prénom et nom sont obligatoires.')
      return
    }
    setSaving(true); setError(null)
    const failed = await onSubmit({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() })
    setSaving(false)
    if (failed) setError(failed.message)
  }

  return (
    <KeyboardAvoidingView
      style={s.onboardWrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.onboardCard}>
        <Text style={s.obBadge}>NOUVEAU BADGE</Text>
        <Text style={s.obTitle}>Enregistrer le membre</Text>
        <Text style={s.obSub}>Ce badge sera définitivement lié à cette personne.</Text>

        {error && <View style={s.obError}><Text style={s.obErrorText}>{error}</Text></View>}

        <TextInput
          style={s.obInput} value={firstName} onChangeText={setFirstName}
          placeholder="Prénom *" placeholderTextColor={colors.muted} autoFocus
        />
        <TextInput
          style={s.obInput} value={lastName} onChangeText={setLastName}
          placeholder="Nom *" placeholderTextColor={colors.muted}
        />
        <TextInput
          style={s.obInput} value={phone} onChangeText={setPhone}
          placeholder="Téléphone (optionnel)" placeholderTextColor={colors.muted} keyboardType="phone-pad"
        />

        <View style={s.obRow}>
          <TouchableOpacity style={s.obCancel} onPress={onCancel} disabled={saving}>
            <Text style={s.obCancelText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.obSubmit, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
            {saving
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.obSubmitText}>Enregistrer & pointer</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: colors.sand },
  permTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  permText: { fontSize: 13, color: colors.muted, textAlign: 'center', marginBottom: 20 },
  permButton: { backgroundColor: colors.brand, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 26 },
  permButtonText: { color: colors.white, fontWeight: 'bold' },
  backLink: { color: colors.muted, marginTop: 18 },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: 54, paddingBottom: 14, paddingHorizontal: 16,
    backgroundColor: 'rgba(20,42,71,0.85)', flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 5,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: colors.white, fontSize: 18 },
  eventName: { color: colors.white, fontWeight: 'bold', fontSize: 15 },
  counters: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  frameWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 240, height: 240, borderRadius: 28,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)',
  },
  hint: { color: 'rgba(255,255,255,0.85)', marginTop: 18, fontSize: 14 },

  feedback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 30, zIndex: 10 },
  fbIcon: { fontSize: 72, color: colors.white, fontWeight: 'bold' },
  fbLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, letterSpacing: 2, marginTop: 6, fontWeight: '700' },
  fbName: { color: colors.white, fontSize: 26, fontWeight: 'bold', marginTop: 10, textAlign: 'center' },
  fbMessage: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 8, textAlign: 'center' },

  onboardWrap: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,20,35,0.88)',
    alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 10,
  },
  onboardCard: { width: '100%', maxWidth: 380, backgroundColor: colors.white, borderRadius: 22, padding: 20 },
  obBadge: { alignSelf: 'flex-start', backgroundColor: colors.accentDark, color: colors.white, fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  obTitle: { fontSize: 19, fontWeight: 'bold', color: colors.text, marginTop: 10 },
  obSub: { fontSize: 12, color: colors.muted, marginTop: 3, marginBottom: 14 },
  obError: { backgroundColor: colors.dangerBg, borderRadius: 10, padding: 10, marginBottom: 10 },
  obErrorText: { color: colors.danger, fontSize: 12 },
  obInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: colors.text, marginBottom: 10,
  },
  obRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  obCancel: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', backgroundColor: '#f1f2f4' },
  obCancelText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  obSubmit: { flex: 2, borderRadius: 12, paddingVertical: 13, alignItems: 'center', backgroundColor: colors.brand },
  obSubmitText: { color: colors.white, fontWeight: 'bold', fontSize: 14 },
})
