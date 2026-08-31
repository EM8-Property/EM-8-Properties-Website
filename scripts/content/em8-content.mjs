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
  /**
   * Antioch Shopping Plaza — the one live offering.
   *
   * SOURCE: "Antioch_Shopping_Plaza_OM.pdf" (Drive, July 2026). Every figure below is
   * read from that document. Nothing here is estimated and nothing is rounded to look
   * better.
   *
   * DELIBERATELY ABSENT, because the OM is marked confidential and proprietary and this
   * is a public page: the rent roll and tenant names, the executed LOI and its terms, the
   * seller-financing and refinance terms, the sponsor/LP economic split, and the equity
   * requirement. What remains is the headline underwriting an investor needs to decide
   * whether to ask for the OM at all — which is what a 506(c) page is for.
   *
   * STATUS is `under-contract`, not `stabilized`. The OM targets a 2026-09-01 close.
   * Presenting it as stabilized would state that EM8 owns an asset it does not yet own.
   *
   * NO METRA FACT. Antioch is on the North Central Service and the OM notes the
   * connection, but no walking time has been measured to this address, and spec §9 lists
   * invented walk times as a launch blocker. A station without a confirmed time is a
   * half-fact, so both fields are omitted rather than guessed.
   *
   * NO PHOTOGRAPHY. The only images are embedded in the OM deck. Upload them in the
   * Studio; the card and the page both degrade to a plain panel until then.
   */
  {
    _id: 'property-antioch-shopping-plaza',
    // Under contract, not owned, so it is kept out of the assets listing — listing it
    // under "Assets across the Chicago MSA" would state that EM8 owns it. It stays an
    // open offering and keeps its own page. Flip this on after closing.
    showInPortfolio: false,
    // The live offering. Only honoured when the document is created; once it exists the
    // Studio value wins, so withdrawing it there is permanent.
    publiclyOffered: true,
    slug: 'antioch-shopping-plaza',
    title: 'Antioch Shopping Plaza',
    assetClass: 'retail',
    status: 'under-contract',
    city: 'Antioch',
    state: 'IL',
    // US Census geocoder, 460 Orchard St, Antioch, IL 60002.
    coordinates: { lat: 42.479085, lng: -88.09984 },
    retailUnitCount: 12,
    squareFeet: 87762,
    yearBuilt: 1965,
    order: 85,
    cardBlurb:
      'An 87,762-square-foot open-air retail center on Orchard Street, bought at $51 a square foot with half the building empty and the anchor space dark.',
    overview: [
      'Antioch Shopping Plaza is an 87,762-square-foot open-air retail center at 460–510 Orchard Street, built in 1965 and sitting on 5.9 acres with 306 parking spaces in the middle of downtown Antioch.',
      'Half the building is empty by floor area, including a 33,540-square-foot former grocery anchor the previous owner could not re-let. That vacancy is the reason the basis is $51 a square foot against an estimated replacement cost near $120.',
      'Downtown Antioch anchors the Chain of Lakes retail corridor and is connected to Chicago by Metra. The village has its own TIF district and is investing in the corridor, and EM8 is already building Main & Orchard next door.',
    ],
    businessPlan: [
      'The anchor is the whole thesis. We subdivide the 33,540-square-foot former grocery into ten right-sized bays of roughly 2,850 square feet each, which is the format that actually leases in a suburban strip: service retail, food and drink, fitness, and medical.',
      'Alongside that, a million dollars of capital goes into demising walls and storefronts, mechanical and electrical repair, a resurfaced lot, and new signage and paint. Most of it is leasing cost rather than cosmetics.',
      'In-place rent averages just over $7 a square foot against a stabilized target near $11, so the upside is in re-letting space that is either empty or badly under-rented rather than in raising rents on sitting tenants. Occupancy is underwritten to 90% by year three.',
      'Longer term, the parcel sits beside our Main & Orchard development, and the two together are worth more than either alone. Holding to redevelop stays an option rather than a requirement, because the stabilized centre pays its own way.',
    ],
    offering: {
      summary:
        'A value-add retail acquisition in downtown Antioch: buy at a discounted basis driven by vacancy, subdivide and re-let the dark anchor, and stabilize at 90% occupancy. Underwritten over a seven-year hold with a refinance in year two.',
      targetIrr: '17.7%',
      targetEquityMultiple: '2.2x',
      targetHoldYears: 7,
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
    // Moved out of the leadership list on 2026-08-31 at Hunter’s direction. Confirmed as
    // “Mikey”. Nir and Ilan join him here once their titles and bios are supplied — a
    // bio is not something this file is allowed to invent.
    group: 'partner-board',
    order: 10,
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
  /**
   * Board members, supplied by Hunter on 2026-08-31 and used verbatim.
   *
   * Both come from Aurum, and both biographies describe their Aurum role rather than an
   * EM8 one — that is how they were given and nothing has been rewritten to imply
   * otherwise. `role` reads "Board Member" because no title was supplied; confirm it.
   *
   * No photography for either. The card falls back to a plain panel until one is uploaded
   * in the Studio.
   */
  {
    _id: 'teamMember-nir-dror',
    name: 'Nir Dror',
    role: 'Board Member',
    group: 'partner-board',
    order: 20,
    bio: [
      'Nir Dror joined Aurum Ventures in 2013. Nir brings with him over 10 years of experience in finance, including investment banking and private equity experience. Nir is actively involved in due diligence, value assessment, financial engineering, transactions and M&A activities. Nir works closely with the portfolio companies on all financial issues.',
      'Prior to joining Aurum, Nir served as the Chief Investment Officer at Origo Investments, a $350mm investment fund. Previously, Nir worked as an associate at Barclays Capital (formerly Lehman Brothers) where he was responsible for global transactions such as M&As, debt restructuring, and IPOs.',
      'Nir holds a Bachelor degree in Law and Accounting from Tel Aviv University, Master degree in Commercial Law from Tel Aviv University and an MBA (cum laude) from the Michigan Ross School of Business.',
    ].join('\n\n'),
  },
  {
    _id: 'teamMember-ilan-lior',
    name: 'Ilan Lior',
    role: 'Board Member',
    group: 'partner-board',
    order: 30,
    bio: [
      'Ilan Lior joined Aurum in 2014. He handles all legal matters relating to the Aurum group of companies, the various investment transactions and supports the portfolio companies on various legal issues.',
      'Prior to joining Aurum, Ilan was a partner in a boutique law firm where he headed the corporate and commercial practice group and advised clients on issues such as corporate financing and restructurings, joint ventures and M&A activities. He also worked extensively on matters of licensing agreements, purchase agreements and arrangements relating to intellectual property.',
      'In his work, Ilan has specialized in cross-border cases and represented a wide range of clients ranging from start-ups and other privately held companies, public enterprises, municipal bodies and governmental agencies, with special expertise in international infrastructure tenders.',
    ].join('\n\n'),
  },
]


/**
 * Two starter articles, written to be edited.
 *
 * The insights feed is the mechanism behind spec §3's "reputation brings capital to us",
 * and it was empty — while sitting in the main navigation and behind the homepage hero's
 * own "Read our thinking" button. So the first thing a curious reader did was land on
 * nothing.
 *
 * These exist to be rewritten, not admired. Every claim in them is restated from copy
 * EM8 has already approved — the four focus cards, the hero, and the property overviews
 * already in this file. They introduce no new position, and deliberately contain no
 * statistic at all: spec §9 lists the three original article bodies as invented, and the
 * fastest way to reintroduce that problem is to write a number into a sample post.
 *
 * Review the voice before the team sees them.
 */
export const POSTS = [
  {
    _id: 'post-start-with-the-platform',
    slug: 'we-start-with-the-platform',
    title: 'We start with the platform, not the parcel',
    category: 'market',
    publishedAt: '2026-08-30T12:00:00Z',
    excerpt:
      'Proximity to a station is the one thing about a site nobody can copy, undercut, or build next door to you later. So it is where we start rather than where we finish.',
    body: [
      'Most site searches begin with the land: what is for sale, what it costs, what can be put on it. We start one step earlier, with what is already there and cannot be moved.',
      'A Metra platform is the clearest version of that. It is fixed infrastructure, paid for long ago by somebody else, and no competitor can add one next to their own site to catch up with you. The same is true of a park, a school, or a downtown block that people already walk. Buying proximity to those things is cheaper and more honest than trying to manufacture an amenity that substitutes for them.',
      'This is why walking distance to the station appears on every property page as a fact rather than a phrase in a paragraph. It is either true of a building or it is not, and it should be as easy to check as the year it was built.',
      'The discipline it imposes is mostly about what we turn down. A site that prices well but sits a long drive from anything is a site where the entire investment case rests on our own execution. Where the location does part of the work, our execution has something to compound against.',
    ],
  },
  {
    _id: 'post-what-a-village-wants-built',
    slug: 'finding-out-what-a-village-wants-built',
    title: 'Finding out what a village wants built',
    category: 'municipal-partnership',
    publishedAt: '2026-08-30T12:00:00Z',
    excerpt:
      'The cheapest entitlement is the one where the community already wanted what you are proposing. That means asking before drawing, which is slower at the start and faster everywhere after.',
    body: [
      'There are two ways to approach a village. One is to decide what you want to build, draw it, and then spend a year explaining why the community should accept it. The other is to find out what the community has been trying to get built, and then work out whether there is a project in it for us.',
      'We do the second one. It is slower at the beginning, and it is the reason our entitlement periods tend to be quieter than the schedule assumed.',
      'A municipality is not a counterparty in a single transaction. It is a partner we expect to be in front of again with the next site, and the one after that. A developer who wins a contested approval and then leaves has spent goodwill that the next applicant has to rebuild. We would rather still be able to pick up the phone.',
      'In practice this means the early conversations are about the village comprehensive plan, the parts of the corridor that have sat empty, and what previous applicants got wrong. By the time there is a drawing, most of the disagreement has already happened, in a room, before anyone had money in the ground.',
    ],
  },
]

/**
 * Two starter testimonials, written as DRAFTS and left without consent.
 *
 * Both gates matter and they are not the same gate:
 *
 *   - `consentOnRecord: false` means TESTIMONIALS_QUERY will never return them, so they
 *     cannot appear on the site. Spec §11 requires written consent before publishing any
 *     investor's name, and these are not real investors.
 *   - written as drafts (`drafts.` id prefix) so the release gate, which now only
 *     inspects published documents, does not see an unconsented testimonial in the
 *     dataset at all.
 *
 * They are for practising the edit, and for showing what the field wants. Replace the
 * quote and attribution with a real investor's words, tick the consent box once the
 * written permission is actually on file, and publish. The homepage and /investors
 * sections appear on their own the moment one consented testimonial exists.
 */
export const TESTIMONIALS = [
  {
    _id: 'testimonial-sample-1',
    quote:
      'Replace this with something a real investor said, in their words. The specific sentence is what persuades — how quickly a question got answered, what happened when something went wrong, what the reporting is actually like to read.',
    attribution: 'Sample entry — replace with a real name',
    descriptor: 'Role or descriptor, e.g. Private Equity Consultant',
    consentOnRecord: false,
    order: 10,
  },
  {
    _id: 'testimonial-sample-2',
    quote:
      'A second sample. Keep quotes to two or three sentences: the ones that work name a moment rather than an adjective, and an anonymous quote persuades nobody, so the name and the written consent have to arrive together.',
    attribution: 'Sample entry — replace with a real name',
    descriptor: 'Role or descriptor, e.g. Family Office Principal',
    investorSince: 2019,
    consentOnRecord: false,
    order: 20,
  },
]

/**
 * The singleton. `contactEmail` moved from hunter@ to info@ so the address on the site
 * belongs to the company rather than a person, and it now actually renders — the footer
 * queried this field and then displayed nothing.
 */
export const SITE_SETTINGS = {
  contactEmail: 'info@em-8.com',
  bookACallUrl: 'https://calendar.app.google/mJNPKxULTGh8NMTq9',
}
