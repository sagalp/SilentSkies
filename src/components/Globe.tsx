import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import type { GlobePoint } from '../types';
import { X, ChevronRight, Compass, ShieldCheck, MapPin, Activity, Layers, Calendar, Navigation } from 'lucide-react';
import { MIGRATION_FLYWAYS, type MigrationArc } from '../hooks/useGBIF';


interface GlobeViewProps {
  points: GlobePoint[];
  selectedSpeciesName: string;
  onGlobeClick?: (lat: number, lng: number) => void;
  onPointClick?: (point: GlobePoint) => void;
  onOpenAnalysis?: () => void;
  autoRotate?: boolean;
  showRoutes?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GlobeComponent = Globe as any;

/** Returns the closest major flyway arc object to given lat/lng */
function getNearestFlywayArc(lat: number, lng: number): MigrationArc {
  let nearest = MIGRATION_FLYWAYS[0];
  let minDist = Infinity;
  for (const arc of MIGRATION_FLYWAYS) {
    const midLat = (arc.startLat + arc.endLat) / 2;
    const midLng = (arc.startLng + arc.endLng) / 2;
    const d = Math.sqrt((lat - midLat) ** 2 + (lng - midLng) ** 2);
    if (d < minDist) {
      minDist = d;
      nearest = arc;
    }
  }
  return nearest;
}

export function GlobeView({
  points,
  selectedSpeciesName,
  onGlobeClick,
  onPointClick,
  onOpenAnalysis,
  autoRotate = true,
  showRoutes = true,
}: GlobeViewProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [activePoint, setActivePoint] = useState<GlobePoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<GlobePoint | null>(null);

  // Clear active point inspector panel whenever species changes
  useEffect(() => {
    setActivePoint(null);
  }, [selectedSpeciesName]);

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
        // Offset longitude slightly (-12deg) so the dot stays centered in the globe space to the left of the side panel
        globeRef.current.pointOfView({ lat: pt.lat, lng: pt.lng - 12, altitude: 1.35 }, 1000);
      }
    },
    [onPointClick]
  );

  const handleCanvasClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ lat, lng }: any) => {
      if (onGlobeClick && lat != null && lng != null) onGlobeClick(lat, lng);
    },
    [onGlobeClick]
  );

  // ── 3D Glowing Beacon Beam Generator (Pillars from Globe Surface to 3D Sphere Dot) ──
  const createBeaconBeam = useCallback((d: object) => {
    const pt = d as GlobePoint;
    const weight = pt.weight || 0.3;
    const colorHex = pt.color || '#52b788';

    // Altitude H in Three.js units (Globe R = 100)
    const altFrac = 0.02 + weight * 0.045;
    const H = altFrac * 100;
    const radiusTop = 0.25 + weight * 0.35;
    const radiusBottom = 0.65 + weight * 0.85;

    const group = new THREE.Group();

    // Beacon beam cylinder extending along Z-axis from ground up to dot center
    const geom = new THREE.CylinderGeometry(radiusTop, radiusBottom, H, 16, 1, true);
    geom.rotateX(Math.PI / 2);
    geom.translate(0, 0, H / 2);

    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geom, mat);
    group.add(mesh);
    return group;
  }, []);

  const updateBeaconBeam = useCallback((obj: THREE.Object3D, d: object) => {
    const pt = d as GlobePoint;
    const isSelected = activePoint?.id === pt.id;
    const isHovered = hoveredPoint?.id === pt.id;
    const colorHex = isSelected ? '#ffffff' : isHovered ? '#00f2fe' : (pt.color || '#52b788');

    obj.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshBasicMaterial;
        mat.color.set(new THREE.Color(colorHex));
        mat.opacity = isSelected ? 0.8 : isHovered ? 0.6 : 0.35;
      }
    });
  }, [activePoint, hoveredPoint]);

  // ── Tooltip HTML for hover labels ──────────────────────────────────────────
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
          background: rgba(7, 17, 26, 0.97);
          border: 1px solid ${densityColor}44;
          border-radius: 14px;
          padding: 13px 16px;
          color: #e8f0ec;
          font-family: 'Space Grotesk', -apple-system, sans-serif;
          font-size: 13px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85), 0 0 24px ${densityColor}33;
          backdrop-filter: blur(20px);
          min-width: 230px;
          pointer-events: none;
        ">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px;">
            <span style="font-weight: 700; color: #fff; font-size: 13.5px; letter-spacing: -0.2px;">
              ${speciesName}
            </span>
            <span style="
              background: ${densityColor}22;
              border: 1px solid ${densityColor}66;
              color: ${densityColor};
              font-size: 10px;
              font-weight: 700;
              padding: 2px 9px;
              border-radius: 20px;
              font-family: 'JetBrains Mono', monospace;
            ">
              ${yearLabel}
            </span>
          </div>

          <div style="font-size: 11px; color: #8da89a; margin-bottom: 10px; display: flex; align-items: center; gap: 4px;">
            📍 ${locName}
          </div>

          <div style="
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 9px;
            padding: 9px 11px;
            border: 1px solid rgba(255, 255, 255, 0.06);
          ">
            <div>
              <div style="font-size: 8.5px; color: #4d6b5c; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 700;">Status</div>
              <div style="font-weight: 700; color: ${densityColor}; font-size: 11.5px; margin-top: 2px;">${riskLabel}</div>
            </div>
            <div>
              <div style="font-size: 8.5px; color: #4d6b5c; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 700;">Records</div>
              <div style="font-weight: 700; color: #e8f0ec; font-size: 11px; margin-top: 2px; font-family: 'JetBrains Mono', monospace;">${obsCount} obs</div>
            </div>
          </div>
          <div style="font-size: 9.5px; color: ${densityColor}; margin-top: 9px; text-align: center; font-weight: 600; letter-spacing: 0.3px;">
            ✦ Click to expand deep analytics
          </div>
        </div>
      `;
    },
    [selectedSpeciesName]
  );

  // Filter routes so that when a dot is clicked, ONLY the connecting migration route is displayed
  const visibleArcs = useMemo(() => {
    if (!showRoutes) return [];
    if (activePoint) {
      const connectedArc = getNearestFlywayArc(activePoint.lat, activePoint.lng);
      return [connectedArc];
    }
    return MIGRATION_FLYWAYS;
  }, [showRoutes, activePoint]);

  const getArcLabel = useCallback((d: object) => {
    const arc = d as MigrationArc;
    return `<div style="
      background: rgba(7,17,26,0.95);
      border: 1px solid ${arc.color}55;
      border-radius: 10px;
      padding: 7px 12px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 11.5px;
      color: ${arc.color};
      font-weight: 700;
      pointer-events: none;
      box-shadow: 0 8px 24px rgba(0,0,0,0.7);
    ">${arc.name}</div>`;
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
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
        atmosphereAltitude={0.15}
        backgroundColor="rgba(0,0,0,0)"

        // Smooth 300ms transitions on data update (no unmounting, camera & zoom stay 100% steady)
        pointTransitionDuration={300}
        ringTransitionDuration={300}

        // ── 3D Glowing Spheres (Smooth 32-res resolution with dynamic scale on hover/active) ──
        pointsData={points}
        pointKey="id"
        pointLat="lat"
        pointLng="lng"
        pointAltitude={(d: object) => {
          const pt = d as GlobePoint;
          const isSelected = activePoint?.id === pt.id;
          const isHovered = hoveredPoint?.id === pt.id;
          const baseAlt = 0.02 + (pt.weight || 0.3) * 0.045;
          if (isSelected) return baseAlt + 0.02;
          if (isHovered) return baseAlt + 0.01;
          return baseAlt;
        }}
        pointRadius={(d: object) => {
          const pt = d as GlobePoint;
          const isSelected = activePoint?.id === pt.id;
          const isHovered = hoveredPoint?.id === pt.id;
          const baseRad = 0.65 + (pt.weight || 0.3) * 0.75;
          if (isSelected) return baseRad * 1.5;
          if (isHovered) return baseRad * 1.3;
          return baseRad;
        }}
        pointColor={(d: object) => {
          const pt = d as GlobePoint;
          if (activePoint && activePoint.id === pt.id) return '#ffffff';
          if (hoveredPoint && hoveredPoint.id === pt.id) return '#00f2fe';
          return pt.color || '#52b788';
        }}
        pointResolution={32}
        pointsMerge={false}
        onPointClick={(pt: object) => handlePointSelect(pt as GlobePoint)}
        onPointHover={(pt: object | null) => {
          setHoveredPoint(pt as GlobePoint | null);
          if (containerRef.current) {
            containerRef.current.style.cursor = pt ? 'pointer' : 'default';
          }
        }}
        pointLabel={getTooltipHtml}

        // ── 3D Glowing Vertical Light Beacons (Pillars from Surface to Dot) ──
        customLayerData={points}
        customLayerKey="id"
        customLat="lat"
        customLng="lng"
        customAltitude={0}
        customThreeObject={createBeaconBeam}
        customThreeObjectUpdate={updateBeaconBeam}

        // ── Dynamic Pulsing Radar Rings on Globe Surface ──
        ringsData={points}
        ringKey="id"
        ringLat="lat"
        ringLng="lng"
        ringAltitude={0.0015}
        ringColor={(d: object) => {
          const pt = d as GlobePoint;
          const hex = pt.color || '#52b788';
          if (activePoint && activePoint.id === pt.id) {
            return ['#ffffffdd', '#ffffff00'];
          }
          if (hoveredPoint && hoveredPoint.id === pt.id) {
            return ['#00f2fedd', '#00f2fe00'];
          }
          return [`${hex}99`, `${hex}00`];
        }}
        ringMaxRadius={(d: object) => {
          const pt = d as GlobePoint;
          const base = 2.5 + (pt.weight || 0.3) * 3.5;
          if (activePoint?.id === pt.id) return base * 1.6;
          if (hoveredPoint?.id === pt.id) return base * 1.3;
          return base;
        }}
        ringPropagationSpeed={(d: object) => {
          const pt = d as GlobePoint;
          if (activePoint?.id === pt.id) return 3.5;
          if (hoveredPoint?.id === pt.id) return 2.8;
          return 1.6 + (pt.weight || 0.3) * 1.2;
        }}
        ringRepeatPeriod={(d: object) => {
          const pt = d as GlobePoint;
          if (activePoint?.id === pt.id) return 850;
          if (hoveredPoint?.id === pt.id) return 1000;
          return 1600;
        }}
        onRingClick={(pt: object) => handlePointSelect(pt as GlobePoint)}
        ringLabel={getTooltipHtml}

        // ── Migration Route Arcs ──
        arcsData={visibleArcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor={(d: object) => {
          const arc = d as MigrationArc;
          return [arc.color + 'ee', arc.color + '22'];
        }}
        arcStroke={activePoint ? 0.95 : 0.55}
        arcDashLength={0.35}
        arcDashGap={0.65}
        arcDashAnimateTime={3500}
        arcAltitudeAutoScale={0.28}
        arcLabel={getArcLabel}

        onGlobeClick={handleCanvasClick}
        animateIn={false}
        rendererConfig={{ antialias: true, alpha: true }}
      />

      {/* ── Point Inspector Side Panel (Side-by-side, Clear Globe, No Blur) ── */}
      {activePoint && (
        <div className="point-inspector-side-container">
          <div className="point-inspector-card glass-panel">
            <div className="inspector-header">
              <div className="inspector-title-group">
                <span
                  className="inspector-dot"
                  style={{ background: activePoint.color || '#52b788' }}
                />
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
              {/* Status Banner */}
              <div
                className="inspector-status-banner"
                style={{
                  background: `${activePoint.color || '#52b788'}15`,
                  borderColor: `${activePoint.color || '#52b788'}44`,
                }}
              >
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
                    <span className="metric-val font-mono">
                      {activePoint.lat.toFixed(2)}°, {activePoint.lng.toFixed(2)}°
                    </span>
                  </div>
                </div>
              </div>

              {/* Ecosystem */}
              <div className="inspector-habitat-section">
                <span className="inspector-section-label">🌿 Primary Ecosystem Classification</span>
                <p className="inspector-habitat-name">{activePoint.habitatType || 'Wetland & Migratory Corridor'}</p>
                <p className="inspector-habitat-desc">
                  This coordinate sector represents a known ecological zone for the selected species.
                  Occurrence density confirms seasonal usage by foraging and migratory groups at this latitude band.
                </p>
              </div>

              {/* Connected Migration Flyway Focus */}
              <div className="inspector-route-section active-focus">
                <span className="inspector-section-label">
                  <Navigation size={10} style={{ display: 'inline', marginRight: 4 }} />
                  Connected Migration Corridor
                </span>
                <p className="inspector-route-name">{getNearestFlywayArc(activePoint.lat, activePoint.lng).name}</p>
                <p className="inspector-route-hint">✦ Globe view focused on this specific flight route</p>
              </div>

              {/* CTA */}
              {onOpenAnalysis && (
                <button
                  className="inspector-action-btn"
                  onClick={() => { setActivePoint(null); onOpenAnalysis(); }}
                >
                  <span>Run AI Deep Analysis on this Region</span>
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom fade */}
      <div
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: 100,
          background: 'linear-gradient(to top, #050a0e 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
