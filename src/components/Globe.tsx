import { useRef, useEffect, useCallback, useState } from 'react';
import Globe from 'react-globe.gl';
import type { GlobePoint } from '../types';

interface GlobeViewProps {
  points: GlobePoint[];
  selectedSpeciesName: string;
  onGlobeClick?: (lat: number, lng: number) => void;
  onPointClick?: (point: GlobePoint) => void;
  autoRotate?: boolean;
}

export function GlobeView({
  points,
  selectedSpeciesName,
  onGlobeClick,
  onPointClick,
  autoRotate = true,
}: GlobeViewProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

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
    ctrl.autoRotate = autoRotate;
    ctrl.autoRotateSpeed = 0.4;
    ctrl.enableDamping = true;
    ctrl.dampingFactor = 0.08;
  }, [autoRotate]);

  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.1 }, 1200);
  }, []);

  const handleClick = useCallback(
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
      const densityLabel =
        pt.weight < 0.35 ? 'Low Density (High Risk)' :
        pt.weight < 0.70 ? 'Moderate Density' : 'High Density (Healthy)';
      const densityColor = pt.color || '#10b981';

      return `
        <div style="
          background: rgba(6, 10, 20, 0.94);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 12px 16px;
          color: #e2e8f0;
          font-family: 'Outfit', -apple-system, sans-serif;
          font-size: 13px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.75), 0 0 15px ${densityColor}44;
          backdrop-filter: blur(12px);
          min-width: 210px;
          pointer-events: none;
        ">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-weight: 700; color: #fff; font-size: 14px; letter-spacing: -0.2px;">
              ${pt.species || selectedSpeciesName}
            </span>
            <span style="
              background: ${densityColor}22;
              border: 1px solid ${densityColor};
              color: ${densityColor};
              font-size: 10px;
              font-weight: 700;
              padding: 2px 7px;
              border-radius: 20px;
              text-transform: uppercase;
            ">
              ${pt.year || '2020'}
            </span>
          </div>

          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 10px;">
            📍 ${pt.locationName || `Lat ${pt.lat}°, Lng ${pt.lng}°`}
          </div>

          <div style="
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            background: rgba(255, 255, 255, 0.04);
            border-radius: 8px;
            padding: 8px 10px;
            border: 1px solid rgba(255, 255, 255, 0.06);
          ">
            <div>
              <div style="font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Eco Risk Status</div>
              <div style="font-weight: 700; color: ${densityColor}; font-size: 11.5px; margin-top: 1px;">${densityLabel}</div>
            </div>
            <div>
              <div style="font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">GBIF Records</div>
              <div style="font-weight: 700; color: #fff; font-size: 12px; margin-top: 1px;">${(pt.rawCount || 1).toLocaleString()} obs</div>
            </div>
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
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        atmosphereColor="#10b981"
        atmosphereAltitude={0.16}
        backgroundColor="rgba(0,0,0,0)"
        // Heatmap points data & styling
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={0.015}
        pointRadius={(d: object) => 0.35 + (d as GlobePoint).weight * 0.7}
        pointColor="color"
        pointsMerge={false}
        pointLabel={getTooltipHtml}
        onPointClick={(pt: object) => onPointClick?.(pt as GlobePoint)}
        onGlobeClick={handleClick}
        animateIn={true}
        rendererConfig={{ antialias: true, alpha: true }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 100,
          background: 'linear-gradient(to top, #05070d 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
