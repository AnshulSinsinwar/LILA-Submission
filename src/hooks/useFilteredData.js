import { useMemo } from 'react';
import {
  getFilteredMatches,
  getPlayersFromMatches,
  getPathPoints,
  getActionEvents,
  getHeatmapPoints,
  getAllActionEvents,
} from '../utils/dataHelpers';

/**
 * Hook that applies all filters and produces render-ready data.
 */
export function useFilteredData(mapData, {
  selectedDates,
  selectedMatch,
  playerType,
  heatmapMode,
  layerVisibility,
  timelineCursor,
}) {
  // 1. Filter matches by date
  const filteredMatches = useMemo(() => {
    return getFilteredMatches(mapData, selectedDates);
  }, [mapData, selectedDates]);

  // 2. If specific match selected, narrow to it
  const activeMatches = useMemo(() => {
    if (selectedMatch) {
      return filteredMatches.filter(m => m.id === selectedMatch);
    }
    return filteredMatches;
  }, [filteredMatches, selectedMatch]);

  // 3. Extract players based on type filter
  const players = useMemo(() => {
    return getPlayersFromMatches(activeMatches, playerType);
  }, [activeMatches, playerType]);

  // 4. Build path data
  const pathData = useMemo(() => {
    if (!layerVisibility.paths) return [];
    return players.map(player => {
      const points = getPathPoints(player.events);
      // Apply timeline cursor filter
      const filteredPoints = timelineCursor != null
        ? points.filter(p => p.ts <= timelineCursor)
        : points;
      return {
        userId: player.userId,
        isBot: player.isBot,
        points: filteredPoints,
      };
    });
  }, [players, layerVisibility.paths, timelineCursor]);

  // 5. Build event marker data
  const eventData = useMemo(() => {
    const events = [];
    for (const player of players) {
      const actionEvents = getActionEvents(player.events);
      for (const event of actionEvents) {
        // Check layer visibility
        if (!isEventVisible(event.type, layerVisibility)) continue;
        // Apply timeline cursor
        if (timelineCursor != null && event.ts > timelineCursor) continue;
        events.push({
          ...event,
          userId: player.userId,
          isBot: player.isBot,
        });
      }
    }
    return events;
  }, [players, layerVisibility, timelineCursor]);

  // 6. Build heatmap points
  const heatmapPoints = useMemo(() => {
    return getHeatmapPoints(activeMatches, heatmapMode, playerType);
  }, [activeMatches, heatmapMode, playerType]);

  // 7. Aggregate stats
  const stats = useMemo(() => {
    const totalMatches = activeMatches.length;
    const totalPlayers = players.length;
    const humanPlayers = players.filter(p => !p.isBot).length;
    const botPlayers = players.filter(p => p.isBot).length;
    const totalEvents = players.reduce((sum, p) => sum + p.events.length, 0);

    return { totalMatches, totalPlayers, humanPlayers, botPlayers, totalEvents };
  }, [activeMatches, players]);

  // 7b. Per-layer event counts for sidebar badges
  const layerCounts = useMemo(() => {
    const counts = { paths: 0, kills: 0, botKills: 0, deaths: 0, botDeaths: 0, storm: 0, loot: 0 };
    for (const player of players) {
      for (const e of player.events) {
        switch (e.t) {
          case 'P': case 'BP': counts.paths++; break;
          case 'K': counts.kills++; break;
          case 'D': counts.deaths++; break;
          case 'BK': counts.botKills++; break;
          case 'BD': counts.botDeaths++; break;
          case 'S': counts.storm++; break;
          case 'L': counts.loot++; break;
        }
      }
    }
    return counts;
  }, [players]);

  // 8. Timeline-related: get all action events for event ticks
  const timelineEvents = useMemo(() => {
    if (!selectedMatch) return [];
    return getAllActionEvents(activeMatches);
  }, [activeMatches, selectedMatch]);

  // 9. Match duration range
  const timeRange = useMemo(() => {
    if (!selectedMatch || activeMatches.length === 0) return { min: 0, max: 0 };
    const match = activeMatches[0];
    return { min: 0, max: match.dur || 0 };
  }, [activeMatches, selectedMatch]);

  return {
    filteredMatches,
    activeMatches,
    players,
    pathData,
    eventData,
    heatmapPoints,
    stats,
    layerCounts,
    timelineEvents,
    timeRange,
  };
}

function isEventVisible(eventType, visibility) {
  switch (eventType) {
    case 'K': return visibility.kills;
    case 'D': return visibility.deaths;
    case 'BK': return visibility.botKills;
    case 'BD': return visibility.botDeaths;
    case 'S': return visibility.storm;
    case 'L': return visibility.loot;
    default: return true;
  }
}
