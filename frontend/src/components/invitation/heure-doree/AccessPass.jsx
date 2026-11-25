import { useReveal } from './hooks'

/** Pass d'accès de l'invité (QR présenté à l'accueil) — lien personnel uniquement. */
export default function AccessPass({ config, t, reduced }) {
  const ref = useReveal(reduced)
  const { pass } = config
  if (!pass || config.event.expired) return null
  return (
    <section ref={ref} className="hd-section hd-reveal" data-testid="invitation-access">
      <p className="hd-caps hd-kicker hd-p">{t('pass.title')}</p>
      <div className="hd-pass"><div><img src={pass.qr} alt={t('pass.qr')} width="150" height="150" style={{ width: '100%', height: 'auto', display: 'block' }} /></div></div>
      <p className="hd-p" style={{ fontStyle: 'italic', marginTop: 10, color: 'var(--hd-ink-soft)' }}>{t('pass.hint')}</p>
      {(pass.name || pass.label) && <p className="hd-p">{[pass.name, pass.label].filter(Boolean).join(' · ')}</p>}
    </section>
  )
}
