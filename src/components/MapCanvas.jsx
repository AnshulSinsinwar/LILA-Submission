import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle } from 'react-konva';
import {
  MAP_CONFIG,
  MAP_SIZE,
  PLAYER_COLORS,
  BOT_COLOR,
  BOT_OPACITY,
  HUMAN_OPACITY,
  PATH_WIDTH,
  BOT_PATH_DASH,
  EVENT_COLORS,
  EVENT_MARKER_RADIUS,
} from '../utils/constants';

export default function MapCanvas({
  selectedMap,
  pathData,
  eventData,
  heatmapPoints,
  compareHeatmapPoints,
  comparisonMode,
  heatmapMode,
  loading,
  selectedMatch,
}) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [minimapImage, setMinimapImage] = useState(null);
  const heatCanvasRef = useRef(null);
  const [heatmapImageObj, setHeatmapImageObj] = useState(null);
  const [heatmapImageObjB, setHeatmapImageObjB] = useState(null);

  // ─── Resize handling ──────────────────────────────────────────
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // ─── Scale to fit container while maintaining aspect ratio ───
  const availableHeight = selectedMatch ? dimensions.height - 112 : dimensions.height;
  
  const scale = useMemo(() => {
    const scaleX = dimensions.width / MAP_SIZE;
    const scaleY = availableHeight / MAP_SIZE;
    return Math.min(scaleX, scaleY) * 0.98; // 98% keeps a small breathing room
  }, [dimensions.width, availableHeight]);

  const offsetX = (dimensions.width - MAP_SIZE * scale) / 2;
  const offsetY = (availableHeight - MAP_SIZE * scale) / 2;

  // ─── Load minimap image ───────────────────────────────────────
  useEffect(() => {
    if (!selectedMap || !MAP_CONFIG[selectedMap]) return;

    const img = new window.Image();
    img.src = MAP_CONFIG[selectedMap].minimap;
    img.onload = () => setMinimapImage(img);
    img.onerror = () => {
      console.error('Failed to load minimap:', MAP_CONFIG[selectedMap].minimap);
      // Try the original format as fallback
      const fallbackSrc = MAP_CONFIG[selectedMap].minimap.replace('.webp', selectedMap === 'Lockdown' ? '.jpg' : '.png');
      const fallbackImg = new window.Image();
      fallbackImg.src = fallbackSrc;
      fallbackImg.onload = () => setMinimapImage(fallbackImg);
    };
  }, [selectedMap]);

  // ─── Generate heatmap canvas ──────────────────────────────────
  useEffect(() => {
    if (heatmapMode === 'none') {
      setHeatmapImageObj(null);
      setHeatmapImageObjB(null);
      return;
    }

    // Import simpleheat dynamically
    import('simpleheat').then(({ default: simpleheat }) => {
      // Period A Canvas (or regular if not comparing)
      if (heatmapPoints && heatmapPoints.length > 0) {
        const canvasA = document.createElement('canvas');
        canvasA.width = MAP_SIZE;
        canvasA.height = MAP_SIZE;
        const heatA = simpleheat(canvasA);
        heatA.data(heatmapPoints);
        
        const isAggregate = !selectedMatch;
        const pointCount = heatmapPoints.length;
        const isSparse = pointCount < 500;
        const radius = isSparse ? 25 : (isAggregate ? 12 : 20);
        const blur = isSparse ? 35 : (isAggregate ? 18 : 28);
        heatA.radius(radius, blur);
        heatA.max(Math.max(2, Math.min(pointCount / (isAggregate ? 200 : 30), 20)));
        
        if (comparisonMode) {
          // Blue gradient for Period A
          heatA.gradient({ 0.2: 'rgba(66, 135, 245, 0.4)', 0.6: 'rgba(66, 135, 245, 0.8)', 1.0: 'rgb(66, 135, 245)' });
        }
        
        heatA.draw(isSparse ? 0.02 : 0.03);
        const imgA = new window.Image();
        imgA.src = canvasA.toDataURL();
        imgA.onload = () => setHeatmapImageObj(imgA);
      } else {
        setHeatmapImageObj(null);
      }
      
      // Period B Canvas
      if (comparisonMode && compareHeatmapPoints && compareHeatmapPoints.length > 0) {
        const canvasB = document.createElement('canvas');
        canvasB.width = MAP_SIZE;
        canvasB.height = MAP_SIZE;
        const heatB = simpleheat(canvasB);
        heatB.data(compareHeatmapPoints);
        
        const pointCountB = compareHeatmapPoints.length;
        const isSparseB = pointCountB < 500;
        const radiusB = isSparseB ? 25 : (!selectedMatch ? 12 : 20);
        const blurB = isSparseB ? 35 : (!selectedMatch ? 18 : 28);
        heatB.radius(radiusB, blurB);
        heatB.max(Math.max(2, Math.min(pointCountB / (!selectedMatch ? 200 : 30), 20)));
        
        // Red gradient for Period B
        heatB.gradient({ 0.2: 'rgba(255, 76, 76, 0.4)', 0.6: 'rgba(255, 76, 76, 0.8)', 1.0: 'rgb(255, 76, 76)' });
        
        heatB.draw(isSparseB ? 0.02 : 0.03);
        const imgB = new window.Image();
        imgB.src = canvasB.toDataURL();
        imgB.onload = () => setHeatmapImageObjB(imgB);
      } else {
        setHeatmapImageObjB(null);
      }
    }).catch(err => {
      console.warn('simpleheat not available:', err);
    });
  }, [heatmapPoints, compareHeatmapPoints, heatmapMode, selectedMatch, comparisonMode]);

  // ─── Assign colors to human players ───────────────────────────
  const playerColorMap = useMemo(() => {
    const map = {};
    let colorIndex = 0;
    if (pathData) {
      for (const player of pathData) {
        if (!player.isBot && !map[player.userId]) {
          map[player.userId] = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
          colorIndex++;
        }
      }
    }
    return map;
  }, [pathData]);

  // ─── Render ───────────────────────────────────────────────────
  // Never block on loading — show minimap immediately, overlay loading badge

  return (
    <div className="map-container" ref={containerRef} id="map-canvas">
      <Stage
        width={dimensions.width}
        height={dimensions.height}
      >
        {/* Layer 1: Minimap Image */}
        <Layer>
          {minimapImage && (
            <KonvaImage
              image={minimapImage}
              x={offsetX}
              y={offsetY}
              width={MAP_SIZE * scale}
              height={MAP_SIZE * scale}
            />
          )}
        </Layer>

        {/* Layer 2: Player Paths */}
        <Layer>
          {pathData?.map((player, idx) => {
            if (player.points.length < 2) return null;
            const flatPoints = [];
            for (const pt of player.points) {
              flatPoints.push(offsetX + pt.x * scale);
              flatPoints.push(offsetY + pt.y * scale);
            }
            return (
              <Line
                key={`path-${player.userId}-${idx}`}
                points={flatPoints}
                stroke={player.isBot ? BOT_COLOR : (playerColorMap[player.userId] || PLAYER_COLORS[0])}
                strokeWidth={PATH_WIDTH}
                opacity={player.isBot ? BOT_OPACITY : HUMAN_OPACITY}
                dash={player.isBot ? BOT_PATH_DASH : undefined}
                lineCap="round"
                lineJoin="round"
                tension={0.3}
                listening={false}
              />
            );
          })}
        </Layer>

        {/* Layer 3: Event Markers */}
        <Layer>
          {eventData?.slice(0, selectedMatch ? 500 : 200).map((event, idx) => {
            const color = EVENT_COLORS[event.type] || '#fff';
            const radius = EVENT_MARKER_RADIUS[event.type] || 5;
            const markerScale = selectedMatch ? Math.max(0.5, scale) : Math.max(0.4, scale * 0.7);
            return (
              <Circle
                key={`event-${idx}`}
                x={offsetX + event.x * scale}
                y={offsetY + event.y * scale}
                radius={radius * markerScale}
                fill={color}
                opacity={selectedMatch ? 0.85 : 0.65}
                stroke="#000"
                strokeWidth={selectedMatch ? 1 : 0.5}
                listening={false}
              />
            );
          })}
        </Layer>

        {/* Layer 4: Heatmap Overlay */}
        <Layer>
          {heatmapImageObj && heatmapMode !== 'none' && (
            <KonvaImage
              image={heatmapImageObj}
              x={offsetX}
              y={offsetY}
              width={MAP_SIZE * scale}
              height={MAP_SIZE * scale}
              opacity={0.6}
              globalCompositeOperation={comparisonMode ? 'screen' : 'source-over'}
              listening={false}
            />
          )}
          {comparisonMode && heatmapImageObjB && heatmapMode !== 'none' && (
            <KonvaImage
              image={heatmapImageObjB}
              x={offsetX}
              y={offsetY}
              width={MAP_SIZE * scale}
              height={MAP_SIZE * scale}
              opacity={0.6}
              globalCompositeOperation="screen"
              listening={false}
            />
          )}
        </Layer>
      </Stage>
      {loading && (
        <div className="map-loading-badge">
          <div className="spinner" />
          <span>Loading telemetry...</span>
        </div>
      )}
    </div>
  );
}
