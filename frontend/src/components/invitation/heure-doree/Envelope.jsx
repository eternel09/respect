import { useEffect, useState } from 'react'
import WaxSeal from './WaxSeal'

const HALVES = [
  ['l', 'polygon(0 0, 54% 0, 45% 24%, 57% 46%, 44% 70%, 53% 100%, 0 100%)'],
  ['r', 'polygon(54% 0, 100% 0, 100% 100%, 53% 100%, 44% 70%, 57% 46%, 45% 24%)'],
]

/**
 * Enveloppe d'ouverture (plein écran). Au toucher du sceau : il se fissure en
 * deux, le rabat pivote en 3D (0,8 s), la carte glisse vers le haut, puis
 * fondu vers l'invitation. `onOpen` est appelé dans le geste (déblocage audio).
 */
export default function Envelope({ config, t, lang, reduced, onOpen, onDone }) {
  const [started, setStarted] = useState(false)
  const [stage, setStage] = useState('sealed') // sealed → opening → flap-back → gone
  const { couple, assets } = config
  const names = [couple.groom, couple.bride].filter(Boolean)

  useEffect(() => {
    if (!started) return
    if (reduced) { onDone(); return }
    const timers = [
      setTimeout(() => setStage('flap-back'), 700),
      setTimeout(() => setStage('gone'), 2100),
      setTimeout(onDone, 2700),
    ]
    return () => timers.forEach(clearTimeout)
  }, [started, reduced, onDone])

  const open = () => {
    if (started) return
    onOpen?.()
    setStarted(true)
    setStage('opening')
  }

  const cls = ['hd-env', stage !== 'sealed' && 'is-opening', (stage === 'flap-back' || stage === 'gone') && 'is-flap-back', stage === 'gone' && 'is-gone']
    .filter(Boolean).join(' ')

  return (
    <section className={cls} data-testid="heure-doree-intro" lang={lang}>
      <div className="hd-env-inner">
        <img className="hd-env-floral" src={assets.envelopeFloralTop} alt="" aria-hidden
          style={{ width: '58%', right: '-18%', top: '-6%', transform: 'rotate(198deg)' }} />

        <div className="hd-env-obj">
          <div className="hd-env-back" />
          {/* Carte qui sort de l'enveloppe */}
          <div className="hd-env-card" aria-hidden>
            <WaxSeal letters={couple.monogram} size={44} />
            <p className="hd-caps hd-kicker" style={{ marginTop: 10, fontSize: 9.5 }}>{t('envelope.union')}</p>
            <p className="hd-script hd-gold" style={{ fontSize: 34, margin: '2px 0 0', display: 'inline-block' }}>{names.join(' & ') || config.title}</p>
          </div>
          <div className="hd-env-front" aria-hidden><i className="l" /><i className="r" /><i className="b" /></div>
          <div className="hd-env-flap" aria-hidden><div /><div /></div>
          {/* Pli du rabat et des côtés (ombre portée), masqué à l'ouverture */}
          <svg className="hd-env-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <defs><filter id="hd-env-blur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.1" /></filter></defs>
            <polyline points="0,1 50,64 100,1" fill="none" stroke="rgba(110,85,40,.32)" strokeWidth="2.4" filter="url(#hd-env-blur)" vectorEffect="non-scaling-stroke" />
            <polyline points="0,0 50,62 100,0" fill="none" stroke="rgba(120,95,50,.38)" strokeWidth=".8" vectorEffect="non-scaling-stroke" />
            <line x1="0" y1="100" x2="35" y2="63" stroke="rgba(120,95,50,.22)" strokeWidth=".8" vectorEffect="non-scaling-stroke" />
            <line x1="100" y1="100" x2="65" y2="63" stroke="rgba(120,95,50,.22)" strokeWidth=".8" vectorEffect="non-scaling-stroke" />
          </svg>
          <button type="button" className="hd-env-seal" onClick={open} disabled={stage !== 'sealed'}
            aria-label={t('envelope.open')} data-testid="heure-doree-seal">
            <span className="hd-seal-pulse" style={{ position: 'relative', width: 92, height: 92 }}>
              {HALVES.map(([side, clip]) => (
                <span key={side} className={`hd-seal-half ${side}`} style={{ position: 'absolute', inset: 0, clipPath: clip }}>
                  <WaxSeal letters={couple.monogram} size={92} className="flat" />
                </span>
              ))}
              {!reduced && <span className="hd-seal-shine" />}
            </span>
          </button>
        </div>

        <img className="hd-env-floral" src={assets.envelopeFloralBottom} alt="" aria-hidden
          style={{ width: '40%', left: '-22%', bottom: '-19%', transform: 'rotate(26deg)' }} />

        <div className="hd-env-text">
          <p className="hd-caps" style={{ fontSize: 11 }}>{t('envelope.kicker')}</p>
          <p className="hd-script" style={{ fontSize: 30, margin: '2px 0' }}>{t('envelope.union')}</p>
          <p className="hd-caps" style={{ fontSize: 12 }}>{names.join(' & ') || config.title}</p>
          <p className="hd-caps" style={{ fontSize: 10.5, marginTop: 18, opacity: .85 }}>{t('envelope.touch')}</p>
        </div>
      </div>
    </section>
  )
}
