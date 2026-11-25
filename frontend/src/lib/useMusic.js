import { useCallback, useRef, useState } from 'react'

/**
 * Musique d'ambiance d'une invitation : l'élément <audio> et ses commandes.
 * La lecture ne démarre que sur un geste de l'invité (ouverture, bouton).
 * `attach` se branche sur l'élément <audio> (prop `ref`).
 */
export default function useMusic(url) {
  const el = useRef(null)
  const [playing, setPlaying] = useState(false)
  const attach = useCallback((node) => { el.current = node }, [])
  const play = useCallback(() => {
    el.current?.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }, [])
  const toggle = useCallback(() => {
    if (!el.current) return
    if (!el.current.paused) { el.current.pause(); setPlaying(false) } else play()
  }, [play])
  return { attach, url, playing, play, toggle }
}
