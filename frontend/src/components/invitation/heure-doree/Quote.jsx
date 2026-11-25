import { pick } from './config'
import { useReveal } from './hooks'

/** Citation centrée, entre deux filets dorés. */
export default function Quote({ config, t, lang, reduced }) {
  const ref = useReveal(reduced)
  const quote = pick(config.texts.quote, lang) || t('quote.default')
  const by = pick(config.texts.quoteBy, lang)
  return (
    <section ref={ref} className="hd-section hd-reveal" style={{ paddingTop: 56 }}>
      <img className="hd-ornament-img" src={config.assets.divider} alt="" aria-hidden width="220" height="18" loading="lazy" />
      <blockquote className="hd-script" style={{ fontSize: 34, lineHeight: 1.25, margin: '10px 4px', whiteSpace: 'pre-line' }}>{quote}</blockquote>
      {by && <p className="hd-caps hd-kicker" style={{ fontSize: 11 }}>{by}</p>}
      <img className="hd-ornament-img" src={config.assets.divider} alt="" aria-hidden width="220" height="18" loading="lazy" style={{ transform: 'scaleY(-1)' }} />
    </section>
  )
}
