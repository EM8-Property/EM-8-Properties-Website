/**
 * A team biography, collapsed behind a native disclosure.
 *
 * `<details>` rather than a client component with state: it works with no JavaScript, it
 * is keyboard-operable for free, and it keeps /about a server component. The only cost is
 * styling the marker, which is cheaper than a `useState` boundary on a page that
 * otherwise has none.
 *
 * Collapsed by default. Etamar asked for bios that appear on click, and it also shortens a
 * page that renders nine cards in one column on a phone.
 *
 * `bio` is a plain text field, so its newlines carry no meaning to HTML — a board member's
 * three-paragraph career collapses into one unbroken wall of text if it is dropped into a
 * single <p>. Blank runs are discarded rather than emitted as empty paragraphs, because an
 * editor pasting from a document reliably brings extra newlines with them.
 */
export function TeamBio({ bio, name }: { bio?: string | null; name: string }) {
  if (!bio) return null
  const paragraphs = bio.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  if (paragraphs.length === 0) return null

  return (
    <details className="mt-2">
      {/*
        The name is in the label, not just "Read bio". A screen reader announces the
        control without the card around it, so nine identical controls on one page are
        nine indistinguishable ones. But the name is appended after the visible words
        rather than replacing them, because WCAG 2.5.3 (Label in Name) requires the
        accessible name to contain the visible label — a speech-input user who sees
        "Read bio" and says "click Read bio" needs that phrase to actually be in the name.
      */}
      <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-text hover:text-ink">
        Read bio
        <span className="sr-only"> for {name}</span>
      </summary>
      {paragraphs.map((p, i) => (
        <p key={i} className="mt-2 text-xs leading-relaxed text-ink-secondary">
          {p}
        </p>
      ))}
    </details>
  )
}
