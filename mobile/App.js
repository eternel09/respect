import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { configureApi } from './src/lib/api'
import { getSession } from './src/lib/storage'
import EventsScreen from './src/screens/EventsScreen'
import LoginScreen from './src/screens/LoginScreen'
import ScanScreen from './src/screens/ScanScreen'
import { colors } from './src/theme'

/**
 * Signiq Scanner — pointage de présence par scan du QR personnel des membres.
 * Flux : connexion staff → choix d'événement (manifeste offline) → scan caméra.
 */
export default function App() {
  const [booting, setBooting] = useState(true)
  const [session, setSession] = useState(null)
  const [event, setEvent] = useState(null)

  useEffect(() => {
    getSession().then((saved) => {
      if (saved?.token) {
        configureApi({ serverUrl: saved.serverUrl, token: saved.token })
        setSession(saved)
      }
      setBooting(false)
    })
  }, [])

  if (booting) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  return (
    <>
      <StatusBar style={event ? 'light' : 'dark'} />
      {!session ? (
        <LoginScreen onLoggedIn={setSession} />
      ) : !event ? (
        <EventsScreen
          session={session}
          onEventSelected={setEvent}
          onLogout={() => { setSession(null); setEvent(null) }}
        />
      ) : (
        <ScanScreen event={event} onBack={() => setEvent(null)} />
      )}
    </>
  )
}
