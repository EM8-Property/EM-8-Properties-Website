/**
 * The shape of a hero slide, and the one rule for which of them count.
 *
 * This lives in `lib` rather than beside `HeroCarousel` for a reason the build enforces:
 * `HeroCarousel` is a `'use client'` module, so everything it exports becomes a client
 * reference. `PageHero` is a server component and has to make the same judgement before it
 * decides between the photographic hero and the plain fallback — calling a function across
 * that boundary fails the build with "Attempted to call usableSlides() from the server".
 *
 * Shared rather than duplicated because if the two definitions ever drifted, `PageHero`
 * would hand `HeroCarousel` a list it then rejects: the carousel returns `null`, the page
 * loses its `<h1>` entirely, and the header carries on overlaying nothing.
 */
export type CarouselSlide = {
  image: unknown
  slug: string | null
  propertyTitle: string | null
}

/**
 * A slide whose property reference is dangling is dropped rather than rendered: a large
 * clickable photograph that goes nowhere is worse than one fewer slide.
 */
export function usableSlides(slides: CarouselSlide[]): CarouselSlide[] {
  return slides.filter((s) => s.slug)
}
