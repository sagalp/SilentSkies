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

// 3-tier ecological color scale:
// 🟢 Emerald #52b788: High Density / Healthy Population
// 🟡 Amber #e9c46a: Moderate Density Corridor
// 🔴 Crimson #e63946: Low Density / High Ecological Risk
export function weightToColor(weight: number): string {
  if (weight >= 0.65) return '#52b788'; // Emerald
  if (weight >= 0.35) return '#e9c46a'; // Amber
  return '#e63946';                   // Crimson
}

const HABITAT_TYPES = [
  'Wetland & Coastal Estuary',
  'Grassland & Agricultural Margin',
  'Temperate Mixed Forest',
  'Boreal Woodland Corridor',
  'Alpine & Sub-alpine Refuge',
  'Riparian River Basin',
  'Tropical Canopy & Savanna',
  'Subtropical Marshland',
];

const PEAK_MONTHS = [
  'April – May (Spring Passage)',
  'May – June (Breeding Season Peak)',
  'August – September (Autumn Migration)',
  'September – October (Southward Corridor)',
  'November – December (Winter Roosting)',
];

function inferHabitatType(lat: number, lng: number): string {
  const hash = Math.abs(Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453);
  const idx = Math.floor((hash - Math.floor(hash)) * HABITAT_TYPES.length);
  return HABITAT_TYPES[idx];
}

function inferPeakMonth(lat: number): string {
  if (lat > 40) return PEAK_MONTHS[1];
  if (lat > 20) return PEAK_MONTHS[0];
  if (lat > -20) return PEAK_MONTHS[2];
  return PEAK_MONTHS[3];
}

/**
 * Cluster raw geographic points into spatial grid cells (e.g. ~3.5° grid binning).
 * Merges overlapping/nearby points so high-density areas combine into single green/amber glowing clusters
 * instead of clipping redundant red dots!
 */
export function clusterRawPoints(
  rawPoints: { lat: number; lng: number; count: number; locationName?: string }[],
  speciesName: string,
  year: number,
  gridResolution = 3.5
): GlobePoint[] {
  if (rawPoints.length === 0) return [];

  const grid = new Map<
    string,
    {
      sumLat: number;
      sumLng: number;
      totalCount: number;
      clusterSize: number;
      locations: Set<string>;
    }
  >();

  for (const pt of rawPoints) {
    const gridLat = Math.floor(pt.lat / gridResolution) * gridResolution + gridResolution / 2;
    const gridLng = Math.floor(pt.lng / gridResolution) * gridResolution + gridResolution / 2;
    const key = `${gridLat.toFixed(1)},${gridLng.toFixed(1)}`;

    if (!grid.has(key)) {
      grid.set(key, {
        sumLat: pt.lat * pt.count,
        sumLng: pt.lng * pt.count,
        totalCount: pt.count,
        clusterSize: 1,
        locations: new Set(pt.locationName ? [pt.locationName] : []),
      });
    } else {
      const cell = grid.get(key)!;
      cell.sumLat += pt.lat * pt.count;
      cell.sumLng += pt.lng * pt.count;
      cell.totalCount += pt.count;
      cell.clusterSize += 1;
      if (pt.locationName) cell.locations.add(pt.locationName);
    }
  }

  const cells = Array.from(grid.values());
  const maxCount = Math.max(...cells.map(c => c.totalCount), 1);

  return cells.map((cell, idx) => {
    const lat = Number((cell.sumLat / cell.totalCount).toFixed(2));
    const lng = Number((cell.sumLng / cell.totalCount).toFixed(2));

    // Sqrt scale makes dense & medium clusters prominent
    const ratio = cell.totalCount / maxCount;
    const weight = Number(Math.min(1.0, Math.max(0.15, Math.sqrt(ratio))).toFixed(2));

    const color = weightToColor(weight);
    const primaryLoc = Array.from(cell.locations)[0] ||
      `${lat > 0 ? `${lat}°N` : `${Math.abs(lat)}°S`}, ${lng > 0 ? `${lng}°E` : `${Math.abs(lng)}°W`}`;

    const riskRating =
      weight >= 0.65 ? 'Healthy Corridor' :
      weight >= 0.35 ? 'Moderate Density Watch' : 'Low Density / Vulnerable';

    return {
      id: `cluster-${year}-${idx}-${lat}-${lng}`,
      lat,
      lng,
      weight,
      rawCount: cell.totalCount,
      clusterSize: cell.clusterSize,
      species: speciesName,
      locationName: primaryLoc,
      year,
      color,
      habitatType: inferHabitatType(lat, lng),
      peakMonth: inferPeakMonth(lat),
      riskRating,
    };
  });
}

export function generateDemoPoints(taxonKey: string, year: number, speciesName = 'Migratory Bird'): GlobePoint[] {
  const seed = taxonKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = (i: number) => {
    const x = Math.sin(seed + i * 17.3 + year * 0.1) * 10000;
    return x - Math.floor(x);
  };

  const isDecline = seed % 3 !== 0;
  const declineFactor = isDecline ? Math.max(0.3, 1 - (year - 2000) * 0.016) : 1;
  const numRawPoints = Math.round((140 + rng(0) * 180) * declineFactor);

  const flyways = [
    { name: 'Atlantic Americas Corridor', lat: 42, lng: -75, spread: 18 },
    { name: 'Mississippi Valley Flyway', lat: 36, lng: -90, spread: 20 },
    { name: 'East Asian-Australasian Flyway', lat: 32, lng: 118, spread: 22 },
    { name: 'East Atlantic European Flyway', lat: 51, lng: 7, spread: 16 },
    { name: 'Black Sea-Mediterranean Flyway', lat: 38, lng: 24, spread: 15 },
    { name: 'Central Asian Steppe Flyway', lat: 48, lng: 68, spread: 18 },
  ];

  const unclustered = [];
  for (let i = 0; i < numRawPoints; i++) {
    const fw = flyways[Math.floor(rng(i * 3) * flyways.length)];
    const lat = Number((Math.max(-75, Math.min(75, fw.lat + (rng(i * 7) - 0.5) * fw.spread))).toFixed(2));
    const lng = Number((fw.lng + (rng(i * 11) - 0.5) * fw.spread * 1.5).toFixed(2));
    const count = Math.round(40 + rng(i * 13) * 600);

    unclustered.push({
      lat,
      lng,
      count,
      locationName: `${fw.name} (${lat > 0 ? `${lat.toFixed(1)}°N` : `${Math.abs(lat).toFixed(1)}°S`}, ${lng > 0 ? `${lng.toFixed(1)}°E` : `${Math.abs(lng).toFixed(1)}°W`})`,
    });
  }

  // Apply spatial grid clustering so close dots merge!
  return clusterRawPoints(unclustered, speciesName, year, 3.8);
}

function mapToGlobePoints(occurrences: OccurrencePoint[], speciesName: string, year: number): GlobePoint[] {
  if (occurrences.length === 0) return [];

  const rawMapped = occurrences.map(o => ({
    lat: o.lat,
    lng: o.lng,
    count: o.count || 1,
    locationName: [o.stateProvince, o.country].filter(Boolean).join(', '),
  }));

  return clusterRawPoints(rawMapped, speciesName, year, 3.2);
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
