import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './heure-doree.css'
import { normalizeConfig, pick } from './config'
import { translator } from './i18n'
import { usePrefersReducedMotion, useReveal } from './hooks'
import Envelope from './Envelope'
import Hero from './Hero'
import Quote from './Quote'
import Countdown from './Countdown'
import Gallery from './Gallery'
import Story from './Story'
import Schedule from './Schedule'
import EventDetails from './EventDetails'
import Rsvp from './Rsvp'
import AccessPass from './AccessPass'
import Footer from './Footer'
import MusicToggle from './MusicToggle'
import LanguageSwitch from './LanguageSwitch'
import GoldDust from './GoldDust'

/** Motifs floraux gaufrés ton sur ton (lumière en haut à gauche, ombre en bas à droite). */
const FLOWER = 'M0 -9c3 0 4 4 0 9c-4-5-3-9 0-9z'
const rosette = (x, y, s) => [0, 72, 144, 216, 288].map(a => `<path transform="translate(${x} ${y}) scale(${s}) rotate(${a})" d="${FLOWER}"/>`).join('')
const EMBOSS = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" fill="none" stroke-width="1" stroke-linecap="round">'
  + `<g stroke="#ffffff" stroke-opacity=".5" transform="translate(-.6 -.6)">${rosette(40, 44, 1.1)}${rosette(132, 128, .8)}<path d="M64 60c14 6 24 18 26 34M100 22c10 4 16 12 18 22M18 120c12-2 22 4 28 14"/></g>`
  + `<g stroke="#d9cbb0" stroke-opacity=".3" transform="translate(.6 .6)">${rosette(40, 44, 1.1)}${rosette(132, 128, .8)}<path d="M64 60c14 6 24 18 26 34M100 22c10 4 16 12 18 22M18 120c12-2 22 4 28 14"/></g>`
  + '</svg>',
)}")`

const FONTS = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Pinyon+Script&family=Great+Vibes&display=swap'
const store = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch { /* indisponible */ } },
}

function VideoMessage({ config, t, lang, reduced }) {
  const ref = useReveal(reduced)
  if (!config.video) return null
  return (
    <section ref={ref} className="hd-section hd-reveal">
      <h2 className="hd-script hd-h2" style={{ fontSize: 42 }}>{pick(config.video.title, lang) || t('video.title')}</h2>
      <video src={config.video.src} className="hd-p" style={{ width: '100%', maxWidth: 280, aspectRatio: '9/16', objectFit: 'cover', margin: '14px auto 0', display: 'block', background: '#000', borderRadius: 3 }}
        autoPlay muted loop playsInline controls preload="metadata" />
    </section>
  )
}

/**
 * Invitation « Heure dorée » — tout le contenu vient de `config`
 * (voir invitation.config.example.json et config.js).
 *
 * @param config      objet de configuration (brut, normalisé ici)
 * @param preview     aperçu du back-office : sans enveloppe ni éléments fixes
 * @param reduced     force le mouvement réduit (sinon prefers-reduced-motion)
 * @param storageKey  clé de mémorisation (ouverture déjà vue, langue)
 * @param onAnswered  appelé après une réponse RSVP enregistrée
 */
export default function HeureDoreeInvitation({ config: raw, preview = false, reduced: forced, storageKey = 'demo', onAnswered }) {
  const config = useMemo(() => normalizeConfig(raw), [raw])
  const prefers = usePrefersReducedMotion()
  const reduced = forced ?? prefers
  const [lang, setLang] = useState(() => {
    const saved = store.get(`hd-lang:${storageKey}`)
    return config.languages.includes(saved) ? saved : config.lang
  })
  const t = useMemo(() => translator(lang), [lang])
  const [stage, setStage] = useState(() => (preview || store.get(`inv-open:${storageKey}`) === '1' ? 'open' : 'sealed'))
  const [playing, setPlaying] = useState(false)
  const audio = useRef(null)
  const details = useRef(null)

  useEffect(() => {
    if (document.getElementById('hd-fonts')) return
    const link = Object.assign(document.createElement('link'), { id: 'hd-fonts', rel: 'stylesheet', href: FONTS })
    document.head.appendChild(link)
  }, [])
  useEffect(() => {
    if (preview) return
    const prev = document.title
    document.title = `${config.title} · ${t('envelope.kicker')}`
    document.documentElement.lang = lang
    return () => { document.title = prev }
  }, [preview, config.title, lang, t])

  const changeLang = (l) => { setLang(l); store.set(`hd-lang:${storageKey}`, l) }
  const play = () => { audio.current?.play().then(() => setPlaying(true)).catch(() => setPlaying(false)) }
  const toggleMusic = () => { if (!audio.current) return; if (playing) { audio.current.pause(); setPlaying(false) } else play() }
  const opened = useCallback(() => { setStage('open'); store.set(`inv-open:${storageKey}`, '1') }, [storageKey])
  const replay = () => { store.set(`inv-open:${storageKey}`, null); setStage('sealed'); window.scrollTo({ top: 0 }) }

  const style = {
    '--hd-paper': `url("${config.assets.paper}")`, '--hd-leaf': `url("${config.assets.goldLeaf}")`, '--hd-emboss': EMBOSS,
  }
  const props = { config, t, lang, reduced, preview }
  return (
    <div className={`hd-root${preview ? ' hd-preview' : ''}${reduced ? ' hd-reduced' : ''}`} style={style} lang={lang} data-testid="heure-doree">
      {!preview && stage !== 'open' && <Envelope {...props} onOpen={config.music ? play : undefined} onDone={opened} />}
      {!preview && !reduced && <GoldDust />}
      {!preview && <LanguageSwitch lang={lang} languages={config.languages} onChange={changeLang} t={t} />}
      {!preview && config.music && (
        <>
          <audio ref={audio} src={config.music.src} loop preload="none" />
          <MusicToggle playing={playing} onToggle={toggleMusic} t={t} />
        </>
      )}

      <Hero {...props} active={stage === 'open'} onScroll={() => details.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })} />
      <div ref={details}><Quote {...props} /></div>
      <Countdown {...props} />
      <Gallery {...props} />
      <Story {...props} />
      <Schedule {...props} />
      <EventDetails {...props} />
      <Rsvp {...props} onAnswered={onAnswered} />
      <AccessPass {...props} />
      <VideoMessage {...props} />
      <Footer {...props} onReplay={!preview && !reduced ? replay : null} />
    </div>
  )
}
