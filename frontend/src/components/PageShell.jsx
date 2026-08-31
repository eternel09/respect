import { motion } from 'motion/react'

/**
 * Conteneur de page admin : padding responsive, en-tête optionnel
 * (titre + sous-titre + actions) et animation d'entrée cohérente.
 */
export default function PageShell({ title, subtitle, actions, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="p-4 sm:p-6 lg:p-8"
    >
      {(title || actions) && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            {title && <h1 className="font-display text-[1.7rem] sm:text-[2rem] leading-tight font-medium text-gray-900 tracking-tight">{title}</h1>}
            {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </motion.div>
  )
}
