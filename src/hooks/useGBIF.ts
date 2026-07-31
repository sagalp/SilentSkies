import { useState, useEffect, useCallback, useRef } from 'react';
import type { GlobePoint, OccurrencePoint } from '../types';

const GBIF_BASE = 'https://api.gbif.org/v1';
const CACHE = new Map<string, { occurrences: OccurrencePoint[]; total: number }>();

interface UseGBIFOptions {
  taxonKey: string;
  year: number;
  limit?: number;
}

interface UseGBIFReturn {
  points: GlobePoint[];
  loading: boolean;
  error: string | null;
  totalCount: number;
}

// 3-tier ecological color scale matching the legend 1-to-1:
// 🔴 Red #ef4444: Low Density (< 35%) = High Ecological Risk
// 🟡 Amber #f59e0b: Moderate Density (35% - 70%) = Moderate Risk
// 🟢 Emerald #10b981: High Density (>= 70%) = Healthy Population
function weightToColor(weight: number): string {
  if (weight < 0.35) return '#ef4444'; // Red = Low density / High risk
  if (weight < 0.70) return '#f59e0b'; // Amber = Moderate density
  return '#10b981';                   // Emerald = High density / Healthy
}

export function generateDemoPoints(taxonKey: string, year: number, speciesName = 'Migratory Bird'): GlobePoint[] {
  const seed = taxonKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = (i: number) => {
    const x = Math.sin(seed + i * 17.3 + year * 0.1) * 10000;
    return x - Math.floor(x);
  };

  const isDecline = seed % 3 !== 0;
  const declineFactor = isDecline ? Math.max(0.25, 1 - (year - 2000) * 0.018) : 1;
  const numPoints = Math.round((90 + rng(0) * 140) * declineFactor);

  const flyways = [
    { name: 'Atlantic Americas Flyway', lat: 42, lng: -75, spread: 22 },
    { name: 'Mississippi Flyway', lat: 36, lng: -90, spread: 24 },
    { name: 'East Asian-Australasian Flyway', lat: 32, lng: 118, spread: 25 },
    { name: 'East Atlantic Flyway', lat: 51, lng: 7, spread: 20 },
    { name: 'Black Sea-Mediterranean Flyway', lat: 38, lng: 24, spread: 18 },
    { name: 'Central Asian Flyway', lat: 48, lng: 68, spread: 22 },
  ];

  const points: GlobePoint[] = [];
  for (let i = 0; i < numPoints; i++) {
    const fw = flyways[Math.floor(rng(i * 3) * flyways.length)];
    const lat = Number((Math.max(-75, Math.min(75, fw.lat + (rng(i * 7) - 0.5) * fw.spread))).toFixed(2));
    const lng = Number((fw.lng + (rng(i * 11) - 0.5) * fw.spread * 1.6).toFixed(2));
    const weight = Number((0.25 + rng(i * 13) * 0.75).toFixed(2));
    const rawCount = Math.round(weight * 850 + rng(i * 17) * 400);

    points.push({
      lat,
      lng,
      weight,
      rawCount,
      species: speciesName,
      locationName: `${fw.name} (${lat > 0 ? `${lat}°N` : `${Math.abs(lat)}°S`}, ${lng > 0 ? `${lng}°E` : `${Math.abs(lng)}°W`})`,
      year,
      color: weightToColor(weight),
    });
  }
  return points;
}

function mapToGlobePoints(occurrences: OccurrencePoint[], speciesName: string, year: number): GlobePoint[] {
  if (occurrences.length === 0) return [];

  const grid = new Map<string, { lat: number; lng: number; count: number; country?: string; state?: string }>();
  for (const o of occurrences) {
    const gridLat = Math.round(o.lat * 1.5) / 1.5;
    const gridLng = Math.round(o.lng * 1.5) / 1.5;
    const key = `${gridLat},${gridLng}`;
    if (grid.has(key)) {
      grid.get(key)!.count += o.count || 1;
    } else {
      grid.set(key, { lat: gridLat, lng: gridLng, count: o.count || 1, country: o.country, state: o.stateProvince });
    }
  }

  const cells = Array.from(grid.values());
  const maxCount = Math.max(...cells.map(c => c.count), 1);

  return cells.map(c => {
    const weight = Number((c.count / maxCount).toFixed(2));
    const loc = [c.state, c.country].filter(Boolean).join(', ') || `${c.lat > 0 ? `${c.lat}°N` : `${Math.abs(c.lat)}°S`}, ${c.lng > 0 ? `${c.lng}°E` : `${Math.abs(c.lng)}°W`}`;
    return {
      lat: c.lat,
      lng: c.lng,
      weight,
      rawCount: c.count,
      species: speciesName,
      locationName: loc,
      year,
      color: weightToColor(weight),
    };
  });
}

export function useGBIF({ taxonKey, year, limit = 400 }: UseGBIFOptions): UseGBIFReturn {
  const [points, setPoints] = useState<GlobePoint[]>(() => generateDemoPoints(taxonKey, year));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchOccurrences = useCallback(async () => {
    const cacheKey = `${taxonKey}-${year}`;

    if (CACHE.has(cacheKey)) {
      const cached = CACHE.get(cacheKey)!;
      const mapped = mapToGlobePoints(cached.occurrences, 'Species', year);
      setPoints(mapped.length > 0 ? mapped : generateDemoPoints(taxonKey, year));
      setTotalCount(cached.total);
      setLoading(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        taxonKey,
        year: String(year),
        hasCoordinate: 'true',
        hasGeospatialIssue: 'false',
        limit: String(limit),
        offset: '0',
      });

      const res = await fetch(`${GBIF_BASE}/occurrence/search?${params}`, {
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`GBIF error: ${res.status}`);

      const data = await res.json();
      const occurrences: OccurrencePoint[] = (data.results || [])
        .filter((r: { decimalLatitude?: number; decimalLongitude?: number }) =>
          r.decimalLatitude != null && r.decimalLongitude != null
        )
        .map((r: { decimalLatitude: number; decimalLongitude: number; species?: string; country?: string; stateProvince?: string }) => ({
          lat: r.decimalLatitude,
          lng: r.decimalLongitude,
          count: 1,
          year,
          species: r.species || 'Species',
          country: r.country,
          stateProvince: r.stateProvince,
        }));

      const total = data.count || occurrences.length;
      CACHE.set(cacheKey, { occurrences, total });

      setTotalCount(total);
      if (occurrences.length > 0) {
        const speciesName = occurrences[0]?.species || 'Species';
        setPoints(mapToGlobePoints(occurrences, speciesName, year));
      } else {
        setPoints(generateDemoPoints(taxonKey, year));
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message);
        setPoints(generateDemoPoints(taxonKey, year));
      }
    } finally {
      setLoading(false);
    }
  }, [taxonKey, year, limit]);

  useEffect(() => {
    fetchOccurrences();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchOccurrences]);

  return { points, loading, error, totalCount };
}

export async function fetchYearlyCounts(
  taxonKey: string,
  startYear = 2000,
  endYear = 2025
): Promise<Record<number, number>> {
  const counts: Record<number, number> = {};
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

  await Promise.all(
    years.map(async (year) => {
      try {
        const params = new URLSearchParams({
          taxonKey,
          year: String(year),
          hasCoordinate: 'true',
          hasGeospatialIssue: 'false',
          limit: '0',
        });
        const res = await fetch(`${GBIF_BASE}/occurrence/search?${params}`);
        if (res.ok) {
          const data = await res.json();
          counts[year] = data.count || 0;
        }
      } catch {
        counts[year] = 0;
      }
    })
  );

  return counts;
}
