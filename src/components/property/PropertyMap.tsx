'use client'

// Static import. The original plan did `await import('leaflet/dist/leaflet.css')` inside
// useEffect — a dynamic import of a stylesheet is not a supported bundler path, so the
// map would render unstyled (tiles stacked in a column, controls adrift) with no error.
// CSS imports in client components are handled at build time; this is the correct form.
import 'leaflet/dist/leaflet.css'

import { useEffect, useRef } from 'react'

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
        color: '#2C7A74',
        fillColor: '#4ABDB5',
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
      className="h-64 w-full rounded-card border border-rule"
    />
  )
}
