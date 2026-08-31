/**
 * The real content for the EM8 site, and the provenance of every figure in it.
 *
 * SOURCES
 *  - "EM8 Portfolio Final - June 19th 2026 v2.xlsx" (Drive) — units, dates, sale prices,
 *    realized multiples, occupancy, strategy.
 *  - em-8.com (the live Vite site) — property naming, descriptive copy, team bios, and
 *    the photography, which already lives in an older Sanity project (svwmqi1a).
 *  - "EM8 Strategy Ideation — 2026/08/25" (Drive) — the four success factors, taken from
 *    that meeting's recorded decisions rather than invented for the page.
 *  - Coordinates: US Census geocoder against each street address. Boulevard had no Census
 *    match and uses the OpenStreetMap result for 6701 South St.
 *
 * WHAT IS DELIBERATELY ABSENT
 *  - Every figure in spec §9 that could not be sourced: municipal counts, entitlement
 *    counts, zoning-litigation claims, Boulevard's target returns and retail suite mix,
 *    and all three insight articles. Empty beats invented; tests/shared/placeholders.ts
 *    fails the gate if any of them reappear.
 *  - Walk Score and Transit Score, which need a walkscore.com API key. The fields exist;
 *    the values are not guessed.
 *  - Everything confidential in the portfolio sheet: lender names, debt balances, rates,
 *    maturities, promote earned, EM8's own equity, and LP capital accounts. None of it
 *    belongs on a public marketing site.
 *
 * UNIT COUNTS carry residential and retail separately. The live site published
 * residential only; the portfolio sheet published the combined total. That is the entire
 * source of the 66/71, 90/93 and 29/31 disagreements — confirmed by Hunter, 2026-08-30.
 *
 * METRA WALK TIMES are 5 minutes for the four Oak Forest assets and Boulevard, confirmed
 * by Hunter on 2026-08-30. Geocoded straight-line estimates put ReVerb at ~8 min and
 * Waverly Creek at ~7; he confirmed the real walking routes are within five. Properties
 * where transit is not the story carry no Metra fact at all rather than a weak one.
 */

/** Photography from the current live site's Sanity project. */
const OLD_CDN = 'https://cdn.sanity.io/images/svwmqi1a/production/'
export const oldImage = (file) => OLD_CDN + file

/**
 * Sanity requires a _key on every array item, Portable Text blocks and their spans
 * included. Omitting them still writes and still renders — the failure is confined to
 * the Studio, which shows a "Missing keys" banner on each paragraph and will not reorder
 * them until an editor repairs it. Nothing in the build, the unit suite, or Lighthouse
 * can see that.
 *
 * Keys are derived from position rather than randomised so that re-running the migration
 * produces byte-identical documents, instead of a fresh revision in every document's
 * history on every run.
 */
const block = (text, i) => ({
  _type: 'block',
  _key: `b${i}`,
  style: 'normal',
  markDefs: [],
  children: [{ _type: 'span', _key: `b${i}s0`, text, marks: [] }],
})
export const portable = (paragraphs) => paragraphs.map(block)

export const PROPERTIES = [
  {
    _id: 'property-boulevard-central-station',
    slug: 'boulevard-at-central-station',
    title: 'The Boulevard at Central Station',
    assetClass: 'mixed-use',
    status: 'stabilized',
    city: 'Tinley Park',
    state: 'IL',
    coordinates: { lat: 41.57576, lng: -87.78197 },
    metraStation: 'Tinley Park',
    walkMinutes: 5,
    unitCount: 66,
    retailUnitCount: 5,
    yearBuilt: 2021,
    order: 10,
    featured: true,
    image: '19872fd567ecde655bd15d04e48a723b6b752cf6-1600x917.jpg',
    alt: 'The Boulevard at Central Station, Tinley Park',
    cardBlurb:
      'Mixed-use development with street-level retail, built in 2021 and bought in 2026. The Tinley Park Metra platform is directly across the street.',
    overview: [
      'The Boulevard at Central Station sits directly across from the Tinley Park Metra station. Nobody can build that position twice. The platform is the amenity, and there is only one of them.',
      'Apartments sit above street-level retail. The shops get commuter traffic twice a day, and the residents get a downtown block they can actually walk.',
    ],
    businessPlan: [
      'We bought it in June 2026. The work here is operational rather than structural: tighten up management, and lease the retail to businesses the commuters and residents will actually use. The building is only a few years old and the location is fixed.',
    ],
  },
  {
    _id: 'property-157-and-cicero',
    slug: '157-and-cicero',
    title: '157 & Cicero',
    assetClass: 'mixed-use',
    status: 'stabilized',
    city: 'Oak Forest',
    state: 'IL',
    coordinates: { lat: 41.60697, lng: -87.7367 },
    metraStation: 'Oak Forest',
    walkMinutes: 5,
    unitCount: 90,
    retailUnitCount: 3,
    yearBuilt: 2024,
    order: 20,
    featured: true,
    image: '04c37374686073f6bf650aa6ebd92a0a41989278-4160x3117.jpg',
    alt: '157 & Cicero, Oak Forest',
    cardBlurb:
      'Ground-up mixed-use, finished in 2024. Apartments over street-level retail, five minutes on foot from the Oak Forest Metra station.',
    overview: [
      'We built 157 & Cicero from the ground up with the City of Oak Forest, on a site the city had been trying to get activated for years.',
      'This is how we prefer to work. The city had a plan for its downtown, and we built what the plan asked for, a few minutes from the Metra platform.',
    ],
    businessPlan: [
      'Delivered and stabilized. The retail is leased to tenants who draw on the building and the blocks around it.',
    ],
  },
  {
    _id: 'property-waverly-creek',
    slug: 'waverly-creek-townhomes',
    title: 'Waverly Creek Townhomes',
    assetClass: 'townhomes',
    status: 'lease-up',
    city: 'Oak Forest',
    state: 'IL',
    coordinates: { lat: 41.60868, lng: -87.73677 },
    metraStation: 'Oak Forest',
    walkMinutes: 5,
    unitCount: 29,
    retailUnitCount: 2,
    yearBuilt: 2026,
    order: 30,
    featured: true,
    image: '1773bb5110fccba66a5624bdfee794dd21b7b897-4160x3117.jpg',
    alt: 'Waverly Creek Townhomes, Oak Forest',
    cardBlurb:
      'Ground-up townhomes with a retail component, delivered in 2026. Still leasing. Five minutes on foot from the Oak Forest Metra station.',
    overview: [
      'A ground-up townhome development at 156th and Cicero, delivered in May 2026 and leasing now.',
      'Townhomes fill a real gap in Oak Forest. Some households want more room than an apartment gives them but do not want to leave a walkable part of town with a train in it.',
    ],
    businessPlan: [
      'Leasing now. The near-term work is absorption, getting from delivery to a stabilized rent roll, and filling the retail.',
    ],
  },
  {
    _id: 'property-reverb-woodland-trails',
    slug: 'reverb-woodland-trails',
    title: 'ReVerb — Woodland Trails',
    assetClass: 'multifamily',
    status: 'stabilized',
    city: 'Oak Forest',
    state: 'IL',
    coordinates: { lat: 41.60218, lng: -87.74385 },
    metraStation: 'Oak Forest',
    walkMinutes: 5,
    unitCount: 72,
    yearRenovated: 2022,
    order: 40,
    image: 'a142e32f07324bf7348a026501d355c52217e2b2-5280x3956.jpg',
    alt: 'ReVerb — Woodland Trails, Oak Forest',
    cardBlurb:
      'Seventy-two apartments in Oak Forest. We rebuilt the interiors and the shared spaces in 2022, and it has run essentially full since.',
    overview: [
      'Seventy-two apartments on LeClaire Avenue in Oak Forest. We renovated it inside and out, and it has run at full occupancy since.',
    ],
    businessPlan: [
      'Stabilized and held for income. We upgraded the interiors and common areas before lease-up, and it has run essentially full since.',
    ],
  },
  {
    _id: 'property-oak-forest-k',
    slug: 'oak-forest-k',
    title: 'Oak Forest K',
    assetClass: 'multifamily',
    status: 'renovation-complete',
    city: 'Oak Forest',
    state: 'IL',
    coordinates: { lat: 41.60682, lng: -87.73899 },
    metraStation: 'Oak Forest',
    walkMinutes: 5,
    unitCount: 40,
    yearRenovated: 2025,
    order: 50,
    image: '9db204df8d7738c6486b8df3cf444148e3863811-1222x811.png',
    alt: 'Oak Forest K, Oak Forest',
    cardBlurb:
      'Forty apartments across two buildings, modernized inside and refaced outside. The work finished in 2025.',
    overview: [
      'Two buildings, on Lamon Avenue and West 157th Street, a few minutes from the Metra station. We closed on them separately in late 2022 and early 2023.',
    ],
    businessPlan: [
      'The renovation wrapped in 2025. We modernized interiors unit by unit and rebuilt the exterior facade. We hold and operate it at the improved rent level now.',
    ],
  },
  {
    _id: 'property-382-penn',
    slug: '382-penn-apartments',
    title: '382 Penn Apartments',
    assetClass: 'multifamily',
    status: 'lease-up',
    city: 'Glen Ellyn',
    state: 'IL',
    coordinates: { lat: 41.87671, lng: -88.07318 },
    unitCount: 88,
    yearRenovated: 2025,
    order: 60,
    image: '51870aba22bd28478bb3f13a840130ebe85f3091-1600x1199.jpg',
    alt: '382 Penn Apartments, Glen Ellyn',
    cardBlurb:
      'Eighty-eight apartments in Glen Ellyn. We renovate units as they turn instead of emptying the building, so it earns while it leases.',
    overview: [
      'Eighty-eight apartments on Pennsylvania Avenue in Glen Ellyn, a DuPage County suburb with good schools and a downtown people actually use.',
    ],
    businessPlan: [
      'Renovation and lease-up run at the same time. We take units as they turn instead of emptying the building, so it keeps producing income the whole way through.',
    ],
  },
  {
    _id: 'property-park-townhomes',
    slug: 'park-townhomes-highland-park',
    title: 'Park Townhomes at Highland Park',
    assetClass: 'townhomes',
    status: 'stabilized',
    city: 'Highland Park',
    state: 'IL',
    coordinates: { lat: 42.1869, lng: -87.8036 },
    unitCount: 40,
    yearBuilt: 1960,
    order: 70,
    image: '285467a42b1a50e50fe824f5ca8780cdffa02f1e-5568x3712.jpg',
    alt: 'Park Townhomes at Highland Park',
    cardBlurb:
      'Forty townhomes on Green Bay Road. New supply on the North Shore is scarce and the older stock rarely trades, so we hold this one for income.',
    overview: [
      'Forty townhomes on Green Bay Road in Highland Park. New supply on the North Shore is scarce, and the stock that exists rarely comes to market.',
    ],
    businessPlan: [
      'Held for income. We refinanced in the first quarter of 2026, and it continues to run at a high leased rate.',
    ],
  },
  {
    _id: 'property-antioch-industrial',
    slug: 'antioch-industrial',
    title: 'Antioch Industrial',
    assetClass: 'industrial',
    status: 'stabilized',
    city: 'Antioch',
    state: 'IL',
    coordinates: { lat: 42.4863, lng: -88.09087 },
    unitCount: 1,
    squareFeet: 36530,
    yearBuilt: 1989,
    yearRenovated: 2021,
    order: 80,
    image: 'f920b3a2849a5edcf1f9879adb0793a8987b4873-620x426.jpg',
    alt: 'Antioch Industrial, Antioch',
    cardBlurb:
      "A 36,530-square-foot manufacturing building on a net lease, renovated in 2021. It sits in Lake County's medical and biopharmaceutical corridor.",
    overview: [
      'A purpose-built manufacturing facility on Drom Court in Antioch, put up in 1989 and heavily renovated in 2021. Lake County’s medical and biopharmaceutical corridor runs through here.',
    ],
    businessPlan: [
      "Held on a net lease, so the tenant carries the operating costs. It is our only industrial building and the steadiest income line we have.",
    ],
  },
  {
    _id: 'property-burbank-manor',
    slug: 'burbank-manor-apartments',
    title: 'Burbank Manor Apartments',
    assetClass: 'senior',
    status: 'sold',
    city: 'Burbank',
    state: 'IL',
    coordinates: { lat: 41.75352, lng: -87.76693 },
    unitCount: 173,
    squareFeet: 148034,
    yearBuilt: 1984,
    order: 90,
    image: '15eff42cd7014323a1613cb851712db1f81fe917-5472x3648.jpg',
    alt: 'Burbank Manor Apartments, Burbank',
    cardBlurb:
      'A 173-unit senior garden apartment community in Burbank. We bought it in December 2020 and sold it in July 2022.',
    overview: [
      'A 173-unit senior garden apartment community built in 1984, roughly 148,000 square feet on Pinehurst Court.',
    ],
    dealStory: {
      acquired:
        'We bought it in December 2020: 173 units of senior garden apartments in Burbank, built in 1984.',
      executed:
        'We stabilized operations and brought the rent roll up to market over the hold, finishing at 96% occupancy.',
      exited: 'Sold in July 2022 for $20.5 million, a realized cap rate of 5.49%.',
      equityMultiple: '1.99x',
      exitYear: 2022,
    },
  },
  {
    _id: 'property-embassy-apartments',
    slug: 'embassy-apartments',
    title: 'Embassy Apartments',
    assetClass: 'multifamily',
    status: 'sold',
    city: 'Mundelein',
    state: 'IL',
    coordinates: { lat: 42.26109, lng: -87.98964 },
    unitCount: 72,
    yearBuilt: 1972,
    order: 100,
    image: 'bb954d2b6e1f3fe4a3494ec7f1f86cf6393eb1cb-2048x1365.jpg',
    alt: 'Embassy Apartments, Mundelein',
    cardBlurb:
      'Seventy-two apartments on South Shaddle Avenue in Mundelein. We bought it in August 2021 and sold it in June 2023.',
    overview: [
      'Seventy-two apartments in two-story garden buildings on South Shaddle Avenue in Mundelein, built in 1972.',
    ],
    dealStory: {
      acquired:
        'We bought it in August 2021: 72 apartments in two-story garden buildings in Mundelein, built in 1972.',
      executed:
        'We renovated the unit interiors and repositioned the rent roll while occupancy held in the mid-nineties.',
      exited: 'Sold in June 2023 for $10.0 million, a realized cap rate of 6.36%.',
      equityMultiple: '1.37x',
      exitYear: 2023,
    },
  },
]

/**
 * Spec §9 confirms all five as real. The last two appear nowhere on the current site and
 * are the most LP-relevant proof EM8 owns, which is why they sit alongside the AUM figure
 * every sponsor quotes rather than being left out.
 */
export const HERO_STATS = [
  { _id: 'heroStat-aum', figure: '$100M+', label: 'Assets Under Management', order: 10 },
  { _id: 'heroStat-managed', figure: '1,350+', label: 'Units Managed', order: 20 },
  { _id: 'heroStat-sold', figure: '750+', label: 'Units Sold', order: 30 },
  { _id: 'heroStat-multiple', figure: '1.79x', label: 'Realized Equity Multiple', order: 40 },
  { _id: 'heroStat-roe', figure: '36.2%', label: 'Average Annual Return on Equity', order: 50 },
]

/** Taken from the recorded decisions of the 2026-08-25 strategy session, not invented. */
export const FOCUS_CARDS = [
  {
    _id: 'focusCard-communities',
    title: 'Communities people choose',
    description:
      'We build places people stay in. Retention is what compounds, both in the rent roll and in the reputation that brings us the next deal. Turnover burns both.',
    order: 10,
  },
  {
    _id: 'focusCard-transit',
    title: 'Transit and infrastructure first',
    description:
      'We start with what a place already has: a Metra platform, a park, a downtown worth walking to. Buying proximity is cheaper and more honest than trying to manufacture it.',
    order: 20,
  },
  {
    _id: 'focusCard-municipal',
    title: 'Partnership with municipalities',
    description:
      'We treat a city as a long-term partner, not a counterparty. That means finding out what a community wants built before we propose what we want to build.',
    order: 30,
  },
  {
    _id: 'focusCard-design',
    title: 'Design for value, not for savings',
    description:
      'We make design decisions against long-term value instead of short-term value engineering. The cheapest specification is rarely the one that still looks right in year ten.',
    order: 40,
  },
]

export const TEAM = [
  {
    _id: 'teamMember-etamar-deshe',
    name: 'Etamar Deshe',
    role: 'Principal',
    bio: "Leads acquisition strategy, deal structuring, and capital allocation across EM8's investment portfolio.",
    image: '7bc543fd74a82c8746ce145c9ce27dea59d523ae-366x366.jpg',
    order: 10,
  },
  {
    _id: 'teamMember-michael-gallant',
    name: 'Michael Gallant',
    role: 'Principal',
    bio: 'Oversees capital markets, refinancing strategy, and investor relations across all assets.',
    image: '10298315722421f69fd2877f9fd463d4bcea7993-800x800.jpg',
    order: 20,
  },
  {
    _id: 'teamMember-alexander-riegler',
    name: 'Alexander Riegler',
    role: 'Director of Real Estate & Investor Relations',
    bio: "Leads real estate operations, investor relations, reporting, and asset management across EM8's portfolio.",
    image: '03afd7dece2a52e90f9a98fda922ed06b931be8d-800x800.jpg',
    order: 30,
  },
  {
    _id: 'teamMember-kathy-molinaro',
    name: 'Kathy Molinaro',
    role: 'Administrative Manager',
    bio: 'Coordinates project execution, compliance, and day-to-day operational workflows.',
    image: '446e9a3c0fd798d67d975d16587f814ed84125b9-800x800.jpg',
    order: 40,
  },
  {
    _id: 'teamMember-hunter-heyman',
    name: 'Hunter Heyman',
    role: 'Investor Relations and Real Estate Analyst',
    bio: "Leads investor communications and marketing, and provides analysis support across EM8's portfolio.",
    image: '3123f6aa927b754eac08b62c3f5bb4eb44b3362c-800x724.jpg',
    order: 50,
  },
  {
    _id: 'teamMember-amy-moll',
    name: 'Amy Moll',
    role: 'Accountant',
    bio: 'Manages financial reporting and accounting operations across all properties.',
    image: 'dcd95a7cc062b57e832a1a50c85c1997e5dcb58c-400x400.jpg',
    order: 60,
  },
]
