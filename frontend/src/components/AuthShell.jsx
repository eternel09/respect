import { useState } from 'react'
import { motion } from 'motion/react'
import logoFull from '../assets/logo-full.png'
import Icon from './ui/Icon'
import { authInputCls } from '../lib/passwordForm'

/** Cadre des écrans de compte (mot de passe oublié, réinitialisation, changement). */
export default function AuthShell({ icon, title, subtitle, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-6">
      <motion.div
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[420px]"
      >
        <img src={logoFull} alt="Signiq" className="h-9 w-auto mb-8" />
        <div className="bg-white rounded-3xl ring-1 ring-black/5 shadow-sm p-7">
          {icon && (
            <span className="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-4">
              <Icon name={icon} size={22} />
            </span>
          )}
          <h1 className="font-display text-[1.6rem] leading-tight font-medium text-gray-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-gray-500 text-sm mt-1.5 mb-6">{subtitle}</p>}
          {children}
        </div>
      </motion.div>
    </div>
  )
}

/** Champ mot de passe avec bouton afficher / masquer. */
export function PasswordInput({ id, label, value, onChange, error, autoComplete = 'new-password', autoFocus }) {
  const [shown, setShown] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-gray-700 mb-1.5">{label}</label>
      <span className="relative block">
        <input
          id={id} type={shown ? 'text' : 'password'} required value={value}
          autoComplete={autoComplete} autoFocus={autoFocus}
          onChange={e => onChange(e.target.value)}
          aria-invalid={error ? 'true' : undefined}
          className={`${authInputCls} pr-12`}
        />
        <button
          type="button" onClick={() => setShown(v => !v)}
          aria-label={shown ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100"
        >
          <Icon name={shown ? 'visibility_off' : 'visibility'} size={20} />
        </button>
      </span>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
