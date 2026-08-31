export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`overflow-hidden rounded-card border border-rule bg-ground ${className}`}>
      {children}
    </div>
  )
}
