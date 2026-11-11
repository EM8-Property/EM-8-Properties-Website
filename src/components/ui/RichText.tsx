import { PortableText, type PortableTextComponents } from 'next-sanity'
import type { ComponentProps } from 'react'

/*
 * Tailwind's preflight strips heading sizes, list bullets and link colour, and nothing on
 * this site puts them back globally. PortableText's defaults emit bare <h2>, <ul> and <a>,
 * so a heading chosen in the Studio rendered at body size and read as one more paragraph.
 * Found on 2026-11-11: the NITA article's eight section headings were saved as h2 and
 * shipped in the HTML, but nobody could see them.
 *
 * Every Studio rich-text field renders through here, so whatever the editor offers (the
 * heading styles, bold, italic, lists, links, quotes) shows on the page.
 */
export const RICH_TEXT_COMPONENTS: PortableTextComponents = {
  block: {
    h1: ({ children }) => (
      <h2 className="pt-4 text-xl font-bold leading-snug tracking-tight text-ink">{children}</h2>
    ),
    h2: ({ children }) => (
      <h2 className="pt-4 text-xl font-bold leading-snug tracking-tight text-ink">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="pt-2 text-base font-bold leading-snug text-ink">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="pt-2 text-base font-semibold leading-snug text-ink">{children}</h4>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-s-2 border-teal-text ps-4 italic">{children}</blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc space-y-1 ps-5">{children}</ul>,
    number: ({ children }) => <ol className="list-decimal space-y-1 ps-5">{children}</ol>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    link: ({ children, value }) => {
      const href: string = value?.href ?? ''
      const external = /^https?:\/\//.test(href)
      return (
        <a
          href={href}
          className="text-teal-text underline underline-offset-2 hover:no-underline"
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {children}
        </a>
      )
    },
  },
}

/** Sanity rich text with the site's styling for headings, bold, lists and links. */
export function RichText({ value }: { value: ComponentProps<typeof PortableText>['value'] }) {
  return <PortableText value={value} components={RICH_TEXT_COMPONENTS} />
}
