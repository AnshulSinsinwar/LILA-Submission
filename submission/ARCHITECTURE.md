# Architecture Document — LILA Pathfinder

## System Overview

LILA Pathfinder is a **zero-backend** web application. All data processing happens at build time; the deployed artifact is pure static files served from Vercel's CDN.

```
┌─────────────────┐        ┌──────────────────┐       ┌──────────────┐
│  1,243 Parquet   │──────▶│  Python Preprocessor │──────▶│ 4 JSON Files │
│  Files (raw)     │  ETL  │  (scripts/preprocess.py) │       │ + 3 WebP Maps│
└─────────────────┘        └──────────────────┘       └───────┬──────┘
                                                              │
                                                     ┌───────▼──────┐
                                                     │ Vite + React  │
                                                     │ Static Bundle │
                                                     └───────┬──────┘
                                                              │  deploy
                                                     ┌───────▼──────┐
                                                     │  Vercel CDN   │──▶ Browser
                                                     └──────────────┘
```

## Key Architectural Decision: Build-Time Coordinate Mapping

The most technically nuanced part of this project is converting world coordinates `(x, z)` to minimap pixel positions `(px, py)`. Each of the three maps has its own origin and scale values that define the mapping between the game engine's coordinate system and the minimap image's pixel space:

| Map | origin_x | origin_z | scale |
|-----|----------|----------|-------|
| AmbroseValley | -370 | -473 | 900 |
| GrandRift | -290 | -290 | 581 |
| Lockdown | -500 | -500 | 1000 |

The conversion formula normalizes world coordinates to the `[0, 1]` range, then scales to a 1024×1024 pixel grid:

```
u = (x - origin_x) / scale         → horizontal position [0..1]
v = (z - origin_z) / scale         → vertical position [0..1]
px = round(u × 1024)               → horizontal pixel [0..1023]
py = round((1 - v) × 1024)         → vertical pixel [0..1023], Y-flipped
```

The Y-flip in `py` deserves explanation. Game engines typically use a coordinate system where the Z-axis increases "forward" — meaning higher Z values represent positions further north on the map. But image coordinate systems have their origin at the **top-left**, with Y increasing downward. Without the `(1 - v)` inversion, every player path and event marker would appear vertically mirrored: a player in the north of the game world would render near the bottom of the minimap. This is a subtle bug that would look almost correct at first glance (all events would still land on the map geometry) but would produce completely wrong spatial analysis.

The decision to pre-compute coordinates at build time rather than at runtime was deliberate. By performing the transformation in exactly one place — `scripts/preprocess.py` — we get three benefits. First, coordinate correctness is tested once during preprocessing and validated against the README's reference point (world `(-301.45, -355.55)` on AmbroseValley maps to pixel `(78, 890)` — our output matches exactly). Second, the frontend never touches the coordinate formula, eliminating an entire class of rendering bugs. Third, the output JSON files are self-contained: any consumer can render them as-is without knowing the per-map origin, scale, or flip rules.

## Data Pipeline

| Stage | Input | Output | Key Logic |
|-------|-------|--------|-----------|
| Read | 1,243 `.parquet` files | Raw DataFrame | PyArrow read, concat |
| Decode | `event` column (bytes) | String event types | `x.decode('utf-8')` |
| Classify | `user_id` column | `is_bot` flag | UUID regex = human, numeric = bot |
| Timestamps | `ts` (epoch datetime) | `ts_ms` (relative int) | Per-match: `ts - min(ts across all players in match)` |
| Coordinates | `x, z` (world floats) | `px, py` (pixel ints) | Per-map formula with Y-flip, clamped to [0, 1023] |
| Output | Processed DataFrame | 3 map JSONs + 1 metadata | Grouped by map → match → player → events |

**Bot detection:** Human user_ids follow UUID format (`8-4-4-4-12` hex characters). Bot user_ids are numeric strings (`1400`, `1432`). This is the *only* reliable classifier — event type prefixes (`Bot*`) don't cleanly separate bot/human because `BotKill` events appear in human player files (the human killed a bot).

## Frontend Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| State | React useState + useMemo | Filter state, derived data |
| Data | Custom hooks (useMapData, useFilteredData) | Fetch, cache, filter |
| Rendering | Konva.js (react-konva) | Canvas-based map layers |
| Heatmap | simpleheat | Offscreen canvas → Konva Image |

### Konva Layer Stack (bottom to top)

1. **Minimap Image** — Background map (1024×1024 WebP)
2. **Paths** — Player movement polylines (solid=human, dashed=bot)
3. **Event Markers** — Kill/death/loot/storm circles
4. **Heatmap** — simpleheat overlay (traffic/kills/deaths/loot modes)

### Cascading Filter Chain

```
Map Tab → Date Checkboxes → Match Dropdown → Player Type Toggle
   ↓            ↓                 ↓                  ↓
 fetch      narrow matches    single/aggregate    filter events
 JSON       in dropdown       mode switch         for heatmap
```

Each filter narrows the next. A user selecting GrandRift + Feb 10 sees only GrandRift matches from that day in the dropdown (~8-15 matches, not 796).

## Minimap Optimization

Original minimap images totaled **23 MB**. The preprocessor converts them to 1024×1024 WebP at quality 85, reducing total size to **234 KB** (99% reduction). This ensures sub-second first paint even on mobile connections.

## Tech Stack Justification

| Choice | Why | What we rejected |
|--------|-----|------------------|
| Vite + React | Fast dev, no routing needed | Next.js (overkill for SPA) |
| Konva.js | Layer abstraction for togglable overlays | D3 (SVG, wrong tool), Leaflet (geo maps, wrong coordinate system) |
| simpleheat | 200-line lib, takes `[x,y,intensity]` exactly | Hand-rolled gaussian blur (3+ hours) |
| Vercel | CDN, free tier, instant deploy | Self-hosted (unnecessary complexity) |
| Vanilla CSS | Full control over dark theme | Tailwind (not requested, adds build step) |

## Trade-offs & What I'd Build Next

| What | Why | Effort |
|------|-----|--------|
| Scheduled pipeline (GitHub Actions) | Auto-update JSONs daily from new parquet drops | 2 hours |
| Extraction event in telemetry | Can't measure the most important metric in an extraction shooter | Data instrumentation change |
| Session linking across days | 339 user_ids across 5 days — are these returning players? Can't tell without session linking | Schema change |
| Full match telemetry | Current data = sampling windows. Full recordings would unlock real match duration, survival rate, extraction rate | Infrastructure change |
| Date comparison mode (built) | Pre/post patch spatial comparison. Turns tool from descriptive to diagnostic | ✅ Shipped |

