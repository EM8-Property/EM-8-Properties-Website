/**
 * The realized track record, from "EM8 Transacted Assets as of August 2026".
 *
 * GENERATED, not typed. Every figure here was read out of Hunter's spreadsheet by
 * scripts/dev/gen-track-record.mjs rather than copied by hand, because eleven deals times
 * five figures is fifty-five chances to fat-finger a number that a reader would take for a
 * measurement. Regenerate rather than edit if the sheet changes.
 *
 * ## What is deliberately not here
 *
 * The sheet also carries total equity, total project cost, purchase price, closing costs,
 * net exit proceeds to LPs, LTM NOI and realized cap rate. None of them are in this file.
 * LP capital and operating margins are not marketing copy, and tests/unit/contentSource
 * .test.ts already refuses lender names, debt balances and promote for the same reason —
 * it is extended to cover these.
 *
 * ## Gross, not net
 *
 * `grossIrr` is before fees and promote. The sheet has a Net IRR to LPs for two of the
 * eleven deals only; Hunter's decision of 2026-09-15 was one basis across all of them, so
 * gross it is, named for its basis and labelled that way on the page. Burbank is 51.7%
 * gross against 42.5% net, which is the size of the gap this naming exists to prevent
 * anyone forgetting.
 */

/** New `property` documents. Written with createIfNotExists — never clobbers a live edit. */
export const TRACK_RECORD_NEW = [
  {
    "_id": "property-worth-apartments",
    "_type": "property",
    "title": "Worth Apartments",
    "slug": {
      "_type": "slug",
      "current": "worth-apartments"
    },
    "assetClass": "multifamily",
    "status": "sold",
    "city": "Worth",
    "state": "IL",
    "coordinates": {
      "_type": "geopoint",
      "lat": 41.690232,
      "lng": -87.782551
    },
    "cardBlurb": "Value-add multifamily in Worth, Illinois. Acquired 2020, sold 2022 after 2.5 years.",
    "showInPortfolio": true,
    "featured": false,
    "order": 200,
    "dealStory": {
      "acquiredYear": 2020,
      "exitYear": 2022,
      "equityMultiple": "1.81x",
      "grossIrr": 18.1,
      "salePrice": 4400000
    }
  },
  {
    "_id": "property-knox-and-kilpatrick",
    "_type": "property",
    "title": "Knox & Kilpatrick",
    "slug": {
      "_type": "slug",
      "current": "knox-and-kilpatrick"
    },
    "assetClass": "multifamily",
    "status": "sold",
    "city": "Oak Forest",
    "state": "IL",
    "coordinates": {
      "_type": "geopoint",
      "lat": 41.614172,
      "lng": -87.733105
    },
    "cardBlurb": "Value-add multifamily in Oak Forest, Illinois. Acquired 2019, sold 2025 after 6.5 years.",
    "showInPortfolio": true,
    "featured": false,
    "order": 200,
    "dealStory": {
      "acquiredYear": 2019,
      "exitYear": 2025,
      "equityMultiple": "3.10x",
      "grossIrr": 29.2,
      "salePrice": 8200000
    }
  },
  {
    "_id": "property-oakwood-apartments",
    "_type": "property",
    "title": "Oakwood Apartments",
    "slug": {
      "_type": "slug",
      "current": "oakwood-apartments"
    },
    "assetClass": "multifamily",
    "status": "sold",
    "city": "Kenosha",
    "state": "WI",
    "coordinates": {
      "_type": "geopoint",
      "lat": 42.590736,
      "lng": -87.857731
    },
    "cardBlurb": "Value-add multifamily in Kenosha, Wisconsin. Acquired 2021, sold 2025 after 3.7 years.",
    "showInPortfolio": true,
    "featured": false,
    "order": 200,
    "dealStory": {
      "acquiredYear": 2021,
      "exitYear": 2025,
      "equityMultiple": "2.61x",
      "grossIrr": 31.8,
      "salePrice": 5500000
    }
  },
  {
    "_id": "property-pinetree-apartments",
    "_type": "property",
    "title": "Pinetree Apartments",
    "slug": {
      "_type": "slug",
      "current": "pinetree-apartments"
    },
    "assetClass": "multifamily",
    "status": "sold",
    "city": "Hanover Park",
    "state": "IL",
    "coordinates": {
      "_type": "geopoint",
      "lat": 41.99287,
      "lng": -88.146483
    },
    "cardBlurb": "Value-add multifamily in Hanover Park, Illinois. Acquired 2018, sold 2022 after 3.7 years.",
    "showInPortfolio": true,
    "featured": false,
    "order": 200,
    "dealStory": {
      "acquiredYear": 2018,
      "exitYear": 2022,
      "equityMultiple": "2.59x",
      "grossIrr": 28.4,
      "salePrice": 6400000
    }
  },
  {
    "_id": "property-crestline-apartments",
    "_type": "property",
    "title": "Crestline Apartments",
    "slug": {
      "_type": "slug",
      "current": "crestline-apartments"
    },
    "assetClass": "multifamily",
    "status": "sold",
    "city": "Alsip",
    "state": "IL",
    "coordinates": {
      "_type": "geopoint",
      "lat": 41.683588,
      "lng": -87.745188
    },
    "cardBlurb": "Value-add multifamily in Alsip, Illinois. Acquired 2020, sold 2023 after 3 years.",
    "showInPortfolio": true,
    "featured": false,
    "order": 200,
    "dealStory": {
      "acquiredYear": 2020,
      "exitYear": 2023,
      "equityMultiple": "2.25x",
      "grossIrr": 15.5,
      "salePrice": 17300000
    }
  },
  {
    "_id": "property-uteg-street-apartments",
    "_type": "property",
    "title": "Uteg Street Apartments",
    "slug": {
      "_type": "slug",
      "current": "uteg-street-apartments"
    },
    "assetClass": "multifamily",
    "status": "sold",
    "city": "Crystal Lake",
    "state": "IL",
    "coordinates": {
      "_type": "geopoint",
      "lat": 42.230944,
      "lng": -88.329724
    },
    "cardBlurb": "Value-add multifamily in Crystal Lake, Illinois. Acquired 2018, sold 2022 after 4 years.",
    "showInPortfolio": true,
    "featured": false,
    "order": 200,
    "dealStory": {
      "acquiredYear": 2018,
      "exitYear": 2022,
      "equityMultiple": "1.52x",
      "grossIrr": 6,
      "salePrice": 5100000
    }
  },
  {
    "_id": "property-station-hills-belle-court",
    "_type": "property",
    "title": "Station Hills & Belle Court",
    "slug": {
      "_type": "slug",
      "current": "station-hills-belle-court"
    },
    "assetClass": "multifamily",
    "status": "sold",
    "city": "Kenosha",
    "state": "WI",
    "coordinates": {
      "_type": "geopoint",
      "lat": 42.581393,
      "lng": -87.870414
    },
    "cardBlurb": "Value-add multifamily in Kenosha, Wisconsin. Acquired 2020, sold 2025 after 4.2 years.",
    "showInPortfolio": true,
    "featured": false,
    "order": 200,
    "dealStory": {
      "acquiredYear": 2020,
      "exitYear": 2025,
      "equityMultiple": "2.82x",
      "grossIrr": 32,
      "salePrice": 13000000
    }
  }
]

/** Deal-story figures patched onto properties that already exist in the dataset. */
export const TRACK_RECORD_PATCH = [
  {
    "slug": "burbank-manor-apartments",
    "label": "EM8 Burbank",
    "dealStory": {
      "acquiredYear": 2020,
      "exitYear": 2022,
      "equityMultiple": "1.99x",
      "grossIrr": 51.7,
      "salePrice": 20500000
    }
  },
  {
    "slug": "embassy-apartments",
    "label": "EM8 Mundelein",
    "dealStory": {
      "acquiredYear": 2021,
      "exitYear": 2023,
      "equityMultiple": "1.37x",
      "grossIrr": 19,
      "salePrice": 10000000
    }
  }
]

/**
 * Rows in the sheet that are deliberately NOT published, and why. Recorded so the next
 * person can see the omission was a decision rather than an oversight.
 */
export const TRACK_RECORD_SKIPPED = [
  {
    "label": "Reverb",
    "why": "ReVerb — Woodland Trails is live as `stabilized`. Hunter, 2026-09-15: the site is right, leave it alone."
  },
  {
    "label": "Old 157th Apartments",
    "why": "Old 157th Apartments was sold to an EM8 affiliate to assemble the 157 & Cicero redevelopment. Not an arm’s-length exit, so it is not a track-record line; its history belongs in 157 & Cicero’s deal story."
  }
]

/**
 * Map pins that geocoded to a street but not a house number, so the marker is approximate.
 *
 * Nominatim returned three candidates for Crestline spanning about 1.2 miles of longitude,
 * every one of them labelled West 115th Street, and a Chicago-grid estimate disagreed with
 * all three. This is the Alsip-proper match. **Hunter to confirm the exact spot** — he knows
 * where his own building is, and a wrong pin is visible on the property page rather than
 * hidden in a field.
 */
export const TRACK_RECORD_COORDS_UNCONFIRMED = [
  "crestline-apartments"
]
