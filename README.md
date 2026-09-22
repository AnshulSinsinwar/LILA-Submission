# LILA Pathfinder

**Player Journey Visualization Tool** for LILA BLACK telemetry data.

> Built for level designers who think in geometry, not in rows.

## Live Demo

🔗 [Deployed URL on Vercel] *(will be added after deployment)*

## Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.10+ with `pyarrow`, `pandas`, `Pillow`

### 1. Install Dependencies
```bash
npm install
pip install pyarrow pandas Pillow
```

### 2. Preprocess Data
Place the `player_data/` folder in the project root, then run:
```bash
npm run preprocess
```
This converts 1,243 parquet files into 4 optimized JSON files in `public/data/`.

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173)

### 4. Build for Production
```bash
npm run build
npm run preview   # preview the build locally
```

## Features

| Feature | Description |
|---------|-------------|
| **3 Game Maps** | Ambrose Valley, Grand Rift, Lockdown — with optimized WebP minimaps |
| **Player Paths** | Solid blue lines for humans, dashed gray for bots |
| **Event Markers** | Kill (red), Bot Kill (orange), Storm Death (purple), Loot (green) |
| **4 Heatmap Modes** | Traffic, Kill Zones, Death Zones, Loot Density |
| **Bot vs Human Toggle** | Filter heatmaps and paths by player type |
| **Cascading Filters** | Map → Date → Match selector narrows to 20-50 relevant matches |
| **Timeline Playback** | Step-through slider with colored event ticks, 1x/2x/4x speed |
| **Dual-Panel HUD** | Symmetrical UI (Left: Context, Right: Controls) to reduce cognitive load |
| **Simulated SSO & Onboarding** | Premium startup flow with a 3-step feature tutorial modal |

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| React 18 + Vite 5 | UI framework + build tool |
| Konva.js + react-konva | Canvas-based map rendering (4 layers) |
| simpleheat | Lightweight heatmap generation |
| Python (PyArrow, Pandas) | Build-time data preprocessing |
| Vercel | Static hosting + CDN |

## Project Structure

```
├── scripts/preprocess.py    # Parquet → JSON pipeline
├── public/data/             # Generated JSON (3 maps + metadata)
├── public/minimaps/         # Optimized WebP minimaps
├── src/
│   ├── components/          # React UI components
│   ├── hooks/               # Data fetching & filtering logic
│   └── utils/               # Constants & helpers
├── ARCHITECTURE.md          # Technical architecture document
├── INSIGHTS.md              # 3 gameplay insights from the data
└── README.md                # This file
```

## Key Design Decisions

1. **Build-time coordinate mapping** — World coordinates are pre-computed to pixel positions by the Python preprocessor. The frontend never does coordinate math.
2. **Zero runtime backend** — Purely static files served from CDN. No server, no database.
3. **Map-first UX** — The minimap is the central element. All data overlays on it.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full technical details.

## Data Insights

See [INSIGHTS.md](./INSIGHTS.md) for 3 actionable gameplay findings.
