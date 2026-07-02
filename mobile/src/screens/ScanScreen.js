import { CameraView, useCameraPermissions } from 'expo-camera'
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native'
import { processScan } from '../lib/scanner'
import { getQueue } from '../lib/storage'
import { colors } from '../theme'

const FEEDBACK = {
  recorded:           { bg: colors.success, icon: '✓', label: 'PRÉSENCE ENREGISTRÉE', vibrate: 90 },
  'offline-recorded': { bg: colors.success, icon: '✓', label: 'ENREGISTRÉ HORS-LIGNE', vibrate: 90 },
  already:            { bg: colors.warning, icon: '↻', label: 'DÉJÀ POINTÉ', vibrate: [0, 70, 80, 70] },
  unknown:            { bg: colors.danger, icon: '✕', label: 'BADGE NON RECONNU', vibrate: 400 },
  invalid:            { bg: colors.danger, icon: '!', label: 'SCAN INVALIDE', vibrate: 400 },
}

export default function ScanScreen({ event, onBack }) {
  const [permission, requestPermission] = useCameraPermissions()
  const [feedback, setFeedback] = useState(null) // { status, title, message }
  const [pending, setPending] = useState(0)
  const [count, setCount] = useState(0)
  const busy = useRef(false)

  useEffect(() => { getQueue().then((q) => setPending(q.length)) }, [])

  const onScanned = async ({ data }) => {
    if (busy.current || !data) return
    busy.current = true

    const result = await processScan(String(data).trim(), event.id)
    const fb = FEEDBACK[result.status] || FEEDBACK.invalid
    Vibration.vibrate(fb.vibrate)
    setFeedback(result)
    if (result.status === 'recorded' || result.status === 'offline-recorded') setCount((c) => c + 1)
    if (result.status === 'offline-recorded') setPending((p) => p + 1)

    // Réarme après un court délai : cadence de scan fluide sur le terrain
    setTimeout(() => { setFeedback(null); busy.current = false }, 1600)
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
        onBarcodeScanned={feedback ? undefined : onScanned}
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
      {!feedback && (
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
    </View>
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
    backgroundColor: 'rgba(20,42,71,0.85)', flexDirection: 'row', alignItems: 'center', gap: 12,
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

  feedback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 30 },
  fbIcon: { fontSize: 72, color: colors.white, fontWeight: 'bold' },
  fbLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, letterSpacing: 2, marginTop: 6, fontWeight: '700' },
  fbName: { color: colors.white, fontSize: 26, fontWeight: 'bold', marginTop: 10, textAlign: 'center' },
  fbMessage: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 8, textAlign: 'center' },
})
