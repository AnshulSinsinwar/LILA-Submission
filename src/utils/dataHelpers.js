/* Data filtering and transformation utilities */

import { ACTION_EVENTS } from './constants';

/**
 * Get all matches from map data, optionally filtered by dates
 */
export function getFilteredMatches(mapData, selectedDates) {
  if (!mapData?.matches) return [];

  return Object.entries(mapData.matches)
    .filter(([, match]) => selectedDates.includes(match.d))
    .map(([id, match]) => ({ id, ...match }));
}

/**
 * Get all players from a set of matches, filtered by player type
 */
export function getPlayersFromMatches(matches, playerType) {
  const players = [];
  for (const match of matches) {
    if (!match.p) continue;
    for (const [userId, playerData] of Object.entries(match.p)) {
      const isBot = playerData.b;
      if (playerType === 'humans' && isBot) continue;
      if (playerType === 'bots' && !isBot) continue;
      players.push({
        userId,
        isBot,
        events: playerData.e,
        matchId: match.id,
        matchDate: match.d,
      });
    }
  }
  return players;
}

/**
 * Extract path points (Position/BotPosition events) from player events
 */
export function getPathPoints(events) {
  return events
    .filter(e => e.t === 'P' || e.t === 'BP')
    .map(e => ({ x: e.px, y: e.py, ts: e.ts }));
}

/**
 * Extract action events (non-movement) from player events
 */
export function getActionEvents(events) {
  return events
    .filter(e => ACTION_EVENTS.includes(e.t))
    .map(e => ({ type: e.t, x: e.px, y: e.py, ts: e.ts }));
}

/**
 * Build heatmap data points from events based on mode
 */
export function getHeatmapPoints(matches, heatmapMode, playerType) {
  const points = [];
  if (heatmapMode === 'none') return points;

  const targetEvents = {
    traffic: ['P', 'BP'],
    kills: ['K', 'BK'],
    deaths: ['D', 'BD', 'S'],
    loot: ['L'],
  };

  const targets = targetEvents[heatmapMode] || [];

  for (const match of matches) {
    if (!match.p) continue;
    for (const [, playerData] of Object.entries(match.p)) {
      const isBot = playerData.b;
      if (playerType === 'humans' && isBot) continue;
      if (playerType === 'bots' && !isBot) continue;

      for (const event of playerData.e) {
        if (targets.includes(event.t)) {
          points.push([event.px, event.py, 1]);
        }
      }
    }
  }
  return points;
}

/**
 * Get all action events across matches for timeline event ticks
 */
export function getAllActionEvents(matches) {
  const events = [];
  for (const match of matches) {
    if (!match.p) continue;
    for (const [, playerData] of Object.entries(match.p)) {
      for (const event of playerData.e) {
        if (ACTION_EVENTS.includes(event.t)) {
          events.push({ type: event.t, ts: event.ts });
        }
      }
    }
  }
  return events.sort((a, b) => a.ts - b.ts);
}

/**
 * Format match label for dropdown: "AV · 4H 2B · Feb 10 · 0.6s"
 */
export function formatMatchLabel(match, index) {
  const dateShort = match.d?.replace('February_', 'Feb ') || '';
  const durMs = match.dur || 0;
  const durLabel = durMs < 1000 ? `${durMs}ms` : `${(durMs / 1000).toFixed(1)}s`;
  return `#${index + 1} · ${match.h}H ${match.bc}B · ${dateShort} · ${durLabel}`;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(ms) {
  if (ms < 1000) return `${ms}ms`;
  const sec = (ms / 1000).toFixed(1);
  return `${sec}s`;
}
