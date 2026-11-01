/**
 * Photo du couple en fond de page, sous un voile ivoire : nette en haut (là
 * où l'enveloppe et le nom de l'invité laissent respirer l'image), de plus
 * en plus voilée vers le bas pour que les textes restent lisibles.
 */
export default function PhotoBackdrop({ src, ivory = '#f7f0e6', fixed = true }) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(ivory.slice(i, i + 2), 16))
  const veil = (a) => `rgba(${r},${g},${b},${a})`
  return (
    <div aria-hidden className={`${fixed ? 'fixed z-0' : 'absolute -z-10'} inset-0 pointer-events-none overflow-hidden`}>
      <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover scale-105" />
      <div className="absolute inset-0"
        style={{ background: `linear-gradient(180deg, ${veil(0.42)} 0%, ${veil(0.62)} 38%, ${veil(0.84)} 70%, ${veil(0.92)} 100%)` }} />
    </div>
  )
}
