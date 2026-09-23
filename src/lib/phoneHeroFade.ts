import type { CSSProperties } from 'react'

/**
 * The homepage's phone hero veil, editable in the Studio under Home page → Phone hero fade.
 *
 * The values arrive as two CSS custom properties on the scrim, which the
 * `bg-hero-phone-veil` utility in `globals.css` reads. A class per value would not work:
 * Tailwind only generates classes it can find written out in source, and these are
 * whatever an editor typed.
 *
 * The Studio validates the ranges, but `validation` binds the Studio only (see
 * `docs/deploys-and-migrations.md`, "required() is a lie"), so they are clamped here as
 * well. Anything missing or unusable falls back to what Hunter chose on 2026-09-22.
 */
export const PHONE_HERO_FADE_DEFAULTS = { veil: 40, fadeStart: 5 } as const

export type PhoneHeroFade = { veil?: number | null; fadeStart?: number | null } | null | undefined

const clamp = (value: number | null | undefined, min: number, max: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback

export function phoneHeroFadeStyle(fade: PhoneHeroFade): CSSProperties {
  const veil = clamp(fade?.veil, 0, 80, PHONE_HERO_FADE_DEFAULTS.veil)
  const fadeStart = clamp(fade?.fadeStart, 0, 60, PHONE_HERO_FADE_DEFAULTS.fadeStart)
  return { '--hero-veil': `${veil}%`, '--hero-fade': `${fadeStart}%` } as CSSProperties
}
