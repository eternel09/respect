import { useEffect, useRef, useState } from 'react'
import { LANG_NAMES } from './i18n'

/** Bouton rond (haut droite) : FR / EN / Lingala. */
export default function LanguageSwitch({ lang, languages, onChange, t }) {
  const [open, setOpen] = useState(false)
  const menu = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!menu.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', esc)
    menu.current?.querySelector('[aria-checked="true"]')?.focus()
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  if (languages.length < 2) return null
  return (
    <div ref={menu}>
      <button type="button" className="hd-fab hd-fab-lang" onClick={() => setOpen(o => !o)}
        aria-haspopup="menu" aria-expanded={open} aria-label={t('lang.label')} title={t('lang.label')}>
        {lang.toUpperCase()}
      </button>
      {open && (
        <ul className="hd-lang-menu" role="menu">
          {languages.map(l => (
            <li key={l}>
              <button type="button" role="menuitemradio" aria-checked={l === lang} lang={l}
                onClick={() => { onChange(l); setOpen(false) }}>
                {LANG_NAMES[l]} <small>{l.toUpperCase()}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
