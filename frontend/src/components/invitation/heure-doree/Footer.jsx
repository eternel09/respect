import { pick } from './config'
import WaxSeal from './WaxSeal'

/** Pied de page : monogramme, mot d'amour, mention de l'application. */
export default function Footer({ config, t, lang, onReplay }) {
  const names = [config.couple.groom, config.couple.bride].filter(Boolean).join(' & ') || config.title
  return (
    <footer className="hd-footer">
      <WaxSeal letters={config.couple.monogram} size={64} />
      {pick(config.texts.closing, lang) && <p className="hd-p" style={{ fontStyle: 'italic', maxWidth: 330, whiteSpace: 'pre-line' }}>{pick(config.texts.closing, lang)}</p>}
      <p className="hd-p" style={{ marginTop: 4 }}>{t('footer.love')}</p>
      <p className="hd-script hd-gold" style={{ fontSize: 40, margin: 0, display: 'inline-block' }}>{names}</p>
      {onReplay && <button type="button" className="hd-link" onClick={onReplay}>{t('footer.replay')}</button>}
      <p className="hd-caps" style={{ fontSize: 10, opacity: .6, marginTop: 6 }}>
        {config.app.url ? <a href={config.app.url} style={{ color: 'inherit' }}>{t('footer.made', { app: config.app.name })}</a> : t('footer.made', { app: config.app.name })}
      </p>
    </footer>
  )
}
