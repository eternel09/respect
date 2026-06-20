export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-6 ${className}`}>
      {children}
    </div>
  )
}
