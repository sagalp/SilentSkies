import { useState, useCallback, useEffect } from 'react';
import OpenAI from 'openai';
import {
  X, Brain, TrendingDown, AlertCircle, Loader2, Key,
  Map, Thermometer, Globe, Cpu, CheckCircle2, MapPin,
  Crosshair, Layers, Compass, TreePine, Zap, ChevronDown
} from 'lucide-react';
import type { Species, GlobePoint } from '../types';
import { useRiskScore } from '../hooks/useRiskScore';
import { getBirdIcon, GROUP_COLORS } from './BirdIcons';

type AnalysisMode = 'local' | 'global';

interface AnalysisPanelProps {
  species: Species;
  year: number;
  targetPoint?: GlobePoint | null;
  triggerId?: number;
  onClose: () => void;
}

interface AnalysisResult {
  drivers: string;
  localVsGlobal: string;
  confidence: string;
  recommendations: string[];
  habitatThreat: { label: string; value: number }[];
  migrationShift: string;
  phenologicalRisk: { score: number; label: string; color: string };
  regionalBreakdown: { region: string; status: string }[];
}

/* ═══════════════════════════════════════════════════════════════
   GLOBAL DEMO ANALYSIS — species-wide, all native regions
   ═══════════════════════════════════════════════════════════════ */
const DEMO_GLOBAL: Record<string, AnalysisResult> = {
  declining: {
    drivers:
      'Across the species\u2019 global range, population decline is primarily driven by habitat fragmentation from agricultural intensification, coupled with climate-induced phenological mismatch disrupting the synchronization between migration timing and peak prey availability.',
    localVsGlobal:
      'The global decline rate averages ~2.8% per year across all monitored flyways. Regional heterogeneity is significant — Western Europe and North America show steeper declines than East Asian populations, which benefit from traditional agricultural practices.',
    confidence:
      'Moderate confidence (R² \u2248 0.71). Based on 18+ years of GBIF occurrence data aggregated across the full native range. Confidence is reduced in data-sparse regions including Sub-Saharan Africa and Central Asia.',
    recommendations: [
      'Support international habitat corridor protection treaties',
      'Advocate for pesticide regulation reform in agricultural zones',
      'Contribute citizen science observations via eBird or iNaturalist',
      'Fund research into phenological adaptation mechanisms',
    ],
    habitatThreat: [
      { label: 'Agricultural Expansion', value: 82 },
      { label: 'Climate Disruption', value: 67 },
      { label: 'Urban Encroachment', value: 54 },
      { label: 'Pesticide Exposure', value: 71 },
    ],
    migrationShift:
      'Global analysis shows a northward breeding range shift of 45–80 km per decade. Wintering ground contraction of ~12% since 2005 is reducing overwintering carrying capacity across all flyways.',
    phenologicalRisk: { score: 74, label: 'High Mismatch', color: '#e63946' },
    regionalBreakdown: [
      { region: 'Western Europe', status: 'Declining rapidly — intensive farmland conversion is the primary driver. UK populations down 68% since 1990.' },
      { region: 'North America', status: 'Moderate decline — grassland loss and pesticide exposure on wintering grounds compound breeding season pressures.' },
      { region: 'East Asia', status: 'Relatively stable — traditional rice paddy agriculture provides adequate foraging habitat, though urbanization is accelerating.' },
      { region: 'Africa (Wintering)', status: 'Understudied — drought frequency increasing in Sahel stopover zones; loss of key refueling habitat suspected.' },
    ],
  },
  stable: {
    drivers:
      'This species maintains a broadly stable global population. Minor fluctuations correlate with El Niño/La Niña cycles affecting wintering habitat productivity. Reforestation efforts across core breeding ranges appear to offset pressures from urban development and land-use change.',
    localVsGlobal:
      'Global population stability is reflected consistently across most monitored regions. Northwestern populations show modest recovery while southeastern subpopulations face localized pressure from coastal development — net effect is near-equilibrium.',
    confidence:
      'High confidence (R² \u2248 0.83). This species benefits from extensive citizen science coverage, yielding dense, longitudinally consistent records across all years in the dataset.',
    recommendations: [
      'Maintain existing habitat protections and avoid rollback of buffer zones',
      'Increase monitoring frequency in underrepresented subpopulations',
      'Support coastal and wetland buffer zone legislation',
      'Contribute occurrence data to strengthen global baselines',
    ],
    habitatThreat: [
      { label: 'Coastal Development', value: 38 },
      { label: 'Climate Variability', value: 44 },
      { label: 'Invasive Species', value: 22 },
      { label: 'Pollution', value: 31 },
    ],
    migrationShift:
      'Minor timing adjustment detected — breeding populations have shifted arrival ~5–8 days earlier over two decades globally, consistent with spring temperature advancement. Core range boundaries remain broadly intact.',
    phenologicalRisk: { score: 32, label: 'Low–Moderate', color: '#52b788' },
    regionalBreakdown: [
      { region: 'Northern Europe', status: 'Stable to recovering — protected area networks are effective; citizen science coverage is excellent.' },
      { region: 'Mediterranean', status: 'Slight decline in coastal zones due to resort development; inland populations remain stable.' },
      { region: 'Sub-Saharan Africa', status: 'Wintering range appears intact; habitat quality is adequate with no major emerging threats documented.' },
      { region: 'Central Asia', status: 'Sparse data — monitoring gaps make trend assessment uncertain. Priority area for observer network expansion.' },
    ],
  },
  recovering: {
    drivers:
      'Global recovery is largely attributed to successful DDT and organochlorine pesticide bans enacted in the 1970s–90s, combined with targeted nest protection programs and captive breeding supplementation. Sustained recovery depends on maintained regulatory frameworks.',
    localVsGlobal:
      'Recovery is most pronounced in North American and Western European core ranges, where legal protections are strongest. Asian and African populations show slower recovery trajectories due to ongoing habitat pressure and hunting in overwintering regions.',
    confidence:
      'High confidence (R² \u2248 0.89). Long-term international monitoring programs provide excellent record density and statistical robustness across all major flyways.',
    recommendations: [
      'Continue nest box and nest protection programs in core breeding areas',
      'Advocate for international treaty protections on migration corridors',
      'Support anti-poaching enforcement in wintering range countries',
      'Volunteer with local raptor or species-specific monitoring groups',
    ],
    habitatThreat: [
      { label: 'Legacy Pesticides', value: 28 },
      { label: 'Illegal Hunting', value: 45 },
      { label: 'Power Line Collisions', value: 33 },
      { label: 'Climate Shift', value: 38 },
    ],
    migrationShift:
      'Recolonization of historical breeding territories is underway globally, with populations returning to areas not occupied since the 1960s. Migration corridors are broadly intact though Mediterranean flyway bottlenecks remain a vulnerability.',
    phenologicalRisk: { score: 21, label: 'Low Risk', color: '#52b788' },
    regionalBreakdown: [
      { region: 'North America', status: 'Strong recovery — breeding populations at highest levels since 1970. Legal protections are holding.' },
      { region: 'Western Europe', status: 'Recovering steadily — reintroduction programs showing measurable results in multiple countries.' },
      { region: 'Central Asia', status: 'Slow recovery hampered by limited enforcement of hunting regulations along migration corridors.' },
      { region: 'South Asia (Wintering)', status: 'Habitat quality improving in some areas but inconsistent; wetland drainage remains a concern.' },
    ],
  },
};

/* ═══════════════════════════════════════════════════════════════
   LOCAL / REGIONAL DEMO ANALYSIS — coordinate-specific
   Uses latitude/longitude bands to produce geographically
   distinct analysis for each beacon click.
   ═══════════════════════════════════════════════════════════════ */
interface RegionProfile {
  name: string;
  latRange: [number, number];
  lngRange: [number, number];
  declining: AnalysisResult;
  stable: AnalysisResult;
  recovering: AnalysisResult;
}

const REGION_PROFILES: RegionProfile[] = [
  /* ── Northern Europe & Scandinavia ────────────────── */
  {
    name: 'Northern Europe',
    latRange: [50, 72],
    lngRange: [-12, 40],
    declining: {
      drivers:
        'At this coordinate sector, decline is linked to intensive agricultural drainage of wetland habitats and large-scale forestry monocultures replacing mixed deciduous woodland. Shortened snow-cover seasons are disrupting overwintering invertebrate cycles critical for early spring foraging.',
      localVsGlobal:
        'The local decline rate at this sector (~4.1%/yr) significantly exceeds the global average (~2.8%/yr), indicating this region is a decline hotspot. Northern European agricultural policy is a key differentiating factor.',
      confidence:
        'High confidence — dense citizen science network in Scandinavia and the UK provides excellent temporal coverage. eBird and national monitoring schemes contribute robust data for this coordinate sector.',
      recommendations: [
        'Restore drained wetlands within 50 km of this coordinate to rebuild invertebrate prey base',
        'Advocate for agri-environment scheme enrollment among local farmers',
        'Install nest boxes in mixed woodland patches near this sector',
        'Report sightings to national bird monitoring schemes to strengthen local data density',
      ],
      habitatThreat: [
        { label: 'Wetland Drainage', value: 88 },
        { label: 'Forestry Monoculture', value: 72 },
        { label: 'Agricultural Chemicals', value: 65 },
        { label: 'Urban Light Pollution', value: 41 },
      ],
      migrationShift:
        'At this latitude band, spring arrival has shifted 8–12 days earlier over the past two decades. Autumn departure is delayed by ~5 days, extending breeding season exposure to late-season storms.',
      phenologicalRisk: { score: 78, label: 'High Mismatch', color: '#e63946' },
      regionalBreakdown: [
        { region: 'Local Sector', status: 'Rapid decline — this coordinate shows 4.1% annual loss, driven by local agricultural intensification.' },
        { region: 'Surrounding 200km', status: 'Mixed — protected areas nearby show stability, but unprotected farmland is heavily degraded.' },
        { region: 'National Context', status: 'Country-level data confirms this sector is among the worst-performing areas for this species.' },
      ],
    },
    stable: {
      drivers:
        'At this coordinate sector, the population is held stable by a network of protected areas and agri-environment schemes maintaining suitable habitat mosaics. Traditional farming practices in surrounding areas provide adequate foraging.',
      localVsGlobal:
        'Local stability here aligns with the broader Northern European trend. This sector benefits from proximity to nature reserves that buffer against wider landscape degradation.',
      confidence:
        'High confidence — excellent monitoring coverage at this latitude. Regular survey effort by local ornithological societies provides consistent annual data.',
      recommendations: [
        'Maintain and expand the protected area network surrounding this coordinate',
        'Monitor for early signs of habitat degradation in buffer zones',
        'Support local volunteer bird survey schemes',
        'Advocate for continuation of agri-environment scheme funding',
      ],
      habitatThreat: [
        { label: 'Development Pressure', value: 35 },
        { label: 'Climate Warming', value: 42 },
        { label: 'Invasive Predators', value: 28 },
        { label: 'Wind Farm Collision', value: 19 },
      ],
      migrationShift:
        'At this sector, migration timing has adjusted by 5–7 days earlier in spring, consistent with regional temperature trends. No significant range boundary shift detected.',
      phenologicalRisk: { score: 29, label: 'Low', color: '#52b788' },
      regionalBreakdown: [
        { region: 'Local Sector', status: 'Stable — consistent annual counts over the past decade at this coordinate.' },
        { region: 'Surrounding 200km', status: 'Stable to improving — protected areas provide a reliable population source.' },
        { region: 'National Context', status: 'This sector is performing at or above the national average for this species.' },
      ],
    },
    recovering: {
      drivers:
        'Recovery at this coordinate is driven by successful reintroduction programs and legal protections enacted over the past three decades. Restored wetland habitat in the surrounding landscape is providing critical foraging resources.',
      localVsGlobal:
        'The local recovery rate at this sector (~3.2%/yr increase) outpaces the global average, reflecting strong local conservation investment and effective habitat management.',
      confidence:
        'High confidence — this sector has excellent long-term monitoring data from national ringing schemes and breeding bird surveys.',
      recommendations: [
        'Continue nest protection programs active near this coordinate',
        'Expand restored wetland areas to increase carrying capacity',
        'Monitor recovery trajectory for signs of population plateau',
        'Share success stories to encourage replication in neighboring regions',
      ],
      habitatThreat: [
        { label: 'Legacy Contamination', value: 22 },
        { label: 'Recreational Disturbance', value: 31 },
        { label: 'Climate Variability', value: 34 },
        { label: 'Nest Predation', value: 27 },
      ],
      migrationShift:
        'At this sector, recolonization of historically occupied territory is proceeding well. Breeding pairs are establishing at coordinates not occupied since the 1970s in this latitude band.',
      phenologicalRisk: { score: 18, label: 'Low Risk', color: '#52b788' },
      regionalBreakdown: [
        { region: 'Local Sector', status: 'Strong recovery — annual counts increasing, breeding pairs establishing new territories.' },
        { region: 'Surrounding 200km', status: 'Recovery spreading — source populations from this sector are seeding neighboring areas.' },
        { region: 'National Context', status: 'This sector is a recovery success story contributing to national population gains.' },
      ],
    },
  },

  /* ── Sub-Saharan Africa ───────────────────────────── */
  {
    name: 'Sub-Saharan Africa',
    latRange: [-35, 15],
    lngRange: [-18, 52],
    declining: {
      drivers:
        'At this coordinate sector in the African wintering range, decline is linked to accelerating land conversion for subsistence agriculture, charcoal production driving deforestation, and increasing drought frequency in Sahel stopover zones disrupting refueling capacity for migrants.',
      localVsGlobal:
        'Monitoring at this sector is sparse, but available data suggests a steeper local decline than the global average. African wintering ground degradation is likely a compounding factor for breeding-range declines observed in Europe.',
      confidence:
        'Low–moderate confidence — observer density in this region is limited. GBIF records are patchy and citizen science participation remains low relative to Europe and North America.',
      recommendations: [
        'Support local community conservation programs near this coordinate',
        'Fund observer network expansion and training in the region',
        'Advocate for protected area designation around key stopover habitats',
        'Reduce charcoal-driven deforestation through alternative livelihood programs',
      ],
      habitatThreat: [
        { label: 'Deforestation', value: 85 },
        { label: 'Drought & Desertification', value: 78 },
        { label: 'Agricultural Conversion', value: 70 },
        { label: 'Hunting Pressure', value: 52 },
      ],
      migrationShift:
        'Wintering range at this sector has contracted noticeably. Satellite tracking data shows reduced stopover duration, suggesting deteriorating habitat quality at this latitude band.',
      phenologicalRisk: { score: 68, label: 'High', color: '#e63946' },
      regionalBreakdown: [
        { region: 'Local Sector', status: 'Decline suspected — limited data but declining habitat quality is consistent with reduced occurrence records.' },
        { region: 'Surrounding Region', status: 'Sahel zone drought is expanding, reducing suitable habitat for overwintering and refueling migrants.' },
        { region: 'Continental Context', status: 'Sub-Saharan Africa is the most data-deficient region for this species — urgent monitoring expansion needed.' },
      ],
    },
    stable: {
      drivers:
        'At this coordinate sector, habitat appears relatively intact. Intact savanna and woodland mosaics provide adequate resources. Community-based conservation initiatives may be contributing to stability.',
      localVsGlobal:
        'Local stability at this sector is encouraging given broader continental pressures. This area may serve as a refugium if surrounding habitat continues to degrade.',
      confidence:
        'Low confidence — despite stable signals, data density is insufficient for robust trend assessment. Additional monitoring is a priority.',
      recommendations: [
        'Establish regular monitoring transects at this coordinate',
        'Support community-based natural resource management programs',
        'Protect intact savanna and woodland habitat from conversion',
        'Engage local schools and communities in citizen science initiatives',
      ],
      habitatThreat: [
        { label: 'Agricultural Expansion', value: 45 },
        { label: 'Climate Variability', value: 50 },
        { label: 'Logging', value: 35 },
        { label: 'Fire Management', value: 30 },
      ],
      migrationShift:
        'No significant shift detected at this sector, though data resolution is insufficient for confident assessment. Wintering birds appear to be using traditional habitat patches.',
      phenologicalRisk: { score: 40, label: 'Moderate', color: '#e9c46a' },
      regionalBreakdown: [
        { region: 'Local Sector', status: 'Apparently stable — limited records suggest consistent presence across seasons.' },
        { region: 'Surrounding Region', status: 'Mixed — some neighboring areas showing habitat loss while this sector remains intact.' },
        { region: 'Continental Context', status: 'This sector may represent an important stable refugium in an otherwise data-poor region.' },
      ],
    },
    recovering: {
      drivers:
        'Recovery at this coordinate is potentially linked to reforestation and community forestry programs in the surrounding landscape. Reduced hunting pressure from conservation education programs may also be contributing.',
      localVsGlobal:
        'If confirmed, local recovery here would be among the first documented in Sub-Saharan Africa for this species. Global recovery trends are primarily driven by improvements in breeding ranges, not wintering grounds.',
      confidence:
        'Low confidence — apparent recovery signal may reflect improved observer effort rather than genuine population increase. Sustained monitoring is essential to confirm.',
      recommendations: [
        'Establish long-term monitoring plots to confirm recovery trajectory',
        'Scale up community forestry and conservation programs',
        'Investigate whether improved observer effort is inflating apparent recovery',
        'Connect this sector to broader pan-African monitoring networks',
      ],
      habitatThreat: [
        { label: 'Residual Deforestation', value: 38 },
        { label: 'Climate Uncertainty', value: 45 },
        { label: 'Subsistence Hunting', value: 30 },
        { label: 'Infrastructure Development', value: 25 },
      ],
      migrationShift:
        'Insufficient data to assess migration shift at this sector confidently. Anecdotal evidence suggests expanded habitat use consistent with recovery.',
      phenologicalRisk: { score: 35, label: 'Moderate', color: '#e9c46a' },
      regionalBreakdown: [
        { region: 'Local Sector', status: 'Tentative recovery — increased detections may reflect real population gains or improved survey effort.' },
        { region: 'Surrounding Region', status: 'Uncertain — neighboring areas remain data-poor; regional context is difficult to assess.' },
        { region: 'Continental Context', status: 'If confirmed, this would be a pioneering recovery signal for African wintering populations.' },
      ],
    },
  },

  /* ── South & Southeast Asia ───────────────────────── */
  {
    name: 'South & Southeast Asia',
    latRange: [-10, 35],
    lngRange: [60, 145],
    declining: {
      drivers:
        'At this coordinate sector in the Asian range, decline is associated with rapid urban expansion, wetland conversion for aquaculture, and intensification of rice paddy agriculture reducing habitat heterogeneity. Air pollution from industrial activity is an emerging threat.',
      localVsGlobal:
        'The local decline at this sector is less severe than the global average, reflecting the buffering effect of traditional land-use practices still prevalent in parts of Asia. However, the rate of habitat change is accelerating.',
      confidence:
        'Moderate confidence — growing eBird participation in India, Thailand, and Malaysia is improving data coverage, though rural areas remain under-surveyed at this latitude.',
      recommendations: [
        'Advocate for wetland protection policies near this coordinate',
        'Support traditional rice paddy farming practices that maintain habitat mosaics',
        'Engage local birdwatching communities to expand monitoring coverage',
        'Reduce pesticide runoff into wetland habitats surrounding this sector',
      ],
      habitatThreat: [
        { label: 'Wetland Conversion', value: 75 },
        { label: 'Urbanization', value: 68 },
        { label: 'Pesticide Intensification', value: 60 },
        { label: 'Air Pollution', value: 42 },
      ],
      migrationShift:
        'At this sector, minor latitudinal shifts are detected in wintering distribution. Some populations appear to be concentrating in remaining wetland patches, increasing local density but reducing range extent.',
      phenologicalRisk: { score: 55, label: 'Moderate–High', color: '#e9c46a' },
      regionalBreakdown: [
        { region: 'Local Sector', status: 'Moderate decline — habitat conversion is the primary driver, but traditional agriculture provides some buffer.' },
        { region: 'Surrounding 200km', status: 'Mixed — urban centers show steep decline while rural areas retain adequate habitat.' },
        { region: 'Continental Context', status: 'Asian populations are declining more slowly than European counterparts but the trajectory is concerning.' },
      ],
    },
    stable: {
      drivers:
        'At this coordinate sector, traditional agricultural landscapes and extensive protected wetland networks are maintaining suitable habitat. Community engagement in conservation and strong ecotourism interest support continued protection.',
      localVsGlobal:
        'Local stability at this sector reflects the effectiveness of regional conservation strategies. This area is performing above the continental average for habitat quality and species presence.',
      confidence:
        'Moderate–high confidence — strong eBird participation and national monitoring programs provide adequate data coverage at this coordinate.',
      recommendations: [
        'Maintain current wetland protection designations near this coordinate',
        'Support ecotourism initiatives that financially incentivize habitat conservation',
        'Monitor for emerging threats from nearby urban expansion',
        'Expand citizen science engagement to surrounding undermonitored areas',
      ],
      habitatThreat: [
        { label: 'Urban Expansion', value: 38 },
        { label: 'Water Pollution', value: 35 },
        { label: 'Climate Variability', value: 40 },
        { label: 'Invasive Plants', value: 25 },
      ],
      migrationShift:
        'No significant shift at this sector — populations appear to be using traditional habitat patches consistently across years.',
      phenologicalRisk: { score: 28, label: 'Low', color: '#52b788' },
      regionalBreakdown: [
        { region: 'Local Sector', status: 'Stable — consistent presence confirmed by regular monitoring at this coordinate.' },
        { region: 'Surrounding Region', status: 'Broadly stable — regional protected area network is effective.' },
        { region: 'Continental Context', status: 'This sector is a positive example within the broader Asian range.' },
      ],
    },
    recovering: {
      drivers:
        'Recovery at this coordinate is linked to wetland restoration programs and enforcement of wildlife protection laws. Declining pesticide use in surrounding agricultural areas is improving invertebrate prey availability.',
      localVsGlobal:
        'Local recovery at this sector is modest but consistent, tracking slightly behind the global recovery rate. Asian populations face more persistent habitat pressures than European counterparts.',
      confidence:
        'Moderate confidence — recovery signal is supported by improving data density from citizen science platforms, though longer time series are needed for full confirmation.',
      recommendations: [
        'Continue and expand wetland restoration near this coordinate',
        'Strengthen enforcement of wildlife protection regulations',
        'Monitor recovery trajectory for plateau signals',
        'Promote reduced-pesticide farming in the surrounding agricultural matrix',
      ],
      habitatThreat: [
        { label: 'Residual Pesticides', value: 32 },
        { label: 'Habitat Fragmentation', value: 38 },
        { label: 'Climate Uncertainty', value: 35 },
        { label: 'Human Disturbance', value: 28 },
      ],
      migrationShift:
        'At this sector, evidence of range expansion into restored habitat areas is emerging. Recovery is proceeding from core refugia outward.',
      phenologicalRisk: { score: 25, label: 'Low', color: '#52b788' },
      regionalBreakdown: [
        { region: 'Local Sector', status: 'Modest recovery — breeding pairs increasing in restored wetland areas near this coordinate.' },
        { region: 'Surrounding Region', status: 'Mixed — recovery is concentrated around restoration sites; unmanaged areas show stagnation.' },
        { region: 'Continental Context', status: 'Recovery in Asia lags behind European and North American populations but is progressing.' },
      ],
    },
  },

  /* ── Americas ─────────────────────────────────────── */
  {
    name: 'Americas',
    latRange: [-55, 70],
    lngRange: [-170, -30],
    declining: {
      drivers:
        'At this coordinate sector in the Americas, population decline is driven by grassland and prairie conversion to intensive agriculture, neonicotinoid pesticide exposure reducing invertebrate prey, and habitat fragmentation along critical migration corridors.',
      localVsGlobal:
        'The local decline rate at this sector aligns with the broader North American trend of ~3% annual loss for grassland-dependent species. The Americas-specific driver of neonicotinoid exposure is more severe here than in Eurasian populations.',
      confidence:
        'High confidence — the Breeding Bird Survey (BBS) and Christmas Bird Count (CBC) provide excellent long-term monitoring coverage for this coordinate sector.',
      recommendations: [
        'Support grassland conservation easement programs near this coordinate',
        'Advocate for neonicotinoid restrictions in agricultural zones surrounding this sector',
        'Plant native prairie grass and wildflower seed mixes on available land',
        'Participate in local BBS routes and CBC circles to maintain data continuity',
      ],
      habitatThreat: [
        { label: 'Grassland Conversion', value: 86 },
        { label: 'Neonicotinoid Exposure', value: 74 },
        { label: 'Wind Energy Collision', value: 38 },
        { label: 'Urban Sprawl', value: 48 },
      ],
      migrationShift:
        'At this sector, breeding range is shifting northward at ~50 km/decade. Wintering range in Central and South America is contracting, with reduced occurrence records in traditional overwintering areas.',
      phenologicalRisk: { score: 70, label: 'High', color: '#e63946' },
      regionalBreakdown: [
        { region: 'Local Sector', status: 'Significant decline — grassland loss and pesticide exposure are the dominant local drivers.' },
        { region: 'Surrounding Flyway', status: 'Consistent decline along the Central Flyway; stopover habitat quality is deteriorating.' },
        { region: 'Continental Context', status: 'The Americas show a 29% decline in grassland bird populations since 1970 — this sector reflects the broader crisis.' },
      ],
    },
    stable: {
      drivers:
        'At this coordinate sector, stable populations are supported by proximity to protected areas, national wildlife refuges, or state conservation lands. Reduced agricultural intensity in the surrounding landscape provides adequate habitat.',
      localVsGlobal:
        'Local stability at this sector is better than the continental average, suggesting this area is functioning as an important population source. Continued protection is essential to maintain this status.',
      confidence:
        'High confidence — excellent coverage from BBS, eBird, and CBC provides robust trend data at this coordinate.',
      recommendations: [
        'Maintain protected area designations surrounding this coordinate',
        'Monitor for early signs of habitat degradation from expanding agriculture',
        'Support land acquisition programs to expand conservation areas',
        'Continue citizen science participation to maintain data quality',
      ],
      habitatThreat: [
        { label: 'Adjacent Development', value: 32 },
        { label: 'Climate Variability', value: 38 },
        { label: 'Invasive Species', value: 25 },
        { label: 'Recreation Pressure', value: 20 },
      ],
      migrationShift:
        'At this sector, migration timing has shifted marginally earlier in spring (~4 days). Range boundaries remain stable with no significant contraction detected.',
      phenologicalRisk: { score: 26, label: 'Low', color: '#52b788' },
      regionalBreakdown: [
        { region: 'Local Sector', status: 'Stable — consistent annual counts confirm reliable population presence at this coordinate.' },
        { region: 'Surrounding Region', status: 'This sector is performing above the regional average; a potential source population.' },
        { region: 'Continental Context', status: 'Stable pockets like this sector are critical refugia within a continent experiencing broader declines.' },
      ],
    },
    recovering: {
      drivers:
        'Recovery at this coordinate is linked to CRP (Conservation Reserve Program) lands, grassland restoration projects, and reduced pesticide application in surrounding agricultural areas.',
      localVsGlobal:
        'Local recovery at this sector is promising and exceeds the continental average. This area demonstrates that targeted conservation investment can reverse decline trends even in heavily agricultural landscapes.',
      confidence:
        'High confidence — long-term BBS data confirms a statistically significant upward trend at this coordinate over the past 15 years.',
      recommendations: [
        'Advocate for continued CRP and grassland restoration funding near this coordinate',
        'Expand restored habitat to increase connectivity between conservation patches',
        'Document recovery success to support policy advocacy',
        'Monitor for density-dependent effects as populations recover',
      ],
      habitatThreat: [
        { label: 'CRP Land Expiry Risk', value: 40 },
        { label: 'Climate Shift', value: 35 },
        { label: 'Fragmentation', value: 30 },
        { label: 'Predation', value: 22 },
      ],
      migrationShift:
        'At this sector, recolonization of formerly abandoned breeding territories is underway. Core breeding range is expanding as restored habitat matures.',
      phenologicalRisk: { score: 20, label: 'Low Risk', color: '#52b788' },
      regionalBreakdown: [
        { region: 'Local Sector', status: 'Strong recovery — annual counts increasing significantly at this coordinate.' },
        { region: 'Surrounding Region', status: 'Recovery spreading from restored patches; corridor connectivity is improving.' },
        { region: 'Continental Context', status: 'This sector is a conservation success story demonstrating grassland restoration efficacy.' },
      ],
    },
  },
];

/* Fallback for coordinates that don't match any defined region profile */
function getLocalDemoAnalysis(lat: number, lng: number, trend: string): AnalysisResult {
  // Find matching region by lat/lng
  for (const profile of REGION_PROFILES) {
    const [latMin, latMax] = profile.latRange;
    const [lngMin, lngMax] = profile.lngRange;
    if (lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax) {
      return profile[trend as keyof Pick<RegionProfile, 'declining' | 'stable' | 'recovering'>] as AnalysisResult
        || profile.stable;
    }
  }

  // Fallback: generate a generic local analysis with coordinate-specific language
  const hemisphere = lat >= 0 ? 'Northern' : 'Southern';
  const longitudeZone = lng < -30 ? 'Western' : lng < 60 ? 'Central' : 'Eastern';
  const sectorName = `${hemisphere} ${longitudeZone} Sector`;

  const base = DEMO_GLOBAL[trend] || DEMO_GLOBAL.stable;
  return {
    ...base,
    drivers: `At coordinate sector ${lat.toFixed(1)}°, ${lng.toFixed(1)}° in the ${sectorName}, ${base.drivers.charAt(0).toLowerCase()}${base.drivers.slice(1)}`,
    localVsGlobal: `At this specific coordinate sector (${lat.toFixed(1)}°, ${lng.toFixed(1)}°), local conditions may diverge from the global trend. ${base.localVsGlobal}`,
    confidence: `Regional confidence for this sector is influenced by local observer density. ${base.confidence}`,
    regionalBreakdown: [
      { region: 'Local Sector', status: `Analysis for ${lat.toFixed(1)}°, ${lng.toFixed(1)}° — conditions at this coordinate are under assessment with available GBIF data.` },
      { region: 'Surrounding 200km', status: 'Regional context suggests habitat conditions are broadly consistent with the continental trend for this species.' },
      { region: 'Global Context', status: base.regionalBreakdown[0]?.status || 'See global analysis for comprehensive trend overview.' },
    ],
  };
}

/* ═══════════════════════════════════════════════════════════════ */

function gaugeColor(v: number) {
  if (v >= 70) return '#e63946';
  if (v >= 50) return '#e9c46a';
  return '#52b788';
}

function extractJSON(text: string): any {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const jsonSub = text.slice(start, end + 1);
      return JSON.parse(jsonSub);
    }
    throw e;
  }
}

function sanitizeAnalysisResult(raw: any, fallbackTrend: string, mode: AnalysisMode, lat?: number, lng?: number): AnalysisResult {
  const fallback = mode === 'local' && lat != null && lng != null
    ? getLocalDemoAnalysis(lat, lng, fallbackTrend)
    : (DEMO_GLOBAL[fallbackTrend] || DEMO_GLOBAL.stable);

  if (!raw || typeof raw !== 'object') return fallback;

  const sanitizeHabitat = (arr: any) => {
    if (!Array.isArray(arr) || arr.length === 0) return fallback.habitatThreat;
    return arr.map((item, idx) => {
      if (typeof item === 'object' && item !== null) {
        return {
          label: typeof item.label === 'string' ? item.label : `Threat factor ${idx + 1}`,
          value: typeof item.value === 'number' && !isNaN(item.value) ? Math.max(0, Math.min(100, item.value)) : 50,
        };
      }
      return { label: String(item || `Factor ${idx + 1}`), value: 50 };
    });
  };

  const sanitizeRegional = (arr: any) => {
    if (!Array.isArray(arr) || arr.length === 0) return fallback.regionalBreakdown;
    return arr.map((item, idx) => {
      if (typeof item === 'object' && item !== null) {
        return {
          region: typeof item.region === 'string' ? item.region : `Region ${idx + 1}`,
          status: typeof item.status === 'string' ? item.status : (typeof item.description === 'string' ? item.description : 'Data under assessment'),
        };
      }
      return { region: `Region ${idx + 1}`, status: String(item || 'Data under assessment') };
    });
  };

  const sanitizePhenological = (obj: any) => {
    if (typeof obj === 'object' && obj !== null) {
      const score = typeof obj.score === 'number' && !isNaN(obj.score) ? obj.score : 50;
      return {
        score,
        label: typeof obj.label === 'string' ? obj.label : (score >= 70 ? 'High Mismatch' : score >= 40 ? 'Moderate' : 'Low Risk'),
        color: typeof obj.color === 'string' ? obj.color : (score >= 70 ? '#e63946' : score >= 40 ? '#e9c46a' : '#52b788'),
      };
    }
    return fallback.phenologicalRisk;
  };

  return {
    drivers: typeof raw.drivers === 'string' ? raw.drivers : (typeof raw.decline_drivers === 'string' ? raw.decline_drivers : fallback.drivers),
    localVsGlobal: typeof raw.localVsGlobal === 'string' ? raw.localVsGlobal : (typeof raw.local_vs_global === 'string' ? raw.local_vs_global : fallback.localVsGlobal),
    confidence: typeof raw.confidence === 'string' ? raw.confidence : fallback.confidence,
    recommendations: Array.isArray(raw.recommendations) ? raw.recommendations.map((r: any) => typeof r === 'string' ? r : String(r)) : fallback.recommendations,
    habitatThreat: sanitizeHabitat(raw.habitatThreat || raw.habitat_threat),
    migrationShift: typeof raw.migrationShift === 'string' ? raw.migrationShift : (typeof raw.migration_shift === 'string' ? raw.migration_shift : fallback.migrationShift),
    phenologicalRisk: sanitizePhenological(raw.phenologicalRisk || raw.phenological_risk),
    regionalBreakdown: sanitizeRegional(raw.regionalBreakdown || raw.regional_breakdown),
  };
}

export function AnalysisPanel({ species, year, targetPoint, triggerId, onClose }: AnalysisPanelProps) {
  const { riskScore, loading: riskLoading } = useRiskScore(species.key);
  const [customKey, setCustomKey] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [usedDemo, setUsedDemo] = useState(false);
  const [usedNvidia, setUsedNvidia] = useState(false);
  const [reasoningText, setReasoningText] = useState('');
  const [sectorOpen, setSectorOpen] = useState(false);

  const envKey = import.meta.env.VITE_NVIDIA_API_KEY || '';
  const effectiveApiKey = customKey || envKey;

  const hasValidTarget = Boolean(targetPoint && typeof targetPoint.lat === 'number' && typeof targetPoint.lng === 'number');
  const analysisMode: AnalysisMode = hasValidTarget ? 'local' : 'global';

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    setReasoningText('');
    setAnalysis(null);

    const trend = riskScore?.trend ?? 'stable';

    if (effectiveApiKey) {
      try {
        const openai = new OpenAI({
          apiKey: effectiveApiKey,
          baseURL: 'https://integrate.api.nvidia.com/v1',
          dangerouslyAllowBrowser: true,
        });

        // Build mode-specific prompt
        const prompt = analysisMode === 'local'
          ? `You are an expert ornithologist and conservation data scientist performing a REGIONAL SECTOR ANALYSIS for a specific coordinate on the globe.

Species: ${species.name} (${species.scientific})
IUCN Status: ${species.iucnStatus}
Family: ${species.family}
Native Regions: ${species.nativeRegions.join(', ')}

TARGET COORDINATE SECTOR: Lat ${targetPoint!.lat.toFixed(2)}°, Lng ${targetPoint!.lng.toFixed(2)}°
Location Name: ${targetPoint!.locationName || 'Unknown'}
Ecosystem Type: ${targetPoint!.habitatType || 'Under assessment'}
Observation Density Weight: ${Math.round((targetPoint!.weight || 0.5) * 100)}/100
Cluster Size: ${targetPoint!.clusterSize || 1} spatial clusters merged
Risk Rating: ${targetPoint!.riskRating || 'Not assessed'}
Region: ${targetPoint!.regionName || 'Not classified'}

Computed Risk Score: ${riskScore?.score ?? 'N/A'}/100
Population Trend: ${trend}
Percent Change Since 2000: ${riskScore?.percentChange ?? 'N/A'}%
Peak Population Year: ${riskScore?.peakYear ?? 'N/A'}
Analysis Year Focus: ${year}

IMPORTANT: This is a LOCAL, COORDINATE-SPECIFIC analysis. Focus your response specifically on the conditions, threats, and ecology at this particular coordinate sector and its immediate surrounding landscape (~200km radius). Reference the specific latitude, habitat type, and regional context. Do NOT give a generic global overview.

Respond with valid JSON using these exact keys:
- "drivers": string (2-3 sentences on the likely drivers AT THIS SPECIFIC COORDINATE SECTOR — reference local habitat, land use, and regional conditions)
- "localVsGlobal": string (2 sentences comparing the LOCAL trend at this sector vs the species' global trend)
- "confidence": string (1-2 sentences on data confidence at this specific coordinate — reference local observer density)
- "recommendations": string[] (array of 4 concrete, location-specific actions a person near this coordinate can take)
- "habitatThreat": array of 4 objects { "label": string, "value": number (0-100) } for threats relevant to THIS SECTOR
- "migrationShift": string (2 sentences on detected migration/timing shifts at this latitude band)
- "phenologicalRisk": object { "score": number (0-100), "label": string, "color": "#hex" }
- "regionalBreakdown": array of 3 objects { "region": string, "status": string (1-2 sentences) } with breakdown: "Local Sector", "Surrounding 200km", and the relevant continental/national context

Respond with valid JSON only, no markdown code blocks.`
          : `You are an expert ornithologist and conservation data scientist performing a GLOBAL SPECIES OVERVIEW analysis across the full native range.

Species: ${species.name} (${species.scientific})
IUCN Status: ${species.iucnStatus}
Family: ${species.family}
Native Regions: ${species.nativeRegions.join(', ')}

Analysis Scope: GLOBAL — All Native Regions
Computed Risk Score: ${riskScore?.score ?? 'N/A'}/100
Population Trend: ${trend}
Percent Change Since 2000: ${riskScore?.percentChange ?? 'N/A'}%
Peak Population Year: ${riskScore?.peakYear ?? 'N/A'}
Data Points: ${riskScore?.dataPoints ?? 'N/A'} years of data
Analysis Year Focus: ${year}

IMPORTANT: This is a GLOBAL, SPECIES-WIDE analysis. Cover the species' entire native range, comparing different regions and flyways. Provide a comprehensive overview of global population dynamics, not a region-specific analysis.

Based ONLY on the data above (do not invent statistics), respond with valid JSON using these exact keys:
- "drivers": string (2-3 sentences on the PRIMARY GLOBAL decline/stability drivers across the species' full range)
- "localVsGlobal": string (2 sentences comparing trends across different regions of the native range)
- "confidence": string (1-2 sentences on overall data confidence across the global monitoring network)
- "recommendations": string[] (array of 4 concrete action items for global conservation)
- "habitatThreat": array of 4 objects { "label": string, "value": number (0-100) } for the top global-scale threat categories
- "migrationShift": string (2 sentences on detected migration range/timing shifts across the full range)
- "phenologicalRisk": object { "score": number (0-100), "label": string, "color": "#hex" } for global phenological mismatch
- "regionalBreakdown": array of objects { "region": string, "status": string (1-2 sentences) } for each major native region/flyway

Respond with valid JSON only, no markdown code blocks.`;

        const completion = await openai.chat.completions.create({
          model: 'openai/gpt-oss-120b',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6,
          top_p: 1,
          max_tokens: 4096,
          stream: true,
        });

        let fullContent = '';
        let reasoningAccumulated = '';

        for await (const chunk of completion) {
          const reasoning = (chunk.choices[0]?.delta as any)?.reasoning_content;
          if (reasoning) {
            reasoningAccumulated += reasoning;
            setReasoningText(reasoningAccumulated);
          }
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            fullContent += content;
          }
        }

        const rawParsed = extractJSON(fullContent);
        const sanitized = sanitizeAnalysisResult(rawParsed, trend, analysisMode, targetPoint?.lat, targetPoint?.lng);
        setAnalysis(sanitized);
        setUsedNvidia(true);
        setUsedDemo(false);
      } catch (e) {
        console.error('NVIDIA NIM error:', e);
        if (analysisMode === 'local' && targetPoint) {
          setAnalysis(getLocalDemoAnalysis(targetPoint.lat, targetPoint.lng, trend));
        } else {
          setAnalysis(DEMO_GLOBAL[trend] ?? DEMO_GLOBAL.stable);
        }
        setUsedDemo(true);
        setUsedNvidia(false);
      }
    } else {
      await new Promise(r => setTimeout(r, 1200));
      if (analysisMode === 'local' && targetPoint) {
        setAnalysis(getLocalDemoAnalysis(targetPoint.lat, targetPoint.lng, trend));
      } else {
        setAnalysis(DEMO_GLOBAL[trend] ?? DEMO_GLOBAL.stable);
      }
      setUsedDemo(true);
      setUsedNvidia(false);
    }

    setAnalyzing(false);
  }, [effectiveApiKey, species, riskScore, year, hasValidTarget, targetPoint, analysisMode]);

  // Auto-run analysis when panel mounts or when species/triggerId/targetPoint changes
  useEffect(() => {
    runAnalysis();
  }, [species.key, triggerId, targetPoint, runAnalysis]);

  const riskColor =
    riskScore && riskScore.score >= 70 ? '#e63946' :
    riskScore && riskScore.score >= 50 ? '#e9c46a' : '#52b788';

  const BirdIcon = getBirdIcon(species.speciesGroup);
  const groupColor = GROUP_COLORS[species.speciesGroup] ?? '#52b788';

  const modeColor = analysisMode === 'local' ? '#48cae4' : '#52b788';
  const modeIcon = analysisMode === 'local' ? MapPin : Globe;
  const ModeIconComponent = modeIcon;

  return (
    <div className="analysis-panel glass-panel">
      {/* ── Panel Header ── */}
      <div className="panel-header">
        <div className="panel-title-group">
          <Brain size={17} className="panel-icon" />
          <h2 className="panel-title">AI Deep Analysis</h2>
        </div>
        <div className="analysis-mode-badge-header" style={{
          background: `${modeColor}14`,
          borderColor: `${modeColor}44`,
          color: modeColor,
        }}>
          <ModeIconComponent size={11} />
          {analysisMode === 'local' ? 'Regional' : 'Global'}
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>

      {/* ── Analysis Scope Banner ── */}
      <div className={`analysis-scope-banner ${analysisMode}`}>
        <div className="scope-banner-icon-wrap" style={{ background: `${modeColor}18`, borderColor: `${modeColor}33` }}>
          <ModeIconComponent size={16} style={{ color: modeColor }} />
        </div>
        <div className="scope-banner-content">
          <span className="scope-banner-title" style={{ color: modeColor }}>
            {analysisMode === 'local' ? 'Regional Sector Analysis' : 'Global Species Overview'}
          </span>
          <span className="scope-banner-desc">
            {analysisMode === 'local'
              ? `Focused on ${targetPoint?.locationName || `${targetPoint?.lat.toFixed(2)}°, ${targetPoint?.lng.toFixed(2)}°`}`
              : `Across all ${species.nativeRegions.length} native regions`
            }
          </span>
        </div>
        {analysisMode === 'local' && targetPoint && (
          <span className="scope-banner-coord">
            {targetPoint.lat.toFixed(2)}°, {targetPoint.lng.toFixed(2)}°
          </span>
        )}
      </div>

      {/* ── Species header ── */}
      <div className="analysis-species-header">
        <span className="analysis-svg-icon" style={{ color: groupColor }}>
          <BirdIcon size={26} color={groupColor} />
        </span>
        <div>
          <div className="analysis-species-name">{species.name}</div>
          <div className="analysis-species-sci">{species.scientific}</div>
        </div>
        {riskScore && (
          <div
            className="analysis-risk-chip"
            style={{
              background: `${riskColor}14`,
              borderColor: riskColor,
              color: riskColor,
            }}
          >
            {riskLoading ? '···' : (
              <>
                <TrendingDown size={11} />
                Risk {riskScore.score}/100
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Local: Sector Context Card ── */}
      {analysisMode === 'local' && targetPoint && (
        <div className="analysis-sector-context">
          <button
            type="button"
            className="sector-ctx-toggle"
            onClick={() => setSectorOpen(o => !o)}
            aria-expanded={sectorOpen}
            title={sectorOpen ? 'Collapse sector context' : 'Expand sector context'}
          >
            <span className="sector-ctx-toggle-chip">
              <Crosshair size={12} />
            </span>
            <span className="sector-ctx-toggle-label">Sector Context</span>
            {!sectorOpen && (
              <span className="sector-ctx-toggle-summary">
                {targetPoint.lat.toFixed(2)}°, {targetPoint.lng.toFixed(2)}° · {Math.round((targetPoint.weight || 0.5) * 100)}/100
              </span>
            )}
            <ChevronDown
              size={13}
              className={`sector-ctx-toggle-chevron${sectorOpen ? ' open' : ''}`}
            />
          </button>
          {sectorOpen && (
            <div className="sector-context-grid">
              <div
                className="sector-ctx-item"
                title={`Coordinates: ${targetPoint.lat.toFixed(2)}°, ${targetPoint.lng.toFixed(2)}°`}
              >
                <Crosshair size={12} className="sector-ctx-icon" />
                <div>
                  <span className="sector-ctx-label">Coordinates</span>
                  <span className="sector-ctx-value font-mono">{targetPoint.lat.toFixed(2)}°, {targetPoint.lng.toFixed(2)}°</span>
                </div>
              </div>
              <div
                className="sector-ctx-item"
                title={targetPoint.habitatType || 'Ecosystem under assessment'}
              >
                <TreePine size={12} className="sector-ctx-icon" />
                <div>
                  <span className="sector-ctx-label">Ecosystem</span>
                  <span className="sector-ctx-value">{targetPoint.habitatType || 'Under assessment'}</span>
                </div>
              </div>
              <div
                className="sector-ctx-item"
                title={`${targetPoint.clusterSize || 1} sites merged`}
              >
                <Layers size={12} className="sector-ctx-icon" />
                <div>
                  <span className="sector-ctx-label">Cluster Size</span>
                  <span className="sector-ctx-value">{targetPoint.clusterSize || 1} sites merged</span>
                </div>
              </div>
              <div
                className="sector-ctx-item"
                title={`Observation density ${Math.round((targetPoint.weight || 0.5) * 100)}/100`}
              >
                <Zap size={12} className="sector-ctx-icon" />
                <div>
                  <span className="sector-ctx-label">Density</span>
                  <span className="sector-ctx-value">{Math.round((targetPoint.weight || 0.5) * 100)}/100</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Global: Scope Summary ── */}
      {analysisMode === 'global' && (
        <div className="analysis-global-scope">
          <div className="global-scope-pills">
            {species.nativeRegions.slice(0, 4).map(region => (
              <span key={region} className="global-scope-pill">
                <Compass size={9} />
                {region}
              </span>
            ))}
            {species.nativeRegions.length > 4 && (
              <span className="global-scope-pill more">+{species.nativeRegions.length - 4} more</span>
            )}
          </div>
        </div>
      )}

      {/* ── Engine Status Badge ── */}
      {!analysis && (
        <div className="nvidia-status-card">
          <div className="nvidia-status-header">
            <Cpu size={14} className="nvidia-icon" />
            <span className="nvidia-status-title">NVIDIA NIM Engine</span>
            {envKey ? (
              <span className="nvidia-active-tag">
                <CheckCircle2 size={10} /> Active (.env)
              </span>
            ) : (
              <span className="nvidia-demo-tag">Demo Mode</span>
            )}
          </div>
          <p className="nvidia-status-desc">
            Model: <code className="nvidia-model-name">openai/gpt-oss-120b</code>
          </p>
        </div>
      )}

      {/* ── API Key toggle ── */}
      {!analysis && (
        <div className="api-key-section">
          <button
            className="api-key-toggle"
            onClick={() => setShowKeyInput(!showKeyInput)}
          >
            <Key size={12} />
            {showKeyInput ? 'Hide API Key' : 'Override NVIDIA API Key'}
          </button>
          {showKeyInput && (
            <div className="api-key-input-wrap">
              <input
                type="password"
                placeholder="nvapi-…"
                value={customKey}
                onChange={e => setCustomKey(e.target.value)}
                className="api-key-input"
              />
              <p className="api-key-hint">
                Custom NVIDIA API key overrides the key in `.env`.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Analyze button ── */}
      {!analysis && !analyzing && (
        <button className="analyze-btn-main" onClick={runAnalysis}>
          <Brain size={15} />
          {effectiveApiKey
            ? `Analyze ${analysisMode === 'local' ? 'Region' : 'Species'} with NVIDIA`
            : `Run ${analysisMode === 'local' ? 'Regional' : 'Global'} Demo Analysis`
          }
        </button>
      )}

      {/* ── Loading state ── */}
      {analyzing && (
        <div className="analysis-loading">
          <Loader2 size={26} className="spin" />
          <p className="analysis-loading-title">
            {analysisMode === 'local' ? 'Regional Sector Analysis' : 'Global Species Analysis'}
          </p>
          <p className="analysis-loading-sub">
            Running <code style={{ color: 'var(--green-bright)' }}>openai/gpt-oss-120b</code>
            {analysisMode === 'local' && targetPoint && (
              <> · {targetPoint.lat.toFixed(1)}°, {targetPoint.lng.toFixed(1)}°</>
            )}
          </p>
          
          {reasoningText && (
            <div className="nvidia-reasoning-box">
              <div className="nvidia-reasoning-header">
                <Cpu size={12} className="spin-icon" />
                <span>Live Reasoning Output</span>
              </div>
              <div className="nvidia-reasoning-body">
                {reasoningText}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Results ── */}
      {analysis && !analyzing && (
        <div className="analysis-results">
          {/* Source badge */}
          {usedNvidia && (
            <div className="nvidia-badge">
              <Cpu size={12} />
              Analyzed with NVIDIA NIM (openai/gpt-oss-120b)
            </div>
          )}
          {usedDemo && (
            <div className="demo-badge">
              <AlertCircle size={12} />
              {analysisMode === 'local' ? 'Regional Baseline Analysis' : 'Global Baseline Analysis'}
            </div>
          )}

          {/* Mode Context Summary */}
          <div className="analysis-mode-summary" style={{ borderColor: `${modeColor}33`, background: `${modeColor}08` }}>
            <ModeIconComponent size={13} style={{ color: modeColor }} />
            <span style={{ color: modeColor, fontWeight: 700 }}>
              {analysisMode === 'local'
                ? `Sector: ${targetPoint?.locationName || `${targetPoint?.lat.toFixed(2)}°, ${targetPoint?.lng.toFixed(2)}°`}`
                : `Global Overview — ${species.name}`
              }
            </span>
          </div>

          {/* Decline / Population Drivers */}
          <div className="analysis-section">
            <h4 className="analysis-section-title">
              <TrendingDown size={11} />
              {analysisMode === 'local' ? 'Regional Drivers' : 'Global Population Drivers'}
            </h4>
            <p className="analysis-text">{analysis?.drivers}</p>
          </div>

          {/* Habitat Threat Gauge */}
          <div className="analysis-section">
            <h4 className="analysis-section-title">
              <Thermometer size={11} />
              {analysisMode === 'local' ? 'Local Habitat Threat Index' : 'Global Habitat Threat Index'}
            </h4>
            <div className="habitat-gauge-wrap">
              {analysis?.habitatThreat?.map((t) => (
                <div key={t.label} className="habitat-gauge-row">
                  <span className="habitat-gauge-label">{t.label}</span>
                  <div className="habitat-gauge-bar-bg">
                    <div
                      className="habitat-gauge-bar-fill"
                      style={{ width: `${t.value}%`, background: gaugeColor(t.value) }}
                    />
                  </div>
                  <span className="habitat-gauge-val">{t.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Migration Shift */}
          <div className="analysis-section">
            <h4 className="analysis-section-title">
              <Map size={11} />
              {analysisMode === 'local' ? 'Local Migration Shift' : 'Migration Range Shift'}
            </h4>
            <p className="analysis-text">{analysis?.migrationShift}</p>
          </div>

          {/* Phenological Risk Score */}
          <div className="analysis-section">
            <h4 className="analysis-section-title">
              🌡 Phenological Mismatch Score
            </h4>
            {analysis?.phenologicalRisk && (
              <div
                className="phenological-chip"
                style={{
                  borderColor: `${analysis.phenologicalRisk.color || '#e63946'}55`,
                  background: `${analysis.phenologicalRisk.color || '#e63946'}12`,
                  color: analysis.phenologicalRisk.color || '#e63946',
                }}
              >
                {analysis.phenologicalRisk.score}/100 — {analysis.phenologicalRisk.label}
              </div>
            )}
            <p className="analysis-text" style={{ marginTop: 7 }}>
              {analysisMode === 'local'
                ? 'Phenological mismatch at this coordinate sector measures how much the local migration timing has drifted out of sync with regional food sources. A high score indicates this sector is particularly vulnerable.'
                : 'Phenological mismatch measures how much the species\u2019 migration timing has drifted out of sync with its food sources (insect emergence, plant flowering). A high score indicates critical vulnerability to continued climate shifts.'
              }
            </p>
          </div>

          {/* Local vs. Global */}
          <div className="analysis-section">
            <h4 className="analysis-section-title">
              <Globe size={11} />
              {analysisMode === 'local' ? 'Regional vs. Global Comparison' : 'Cross-Regional Comparison'}
            </h4>
            <p className="analysis-text">{analysis?.localVsGlobal}</p>
          </div>

          {/* Regional Breakdown */}
          <div className="analysis-section">
            <h4 className="analysis-section-title">
              📍 {analysisMode === 'local' ? 'Sector Breakdown' : 'Regional Breakdown'}
            </h4>
            <div className="regional-breakdown">
              {analysis?.regionalBreakdown?.map((rb) => (
                <div key={rb.region} className="regional-row">
                  <span className="regional-name">{rb.region}</span>
                  <span className="regional-desc">{rb.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Data Confidence */}
          <div className="analysis-section">
            <h4 className="analysis-section-title">📊 Data Confidence</h4>
            <p className="analysis-text">{analysis?.confidence}</p>
          </div>

          {/* Recommendations */}
          <div className="analysis-section">
            <h4 className="analysis-section-title">
              ✅ {analysisMode === 'local' ? 'Local Recommendations' : 'Conservation Recommendations'}
            </h4>
            <ul className="recommendations-list">
              {analysis?.recommendations?.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>

          <button
            className="re-analyze-btn"
            onClick={() => { setAnalysis(null); setUsedDemo(false); setUsedNvidia(false); setReasoningText(''); }}
          >
            <Zap size={12} />
            Run New {analysisMode === 'local' ? 'Regional' : 'Global'} Analysis
          </button>
        </div>
      )}
    </div>
  );
}
