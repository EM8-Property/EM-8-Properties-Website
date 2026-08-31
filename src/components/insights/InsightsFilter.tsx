'use client'

import { useMemo, useState } from 'react'
import { PostCard, formatCategory, type PostData } from './PostCard'

/**
 * Category filter over the single insights feed (spec §3).
 *
 * One feed, filtered — not separate archives per category. Announcements and essays sit
 * together because the feed is the mechanism behind "reputation brings capital to us",
 * and splitting it would halve the reason to keep reading.
 */
export function InsightsFilter({ posts }: { posts: PostData[] }) {
  const [category, setCategory] = useState<string | null>(null)

  const categories = useMemo(
    () =>
      [...new Set(posts.map((p) => p.category).filter((c): c is string => !!c))].sort(),
    [posts],
  )

  const visible = useMemo(
    () => (category === null ? posts : posts.filter((p) => p.category === category)),
    [posts, category],
  )

  const button = (isActive: boolean) =>
    [
      'rounded-chip border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]',
      isActive
        ? 'border-teal-text bg-teal-text text-white'
        : 'border-rule text-ink-secondary hover:border-teal hover:text-ink',
    ].join(' ')

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-y border-rule py-4">
        <button
          type="button"
          aria-pressed={category === null}
          onClick={() => setCategory(null)}
          className={button(category === null)}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(category === c ? null : c)}
            className={button(category === c)}
          >
            {formatCategory(c)}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-secondary">
          Nothing published in that category yet.
        </p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <PostCard key={p.slug} post={p} />
          ))}
        </div>
      )}
    </div>
  )
}
