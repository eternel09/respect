import { pick } from './config'
import { useReveal } from './hooks'

/** « Déroulé de la journée » : fine ligne dorée, points dorés, heure / titre / description. */
export default function Schedule({ config, t, lang, reduced }) {
  const head = useReveal(reduced)
  const list = useReveal(reduced)
  if (!config.schedule.length) return null
  return (
    <section className="hd-section" aria-labelledby="hd-schedule-title">
      <div ref={head} className="hd-reveal">
        <p className="hd-caps hd-kicker hd-p">{t('schedule.kicker')}</p>
        <h2 id="hd-schedule-title" className="hd-script hd-h2">{pick(config.texts.scheduleTitle, lang) || t('schedule.title')}</h2>
      </div>
      <ol ref={list} className="hd-timeline hd-reveal">
        {config.schedule.map((s, i) => (
          <li key={i}>
            {s.time && <p className="hd-caps hd-time hd-p">{pick(s.time, lang)}</p>}
            <h3 className="hd-script hd-moment">{pick(s.title, lang)}</h3>
            {s.text && <p className="hd-moment-text">{pick(s.text, lang)}</p>}
          </li>
        ))}
      </ol>
    </section>
  )
}
