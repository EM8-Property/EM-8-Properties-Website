export function SiteFooter({ disclaimer }: { disclaimer: string }) {
  return (
    <footer className="mt-16 border-t border-rule bg-panel">
      <div className="mx-auto max-w-[1200px] px-6 py-10">
        {/*
          The disclaimer is required content in Sanity, not a hardcoded string. It is the
          securities language that has to be reviewable and editable without a deploy.
        */}
        <p className="max-w-4xl text-[10px] leading-relaxed text-ink-secondary">{disclaimer}</p>
        <p className="mt-6 text-[10px] text-ink-secondary">
          © {new Date().getFullYear()} EM8 Properties. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
