import Icon from '../ui/Icon'

/** Lecteur discret de la musique d'ambiance : <audio> en boucle + bouton flottant. */
export default function MusicButton({ url, playing, onToggle, audioRef, color = '#5e4b3c', background = '#faf7f1', border = '#c99a3e', side = 'right', bottom = 14 }) {
  if (!url) return null
  return (
    <>
      <audio ref={audioRef} src={url} loop preload="auto" />
      <button type="button" onClick={onToggle} aria-pressed={playing}
        aria-label={playing ? 'Couper la musique' : 'Lancer la musique'}
        className="fixed z-40 h-10 w-10 rounded-full flex items-center justify-center backdrop-blur-sm shadow-sm"
        style={{
          [side]: `max(14px, env(safe-area-inset-${side}, 0px))`,
          bottom: `max(${bottom}px, env(safe-area-inset-bottom, 0px))`,
          background: `${background}dd`, border: `1px solid ${border}`, color,
        }}>
        <Icon name={playing ? 'volume_up' : 'volume_off'} size={19} />
      </button>
    </>
  )
}
