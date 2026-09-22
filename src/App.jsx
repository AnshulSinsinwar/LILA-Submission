import { useState, useCallback, useEffect } from 'react';
import { MAP_IDS, DATE_OPTIONS } from './utils/constants';
import { useMapData, useMetadata } from './hooks/useMapData';
import { useFilteredData } from './hooks/useFilteredData';
import { usePlayback } from './hooks/usePlayback';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import MapCanvas from './components/MapCanvas';
import TimelineBar from './components/TimelineBar';
import Login from './components/Login';
import TutorialModal from './components/TutorialModal';

const DEFAULT_DATES = DATE_OPTIONS.filter(d => !d.partial).map(d => d.id);

// Read initial state from URL on first paint
function getInitialState() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    map: params.get('map') || MAP_IDS[0],
    dates: params.get('dates') ? params.get('dates').split(',') : DEFAULT_DATES,
    compareMode: params.get('compareMode') === 'true',
    compareDates: params.get('compareDates') ? params.get('compareDates').split(',') : ['February_12', 'February_13'],
    match: params.get('match') || null,
    player: params.get('player') || 'all',
    heatmap: params.get('heatmap') || 'traffic',
  };
}

export default function App() {
  // ─── Global State ─────────────────────────────────────────────
  const init = getInitialState();
  const [selectedMap, setSelectedMap] = useState(init.map);
  const [selectedDates, setSelectedDates] = useState(init.dates);
  const [comparisonMode, setComparisonMode] = useState(init.compareMode);
  const [compareDates, setCompareDates] = useState(init.compareDates);
  const [selectedMatch, setSelectedMatch] = useState(init.match);
  const [playerType, setPlayerType] = useState(init.player);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState(init.heatmap);
  const [layerVisibility, setLayerVisibility] = useState({
    paths: true,
    kills: true,
    deaths: true,
    botKills: true,
    botDeaths: true,
    storm: true,
    loot: true,
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('lila_auth') === 'true';
  });

  const [showTutorial, setShowTutorial] = useState(() => {
    return localStorage.getItem('lila_tutorial_seen') !== 'true';
  });

  const handleLogin = useCallback(() => {
    localStorage.setItem('lila_auth', 'true');
    setIsAuthenticated(true);
  }, []);

  const handleDismissTutorial = useCallback(() => {
    localStorage.setItem('lila_tutorial_seen', 'true');
    setShowTutorial(false);
  }, []);

  // Sync state back to URL automatically without triggering reload
  useEffect(() => {
    const params = new URLSearchParams({
      map: selectedMap,
      dates: selectedDates.join(','),
      compareMode: comparisonMode,
      compareDates: compareDates.join(','),
      player: playerType,
      heatmap: heatmapMode,
    });
    if (selectedMatch) params.set('match', selectedMatch);
    window.history.replaceState({}, '', `?${params.toString()}`);
  }, [selectedMap, selectedDates, comparisonMode, compareDates, playerType, heatmapMode, selectedMatch]);

  // ─── Data Loading ─────────────────────────────────────────────
  const { metadata } = useMetadata();
  const { data: mapData, loading: mapLoading } = useMapData(selectedMap);

  // ─── Filtering ────────────────────────────────────────────────
  const filteredResult = useFilteredData(mapData, {
    selectedDates,
    selectedMatch,
    playerType,
    heatmapMode,
    layerVisibility,
    timelineCursor: selectedMatch ? undefined : null, // will be connected to playback
  });

  // ─── Playback ─────────────────────────────────────────────────
  const playback = usePlayback(filteredResult.timeRange);

  // Re-compute filtered data with playback cursor when in match mode
  const finalResult = useFilteredData(mapData, {
    selectedDates,
    selectedMatch,
    playerType,
    heatmapMode,
    layerVisibility,
    timelineCursor: selectedMatch ? playback.cursor : null,
  });

  // Second pass for comparison mode
  const compareResult = useFilteredData(mapData, {
    selectedDates: compareDates,
    selectedMatch,
    playerType,
    heatmapMode,
    layerVisibility,
    timelineCursor: selectedMatch ? playback.cursor : null,
  });

  // ─── Handlers ─────────────────────────────────────────────────
  const handleMapChange = useCallback((mapId) => {
    setSelectedMap(mapId);
    setSelectedMatch(null);
  }, []);

  const handleDateToggle = useCallback((dateId) => {
    setSelectedDates(prev => {
      if (prev.includes(dateId)) {
        if (prev.length <= 1) return prev; // keep at least one
        return prev.filter(d => d !== dateId);
      }
      return [...prev, dateId];
    });
    setSelectedMatch(null);
  }, []);

  const handleCompareDateToggle = useCallback((dateId) => {
    setCompareDates(prev => {
      if (prev.includes(dateId)) {
        if (prev.length <= 1) return prev;
        return prev.filter(d => d !== dateId);
      }
      return [...prev, dateId];
    });
    setSelectedMatch(null);
  }, []);

  const handleMatchSelect = useCallback((matchId) => {
    setSelectedMatch(matchId || null);
  }, []);

  const handleLayerToggle = useCallback((layer) => {
    setLayerVisibility(prev => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  // ─── Render ───────────────────────────────────────────────────
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className={`app ${selectedMatch ? 'has-timeline' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : 'has-sidebar'}`}>
      {showTutorial && <TutorialModal onDismiss={handleDismissTutorial} />}
      <div className="main-layout">
        <LeftPanel
          selectedMap={selectedMap}
          onMapChange={handleMapChange}
          stats={finalResult.stats}
        />
        <RightPanel
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(prev => !prev)}
          selectedDates={selectedDates}
          onDateToggle={handleDateToggle}
          comparisonMode={comparisonMode}
          onComparisonModeChange={setComparisonMode}
          compareDates={compareDates}
          onCompareDateToggle={handleCompareDateToggle}
          selectedMatch={selectedMatch}
          onMatchSelect={handleMatchSelect}
          playerType={playerType}
          onPlayerTypeChange={setPlayerType}
          heatmapMode={heatmapMode}
          onHeatmapModeChange={setHeatmapMode}
          layerVisibility={layerVisibility}
          onLayerToggle={handleLayerToggle}
          layerCounts={finalResult.layerCounts}
          filteredMatches={filteredResult.filteredMatches}
        />
        <MapCanvas
          selectedMap={selectedMap}
          pathData={finalResult.pathData}
          eventData={finalResult.eventData}
          heatmapPoints={finalResult.heatmapPoints}
          compareHeatmapPoints={compareResult.heatmapPoints}
          comparisonMode={comparisonMode}
          heatmapMode={heatmapMode}
          loading={mapLoading}
          selectedMatch={selectedMatch}
        />
      </div>
      <TimelineBar
        visible={!!selectedMatch}
        playback={playback}
        timelineEvents={finalResult.timelineEvents}
      />
    </div>
  );
}
