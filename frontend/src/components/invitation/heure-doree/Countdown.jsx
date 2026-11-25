import { eventStart, pick } from './config'
import { useNow, useReveal } from './hooks'

/** Compte à rebours JOURS / HEURES / MINUTES entre deux colonnes corinthiennes fleuries. */
export default function Countdown({ config, t, lang, reduced }) {
  const ref = useReveal(reduced)
  const now = useNow(1000)
  const target = eventStart(config.event)
  if (!target || config.event.expired) return null
  const s = Math.max(0, Math.floor((target.getTime() - now) / 1000))
  const parts = [[Math.floor(s / 86400), 'countdown.days'], [Math.floor(s / 3600) % 24, 'countdown.hours'], [Math.floor(s / 60) % 60, 'countdown.minutes']]
  return (
    <section ref={ref} className="hd-countdown hd-reveal" aria-labelledby="hd-countdown-title">
      <img className="hd-column" src={config.assets.columnLeft} alt="" aria-hidden loading="lazy" width="360" height="1400" />
      <div style={{ minWidth: 0, padding: '0 2px' }}>
        <h2 id="hd-countdown-title" className="hd-script hd-h2" style={{ fontSize: 44 }}>{t('countdown.title')}</h2>
        <p className="hd-lead" style={{ fontSize: 15.5, marginTop: 2 }}>{pick(config.texts.countdownSubtitle, lang) || t('countdown.subtitle')}</p>
        {s === 0 ? (
          <p className="hd-script hd-gold" style={{ fontSize: 34, marginTop: 16 }}>{t('countdown.today')}</p>
        ) : (
          <div className="hd-counters" role="timer" aria-label={t('countdown.label')}>
            {parts.map(([v, k]) => (
              <div key={k} className="hd-counter">
                <b>{String(v).padStart(2, '0')}</b>
                <small className="hd-caps">{t(k)}</small>
              </div>
            ))}
          </div>
        )}
      </div>
      <img className="hd-column" src={config.assets.columnRight} alt="" aria-hidden loading="lazy" width="360" height="1400" />
    </section>
  )
}
