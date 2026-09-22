# LILA Pathfinder: V2 Product Roadmap & Extensibility Vision

As a Product Manager, delivering the V1 visualization tool is just the baseline. The real objective of APM (Application Performance Monitoring) in a gaming context is to graduate from **descriptive analytics** ("What happened here?") to **predictive and prescriptive analytics** ("Why are players churning here, and how do we fix it?").

If I were leading the LILA Pathfinder product team, here is the strategic roadmap for V2 and V3.

---

## 1. Z-Axis Profiling (Topographical Multi-Floor Rendering)
**The Problem:** Project Black is an extraction shooter. Verticality (sniping from rooftops, looting deep underground bunkers) defines the genre. Currently, our `y` (height) axis is completely flattened onto a 2D plane. We cannot distinguish a roof sniper from a ground-floor victim in the same `x,z` coordinate.
**The Feature:** Implement spatial floor-slicing. Add a Z-Axis slider to the Right Panel allowing Level Designers to isolate telemetry by elevation tiers (e.g., `Elevation < 100`, `100 < Elevation < 500`).
**Business Value:** Identifies unbalanced vertical choke points and map exploits where players safely camp without counterplay.

## 2. Loadout & Meta-Context Integration
**The Problem:** Knowing a player died in Ambrose Valley is good. Knowing *what weapon killed them* is better.
**The Feature:** Hovering over a `kill` or `death` node should pop out a tooltip detailing the TTK (Time to Kill), the exact weapon used, and the victim's loadout tier. Heatmaps should be filterable by "Sniper Kills" vs "Shotgun Kills".
**Business Value:** Allows the core balancing team to see if specific map structures (long sightlines vs tight corridors) are overly biasing the weapon meta, allowing targeted map redesigns to force loadout diversity.

## 3. High-Tier Economic Attrition Modeling
**The Problem:** In an extraction shooter, the economy is everything. "Loot Engagements" are currently binary. We don't know if a player picked up garbage or a legendary artifact.
**The Feature:** Track the lifecycle of high-value items. Plot a specific "Loot Journey" line showing where a legendary item spawned, who killed the owner, and whether it successfully extracted or was lost to the storm. 
**Business Value:** Defines the exact ROI (Return on Investment) of specific map zones. If players never extract with high-tier loot from Grand Rift, the zone becomes dead content.

## 4. Cohort Retention Mapping (The Holy Grail)
**The Problem:** We treat every match as an isolated event. But a player's journey spans dozens of matches.
**The Feature:** Integration with the player retention database. Allow PMs to filter the map by: *Show me the death locations of players who churned (never logged in again) within 24 hours of this match.*
**Business Value:** This directly ties level design to company revenue. If we discover a specific "Death Spiral" zone in Grand Rift that causes 15% of new players to hard-quit the game, fixing that one zone directly increases D1-D7 retention mathematically.

## 5. Live-Ops WebSocket Integration
**The Problem:** The current Python pipeline relies on manual static JSON ingestion. 
**The Feature:** Connect [MapCanvas](file:///C:/My%20Space/My%20Projects/Industrty%20Projects/Lila%20APM/src/components/MapCanvas.jsx#16-272) directly to a WebSocket streaming real-time telemetry from the game servers. 
**Business Value:** When LILA ships a new map update or a live event, the Operations team can watch traffic patterns evolve on the dashboard in real-time, instantly identifying game-breaking bugs, stuck players, or broken AI pathing without waiting for daily batch reports.

## 6. Algorithmic "Kill Box" Detection
**The Problem:** Level Designers currently have to manually stare at heatmaps to find patterns.
**The Feature:** Implement backend clustering algorithms (like DBSCAN) to auto-detect anomalies. The UI would flag alerts: *"Warning: 400% spike in Player Deaths in Ambrose Sector 4 within the last 2 hours."*
**Business Value:** Shifts the tool from passive observation to active alert generation, turning Pathfinder into a true "APM" suite used by site-reliability engineers to monitor game health.

---

### PM Conclusion
V1 proves we can visualize spatial data cleanly and quickly. V2 and V3 are about connecting that spatial data directly to **retention metrics** and **game economy**. By executing this roadmap, LILA Pathfinder becomes the absolute source of truth for every map, economy, and balancing decision made at the studio.
