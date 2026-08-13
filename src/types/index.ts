export interface Species {
  key: string; // GBIF taxon key
  name: string; // common name
  scientific: string; // scientific name
  family: string;
  iucnStatus: IUCNStatus;
  watchPriority: 'critical' | 'high' | 'medium' | 'low';
  nativeRegions: string[];
  emoji: string;
  speciesGroup: string; // ecological/taxonomic group for browser UI
}

export type IUCNStatus =
  | 'LC' // Least Concern
  | 'NT' // Near Threatened
  | 'VU' // Vulnerable
  | 'EN' // Endangered
  | 'CR' // Critically Endangered
  | 'EW' // Extinct in the Wild
  | 'EX'; // Extinct

export interface OccurrencePoint {
  lat: number;
  lng: number;
  count: number;
  year: number;
  species: string;
  country?: string;
  stateProvince?: string;
}

export interface YearlyCount {
  year: number;
  count: number;
  normalized: number; // normalized 0-1 relative to peak year
}

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface IntelligenceAlert {
  type: 'decline' | 'displacement' | 'recovery' | 'fragmentation' | 'stable';
  title: string;
  description: string;
  severity: AlertSeverity;
  badgeColor: string;
}

export interface RiskScore {
  score: number; // 0-100, higher = more at risk
  trend: 'declining' | 'stable' | 'recovering' | 'unknown';
  percentChange: number; // % change over last 10 years
  dataPoints: number;
  peakYear: number;
  yearlyCounts: YearlyCount[];
  label: RiskLabel;
  alert: IntelligenceAlert;
}

export type RiskLabel = 'Critical' | 'High Risk' | 'At Risk' | 'Stable' | 'Recovering';

export interface GBIFOccurrenceResponse {
  results: GBIFRecord[];
  count: number;
  endOfRecords: boolean;
}

export interface GBIFRecord {
  key: number;
  decimalLatitude?: number;
  decimalLongitude?: number;
  year?: number;
  species?: string;
  scientificName?: string;
  stateProvince?: string;
  country?: string;
  countryCode?: string;
}

export interface GlobePoint {
  id?: string;
  lat: number;
  lng: number;
  weight: number;
  species: string;
  rawCount: number;
  color?: string;
  locationName?: string;
  year?: number;
  clusterSize?: number;
  habitatType?: string;
  peakMonth?: string;
  regionName?: string;
  riskRating?: string;
}

export interface RegionClick {
  lat: number;
  lng: number;
  species: string[];
}

export type AppView = 'globe' | 'analysis' | 'action';
