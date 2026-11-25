import { pick, fmtDate } from './config'

/** Ouverture : sur-titre, prénoms dorés, date, illustration, indicateur « Défiler ». */
export default function Hero({ config, t, lang, active, onScroll }) {
  const { couple, event, hero, assets, kind } = config
  const words = couple.groom && couple.bride ? [couple.groom, '&', couple.bride] : [config.title]
  return (
    <header className={`hd-hero${active ? ' is-active' : ''}`} data-testid="heure-doree-hero">
      <img className="hd-hero-img" src={hero.image || assets.heroIllustration} fetchPriority="high" decoding="async"
        alt={pick(hero.alt, lang) || `${words.join(' ')}`} />
      <div className="hd-hero-text">
        <p className="hd-caps hd-kicker">{pick(config.texts.kicker, lang) || t(kind === 'wedding' ? 'hero.kicker.wedding' : 'hero.kicker.event')}</p>
        <h1 className="hd-script hd-names" aria-label={words.join(' ')}>
          {words.map((w, i) => (
            <span key={i} aria-hidden className={`hd-gold${w === '&' ? ' amp' : ''}`} style={{ display: 'inline-block' }}>{w}</span>
          )).reduce((acc, el, i) => (i ? [...acc, ' ', el] : [el]), [])}
        </h1>
        <div className="hd-gold-line" style={{ width: 150, margin: '10px auto' }} aria-hidden />
        <p className="hd-caps">{fmtDate(event.date, lang)}</p>
      </div>
      <button type="button" className="hd-hero-scroll" onClick={onScroll}>
        <span className="hd-caps" style={{ fontSize: 10.5 }}>{t('hero.scroll')}</span>
        <i aria-hidden />
      </button>
    </header>
  )
}
