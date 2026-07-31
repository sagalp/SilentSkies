import { useState, useCallback } from 'react';
import {
  X, Brain, TrendingDown, AlertCircle, Loader2, Key,
  ExternalLink, Map, Thermometer, Globe,
} from 'lucide-react';
import type { Species } from '../types';
import { useRiskScore } from '../hooks/useRiskScore';

interface AnalysisPanelProps {
  species: Species;
  year: number;
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

// Returns color for a gauge bar value 0–100
function gaugeColor(v: number) {
  if (v >= 70) return '#e63946';
  if (v >= 50) return '#e9c46a';
  return '#52b788';
}

export function AnalysisPanel({ species, year, onClose }: AnalysisPanelProps) {
  const { riskScore, loading: riskLoading } = useRiskScore(species.key);
  const [apiKey, setApiKey] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [usedDemo, setUsedDemo] = useState(false);

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);

    if (apiKey) {
      try {
        const prompt = `You are an expert ornithologist and conservation data scientist analyzing bird population trends.

Species: ${species.name} (${species.scientific})
IUCN Status: ${species.iucnStatus}
Family: ${species.family}
Native Regions: ${species.nativeRegions.join(', ')}
Computed Risk Score: ${riskScore?.score ?? 'N/A'}/100
Population Trend: ${riskScore?.trend ?? 'unknown'}
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

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'anthropic-dangerous-direct-browser-calls': 'true',
          },
          body: JSON.stringify({
            model: 'claude-opus-4-5',
            max_tokens: 1800,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        if (!response.ok) throw new Error('Claude API error');
        const data = await response.json();
        const text = data.content[0].text;
        const parsed = JSON.parse(text);
        setAnalysis(parsed);
        setUsedDemo(false);
      } catch (e) {
        console.error(e);
        const trend = riskScore?.trend ?? 'stable';
        setAnalysis(DEMO_ANALYSIS[trend] ?? DEMO_ANALYSIS.stable);
        setUsedDemo(true);
      }
    } else {
      await new Promise(r => setTimeout(r, 1800));
      const trend = riskScore?.trend ?? 'stable';
      setAnalysis(DEMO_ANALYSIS[trend] ?? DEMO_ANALYSIS.stable);
      setUsedDemo(true);
    }

    setAnalyzing(false);
  }, [apiKey, species, riskScore, year]);

  const riskColor =
    riskScore && riskScore.score >= 70 ? '#e63946' :
    riskScore && riskScore.score >= 50 ? '#e9c46a' : '#52b788';

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
        <span className="analysis-emoji">{species.emoji}</span>
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

      {/* API Key toggle */}
      {!analysis && (
        <div className="api-key-section">
          <button
            className="api-key-toggle"
            onClick={() => setShowKeyInput(!showKeyInput)}
          >
            <Key size={12} />
            {showKeyInput ? 'Hide API Key' : 'Add Claude API Key (optional)'}
          </button>
          {showKeyInput && (
            <div className="api-key-input-wrap">
              <input
                type="password"
                placeholder="sk-ant-…"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="api-key-input"
              />
              <p className="api-key-hint">
                Without a key, curated demo analysis is shown. Get yours at{' '}
                <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
                  console.anthropic.com <ExternalLink size={9} />
                </a>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Analyze button */}
      {!analysis && !analyzing && (
        <button className="analyze-btn-main" onClick={runAnalysis}>
          <Brain size={15} />
          {apiKey ? 'Analyze with Claude' : 'Run Demo Analysis'}
        </button>
      )}

      {/* Loading state */}
      {analyzing && (
        <div className="analysis-loading">
          <Loader2 size={26} className="spin" />
          <p>Synthesizing population data…</p>
          <p className="analysis-loading-sub">Grounding analysis in GBIF occurrence trends</p>
        </div>
      )}

      {/* Results */}
      {analysis && !analyzing && (
        <div className="analysis-results">
          {usedDemo && (
            <div className="demo-badge">
              <AlertCircle size={12} />
              Demo mode — add Claude API key for real AI analysis
            </div>
          )}

          {/* Decline Drivers */}
          <div className="analysis-section">
            <h4 className="analysis-section-title">
              <TrendingDown size={11} /> Decline Drivers
            </h4>
            <p className="analysis-text">{analysis.drivers}</p>
          </div>

          {/* Habitat Threat Gauge */}
          <div className="analysis-section">
            <h4 className="analysis-section-title">
              <Thermometer size={11} /> Habitat Threat Index
            </h4>
            <div className="habitat-gauge-wrap">
              {analysis.habitatThreat.map((t) => (
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
            <p className="analysis-text">{analysis.migrationShift}</p>
          </div>

          {/* Phenological Risk Score */}
          <div className="analysis-section">
            <h4 className="analysis-section-title">
              🌡 Phenological Mismatch Score
            </h4>
            <div
              className="phenological-chip"
              style={{
                borderColor: `${analysis.phenologicalRisk.color}55`,
                background: `${analysis.phenologicalRisk.color}12`,
                color: analysis.phenologicalRisk.color,
              }}
            >
              {analysis.phenologicalRisk.score}/100 — {analysis.phenologicalRisk.label}
            </div>
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
            <p className="analysis-text">{analysis.localVsGlobal}</p>
          </div>

          {/* Regional Breakdown */}
          <div className="analysis-section">
            <h4 className="analysis-section-title">
              📍 Regional Breakdown
            </h4>
            <div className="regional-breakdown">
              {analysis.regionalBreakdown.map((rb) => (
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
            <p className="analysis-text">{analysis.confidence}</p>
          </div>

          {/* Recommendations */}
          <div className="analysis-section">
            <h4 className="analysis-section-title">✅ Recommendations</h4>
            <ul className="recommendations-list">
              {analysis.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>

          <button
            className="re-analyze-btn"
            onClick={() => { setAnalysis(null); setUsedDemo(false); }}
          >
            ↺ Run New Analysis
          </button>
        </div>
      )}
    </div>
  );
}
