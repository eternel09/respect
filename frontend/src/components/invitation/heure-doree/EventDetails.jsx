import { fmtDate, fmtTime, icsDataUrl, pick } from './config'
import { useReveal } from './hooks'

const CalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <rect x="3.5" y="5" width="17" height="15" rx="1.5" /><path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
)
const PinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <path d="M12 21s-6.5-6.1-6.5-11a6.5 6.5 0 0 1 13 0C18.5 14.9 12 21 12 21z" /><circle cx="12" cy="10" r="2.4" />
  </svg>
)

/** Détails : dans un grand cadre baroque en arche, sous un lustre en cristal qui se balance. */
export default function EventDetails({ config, t, lang, reduced }) {
  const ref = useReveal(reduced)
  const { event, assets } = config
  const start = fmtTime(event.start, lang), end = fmtTime(event.end, lang)
  const what = pick(event.ceremony, lang) || t('details.ceremony')
  const hours = start
    ? [t('details.at', { what, start }), end && t('details.until', { end })].filter(Boolean).join(' – ')
    : null
  const calendar = event.calendarUrl || icsDataUrl(config)
  const dress = event.dress && (pick(event.dress.title, lang) || pick(event.dress.text, lang)) ? event.dress : null
  return (
    <section className="hd-section" aria-labelledby="hd-details-title" style={{ paddingTop: 72 }}>
      <div className="hd-frame">
        <img className="hd-frame-arch" src={assets.frameArch} alt="" aria-hidden loading="lazy" width="1000" height="330" />
        <div className="hd-chandelier" aria-hidden><img src={assets.chandelier} alt="" loading="lazy" width="360" height="300" /></div>
        <div className="hd-frame-body">
        <div ref={ref} className="hd-reveal">
          <p className="hd-caps hd-kicker hd-p" style={{ fontSize: 11.5 }}>{t('details.kicker')}</p>
          <h2 id="hd-details-title" className="hd-script hd-h2" style={{ fontSize: 46 }}>{t('details.title')}</h2>
          <p className="hd-p" style={{ fontSize: 19, marginTop: 8 }}>{fmtDate(event.date, lang, true)}</p>
          {hours && <p className="hd-p" style={{ fontSize: 16.5, color: 'var(--hd-ink-soft)' }}>{hours}</p>}
          {event.venue && <p className="hd-script hd-venue">{pick(event.venue, lang)}</p>}
          {event.address && <p className="hd-p" style={{ fontSize: 16, color: 'var(--hd-ink-soft)' }}>{pick(event.address, lang)}</p>}
          <div className="hd-btns">
            {calendar && (
              <a className="hd-btn hd-btn-outline" href={calendar} download={event.calendarUrl ? undefined : 'invitation.ics'}>
                <CalIcon /> {t('details.calendar')}
              </a>
            )}
            {event.mapsUrl && (
              <a className="hd-btn hd-btn-outline" href={event.mapsUrl} target="_blank" rel="noreferrer"><PinIcon /> {t('details.directions')}</a>
            )}
          </div>
          {dress && (
            <div style={{ marginTop: 26, paddingTop: 18, borderTop: '1px solid rgba(201,165,92,.45)' }}>
              <p className="hd-caps hd-kicker hd-p" style={{ fontSize: 11.5 }}>{t('details.dress')}</p>
              {dress.title && <p className="hd-script hd-p" style={{ fontSize: 32 }}>{pick(dress.title, lang)}</p>}
              {dress.text && <p className="hd-p" style={{ fontSize: 16, whiteSpace: 'pre-line' }}>{pick(dress.text, lang)}</p>}
            </div>
          )}
        </div>
          <img className="hd-frame-corner l" src={assets.frameCorner} alt="" aria-hidden loading="lazy" />
          <img className="hd-frame-corner r" src={assets.frameCorner} alt="" aria-hidden loading="lazy" />
        </div>
      </div>
    </section>
  )
}
