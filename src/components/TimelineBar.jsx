import { useMemo } from 'react';
import { EVENT_COLORS } from '../utils/constants';
import { formatTimestamp } from '../utils/dataHelpers';

const TICK_TYPE_MAP = {
  K: 'kill',
  D: 'death',
  BK: 'botkill',
  BD: 'death',
  S: 'storm',
  L: 'loot',
};

export default function TimelineBar({ visible, playback, timelineEvents }) {
  if (!visible) return null;

  const {
    cursor,
    isPlaying,
    speed,
    togglePlay,
    seek,
    reset,
    cycleSpeed,
    maxTime,
  } = playback;

  // Position event ticks along the timeline
  const ticks = useMemo(() => {
    if (!timelineEvents || maxTime === 0) return [];
    return timelineEvents.map((event, i) => ({
      key: i,
      left: `${(event.ts / maxTime) * 100}%`,
      className: `event-tick ${TICK_TYPE_MAP[event.type] || 'kill'}`,
    }));
  }, [timelineEvents, maxTime]);

  return (
    <div className={`timeline-bar ${!visible ? 'hidden' : ''}`} id="timeline-bar">
      {/* Controls */}
      <div className="timeline-controls">
        <button
          className={`timeline-btn ${isPlaying ? 'active' : ''}`}
          onClick={togglePlay}
          title={isPlaying ? 'Pause' : 'Play'}
          id="play-pause-btn"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button
          className="timeline-btn"
          onClick={reset}
          title="Reset to start"
          id="reset-btn"
        >
          ⏮
        </button>
        <button
          className="speed-badge"
          onClick={cycleSpeed}
          title="Cycle playback speed"
          id="speed-btn"
        >
          {speed}x
        </button>
      </div>

      {/* Slider + Event Ticks */}
      <div className="timeline-slider-container">
        <div className="event-ticks" id="event-ticks">
          {ticks.map(tick => (
            <div
              key={tick.key}
              className={tick.className}
              style={{ left: tick.left }}
            />
          ))}
        </div>
        <input
          type="range"
          className="timeline-slider"
          min={0}
          max={maxTime}
          value={cursor}
          onChange={e => seek(Number(e.target.value))}
          id="timeline-slider"
        />
      </div>

      {/* Time Display */}
      <div className="timeline-time" id="timeline-time">
        {formatTimestamp(cursor)} / {formatTimestamp(maxTime)}
      </div>
    </div>
  );
}
