import Link from 'next/link'

export function Button({
  href,
  variant = 'primary',
  children,
}: {
  href: string
  variant?: 'primary' | 'secondary'
  children: React.ReactNode
}) {
  const base =
    'inline-block rounded-control px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide'
  // Teal as a solid fill behind white text, which is what the accent is for — the
  // contrast rule applies to teal *text*, not to teal grounds.
  const style =
    variant === 'primary'
      ? 'bg-teal text-white hover:bg-[#3AA8A0]'
      : 'border border-rule text-ink hover:border-teal'
  return (
    <Link href={href} className={`${base} ${style}`}>
      {children}
    </Link>
  )
}
