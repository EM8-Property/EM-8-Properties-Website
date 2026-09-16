'use client'

// Static import. The original plan did `await import('leaflet/dist/leaflet.css')` inside
// useEffect — a dynamic import of a stylesheet is not a supported bundler path, so the
// map would render unstyled (tiles stacked in a column, controls adrift) with no error.
// CSS imports in client components are handled at build time; this is the correct form.
import 'leaflet/dist/leaflet.css'

import { useEffect, useRef } from 'react'
import { palette } from '@/lib/tokens'

export function PropertyMap({
  lat,
  lng,
  title,
}: {
  lat: number
  lng: number
  title: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    let map: import('leaflet').Map | undefined

    void (async () => {
      // Leaflet touches `window` at module scope, so it is loaded here rather than
      // imported at the top — this effect only ever runs in the browser.
      const L = await import('leaflet')
      if (cancelled || !containerRef.current) return

      map = L.map(containerRef.current, {
        // Without this the map swallows page scroll when the cursor passes over it,
        // which strands a reader halfway down a property page.
        scrollWheelZoom: false,
      }).setView([lat, lng], 15)

      // OpenStreetMap tiles, desaturated in CSS to the light institutional treatment.
      //
      // CARTO's light_all basemap was the original choice, and it still returns HTTP 200
      // — but the PNGs now come back stamped "KEY REQUIRED" across every tile, which is
      // invisible to any status-code check and only shows up by looking at the map. OSM
      // serves unwatermarked without a key or an account, and the filter below gets it to
      // the same muted register rather than the default saturated OSM look.
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        className: 'em8-basemap',
      }).addTo(map)

      // A vector marker in brand teal rather than Leaflet's default pin. The default
      // resolves its icon from image files by relative URL, which bundlers rewrite —
      // the well-known result is a broken-image icon on the map. Drawing the marker
      // avoids the asset entirely and matches the palette.
      L.circleMarker([lat, lng], {
        radius: 8,
        weight: 2,
        // From tokens rather than literals: Leaflet draws its vectors through a JS API,
        // so these cannot be Tailwind classes and would otherwise be the one pair of
        // colours a token swap silently misses.
        color: palette.tealText,
        fillColor: palette.teal,
        fillOpacity: 0.9,
      })
        .addTo(map)
        .bindPopup(title)
    })()

    return () => {
      cancelled = true
      map?.remove()
    }
  }, [lat, lng, title])

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`Map showing the location of ${title}`}
      /*
        `isolate` is load-bearing, and it is not a styling choice.

        Leaflet assigns its own z-indexes inside this container and they are large: 400 on
        the tile and overlay panes, 600 on markers, 700 on tooltips, 800 on `.leaflet-control`
        and 1000 on `.leaflet-top` / `.leaflet-bottom`. Nothing scopes them. Without a
        stacking context here those numbers compete in the ROOT context against this site's
        own layers, which top out at `z-50` — so the map painted straight through anything
        overlaying it.

        Hunter hit this on 2026-09-16: opening a photograph in `PropertyGallery` showed the
        Glen Ellyn street map sitting on top of the picture, zoom controls and all. The
        overlay is `fixed inset-0 z-50`; the map's controls are 1000.

        **It was never only the gallery.** `InvestorPopup` is also `z-50` and `fixed
        inset-0`, so on any property page with coordinates the map would have punched
        through that too — it just fires on a delay and had not been seen against a map yet.
        Fixing it here rather than by raising the overlay is what covers both, and whatever
        is overlaid next.

        `isolation: isolate` forces a new stacking context, so every Leaflet z-index above
        becomes relative to this div. The div itself stays at `z-index: auto` in normal
        flow, which any positioned `z-50` element paints above. Raising the overlays to
        `z-[1001]` instead would work today and lose to the next library that picks a bigger
        number.
      */
      className="isolate h-64 w-full rounded-card border border-rule"
    />
  )
}
