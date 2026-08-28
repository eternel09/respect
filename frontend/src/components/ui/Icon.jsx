/**
 * Icône Material Symbols (Rounded). La police est chargée dans index.html.
 * Usage : <Icon name="dashboard" /> · <Icon name="check" size={16} fill={1} />
 */
export default function Icon({ name, size = 20, fill = 0, weight = 500, grade = 0, className = '', style }) {
  return (
    <span
      aria-hidden
      className={`material-symbols-rounded ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${size}`,
        ...style,
      }}
    >
      {name}
    </span>
  )
}
