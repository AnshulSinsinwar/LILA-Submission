# Gameplay Insights — LILA BLACK Telemetry Analysis

**Dataset:** 89,104 telemetry events · 796 matches · 339 unique players · 5 days (Feb 10-14) · 3 maps

All three insights emerged directly from using LILA Pathfinder. The tool made visible what the raw parquet data could not — spatial patterns that only become legible when overlaid on the minimap at scale. Each insight follows the same structure: what caught my attention, quantitative evidence, design implication, and a testable hypothesis with a measurable KPI.

> [!NOTE]
> Timestamps are relative to each match's earliest recorded event. Because telemetry files capture sampling windows rather than full match recordings, timeline durations vary — the tool shows event ordering and spatial progression within each captured window.

---

## Insight 1: LILA BLACK Is Currently a Solo PvE Game — PvP Cannot Occur

### What I noticed
Only 6 PvP kill events exist in 89,104 total events — less than 0.007%. This initially looked like a game design observation. The data tells a deeper story.

### Evidence
**97-99% of recorded matches contain exactly 1 human player.**

| Map | Avg Humans/Match | Solo Match % | Human:Bot Ratio |
|-----|-----------------|-------------|-----------------|
| Ambrose Valley | 0.98 | 97.5% | 1:0.5 |
| Grand Rift | 0.97 | 96.6% | 1:0.9 |
| Lockdown | 0.99 | 99.4% | 1:0.7 |

PvP isn't being suppressed by bot density or map design — **it is structurally impossible** because matches rarely have more than one human. The 3 PvP encounters occurred in the ~2-3% of matches where a second human was present (matches `042774ea` on Ambrose Valley and `711c9a67` on Grand Rift).

This means every BotKill event (2,415 total) represents a human fighting Entity bots, and every BotKilled event (700 total) represents Entity bots winning. The human:Entity kill ratio is **3.45:1** — humans win bot encounters roughly 3.5x as often as they lose.

### Why this matters for level design
If LILA BLACK's extraction mode is designed as PvPvE, the current matchmaking is delivering a PvE-only experience. Level designers optimizing for "player collision zones" or "PvP hotspots" are designing for encounters that cannot happen with current player density. Either:

1. **Matchmaking needs more humans per session** — the telemetry data should be re-collected after increasing lobby fill rates
2. **Or level design should optimize for Entity bot challenge**, not human confrontation — meaning bot patrol density, sightline design, and ambush geometry matter more than chokepoint design

### Testable hypothesis
**If lobby sizes exceed 3 humans per match, PvP kill rate should increase from 0.007% to >0.5% of events.** Measurable via this tool's Kill Zone heatmap filtered by humans-only. Secondary metric: does increased human density change extraction success rates?

### Data instrumentation gap
The dataset contains no explicit **extraction event**. Analysis of final player positions shows only 1 of 1,242 player sessions ended near a map edge (0.1%). However, **40% of players have no death event** (500 of 1,242 sessions), suggesting they survived — either by extraction or by session timeout. **Recommendation: add an explicit `Extracted` event type to future telemetry** to close this blind spot. Without it, the most important metric in an extraction shooter — extraction success rate — cannot be measured.

---

## Insight 2: Grand Rift Is Underplayed 10:1 — A Map Rotation Crisis

### What I noticed
Grand Rift receives 7.4% of all matches despite being one of three maps in rotation.

| Map | Matches | % Share | Events | Unique Humans |
|-----|---------|---------|--------|--------------|
| Ambrose Valley | 566 | **71.1%** | 61,013 | 217 |
| Lockdown | 171 | 21.5% | 21,238 | 79 |
| Grand Rift | 59 | **7.4%** | 6,853 | 29 |

### Evidence
The traffic heatmap comparison tells the story visually. Ambrose Valley has near-complete map coverage — players explore almost every region. Lockdown shows even distribution across its smaller, denser layout. **Grand Rift has large cold zones where zero players visited across 59 matches.** The northwest region (near Cave House) and southeast region (near Engineer's Quarters) show activity, but the central and southern areas are essentially unvisited.

Additionally, Grand Rift has the highest bot ratio (1:0.9 human:bot) — nearly one Entity bot per human. On Ambrose Valley it's 1:0.5. This means Grand Rift lobbies feel more bot-heavy, which may contribute to player avoidance.

### Quadrant analysis — Grand Rift

| Quadrant | Traffic % | Loot % | Kill % |
|----------|----------|--------|--------|
| NW | 33.7% | 33.1% | 33.8% |
| NE | 19.1% | 24.9% | 14.6% |
| SW | 26.1% | 23.5% | 32.5% |
| SE | 21.1% | 18.5% | 19.2% |

The NE quadrant has **24.9% of loot but only 19.1% of traffic** — players aren't finding those loot spawns. The SW quadrant has **32.5% of kills but only 23.5% of loot** — players are dying in a loot-poor zone, which is a punishing experience loop.

### Why this matters for level design
A 10:1 map popularity gap in a 3-map rotation means Grand Rift is either disliked, unfamiliar, or rarely assigned. If matchmaking weights maps equally, players may be abandoning Grand Rift queues. If matchmaking is popularity-weighted, it's creating a death spiral — fewer matches → less familiarity → more avoidance.

### Testable hypothesis
**Hypothesis: redistributing 15% of SW Grand Rift's Entity bot spawns to NE (the loot-rich but under-trafficked quadrant) will increase NE traffic share from 19% to 25%+.** Measurable via traffic heatmap comparison pre/post patch. Secondary metric: Grand Rift's match share in rotation — does fixing the experience loop increase return rate?

---

## Insight 3: Loot Pickup Patterns Reveal Where Players Perceive Value — and Where They Don't

### What I noticed
Loot events are 14.5% of all telemetry (12,885 events) — the third most frequent action after position tracking. Unlike movement (passive) or kills (reactive), loot pickups represent **active player decisions about where to spend time**.

### Evidence — Ambrose Valley quadrant analysis

| Quadrant | Traffic % | Loot % | Gap | Interpretation |
|----------|----------|--------|-----|---------------|
| NW | 34.2% | 31.8% | +2.5 | Balanced — players loot where they walk |
| NE | 10.2% | 9.1% | +1.1 | Low activity zone — both traffic and loot sparse |
| SW | 39.9% | 36.4% | +3.5 | Highest activity — players walk more than they loot |
| **SE** | **15.7%** | **22.8%** | **-7.0** | **Loot-dense but under-trafficked** |

**The SE quadrant of Ambrose Valley contains 22.8% of all loot pickups but only 15.7% of traffic.** This means players who reach SE are rewarded disproportionately — there's more loot per visit. But most players don't go there. This is either:
- A **hidden gem** that experienced players have discovered but new players miss
- Or a **design problem** where high-value loot is placed too far from natural movement paths

### Comparing across maps
Lockdown shows the opposite — loot and traffic are nearly perfectly balanced across all quadrants (within ±5%), suggesting its compact layout naturally distributes both. This makes Lockdown the best-designed map in the dataset for equitable loot access.

### Why this matters for level design
The gap between "where players walk" and "where players loot" is a **direct measure of map efficiency**. A perfectly designed map has zero gap — every area players visit rewards them, and every reward is reachable via natural paths. Ambrose Valley's SE gap suggests the map is 20% larger than its loot distribution justifies, or that SE lacks compelling POIs to pull traffic.

### Testable hypothesis
**Hypothesis: adding a named POI with 2-3 high-tier loot spawns to SE Ambrose Valley (currently unnamed on minimap) will increase SE traffic share from 15.7% to 20%+, closing the traffic-loot gap.** Primary metric: SE quadrant traffic % in post-patch telemetry. Secondary metric: overall map exploration breadth — do players who visit SE also show higher total map coverage (measured via unique grid cells visited)?

### KPI framing for product
**Map utilization ratio** = % of map area receiving >1% of total traffic. Currently estimated at ~70% for Ambrose Valley, ~85% for Lockdown, and ~55% for Grand Rift. Target: >80% for all maps. This directly impacts content ROI — every square meter of designed environment that players never see is wasted art and level design budget.
