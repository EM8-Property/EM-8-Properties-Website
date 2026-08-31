/**
 * Renders a team biography, preserving its paragraph breaks.
 *
 * `bio` is a plain text field, so its newlines carry no meaning to HTML — a board
 * member's three-paragraph career (prior firms, transactions, degrees) collapses into one
 * unbroken wall of text if it is dropped into a single <p>. Staff bios are a single line
 * and unaffected either way.
 *
 * Blank runs are discarded rather than emitted as empty paragraphs, because an editor
 * pasting from a document reliably brings extra newlines with them.
 */
export function TeamBio({ bio }: { bio?: string | null }) {
  if (!bio) return null
  const paragraphs = bio.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  if (paragraphs.length === 0) return null

  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className="mt-2 text-xs leading-relaxed text-ink-secondary">
          {p}
        </p>
      ))}
    </>
  )
}
