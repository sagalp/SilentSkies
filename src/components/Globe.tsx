import { useRef, useEffect, useCallback, useState } from 'react';
import Globe from 'react-globe.gl';
import type { GlobePoint } from '../types';
import { X, ChevronRight, Compass, ShieldCheck, MapPin, Activity, Layers, Calendar } from 'lucide-react';

interface GlobeViewProps {
  points: GlobePoint[];
  selectedSpeciesName: string;
  onGlobeClick?: (lat: number, lng: number) => void;
  onPointClick?: (point: GlobePoint) => void;
  onOpenAnalysis?: () => void;
  autoRotate?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GlobeComponent = Globe as any;

export function GlobeView({
  points,
  selectedSpeciesName,
  onGlobeClick,
  onPointClick,
  onOpenAnalysis,
  autoRotate = true,
}: GlobeViewProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [activePoint, setActivePoint] = useState<GlobePoint | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) setSize({ width, height });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    const ctrl = globeRef.current.controls();
    ctrl.autoRotate = autoRotate && !activePoint;
    ctrl.autoRotateSpeed = 0.4;
    ctrl.enableDamping = true;
    ctrl.dampingFactor = 0.08;
  }, [autoRotate, activePoint]);

  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.pointOfView({ lat: 25, lng: 10, altitude: 2.1 }, 1200);
  }, []);

  const handlePointSelect = useCallback(
    (pt: GlobePoint) => {
      setActivePoint(pt);
      onPointClick?.(pt);

      if (globeRef.current && pt.lat != null && pt.lng != null) {
        globeRef.current.pointOfView(
          { lat: pt.lat, lng: pt.lng, altitude: 1.4 },
          1000
        );
      }
    },
    [onPointClick]
  );

  const handleCanvasClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ lat, lng }: any) => {
      if (onGlobeClick && lat != null && lng != null) {
        onGlobeClick(lat, lng);
      }
    },
    [onGlobeClick]
  );

  const getTooltipHtml = useCallback(
    (d: object) => {
      const pt = d as GlobePoint;
      const densityColor = pt.color || '#52b788';
      const riskLabel = pt.riskRating || (pt.weight >= 0.65 ? 'Healthy Corridor' : pt.weight >= 0.35 ? 'Moderate Density' : 'Low Density');
      const speciesName = pt.species || selectedSpeciesName;
      const yearLabel = pt.year || 2020;
      const locName = pt.locationName || `Lat ${pt.lat}°, Lng ${pt.lng}°`;
      const obsCount = (pt.rawCount || 1).toLocaleString();

      return `
        <div style="
          background: rgba(7, 17, 26, 0.95);
          border: 1px solid rgba(82, 183, 136, 0.22);
          border-radius: 14px;
          padding: 12px 16px;
          color: #e8f0ec;
          font-family: 'Space Grotesk', -apple-system, sans-serif;
          font-size: 13px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 20px ${densityColor}33;
          backdrop-filter: blur(16px);
          min-width: 220px;
          pointer-events: none;
        ">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-weight: 700; color: #fff; font-size: 13.5px; letter-spacing: -0.2px;">
              ${speciesName}
            </span>
            <span style="
              background: ${densityColor}18;
              border: 1px solid ${densityColor}66;
              color: ${densityColor};
              font-size: 10px;
              font-weight: 700;
              padding: 2px 8px;
              border-radius: 20px;
              font-family: 'JetBrains Mono', monospace;
            ">
              ${yearLabel}
            </span>
          </div>

          <div style="font-size: 11px; color: #8da89a; margin-bottom: 9px; display: flex; align-items: center; gap: 4px;">
            📍 ${locName}
          </div>

          <div style="
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 8px;
            padding: 8px 10px;
            border: 1px solid rgba(255, 255, 255, 0.05);
          ">
            <div>
              <div style="font-size: 8.5px; color: #4d6b5c; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 700;">Cluster Status</div>
              <div style="font-weight: 700; color: ${densityColor}; font-size: 11px; margin-top: 2px;">${riskLabel}</div>
            </div>
            <div>
              <div style="font-size: 8.5px; color: #4d6b5c; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 700;">Records</div>
              <div style="font-weight: 700; color: #e8f0ec; font-size: 11px; margin-top: 2px; font-family: 'JetBrains Mono', monospace;">${obsCount} obs</div>
            </div>
          </div>
          <div style="font-size: 9.5px; color: #52b788; margin-top: 8px; text-align: center; font-weight: 600;">
            ✦ Click point to expand deep analytics
          </div>
        </div>
      `;
    },
    [selectedSpeciesName]
  );

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <GlobeComponent
        ref={globeRef}
        width={size.width}
        height={size.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        atmosphereColor="#52b788"
        atmosphereAltitude={0.18}
        backgroundColor="rgba(0,0,0,0)"
        // Glowing 3D Beacons Data
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={(d: object) => 0.012 + ((d as GlobePoint).weight || 0.1) * 0.045}
        pointRadius={(d: object) => 0.45 + ((d as GlobePoint).weight || 0.1) * 0.8}
        pointColor="color"
        pointsMerge={false}
        pointLabel={getTooltipHtml}

        // Radar Glowing Rings Layer
        ringsData={points}
        ringLat="lat"
        ringLng="lng"
        ringColor={(d: object) => (d as GlobePoint).color || '#52b788'}
        ringMaxRadius={(d: object) => 2.2 + ((d as GlobePoint).weight || 0.3) * 4.2}
        ringPropagationSpeed={(d: object) => 1.2 + ((d as GlobePoint).weight || 0.3) * 2.0}
        ringRepeatPeriod={1600}

        onPointClick={(pt: object) => handlePointSelect(pt as GlobePoint)}
        onGlobeClick={handleCanvasClick}
        animateIn={true}
        rendererConfig={{ antialias: true, alpha: true }}
      />

      {/* Expanded Cluster Telemetry Inspector Modal Overlay */}
      {activePoint && (
        <div className="point-inspector-card glass-panel">
          <div className="inspector-header">
            <div className="inspector-title-group">
              <span className="inspector-dot" style={{ background: activePoint.color || '#52b788' }} />
              <div>
                <h3 className="inspector-species">{activePoint.species || selectedSpeciesName}</h3>
                <p className="inspector-location">
                  <MapPin size={11} /> {activePoint.locationName}
                </p>
              </div>
            </div>
            <button className="close-btn" onClick={() => setActivePoint(null)} aria-label="Close Inspector">
              <X size={15} />
            </button>
          </div>

          <div className="inspector-body">
            {/* Status Header Pill */}
            <div className="inspector-status-banner" style={{ background: `${activePoint.color || '#52b788'}15`, borderColor: `${activePoint.color || '#52b788'}44` }}>
              <Activity size={14} style={{ color: activePoint.color }} />
              <div>
                <span className="inspector-status-title" style={{ color: activePoint.color }}>
                  {activePoint.riskRating || 'Cluster Observation Area'}
                </span>
                <span className="inspector-status-sub">
                  Density Weight: {Math.round((activePoint.weight || 0.5) * 100)}/100
                </span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="inspector-metrics-grid">
              <div className="inspector-metric-box">
                <span className="metric-icon"><Layers size={13} /></span>
                <div>
                  <span className="metric-label">Aggregated Obs</span>
                  <span className="metric-val font-mono">{(activePoint.rawCount || 1).toLocaleString()} records</span>
                </div>
              </div>

              <div className="inspector-metric-box">
                <span className="metric-icon"><Compass size={13} /></span>
                <div>
                  <span className="metric-label">Merged Sites</span>
                  <span className="metric-val">{activePoint.clusterSize || 1} spatial clusters</span>
                </div>
              </div>

              <div className="inspector-metric-box">
                <span className="metric-icon"><Calendar size={13} /></span>
                <div>
                  <span className="metric-label">Peak Activity</span>
                  <span className="metric-val">{activePoint.peakMonth || 'May – June'}</span>
                </div>
              </div>

              <div className="inspector-metric-box">
                <span className="metric-icon"><ShieldCheck size={13} /></span>
                <div>
                  <span className="metric-label">Coordinates</span>
                  <span className="metric-val font-mono">{activePoint.lat.toFixed(2)}°, {activePoint.lng.toFixed(2)}°</span>
                </div>
              </div>
            </div>

            {/* Habitat & Environmental Analysis */}
            <div className="inspector-habitat-section">
              <span className="inspector-section-label">🌿 Primary Ecosystem Classification</span>
              <p className="inspector-habitat-name">{activePoint.habitatType || 'Wetland & Migratory Corridor'}</p>
              <p className="inspector-habitat-desc">
                This coordinate sector represents a critical refueling hub along the seasonal flight path. High occurrence density confirms heavy seasonal usage by foraging groups.
              </p>
            </div>

            {/* Deep Analysis CTA */}
            {onOpenAnalysis && (
              <button
                className="inspector-action-btn"
                onClick={() => {
                  setActivePoint(null);
                  onOpenAnalysis();
                }}
              >
                <span>Run AI Deep Analysis on this Region</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 100,
          background: 'linear-gradient(to top, #050a0e 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
