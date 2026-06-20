export default function Button({ children, loading, variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-medium text-sm transition disabled:opacity-60 disabled:cursor-not-allowed'
  const variants = {
    primary:   'bg-brand text-white hover:bg-brand-dark shadow-sm shadow-brand/20',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger:    'bg-red-600 text-white hover:bg-red-700',
    outline:   'border border-brand text-brand hover:bg-brand/5',
  }

  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : null}
      {children}
    </button>
  )
}
