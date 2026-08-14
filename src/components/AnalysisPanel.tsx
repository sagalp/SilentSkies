import { useState, useCallback, useEffect } from 'react';
import OpenAI from 'openai';
import {
  X, Brain, TrendingDown, AlertCircle, Loader2, Key,
  Map, Thermometer, Globe, Cpu, CheckCircle2
} from 'lucide-react';
import type { Species, GlobePoint } from '../types';
import { useRiskScore } from '../hooks/useRiskScore';
import { getBirdIcon, GROUP_COLORS } from './BirdIcons';

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

const DEMO_ANALYSIS: Record<string, AnalysisResult> = {
  declining: {
    drivers:
      'Population decline in this species is primarily driven by habitat fragmentation due to agricultural expansion, particularly the loss of traditional meadow ecosystems used for foraging. Climate-driven shifts in insect emergence timing have also disrupted the synchronization between migration arrival and peak prey availability — a phenomenon known as phenological mismatch.',
    localVsGlobal:
      'The observed local decline rate of ~3.2% per year is consistent with, and slightly exceeds, the global trend reported by BirdLife International. Western Europe and North America show steeper declines compared to Asian populations, likely due to more intensive land-use change.',
    confidence:
      'Moderate confidence (R² = 0.71). Based on 18+ years of GBIF occurrence data with sufficient record density. Confidence is reduced in regions with sparse observer networks — particularly Sub-Saharan Africa and parts of Central Asia.',
    recommendations: [
      'Plant native wildflower meadows to support insect prey base',
      'Avoid mowing during breeding season (May–July)',
      'Reduce pesticide use near water bodies and field margins',
      'Support local conservation land trusts and habitat corridors',
    ],
    habitatThreat: [
      { label: 'Agricultural Expansion', value: 82 },
      { label: 'Climate Disruption', value: 67 },
      { label: 'Urban Encroachment', value: 54 },
      { label: 'Pesticide Exposure', value: 71 },
    ],
    migrationShift:
      'Historical range analysis shows a northward shift of approximately 45–80 km per decade in core breeding territories. Wintering grounds in sub-Saharan Africa have contracted by an estimated 12% since 2005, reducing the carrying capacity for overwintering populations.',
    phenologicalRisk: { score: 74, label: 'High Mismatch', color: '#e63946' },
    regionalBreakdown: [
      { region: 'Western Europe', status: 'Declining rapidly — intensive farmland conversion is the primary driver. UK populations down 68% since 1990.' },
      { region: 'North America', status: 'Moderate decline — grassland loss and pesticide exposure on wintering grounds in South America compound breeding season pressures.' },
      { region: 'East Asia', status: 'Relatively stable — traditional rice paddy agriculture provides adequate foraging habitat, though urbanization is accelerating.' },
      { region: 'Africa (Wintering)', status: 'Understudied — drought frequency increasing in Sahel stopover zones; loss of key refueling habitat suspected.' },
    ],
  },
  stable: {
    drivers:
      'This species shows a relatively stable population trend across observed regions. Minor fluctuations correlate with El Niño/La Niña cycles affecting wintering habitat productivity. Reforestation efforts in core breeding areas appear to be offsetting pressures from urban development.',
    localVsGlobal:
      'Local trends largely mirror global population stability. Some regional heterogeneity is observed — northwestern populations show modest recovery while southeastern subpopulations face localized pressure from coastal development.',
    confidence:
      'High confidence (R² = 0.83). This species is heavily observed by citizen scientists, yielding dense, longitudinally consistent records across all years in the dataset. Statistical noise is low.',
    recommendations: [
      'Maintain existing habitat protections and avoid rollback of buffer zones',
      'Increase monitoring frequency in southeastern subpopulations',
      'Support coastal buffer zone legislation',
      'Contribute occurrence data via eBird or iNaturalist',
    ],
    habitatThreat: [
      { label: 'Coastal Development', value: 38 },
      { label: 'Climate Variability', value: 44 },
      { label: 'Invasive Species', value: 22 },
      { label: 'Pollution', value: 31 },
    ],
    migrationShift:
      'Minor longitudinal shift detected — breeding populations have adjusted arrival timing by approximately 5–8 days earlier over the past two decades, consistent with spring temperature advancement. Core range boundaries remain broadly intact with no significant contraction.',
    phenologicalRisk: { score: 32, label: 'Low–Moderate', color: '#52b788' },
    regionalBreakdown: [
      { region: 'Northern Europe', status: 'Stable to recovering — protected area network is effective; citizen science monitoring coverage is excellent.' },
      { region: 'Mediterranean', status: 'Slight decline in coastal zones due to resort development; inland populations remain stable.' },
      { region: 'Sub-Saharan Africa', status: 'Wintering range appears intact; habitat quality is adequate with no major emerging threats documented.' },
      { region: 'Central Asia', status: 'Sparse data — monitoring gaps make trend assessment uncertain. Priority area for observer network expansion.' },
    ],
  },
  recovering: {
    drivers:
      'Recovery trend is largely attributed to successful DDT and organochlorine pesticide bans enacted in the 1970s–90s, combined with targeted nest protection programs and captive breeding supplementation. Continued recovery depends on sustained regulatory frameworks and reduction in illegal hunting along migration routes.',
    localVsGlobal:
      'Recovery is most pronounced in North American and Western European core ranges. Asian populations have seen slower recovery due to ongoing habitat pressure and hunting in overwintering regions.',
    confidence:
      'High confidence (R² = 0.89). Long-term monitoring programs provide excellent record density. Recovery trajectory is well-documented and statistically robust with minimal noise.',
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
      'Recolonization of historical breeding territories is underway, with populations returning to areas not occupied since the 1960s. Migration corridors are largely intact, though bottlenecks in the Mediterranean flyway remain a vulnerability during peak passage periods.',
    phenologicalRisk: { score: 21, label: 'Low Risk', color: '#52b788' },
    regionalBreakdown: [
      { region: 'North America', status: 'Strong recovery — breeding populations at highest levels since 1970. Legal protections are holding.' },
      { region: 'Western Europe', status: 'Recovering steadily — reintroduction programs in Scotland and Spain showing measurable results.' },
      { region: 'Central Asia', status: 'Slow recovery hampered by limited enforcement of hunting regulations along migration corridors.' },
      { region: 'South Asia (Wintering)', status: 'Habitat quality improving in some areas but inconsistent; wetland drainage remains a concern in Bangladesh and Myanmar.' },
    ],
  },
};

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

function sanitizeAnalysisResult(raw: any, fallbackTrend: string): AnalysisResult {
  const fallback = DEMO_ANALYSIS[fallbackTrend] || DEMO_ANALYSIS.stable;
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

  const envKey = import.meta.env.VITE_NVIDIA_API_KEY || '';
  const effectiveApiKey = customKey || envKey;

  const hasValidTarget = Boolean(targetPoint && typeof targetPoint.lat === 'number' && typeof targetPoint.lng === 'number');

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

        const locationContext = hasValidTarget
          ? `Selected Flyway / Coordinate Sector: Lat ${targetPoint!.lat.toFixed(2)}°, Lng ${targetPoint!.lng.toFixed(2)}°${targetPoint!.locationName ? ` (${targetPoint!.locationName})` : ''}`
          : `Global Native Range Focus`;

        const prompt = `You are an expert ornithologist and conservation data scientist analyzing bird population trends.

Species: ${species.name} (${species.scientific})
IUCN Status: ${species.iucnStatus}
Family: ${species.family}
Native Regions: ${species.nativeRegions.join(', ')}
${locationContext}
Computed Risk Score: ${riskScore?.score ?? 'N/A'}/100
Population Trend: ${trend}
Percent Change Since 2000: ${riskScore?.percentChange ?? 'N/A'}%
Peak Population Year: ${riskScore?.peakYear ?? 'N/A'}
Data Points: ${riskScore?.dataPoints ?? 'N/A'} years of data
Analysis Year Focus: ${year}

Based ONLY on the data above (do not invent statistics), respond with valid JSON using these exact keys:
- "drivers": string (2-3 sentences on likely decline/stability drivers specific to this species/region)
- "localVsGlobal": string (2 sentences comparing local vs global trend)
- "confidence": string (1-2 sentences on your confidence based on data density)
- "recommendations": string[] (array of 4 concrete action items a person can take)
- "habitatThreat": array of 4 objects { "label": string, "value": number (0-100) } for key threat categories
- "migrationShift": string (2 sentences on detected migration range/timing shifts)
- "phenologicalRisk": object { "score": number (0-100), "label": string, "color": "#hex" } for phenological mismatch risk
- "regionalBreakdown": array of objects { "region": string, "status": string (1-2 sentences) } for each native region

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
        const sanitized = sanitizeAnalysisResult(rawParsed, trend);
        setAnalysis(sanitized);
        setUsedNvidia(true);
        setUsedDemo(false);
      } catch (e) {
        console.error('NVIDIA NIM error:', e);
        setAnalysis(DEMO_ANALYSIS[trend] ?? DEMO_ANALYSIS.stable);
        setUsedDemo(true);
        setUsedNvidia(false);
      }
    } else {
      await new Promise(r => setTimeout(r, 1200));
      setAnalysis(DEMO_ANALYSIS[trend] ?? DEMO_ANALYSIS.stable);
      setUsedDemo(true);
      setUsedNvidia(false);
    }

    setAnalyzing(false);
  }, [effectiveApiKey, species, riskScore, year, hasValidTarget, targetPoint]);

  // Auto-run analysis when panel mounts or when species/triggerId/targetPoint changes
  useEffect(() => {
    runAnalysis();
  }, [species.key, triggerId, targetPoint, runAnalysis]);

  const riskColor =
    riskScore && riskScore.score >= 70 ? '#e63946' :
    riskScore && riskScore.score >= 50 ? '#e9c46a' : '#52b788';

  const BirdIcon = getBirdIcon(species.speciesGroup);
  const groupColor = GROUP_COLORS[species.speciesGroup] ?? '#52b788';

  return (
    <div className="analysis-panel glass-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <Brain size={17} className="panel-icon" />
          <h2 className="panel-title">AI Deep Analysis</h2>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>

      {/* Species header */}
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

      {/* Target location banner */}
      {hasValidTarget && (
        <div className="analysis-target-banner">
          <Map size={12} className="target-banner-icon" />
          <span>Sector Focus: {targetPoint!.lat.toFixed(2)}°, {targetPoint!.lng.toFixed(2)}° {targetPoint!.locationName ? `(${targetPoint!.locationName})` : ''}</span>
        </div>
      )}

      {/* Engine Status Badge */}
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

      {/* API Key toggle */}
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

      {/* Analyze button */}
      {!analysis && !analyzing && (
        <button className="analyze-btn-main" onClick={runAnalysis}>
          <Brain size={15} />
          {effectiveApiKey ? 'Analyze with NVIDIA gpt-oss-120b' : 'Run Demo Analysis'}
        </button>
      )}

      {/* Loading state */}
      {analyzing && (
        <div className="analysis-loading">
          <Loader2 size={26} className="spin" />
          <p className="analysis-loading-title">NVIDIA NIM Reasoning Stream</p>
          <p className="analysis-loading-sub">Running <code style={{ color: 'var(--green-bright)' }}>openai/gpt-oss-120b</code></p>
          
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

      {/* Results */}
      {analysis && !analyzing && (
        <div className="analysis-results">
          {usedNvidia && (
            <div className="nvidia-badge">
              <Cpu size={12} />
              Analyzed with NVIDIA NIM (openai/gpt-oss-120b)
            </div>
          )}
          {usedDemo && (
            <div className="demo-badge">
              <AlertCircle size={12} />
              Curated Baseline Analysis
            </div>
          )}

          {/* Decline Drivers */}
          <div className="analysis-section">
            <h4 className="analysis-section-title">
              <TrendingDown size={11} /> Decline Drivers
            </h4>
            <p className="analysis-text">{analysis?.drivers}</p>
          </div>

          {/* Habitat Threat Gauge */}
          <div className="analysis-section">
            <h4 className="analysis-section-title">
              <Thermometer size={11} /> Habitat Threat Index
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
              <Map size={11} /> Migration Range Shift
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
              Phenological mismatch measures how much the species' migration timing has drifted
              out of sync with its food sources (insect emergence, plant flowering). A high score
              indicates critical vulnerability to continued climate shifts.
            </p>
          </div>

          {/* Local vs. Global */}
          <div className="analysis-section">
            <h4 className="analysis-section-title">
              <Globe size={11} /> Local vs. Global Trend
            </h4>
            <p className="analysis-text">{analysis?.localVsGlobal}</p>
          </div>

          {/* Regional Breakdown */}
          <div className="analysis-section">
            <h4 className="analysis-section-title">
              📍 Regional Breakdown
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
            <h4 className="analysis-section-title">✅ Recommendations</h4>
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
            ↺ Run New Analysis
          </button>
        </div>
      )}
    </div>
  );
}
