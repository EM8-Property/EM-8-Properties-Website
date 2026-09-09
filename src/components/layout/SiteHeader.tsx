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
 * changes — from `md` it is the single row it has always been, and `md:ms-auto md:me-5` on
 * the `<nav>` is what keeps that sentence true. Without them the container's
 * `justify-between` had three children instead of two and spread them, putting the nav in
 * the middle of the bar (measured at 1280px: nav x=436, actions x=975) where before this
 * task the nav, Investor Login and the CTA were one cluster against the right edge. The
 * auto inline-start margin gives the free space to the nav instead of splitting it, and
 * `me-5` restores the 20px that the old single `<nav>`'s own `md:gap-5` used to put
 * between `Insights` and `Investor Login`. Measured after: wordmark x=64, nav x=668 with
 * its inline end at 955, actions x=975, CTA right edge 1216 — flush with the 1200px
 * measure's inline end (1280 − 64), which is where it sat before this task.
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
 * **And the disclosed link is a popover below `md`, not an in-flow sibling.** Revealing it
 * in flow re-broke row one for the same arithmetic that put it behind a button in the
 * first place: the header grew 42px on tap (88.5→130.5px at 390px, 113→155px at 320px)
 * and drove /about's eyebrow 2.5px and 27px under the header, because the hero reserves a
 * fixed amount of space for a header whose height had just become interactive. It is
 * `absolute end-6 top-full` against the header now, so revealing it moves the header
 * height by 0px at every width. The E2E test that taps the button re-measures the
 * clearance afterwards, which the first version of it did not.
 *
 * **So are the two nav panels, for the same reason and after the same defect.** They
 * shipped `static` below `md` and cost the header 73-97px on open (88.5→186px at 390px,
 * 113→186px at 320px), taking /about's eyebrow to −58.0px and /insights' to −24.3px. They
 * are `absolute start-6 top-full` against this header now — see `NavDropdown`, which has
 * the full account. Two disclosures in this header, one pattern, and the rule they both
 * answer to is `headerReservation.ts`'s: the header's height must not depend on an
 * interaction.
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
          : /*
             * `relative` for one reason: the disclosed Investor Login link hangs off the
             * header's bottom edge below `md`, so the header has to be its containing
             * block. The overlay branch above is already `absolute` and so already is one
             * — without this the two branches would resolve `top-full` against two
             * different boxes, and the popover would land somewhere arbitrary on the
             * pages with no photograph. `position: relative` with no insets moves nothing.
             */
            `relative border-b border-rule`
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

          `md:order-3` puts this last on a desktop. Source order is wordmark, actions, nav
          — see the `<nav>` below for why, and for the order pair that yields the desktop
          reading of wordmark, nav, actions from it.

          `id` so the E2E deploy-staleness canary can anchor to the CMS-driven CTA by its
          container. It used to take the last `#site-nav a`, which was the CTA until this
          task moved the CTA out of the nav — after which the canary silently graded
          `Insights` instead and passed forever.
        */}
        <div
          id="header-actions"
          className="flex items-center gap-1.5 text-xs font-medium md:order-3"
        >
          {/*
            The small account button. Below `md` only — from `md` up the plain link beside
            it is always visible, so there is nothing for this to disclose there.

            No border, and smaller padding than a typical control here: row one measured
            271-289px of content at 320-390px wide against 272-342px available, so every
            pixel this button does not spend is a pixel the row does not have to find
            elsewhere. See the docblock above for the numbers.

            `min-h-6 min-w-6` is WCAG 2.2 SC 2.5.8's 24px minimum. `p-1` around a 14px SVG
            measured exactly 22x22px, which cleared the SC's *spacing* exception (a 24px
            circle centred on it reached only 1px past its edges and intersected no other
            target) and so was not a new conformance failure — but 22px is a comfort
            problem regardless, and the two pixels fit: measured free space in row one at
            320px was 4.6px. `inline-flex items-center justify-center` so the SVG stays
            centred in the box the minimums grow rather than sitting against one corner.
          */}
          <button
            type="button"
            onClick={() => setAccountOpen((v) => !v)}
            aria-expanded={accountOpen}
            aria-controls="investor-login-link"
            aria-label="Investor Login"
            className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-control p-1 text-ink-secondary hover:text-ink md:hidden"
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

            **Out of flow below `md`, and that is a correctness requirement rather than a
            styling choice.** As an in-flow flex sibling this link cost the header 42px the
            moment it was revealed: row one cannot hold wordmark + link + CTA at any phone
            width — that is the entire reason the disclosure exists — so showing it wrapped
            row one, the header grew 88.5px to 130.5px at 390px and 113px to 155px at
            320px, and the hero, which reserves a FIXED amount of space for the header,
            put its eyebrow 2.5px and 27px UNDERNEATH a translucent bar. Measured on
            /about, one tap into the control this fallback was added to provide.

            `absolute end-6 top-full` against the header itself makes the open state a
            popover hanging off the header's bottom edge, so revealing it changes the
            header's height by exactly 0px at every width. `end-6` rather than `end-0` to
            line its inline end up with the CTA's, which the container's `px-6` sets — and
            `end-`, never `right-`: physical-direction utilities are what a Hebrew RTL
            phase would have to rewrite, and ESLint rejects them under `src/`.

            Anchored to the header rather than to the actions box, which was the first
            attempt and looked worse than it measured: a popover hanging off row one lands
            on top of row TWO, and at 390px it covered `Portfolio` and `Insights` — hiding
            nav labels, in the task whose entire purpose is that the nav labels are
            visible. Below the header it covers the top of the photograph instead, which
            nothing depends on.

            `bg-ground` because a bordered box with no fill is unreadable over the hero
            photograph it now hangs over. `md:static md:mt-0 md:bg-transparent md:z-auto`
            returns every one of those to its previous computed value from `md` up, where
            the link is in flow and unconditionally visible and always has been.

            The E2E test `revealing Investor Login does not change the header's height` is
            what holds this: it taps the button at 320px and 375px and re-measures both the
            height and the clearance. The version of that test that shipped with the
            fallback tapped the button and then asserted only that the link had appeared,
            which is why a negative clearance was green.
          */}
          <a
            id="investor-login-link"
            href={agoraUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${accountOpen ? 'flex' : 'hidden'} absolute end-6 top-full z-50 mt-2 rounded-control border border-rule bg-ground px-3 py-1.5 text-ink shadow-sm hover:border-teal md:static md:z-auto md:mt-0 md:flex md:bg-transparent md:shadow-none`}
          >
            Investor Login
          </a>
          {/*
            px-2, not px-3: the same row-one budget that shrank the account button above
            also does not have 4 more pixels a side to give this button at 320px. A small,
            deliberate change from the button's more common px-3 elsewhere, kept here rather
            than in a shared component so it does not narrow every other button on the site.

            Scoped as `px-2 md:px-3` rather than `px-2`, because the row-one budget is a
            phone problem and this task's premise is that the desktop header does not
            change. Tailwind's `md:` variant is inert below 768px, so the desktop button
            goes back to its previous 12px of inline padding without spending one pixel of
            the 320px budget.
          */}
          <Link
            href={cta.href}
            className="rounded-control bg-ink px-2 py-1.5 font-semibold uppercase tracking-wide text-white md:px-3"
          >
            {cta.label}
          </Link>
        </div>

        {/*
          Row two on a phone, part of row one from md up.

          `basis-full` forces the break and `md:basis-auto` releases it. Never `hidden`:
          this nav being invisible without a tap is the whole defect §5 exists to fix, and
          `mobileNav.test.tsx` asserts the class is absent for that reason.

          `order-last` puts it after the two actions on a phone, which with `basis-full` is
          what makes it row two.

          `md:order-2` against the actions box's `md:order-3` is what places it between the
          wordmark and the actions on a desktop. That pair is not decorative and it is not
          interchangeable with `md:order-none`, which is what shipped first and which does
          the opposite of what its comment claimed: source order here is wordmark, actions,
          nav, so `order: 0` on all three resolves by source order to `wordmark, actions,
          nav` — measured at 1280px, the CTA at x=553 in the middle of the bar and the nav
          links at x=929 against the right edge, where before this task the CTA was at the
          far right. The wordmark's implicit `order: 0` sorts before 2 before 3, so the
          numbered pair reads wordmark, nav, actions and the CTA is at the far right again.
          Verified by measuring x-positions at 1280px, not by reading the rule.

          `md:ms-auto md:me-5` finishes that job, and the order pair alone did not. Order
          fixes the SEQUENCE; `justify-between` still spread three children across the bar
          and left the nav in the middle of it (nav x=436, actions x=975 at 1280px), where
          this task's premise is that the desktop bar is unchanged and before it the nav,
          Investor Login and the CTA were one cluster at the right. `ms-auto` hands the free
          space to the nav rather than splitting it, and `me-5` is the 20px the old single
          `<nav>`'s `md:gap-5` used to leave between `Insights` and `Investor Login`. Both
          are `md:`-only: below `md` this element is `basis-full` and there is no free space
          on its row to absorb. Logical properties, never `mr-`/`ml-`.
        */}
        <nav
          id="site-nav"
          className="order-last flex basis-full flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold uppercase tracking-wide text-ink-secondary md:order-2 md:ms-auto md:me-5 md:basis-auto md:text-xs md:font-medium md:normal-case md:tracking-normal"
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
