/** Sceau de cire doré au monogramme (« A & M »). */
export default function WaxSeal({ letters = [], size = 112, className = '' }) {
  return (
    <div className={`hd-seal ${className}`} style={{ width: size, height: size }} aria-hidden>
      <span style={{ fontSize: size * 0.36 }}>
        {letters.length >= 2 ? <>{letters[0]}<span style={{ fontSize: '.62em' }}>&amp;</span>{letters[1]}</> : letters[0]}
      </span>
    </div>
  )
}
