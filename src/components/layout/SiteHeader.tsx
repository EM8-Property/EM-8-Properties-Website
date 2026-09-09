'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { showsHero } from '@/lib/heroPages'
import { NAV_TREE, type NavKey, type NavLabels, type NavNode } from '@/lib/navigation'
import { NavDropdown } from '@/components/layout/NavDropdown'

/**
 * The header's own call to action: its words and its destination, both from the CMS.
 *
 * The label and the href travel together because rewording a button usually means
 * re-aiming it — "Invest With Us" and "Book a Call" do not want the same page — and
 * splitting them into two props would let one change without the other.
 */
export type HeaderCta = { label: string; href: string }

/**
 * Two rows on a phone, one from `md` up, and no hamburger anywhere.
 *
 * **Why it changed.** Etamar reviewed the live site on a phone and reported that the upper
 * bar was missing Case Studies and Insights. Both were in it — every link was one tap away
 * inside the panel — but a phone header reading `EM8 Properties · Menu` is
 * indistinguishable from a site with no navigation, so the report was accurate about what
 * he could see. Hunter's decision, 2026-09-08: the items are right as they are and they
 * have to be visible on mobile. Spec §5.
 *
 * **Why two rows.** The wordmark, Investor Login and the CTA already fill a 390px row
 * between them, so the nav gets its own: `basis-full md:basis-auto` on the `<nav>`, inside
 * the `flex-wrap` container that has always been here. Nothing about the desktop layout
 * changes — from `md` it is the single row it has always been.
 *
 * **What it costs, and where that is paid.** The header goes from 68px to roughly 100px on
 * a phone, and the hero reserves space for it because it sits *over* the photograph. At
 * 320px on a band page the eyebrow had 28px of clearance and nothing else, so the
 * reservation grew with the header — see `src/lib/headerReservation.ts`, where the
 * measurements are, and the 320px E2E assertion on /about, which is what proves it.
 *
 * **No hamburger — except the one small one this measurement put back.** There is nothing
 * left for the OLD hamburger to hold: the four parents are in the bar and each panel has
 * its own disclosure, so that one is gone entirely. But row one — the wordmark, Investor
 * Login and the CTA — measured 366px of content against 342px of content width at 390px
 * wide (wordmark 120px + Investor Login 107px + gap 12px + the CTA 127px), which is
 * `flex-wrap`'s exact third-row case spec §5 names: two flex children that do not fit
 * together move to their own lines, so row one became TWO rows and the header three
 * instead of two. Per §5's own fallback rule ("if EM8 PROPERTIES + Investor Login + Invest
 * With Us will not fit a row... move Investor Login alone behind a small labelled menu
 * button"), Investor Login moves behind a small button below `md`, freeing enough width
 * that the wordmark, the button and the CTA share one row again. It duplicates no
 * accessible name: the button is a `button` labelled "Investor Login" and the link
 * underneath is the only `link` by that name, in one DOM node whose class alone (not the
 * `hidden` attribute) governs whether it is showing — `${accountOpen ? 'flex' : 'hidden'}
 * ... md:flex`, so at `md` and up the link is unconditionally visible regardless of
 * `accountOpen`, exactly as it always has been. Investor Login stays reachable from the
 * footer either way.
 *
 * The nav labels come from `siteSettings.navLabels`; which nodes exist and where they point
 * comes from `src/lib/navigation.ts`. "Investor Login" is still a literal, deliberately: it
 * names a third-party product rather than carrying copy, which is the same rule stated on
 * `headerCta` in the schema and in the README.
 */
export function SiteHeader({
  agoraUrl,
  cta,
  labels,
  sections,
}: {
  agoraUrl: string
  cta: HeaderCta
  labels: NavLabels
  /**
   * Which optional sections exist, so a panel link to one that does not can be left out.
   *
   * §5: "A section whose body is absent renders nothing, and its nav entry goes with it."
   * Optional, and defaulting to present, so this component can be rendered without it —
   * the layout supplies it, and every test that does not care about the gate can omit it.
   */
  sections?: { whyEm8: boolean }
}) {
  /*
   * On the pages that open on a photograph, the header sits over it so the image runs to
   * the very top of the page. Everywhere else it stays in normal flow — overlaying a page
   * with no photo behind it would drop the header onto body copy.
   */
  const overlay = showsHero(usePathname())

  // A panel link to a section that is not on the page is worse than no link: it scrolls
  // nowhere and reports nothing. On the day this ships `whyEm8` has no body, so this is
  // the live case rather than a hypothetical.
  const hiddenKeys: NavKey[] = sections?.whyEm8 === false ? ['whyEm8'] : []

  /*
   * Below `md`, Investor Login is reachable behind this small button rather than painted
   * directly in row one — see the docblock above for the measurement that put it here.
   * `md:flex` on the link below overrides this regardless of its value, so it changes
   * nothing at `md` and up.
   */
  const [accountOpen, setAccountOpen] = useState(false)

  return (
    <header
      className={
        overlay
          ? /*
             * 0.85, not 1: the header sits over a photograph on the hero pages, and a
             * fully opaque bar would cut a hard line across it. `bg-ground/85` rather than
             * an inline rgba, so the ground token carries it.
             */
            `absolute inset-x-0 top-0 z-40 backdrop-blur-sm bg-ground/85`
          : `border-b border-rule`
      }
    >
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-y-3 px-6 py-4">
        <Link
          href="/"
          className="font-display text-lg font-bold uppercase tracking-wide text-ink"
        >
          EM8 <span className="font-light text-teal-text">Properties</span>
        </Link>

        {/*
          Row one's two actions, ordered as em-8.com orders them. They stay on the phone
          because the defect the mobile nav work closed was precisely that these two were
          unreachable there.
        */}
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {/*
            The small account button. Below `md` only — from `md` up the plain link beside
            it is always visible, so there is nothing for this to disclose there.

            No border, and smaller padding than a typical control here: row one measured
            271-289px of content at 320-390px wide against 272-342px available, so every
            pixel this button does not spend is a pixel the row does not have to find
            elsewhere. See the docblock above for the numbers.
          */}
          <button
            type="button"
            onClick={() => setAccountOpen((v) => !v)}
            aria-expanded={accountOpen}
            aria-controls="investor-login-link"
            aria-label="Investor Login"
            className="rounded-control p-1 text-ink-secondary hover:text-ink md:hidden"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill="none">
              <circle cx="8" cy="5.5" r="2.75" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M2.5 14c.9-3 3-4.5 5.5-4.5S13.1 11 14 14"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {/*
            Agora is a separate product on its own domain and handles accreditation
            verification. It opens in a new tab; rel="noopener noreferrer" keeps the opened
            page from reaching back into this one via window.opener.

            One element rather than two: `accountOpen` decides whether it shows below `md`,
            and `md:flex` overrides that unconditionally from `md` up, exactly as this link
            has always rendered there. A second, always-visible copy for the wide breakpoint
            would put two links named "Investor Login" in the tree.
          */}
          <a
            id="investor-login-link"
            href={agoraUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${accountOpen ? 'flex' : 'hidden'} rounded-control border border-rule px-3 py-1.5 text-ink hover:border-teal md:flex`}
          >
            Investor Login
          </a>
          {/*
            px-2, not px-3: the same row-one budget that shrank the account button above
            also does not have 4 more pixels a side to give this button at 320px. A small,
            deliberate change from the button's more common px-3 elsewhere, kept here rather
            than in a shared component so it does not narrow every other button on the site.
          */}
          <Link
            href={cta.href}
            className="rounded-control bg-ink px-2 py-1.5 font-semibold uppercase tracking-wide text-white"
          >
            {cta.label}
          </Link>
        </div>

        {/*
          Row two on a phone, part of row one from md up.

          `basis-full` forces the break and `md:basis-auto` releases it. Never `hidden`:
          this nav being invisible without a tap is the whole defect §5 exists to fix, and
          `mobileNav.test.tsx` asserts the class is absent for that reason.

          `order-last md:order-none` keeps it after the two actions in the source — so a
          screen reader and a keyboard reach the wordmark, then the actions, then the nav —
          while placing it visually between the wordmark and the actions on a desktop.
        */}
        <nav
          id="site-nav"
          className="order-last flex basis-full flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold uppercase tracking-wide text-ink-secondary md:order-none md:basis-auto md:text-xs md:font-medium md:normal-case md:tracking-normal"
        >
          {NAV_TREE.map((node: NavNode) =>
            node.children ? (
              <NavDropdown
                key={node.key}
                node={node}
                labels={labels}
                hiddenKeys={hiddenKeys}
              />
            ) : (
              <Link key={node.key} href={node.href!} className="hover:text-ink">
                {labels[node.key]}
              </Link>
            ),
          )}
        </nav>
      </div>
    </header>
  )
}
