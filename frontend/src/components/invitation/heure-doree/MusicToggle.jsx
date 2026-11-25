/** Bouton rond (bas droite) : musique on/off, avec une petite onde animée. */
export default function MusicToggle({ playing, onToggle, t }) {
  return (
    <button type="button" className="hd-fab hd-fab-music" onClick={onToggle} aria-pressed={playing}
      aria-label={playing ? t('music.on') : t('music.off')} title={playing ? t('music.on') : t('music.off')}>
      <span className={`hd-wave${playing ? '' : ' off'}`} aria-hidden><i /><i /><i /><i /></span>
    </button>
  )
}
