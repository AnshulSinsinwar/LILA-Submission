import { MAP_CONFIG, MAP_IDS } from '../utils/constants';

export default function LeftPanel({
  selectedMap,
  onMapChange,
  stats,
}) {
  return (
    <aside className="panel panel-left" id="left-panel">
      {/* ─── Brand ─── */}
      <div className="sidebar-section brand-section">
        <div className="header-logo" style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <img src="/lila-logo.png" alt="LILA" style={{ width: '100px', objectFit: 'contain' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '4px', textTransform: 'uppercase', paddingLeft: '2px' }}>Pathfinder</span>
        </div>

        {/* ─── Map Selection ─── */}
        <div className="sidebar-section-title">Select Environment</div>
        <div className="map-tabs" style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'transparent', padding: 0 }}>
          {MAP_IDS.map(mapId => (
            <button
              key={mapId}
              className={`map-tab ${selectedMap === mapId ? 'active' : ''}`}
              onClick={() => onMapChange(mapId)}
              style={{ textAlign: 'left', width: '100%', padding: '12px 16px', borderRadius: '8px' }}
            >
              {MAP_CONFIG[mapId].label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Global Stats ─── */}
      {stats && (
        <div className="sidebar-section" style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
          <div className="sidebar-section-title">Global Telemetry</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="header-stat" style={{ justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Matches Traced</span>
              <span className="header-stat-value">{stats.totalMatches}</span>
            </div>
            <div className="header-stat" style={{ justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Population</span>
              <span className="header-stat-value">{stats.humanPlayers} Hu / {stats.botPlayers} Bot</span>
            </div>
            <div className="header-stat" style={{ justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data Events</span>
              <span className="header-stat-value" style={{ color: 'var(--accent-blue)' }}>{stats.totalEvents?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
