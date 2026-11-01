/**
 * Le carton du client (image téléversée, ou modèle PDF composé au nom de
 * l'invité) à la place de la carte Signiq. Dans l'enveloppe, on en montre le
 * haut au format carte ; une fois sorti, le carton entier à ses proportions.
 */
export default function CartonCard({ src, ratio, full, theme: t, onError }) {
  return (
    <div className="relative w-full overflow-hidden rounded-[10px] select-none"
      style={{
        aspectRatio: full && ratio ? String(ratio) : '1.586 / 1',
        background: `linear-gradient(160deg, ${t.light}, ${t.main})`,
        boxShadow: '0 18px 40px -12px rgba(60,10,20,.45), 0 4px 10px rgba(60,10,20,.2)',
      }}>
      <img src={src} alt="Votre carton d'invitation" draggable={false} onError={onError}
        className="absolute inset-0 w-full h-full object-cover object-top" />
      {/* Reflet discret, comme sur la carte Signiq */}
      <span aria-hidden className="absolute inset-0 inv-holo opacity-60 pointer-events-none" />
    </div>
  )
}
