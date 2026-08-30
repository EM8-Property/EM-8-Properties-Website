// Placeholder shell. Task 13 replaces this with the real homepage, composed from the
// components and Sanity queries built in Tasks 3–12. Deliberately carries no figures:
// no invented number may exist in the tree, even transiently (spec §9).
export default function HomePage() {
  return (
    <main className="mx-auto max-w-[1200px] px-6 py-14">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-teal-text">
        Transit-Oriented Development · Suburban Chicago
      </p>
      <h1 className="mt-4 max-w-[19ch] text-5xl font-bold leading-[1.08] tracking-tight text-ink">
        Creating communities people{' '}
        <span className="text-teal-text">choose to live in</span>.
      </h1>
    </main>
  )
}
