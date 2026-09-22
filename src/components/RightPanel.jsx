import { DATE_OPTIONS, HEATMAP_MODES } from '../utils/constants';
import { formatMatchLabel } from '../utils/dataHelpers';

export default function RightPanel({
  collapsed,
  onToggle,
  selectedDates,
  onDateToggle,
  comparisonMode,
  onComparisonModeChange,
  compareDates,
  onCompareDateToggle,
  selectedMatch,
  onMatchSelect,
  playerType,
  onPlayerTypeChange,
  heatmapMode,
  onHeatmapModeChange,
  layerVisibility,
  onLayerToggle,
  layerCounts,
  filteredMatches,
}) {
  const fmt = n => n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n);
  return (
    <>
      <aside className={`panel panel-right ${collapsed ? 'collapsed' : ''}`} id="right-panel">
        
        {/* ─── Date Filter & Comparison ─── */}
        <div className="sidebar-section date-section">
          <div className="sidebar-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Temporal Range</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', textTransform: 'none', color: 'var(--text-primary)', letterSpacing: 'normal' }}>
              <input type="checkbox" checked={comparisonMode} onChange={(e) => onComparisonModeChange(e.target.checked)} />
              A/B Compare
            </label>
          </div>

          <div className="filter-group" style={{ marginBottom: comparisonMode ? '16px' : '0' }}>
            {comparisonMode && <div className="filter-label" style={{ color: 'var(--accent-blue)', opacity: 0.9 }}>Period A (Blue)</div>}
            <div className="checkbox-group">
              {DATE_OPTIONS.map(date => (
                <label key={date.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedDates.includes(date.id)}
                    onChange={() => onDateToggle(date.id)}
                  />
                  <span className="checkbox-label">{date.label}</span>
                  {date.partial && <span className="checkbox-warning" title="Partial day data">⚠</span>}
                </label>
              ))}
            </div>
          </div>

          {comparisonMode && (
            <div className="filter-group" style={{ marginBottom: 0 }}>
              <div className="filter-label" style={{ color: '#ff4a4a', opacity: 0.9 }}>Period B (Red)</div>
              <div className="checkbox-group">
                {DATE_OPTIONS.map(date => (
                  <label key={`compare-${date.id}`} className="checkbox-item compare-item">
                    <input
                      type="checkbox"
                      checked={compareDates.includes(date.id)}
                      onChange={() => onCompareDateToggle(date.id)}
                    />
                    <span className="checkbox-label">{date.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Entity Type ─── */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Telemetry Subject</div>
          <div className="segmented-control" id="player-type-toggle">
            {['all', 'humans', 'bots'].map(type => (
              <button
                key={type}
                className={`segment ${playerType === type ? 'active' : ''}`}
                onClick={() => onPlayerTypeChange(type)}
              >
                {type === 'all' ? 'All Entities' : type === 'humans' ? 'Humans' : 'Entities (Bots)'}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Match Selector ─── */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Timeline Isolation</div>
          <div className="filter-group">
            <select
              className="filter-select"
              value={selectedMatch || ''}
              onChange={e => onMatchSelect(e.target.value)}
              id="match-selector"
            >
              <option value="">Aggregate View</option>
              {filteredMatches?.map((match, i) => {
                const dot = match.h >= 2 ? '🟢' : match.h === 1 ? '🟡' : '⚫';
                return (
                  <option key={match.id} value={match.id}>
                    {dot} {formatMatchLabel(match, i)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Match Info Card */}
          {selectedMatch && filteredMatches?.length > 0 && (() => {
            const match = filteredMatches.find(m => m.id === selectedMatch);
            if (!match) return null;
            return (
              <div className="match-info" id="match-info-card">
                <div className="match-info-title">{match.id}</div>
                <div className="match-info-stats">
                  <div className="match-stat">
                    <span className="match-stat-label">Humans</span>
                    <span className="match-stat-value humans">{match.h}</span>
                  </div>
                  <div className="match-stat">
                    <span className="match-stat-label">Bots</span>
                    <span className="match-stat-value bots">{match.bc}</span>
                  </div>
                  <div className="match-stat">
                    <span className="match-stat-label">Duration</span>
                    <span className="match-stat-value">{(match.dur / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="match-stat">
                    <span className="match-stat-label">Events</span>
                    <span className="match-stat-value">{Object.values(match.p).reduce((s, p) => s + p.e.length, 0)}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ─── Event Layers ─── */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Event Matrix</div>
          <div
            className={`layer-toggle ${layerVisibility.paths ? '' : 'disabled'}`}
            onClick={() => onLayerToggle('paths')}
          >
            <div className="layer-indicator path" />
            <span className="layer-toggle-label">Traversal Paths</span>
            <span className="layer-count">{fmt(layerCounts?.paths || 0)}</span>
          </div>
          <div
            className={`layer-toggle ${layerVisibility.kills ? '' : 'disabled'}`}
            onClick={() => onLayerToggle('kills')}
          >
            <div className="layer-indicator kill" />
            <span className="layer-toggle-label">PvP Eliminations</span>
            <span className="layer-count">{fmt(layerCounts?.kills || 0)}</span>
          </div>
          <div
            className={`layer-toggle ${layerVisibility.botKills ? '' : 'disabled'}`}
            onClick={() => onLayerToggle('botKills')}
          >
            <div className="layer-indicator botkill" />
            <span className="layer-toggle-label">Bot Eliminations</span>
            <span className="layer-count">{fmt(layerCounts?.botKills || 0)}</span>
          </div>
          <div
            className={`layer-toggle ${layerVisibility.deaths ? '' : 'disabled'}`}
            onClick={() => onLayerToggle('deaths')}
          >
            <div className="layer-indicator death" />
            <span className="layer-toggle-label">Player Deaths</span>
            <span className="layer-count">{fmt(layerCounts?.deaths || 0)}</span>
          </div>
          <div
            className={`layer-toggle ${layerVisibility.storm ? '' : 'disabled'}`}
            onClick={() => onLayerToggle('storm')}
          >
            <div className="layer-indicator storm" />
            <span className="layer-toggle-label">Storm Deaths</span>
            <span className="layer-count">{fmt(layerCounts?.storm || 0)}</span>
          </div>
          <div
            className={`layer-toggle ${layerVisibility.loot ? '' : 'disabled'}`}
            onClick={() => onLayerToggle('loot')}
          >
            <div className="layer-indicator loot" />
            <span className="layer-toggle-label">Loot Engagements</span>
            <span className="layer-count">{fmt(layerCounts?.loot || 0)}</span>
          </div>
        </div>

        {/* ─── Heatmap ─── */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Density Heatmap</div>
          <div className="heatmap-options">
            {HEATMAP_MODES.map(mode => (
              <button
                key={mode.id}
                className={`heatmap-option ${heatmapMode === mode.id ? 'active' : ''}`}
                onClick={() => onHeatmapModeChange(mode.id)}
                id={`heatmap-${mode.id}`}
              >
                <div
                  className="heatmap-dot"
                  style={{ background: mode.color || 'transparent', border: mode.id === 'none' ? '1px solid var(--border)' : 'none' }}
                />
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Legend ─── */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Legend</div>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-line human" />
              <span>Human Path</span>
            </div>
            <div className="legend-item">
              <div className="legend-line bot" />
              <span>Entity Path</span>
            </div>
          </div>
        </div>
      </aside>

      <button
        className={`sidebar-toggle toggle-right ${collapsed ? 'collapsed' : ''}`}
        onClick={onToggle}
        title={collapsed ? 'Show controls' : 'Hide controls'}
        id="right-panel-toggle"
      >
        {collapsed ? '‹' : '›'}
      </button>
    </>
  );
}
