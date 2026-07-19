import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { configureApi } from './src/lib/api'
import { getSession } from './src/lib/storage'
import EventsScreen from './src/screens/EventsScreen'
import GuestScanScreen from './src/screens/GuestScanScreen'
import LoginScreen from './src/screens/LoginScreen'
import ModeScreen from './src/screens/ModeScreen'
import OccasionsScreen from './src/screens/OccasionsScreen'
import ScanScreen from './src/screens/ScanScreen'
import { colors } from './src/theme'

/**
 * Signiq Scanner — deux applications terrain, selon les modules activés côté
 * organisation (mêmes clés que le web) :
 *   • presence  : connexion → choix d'événement → scan des badges membres
 *   • occasions : connexion → choix d'événement → scan des invitations (table)
 * Une organisation mono-module entre directement dans son application.
 */
export default function App() {
  const [booting, setBooting] = useState(true)
  const [session, setSession] = useState(null)
  const [mode, setMode] = useState(null)       // 'presence' | 'occasions'
  const [event, setEvent] = useState(null)     // événement présence
  const [occasion, setOccasion] = useState(null) // occasion événementielle

  useEffect(() => {
    getSession().then((saved) => {
      if (saved?.token) {
        configureApi({ serverUrl: saved.serverUrl, token: saved.token })
        setSession(saved)
      }
      setBooting(false)
    })
  }, [])

  const modules = session?.user?.organization?.modules || []
  // Repli : une organisation sans modules déclarés reste sur la présence
  // (comportement historique de l'app).
  const available = modules.length ? modules : ['presence']
  const soleMode = available.length === 1 ? available[0] : null
  const activeMode = mode || soleMode

  const resetAll = () => { setSession(null); setMode(null); setEvent(null); setOccasion(null) }

  if (booting) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  const scanning = !!event || !!occasion

  return (
    <>
      <StatusBar style={scanning ? 'light' : 'dark'} />

      {!session ? (
        <LoginScreen onLoggedIn={setSession} />
      ) : !activeMode ? (
        <ModeScreen session={session} onModeSelected={setMode} onLogout={resetAll} />
      ) : activeMode === 'occasions' ? (
        !occasion ? (
          <OccasionsScreen
            session={session}
            onOccasionSelected={setOccasion}
            onLogout={resetAll}
            onBack={soleMode ? null : () => setMode(null)}
          />
        ) : (
          <GuestScanScreen occasion={occasion} onBack={() => setOccasion(null)} />
        )
      ) : !event ? (
        <EventsScreen
          session={session}
          onEventSelected={setEvent}
          onLogout={resetAll}
          onBack={soleMode ? null : () => setMode(null)}
        />
      ) : (
        <ScanScreen event={event} onBack={() => setEvent(null)} />
      )}
    </>
  )
}
