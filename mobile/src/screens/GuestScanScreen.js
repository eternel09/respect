import { CameraView, useCameraPermissions } from 'expo-camera'
import { useRef, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native'
import { apiClient, apiErrorMessage, isNetworkError } from '../lib/api'
import { colors } from '../theme'

/**
 * Retours de scan. L'agent d'accueil n'a besoin que d'une chose en un coup
 * d'œil : le nom et LA TABLE. Le reste est secondaire.
 */
const FEEDBACK = {
  checked_in:       { bg: colors.success, icon: '✓', label: 'BIENVENUE',        vibrate: 90 },
  already:          { bg: colors.warning, icon: '↻', label: 'DÉJÀ ENTRÉ(E)',    vibrate: [0, 70, 80, 70] },
  unknown:          { bg: colors.danger,  icon: '✕', label: 'INVITATION INCONNUE', vibrate: 400 },
  expired:          { bg: colors.danger,  icon: '!', label: 'ÉVÉNEMENT TERMINÉ', vibrate: 400 },
  invalid_occasion: { bg: colors.danger,  icon: '!', label: 'ÉVÉNEMENT INTROUVABLE', vibrate: 400 },
  invalid:          { bg: colors.danger,  icon: '!', label: 'SCAN INVALIDE',    vibrate: 400 },
  offline:          { bg: colors.warning, icon: '⇄', label: 'HORS-LIGNE',       vibrate: [0, 70, 80, 70] },
}

export default function GuestScanScreen({ occasion, onBack }) {
  const [permission, requestPermission] = useCameraPermissions()
  const [feedback, setFeedback] = useState(null)
  const [count, setCount] = useState(0)
  const busy = useRef(false)

  const show = (result) => {
    const fb = FEEDBACK[result.status] || FEEDBACK.invalid
    Vibration.vibrate(fb.vibrate)
    setFeedback(result)
    if (result.status === 'checked_in') setCount((c) => c + 1)
    setTimeout(() => { setFeedback(null); busy.current = false }, 2200)
  }

  const onScanned = async ({ data }) => {
    if (busy.current || !data) return
    busy.current = true

    const token = String(data).trim()
    try {
      const res = await apiClient().post('/occasion-scan', { token, occasion_id: occasion.id })
      show({ ...res.data, guest: res.data.guest })
    } catch (err) {
      // Le backend renvoie 404 avec un statut exploitable (unknown/invalid_occasion)
      const body = err.response?.data
      if (body?.status) { show(body); return }
      show({
        status: isNetworkError(err) ? 'offline' : 'invalid',
        message: apiErrorMessage(err, 'Scan impossible.'),
      })
    }
  }

  if (!permission) return <View style={s.root} />

  if (!permission.granted) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.permTitle}>Accès caméra requis</Text>
        <Text style={s.permText}>Le scanner a besoin de la caméra pour lire les invitations QR.</Text>
        <TouchableOpacity style={s.permButton} onPress={requestPermission}>
          <Text style={s.permButtonText}>Autoriser la caméra</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack}><Text style={s.backLink}>← Retour</Text></TouchableOpacity>
      </View>
    )
  }

  const fb = feedback ? (FEEDBACK[feedback.status] || FEEDBACK.invalid) : null
  const guest = feedback?.guest

  return (
    <View style={s.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={feedback ? undefined : onScanned}
      />

      <View style={s.topBar}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backBtnText}>←</Text></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.eventName} numberOfLines={1}>{occasion.name}</Text>
          <Text style={s.counters}>{count} invité(s) accueilli(s)</Text>
        </View>
      </View>

      {!feedback && (
        <View style={s.frameWrap} pointerEvents="none">
          <View style={s.frame} />
          <Text style={s.hint}>Visez le QR de l'invitation</Text>
        </View>
      )}

      {feedback && (
        <View style={[s.feedback, { backgroundColor: fb.bg }]}>
          <Text style={s.fbIcon}>{fb.icon}</Text>
          <Text style={s.fbLabel}>{fb.label}</Text>

          {guest ? (
            <>
              <Text style={s.fbName} numberOfLines={2}>{guest.name}</Text>

              {/* L'information clé : la table */}
              {guest.table ? (
                <View style={s.tableBox}>
                  <Text style={s.tableLabel}>TABLE</Text>
                  <Text style={s.tableValue} numberOfLines={1}>{guest.table}</Text>
                </View>
              ) : (
                <Text style={s.noTable}>Aucune table assignée</Text>
              )}

              {guest.declined && <Text style={s.badge}>⚠ Avait décliné l'invitation</Text>}
              {!guest.confirmed && !guest.declined && <Text style={s.badge}>Sans réponse à l'invitation</Text>}
            </>
          ) : (
            <Text style={s.fbMessage} numberOfLines={3}>{feedback.message}</Text>
          )}
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
    backgroundColor: 'rgba(20,42,71,0.85)', flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 5,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: colors.white, fontSize: 18 },
  eventName: { color: colors.white, fontWeight: 'bold', fontSize: 15 },
  counters: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  frameWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 240, height: 240, borderRadius: 28, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' },
  hint: { color: 'rgba(255,255,255,0.85)', marginTop: 18, fontSize: 14 },

  feedback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 26, zIndex: 10 },
  fbIcon: { fontSize: 60, color: colors.white, fontWeight: 'bold' },
  fbLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, letterSpacing: 2, marginTop: 4, fontWeight: '700' },
  fbName: { color: colors.white, fontSize: 30, fontWeight: 'bold', marginTop: 10, textAlign: 'center' },
  fbMessage: { color: 'rgba(255,255,255,0.9)', fontSize: 15, marginTop: 10, textAlign: 'center' },

  tableBox: {
    marginTop: 20, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)', borderRadius: 22,
    paddingVertical: 14, paddingHorizontal: 34, alignItems: 'center',
  },
  tableLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, letterSpacing: 3, fontWeight: '700' },
  tableValue: { color: colors.white, fontSize: 46, fontWeight: 'bold', marginTop: 2 },
  noTable: { color: 'rgba(255,255,255,0.9)', fontSize: 15, marginTop: 18, fontStyle: 'italic' },
  badge: {
    marginTop: 16, color: colors.white, fontSize: 13, fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, overflow: 'hidden',
  },
})
