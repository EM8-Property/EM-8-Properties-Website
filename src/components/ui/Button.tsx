import Link from 'next/link'

export function Button({
  href,
  variant = 'primary',
  children,
}: {
  href: string
  variant?: 'primary' | 'secondary' | 'onPhoto'
  children: React.ReactNode
}) {
  const base =
    'inline-block rounded-control px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide'
  /*
   * Ink on the accent teal, not white.
   *
   * Spec §2.3 permits teal as a fill behind white text and restricts only teal *text*
   * below 24px — but measured, white on #4ABDB5 is 2.27:1, worse than the accent-teal-
   * text case the spec does forbid, and Lighthouse fails the site's accessibility score
   * on it. It affects every primary call to action: View Portfolio, every form submit,
   * Enter the deal room.
   *
   * #1A1A1A on #4ABDB5 is 7.66:1 and keeps the exact accent colour the spec specifies —
   * only the text colour changes, so the palette is untouched. Confirmed with Hunter
   * 2026-08-30 as a deliberate departure from the spec's wording.
   */
  /*
   * `onPhoto` is the secondary button on the homepage hero, where the ground is a
   * photograph rather than white. `border-rule` and `text-ink` are both near-invisible
   * against a dark scrim, so it takes white on both — the primary variant is unchanged,
   * since ink on the accent teal reads on any ground.
   */
  const style =
    variant === 'primary'
      ? 'bg-teal text-ink hover:bg-[#3AA8A0]'
      : variant === 'onPhoto'
        ? 'border border-white/70 text-white hover:border-white hover:bg-white/10'
        : 'border border-rule text-ink hover:border-teal'
  return (
    <Link href={href} className={`${base} ${style}`}>
      {children}
    </Link>
  )
}
