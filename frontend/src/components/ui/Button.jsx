export default function Button({ children, loading, variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium text-sm transition disabled:opacity-60 disabled:cursor-not-allowed'
  const variants = {
    primary:   'bg-violet-600 text-white hover:bg-violet-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger:    'bg-red-600 text-white hover:bg-red-700',
    outline:   'border border-violet-600 text-violet-600 hover:bg-violet-50',
  }

  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : null}
      {children}
    </button>
  )
}
