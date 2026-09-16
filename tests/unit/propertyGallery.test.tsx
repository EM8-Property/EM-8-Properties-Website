import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PropertyGallery } from '@/components/property/PropertyGallery'

vi.mock('@/sanity/image', () => {
  const chain: Record<string, unknown> = { url: () => 'https://cdn.test/x.jpg' }
  for (const m of ['width', 'height', 'auto', 'fit', 'sharpen']) chain[m] = () => chain
  return { urlForImage: () => chain, urlForPhoto: () => chain, sourceDimensions: () => null }
})

afterEach(cleanup)

const photo = (n: number, alt?: string | null) => ({
  alt,
  asset: { _ref: `image-ref${n}-1600x1200-jpg` },
})

/*
 * The bug this component fixes is not a missing schema — it is a missing renderer.
 *
 * `property.gallery` has been an array of images since the schema was written and
 * `PROPERTY_BY_SLUG_QUERY` has always projected the whole array, but the page read
 * `gallery[0]` and nothing else. Editors could upload ten photographs of a building and
 * see exactly one, which is what Hunter reported on 2026-09-16.
 *
 * So the tests that matter are about what reaches the page, and about the overlay being a
 * real dialog rather than a div that looks like one.
 */
describe('PropertyGallery', () => {
  it('renders nothing when a property has only its hero', () => {
    // Sixteen of the eighteen properties, the day this shipped. An empty "Photographs"
    // heading on every one of them would be worse than the bug.
    const { container } = render(<PropertyGallery photos={[]} propertyTitle="Oak Forest K" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders one thumbnail per photograph', () => {
    render(<PropertyGallery photos={[photo(1), photo(2), photo(3)]} propertyTitle="Waverly" />)
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  /*
   * The page slices `gallery[0]` off before passing the array, so this component never
   * sees the hero. Pinned from the page's side in `propertyPage.test.tsx`; here we only
   * pin that the component renders exactly what it is given and invents nothing.
   */
  it('renders exactly the photographs it is handed', () => {
    const { container } = render(
      <PropertyGallery photos={[photo(1), photo(2)]} propertyTitle="Waverly" />,
    )
    // Queried by tag, not by role: a thumbnail carries alt="" and is therefore
    // `presentation`, which is the point of the test below this one.
    expect(container.querySelectorAll('img')).toHaveLength(2)
  })

  it('names each thumbnail by its alt text, because "Photo 3" is useless read aloud', () => {
    render(
      <PropertyGallery photos={[photo(1, 'The courtyard in summer')]} propertyTitle="Waverly" />,
    )
    expect(screen.getByRole('button', { name: /The courtyard in summer/ })).toBeTruthy()
  })

  it('falls back to a numbered label when alt is empty', () => {
    /*
     * The schema requires alt, but a document created before that validation landed can
     * carry an empty one and a build must not fail on a missing word.
     *
     * The grid now includes the hero, so index 0 is gallery[0] and the first fallback
     * label is "photograph 1" rather than 2.
     */
    render(<PropertyGallery photos={[photo(1, '   ')]} propertyTitle="Waverly" />)
    expect(screen.getByRole('button', { name: /Waverly, photograph 1/ })).toBeTruthy()
  })

  it('gives the thumbnail image an empty alt, so the photo is announced once not twice', () => {
    // The button already carries the description. A repeated alt makes a screen reader
    // read the same sentence twice for one control.
    const { container } = render(
      <PropertyGallery photos={[photo(1, 'The courtyard')]} propertyTitle="Waverly" />,
    )
    const thumb = container.querySelector('img')!
    expect(thumb.getAttribute('alt')).toBe('')
    // An empty alt removes it from the accessibility tree entirely, which is what stops
    // the description being read twice for one control.
    expect(screen.queryByRole('img')).toBeNull()
  })

  describe('the overlay', () => {
    it('opens on click as a modal dialog, and closes on Escape', async () => {
      const user = userEvent.setup()
      render(<PropertyGallery photos={[photo(1, 'One'), photo(2, 'Two')]} propertyTitle="W" />)

      expect(screen.queryByRole('dialog')).toBeNull()
      await user.click(screen.getByRole('button', { name: /One/ }))

      const dialog = screen.getByRole('dialog')
      // `aria-modal` is what tells assistive tech the rest of the page is inert.
      expect(dialog.getAttribute('aria-modal')).toBe('true')

      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('returns focus to the thumbnail that opened it', async () => {
      /*
       * Without this, dismissing drops focus to the top of the document and a keyboard
       * user tabs through the whole page to get back to the photograph after the one they
       * were looking at.
       */
      const user = userEvent.setup()
      render(<PropertyGallery photos={[photo(1, 'One'), photo(2, 'Two')]} propertyTitle="W" />)

      const opener = screen.getByRole('button', { name: /Two/ })
      await user.click(opener)
      await user.keyboard('{Escape}')

      expect(document.activeElement).toBe(opener)
    })

    it('walks the set with the arrow keys and wraps at both ends', async () => {
      const user = userEvent.setup()
      render(
        <PropertyGallery
          photos={[photo(1, 'One'), photo(2, 'Two'), photo(3, 'Three')]}
          propertyTitle="W"
        />,
      )
      await user.click(screen.getByRole('button', { name: /One/ }))
      const dialog = () => screen.getByRole('dialog')

      expect(within(dialog()).getByText('1 of 3')).toBeTruthy()
      await user.keyboard('{ArrowRight}')
      expect(within(dialog()).getByText('2 of 3')).toBeTruthy()

      // Backwards off the front wraps to the end rather than sticking or going negative.
      await user.keyboard('{ArrowLeft}{ArrowLeft}')
      expect(within(dialog()).getByText('3 of 3')).toBeTruthy()
      await user.keyboard('{ArrowRight}')
      expect(within(dialog()).getByText('1 of 3')).toBeTruthy()
    })

    it('shows the photograph whole rather than cropping it', async () => {
      /*
       * `object-contain`, not `object-cover`. The overlay's entire purpose is showing the
       * picture as it was taken; cropping it there would defeat the feature. These
       * photographs are not all one shape, so a fixed height would letterbox the portrait
       * ones or crop the wide ones.
       */
      const user = userEvent.setup()
      render(<PropertyGallery photos={[photo(1, 'One')]} propertyTitle="W" />)
      await user.click(screen.getByRole('button', { name: /One/ }))

      const full = within(screen.getByRole('dialog')).getByRole('img')
      expect(full.className).toMatch(/object-contain/)
      expect(full.className).not.toMatch(/object-cover/)
    })

    /*
     * The enlarged photograph must not be lazy-loaded, and this is a correctness bug rather
     * than a performance preference.
     *
     * next/image defaults to `loading="lazy"`. An unloaded image with `width: auto` inside
     * a column flex container has no intrinsic size to resolve against, so its box computes
     * to 0x0 — and a zero-area element never satisfies the lazy loader's intersection
     * check, so it never loads, so it never gains a size. Shipped on 2026-09-16 and found
     * on the deployed site: the overlay opened onto a 44px-tall dialog containing only its
     * own controls.
     *
     * It passed local checking because it only bites on a COLD load — with the file already
     * cached the intrinsic size is there on the first layout pass and the cycle never
     * forms. Every image had been warmed by earlier testing.
     */
    it('loads the enlarged photograph eagerly, or it can deadlock at 0x0', async () => {
      const user = userEvent.setup()
      render(<PropertyGallery photos={[photo(1, 'One')]} propertyTitle="W" />)
      await user.click(screen.getByRole('button', { name: /One/ }))

      const full = within(screen.getByRole('dialog')).getByRole('img')
      expect(full.getAttribute('loading')).not.toBe('lazy')
    })

    it('constrains the enlarged photograph on both axes, so it cannot overflow a phone', async () => {
      /*
       * `max-h` alone leaves the width free: a 2000px-wide photograph clamped to 720px tall
       * is still painted 960px wide, which overflows a 375px screen. The pair of maxima
       * with auto dimensions is the ordinary "contain within" shape.
       *
       * Asserted on the class string rather than by measuring, because jsdom has no layout
       * — which is also why the 0x0 deadlock above could not have been caught by rendering
       * it here, and had to be found on the deployed page.
       */
      const user = userEvent.setup()
      render(<PropertyGallery photos={[photo(1, 'One')]} propertyTitle="W" />)
      await user.click(screen.getByRole('button', { name: /One/ }))

      const classes = within(screen.getByRole('dialog')).getByRole('img').className.split(' ')
      expect(classes).toContain('max-w-full')
      expect(classes).toContain('max-h-[80svh]')
      expect(classes).toContain('h-auto')
      expect(classes).toContain('w-auto')
      // No definite height: several of these sources are barely 1080px wide, and a fixed
      // height would upscale them in the one place meant to show the picture as it is.
      const definite = classes.filter((c) => {
        if (!c.startsWith('h-[')) return false
        const d = c.charAt(3)
        return d >= '0' && d <= '9'
      })
      expect(definite).toEqual([])
    })

    it('gives the enlarged photograph real alt text', async () => {
      // The thumbnail's alt is empty because its button is labelled. The overlay image is
      // the content, so here the alt has to carry the description.
      const user = userEvent.setup()
      render(<PropertyGallery photos={[photo(1, 'The courtyard')]} propertyTitle="W" />)
      await user.click(screen.getByRole('button', { name: /The courtyard/ }))

      expect(within(screen.getByRole('dialog')).getByRole('img').getAttribute('alt')).toBe(
        'The courtyard',
      )
    })

    it('omits the arrows for a single photograph', async () => {
      const user = userEvent.setup()
      render(<PropertyGallery photos={[photo(1, 'Only')]} propertyTitle="W" />)
      await user.click(screen.getByRole('button', { name: /Only/ }))

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).queryByRole('button', { name: /Next photograph/ })).toBeNull()
      expect(within(dialog).queryByRole('button', { name: /Previous photograph/ })).toBeNull()
      expect(within(dialog).getByRole('button', { name: /Close/ })).toBeTruthy()
    })

    it('locks the page behind it and restores the previous overflow', async () => {
      /*
       * Restoring the PREVIOUS value rather than clearing it, so this cannot stomp on an
       * overflow set by anything else — the same bug `InvestorPopup` documents.
       */
      const user = userEvent.setup()
      document.body.style.overflow = 'scroll'
      render(<PropertyGallery photos={[photo(1, 'One')]} propertyTitle="W" />)

      await user.click(screen.getByRole('button', { name: /One/ }))
      expect(document.body.style.overflow).toBe('hidden')

      await user.keyboard('{Escape}')
      expect(document.body.style.overflow).toBe('scroll')
      document.body.style.overflow = ''
    })
  })
})
