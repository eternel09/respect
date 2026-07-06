/**
 * Pagination commune des tableaux : « x sur y » + fenêtre de 5 pages glissante
 * autour de la page courante. Masquée s'il n'y a qu'une page.
 */
export default function Pagination({ meta, page, onChange, count, label = 'élément(s)' }) {
  if (!meta || !meta.last_page || meta.last_page <= 1) return null

  const total = meta.last_page
  const start = Math.max(1, Math.min(page - 2, total - 4))
  const nums = Array.from({ length: Math.min(5, total) }, (_, i) => start + i)

  return (
    <div className="px-5 py-4 border-t border-black/5 flex flex-col sm:flex-row items-center gap-3 sm:justify-between text-sm text-gray-500">
      <p>{count} sur {meta.total} {label}</p>
      <div className="flex gap-1">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-sand"
        >‹</button>
        {nums.map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-8 h-8 rounded-lg border text-xs transition-colors ${
              page === n ? 'bg-brand text-white border-brand' : 'border-gray-200 hover:bg-sand'
            }`}
          >{n}</button>
        ))}
        <button
          onClick={() => onChange(Math.min(total, page + 1))}
          disabled={page === total}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-sand"
        >›</button>
      </div>
    </div>
  )
}
