import { pick } from './config'
import { useReveal } from './hooks'

/** « Notre histoire » : rideaux dorés comme une scène de théâtre, qui s'écartent à l'entrée. */
export default function Story({ config, t, lang, reduced }) {
  const stage = useReveal(reduced)
  const list = useReveal(reduced)
  if (!config.story.length) return null
  return (
    <section ref={stage} className="hd-story" aria-labelledby="hd-story-title" data-testid="heure-doree-story">
      <div className="hd-curtain l" aria-hidden><img src={config.assets.curtainLeft} alt="" loading="lazy" /></div>
      <div className="hd-curtain r" aria-hidden><img src={config.assets.curtainRight} alt="" loading="lazy" /></div>
      <div className="hd-story-stage">
        <h2 id="hd-story-title" className="hd-script hd-h2" style={{ marginTop: 6, position: 'relative', zIndex: 3, textShadow: '0 0 14px var(--hd-ivory), 0 0 4px var(--hd-ivory)' }}>{pick(config.texts.storyTitle, lang) || t('story.title')}</h2>
        <ol ref={list} className="hd-steps hd-reveal">
          {config.story.map((s, i) => (
            <li key={i}>
              {s.year && <p className="hd-caps hd-kicker hd-p">{pick(s.year, lang)}</p>}
              <h3 className="hd-script hd-step-title">{pick(s.title, lang)}</h3>
              {s.text && <p className="hd-step-text">{pick(s.text, lang)}</p>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
