/* Map configs and color constants for LILA Pathfinder */

export const MAP_CONFIG = {
  AmbroseValley: {
    label: 'Ambrose Valley',
    jsonFile: '/data/ambrose_valley.json',
    minimap: '/minimaps/AmbroseValley_Minimap.webp',
  },
  GrandRift: {
    label: 'Grand Rift',
    jsonFile: '/data/grand_rift.json',
    minimap: '/minimaps/GrandRift_Minimap.webp',
  },
  Lockdown: {
    label: 'Lockdown',
    jsonFile: '/data/lockdown.json',
    minimap: '/minimaps/Lockdown_Minimap.webp',
  },
};

export const MAP_IDS = Object.keys(MAP_CONFIG);

export const DATE_OPTIONS = [
  { id: 'February_10', label: 'Feb 10', partial: false },
  { id: 'February_11', label: 'Feb 11', partial: false },
  { id: 'February_12', label: 'Feb 12', partial: false },
  { id: 'February_13', label: 'Feb 13', partial: false },
  { id: 'February_14', label: 'Feb 14', partial: true },
];

// Full event names keyed by short key from preprocessing
export const EVENT_LABELS = {
  P: 'Position',
  BP: 'Bot Position',
  K: 'Kill',
  D: 'Killed',
  BK: 'Bot Kill',
  BD: 'Bot Killed',
  S: 'Storm Death',
  L: 'Loot',
};

// Events that are "interesting" (non-movement)
export const ACTION_EVENTS = ['K', 'D', 'BK', 'BD', 'S', 'L'];

// Heatmap modes
export const HEATMAP_MODES = [
  { id: 'none', label: 'None', color: 'transparent' },
  { id: 'traffic', label: 'Traffic', color: '#4A9EFF' },
  { id: 'kills', label: 'Kill Zones', color: '#FF4C4C' },
  { id: 'deaths', label: 'Death Zones', color: '#9B59B6' },
  { id: 'loot', label: 'Loot Density', color: '#4CAF50' },
];

// Player path palette — warm tones for humans, limited to avoid visual noise
// First 3 are primary (most matches are solo or 2-3 humans)
export const PLAYER_COLORS = [
  '#4FC3F7', // sky blue — primary human
  '#FF8A65', // warm coral
  '#AED581', // soft green
  '#FFD54F', // amber
  '#CE93D8', // soft purple
  '#4DD0E1', // teal
];

export const BOT_COLOR = '#4A5568';
export const BOT_OPACITY = 0.25;
export const HUMAN_OPACITY = 0.6;
export const PATH_WIDTH = 2;
export const BOT_PATH_DASH = [4, 4];

// Event marker colors
export const EVENT_COLORS = {
  K: '#FF4C4C',   // Kill — red
  D: '#FF4C4C',   // Killed — red (slightly different icon)
  BK: '#FF8B4C',  // Bot Kill — orange
  BD: '#FF8B4C',  // Bot Killed — orange
  S: '#9B59B6',   // Storm — purple
  L: '#4CAF50',   // Loot — green
};

export const EVENT_MARKER_RADIUS = {
  K: 6,
  D: 6,
  BK: 5,
  BD: 5,
  S: 6,
  L: 5,
};

// Canvas dimensions (minimap is 1024x1024, we scale to fit)
export const MAP_SIZE = 1024;
