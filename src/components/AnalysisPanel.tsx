import { useState, useCallback } from 'react';
import { X, Brain, TrendingDown, AlertCircle, Loader2, Key, ExternalLink } from 'lucide-react';
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
      'Support local conservation land trusts',
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
      'Maintain existing habitat protections',
      'Monitor southern subpopulations more closely',
      'Support coastal buffer zone legislation',
      'Contribute occurrence data via eBird/iNaturalist',
    ],
  },
  recovering: {
    drivers:
      'Recovery trend is largely attributed to successful DDT and organochlorine pesticide bans enacted in the 1970s-90s, combined with targeted nest protection programs and captive breeding supplementation. Continued recovery depends on sustained regulatory frameworks and reduction in illegal hunting along migration routes.',
    localVsGlobal:
      'Recovery is most pronounced in North American and Western European core ranges. Asian populations have seen slower recovery due to ongoing habitat pressure and hunting in overwintering regions.',
    confidence:
      'High confidence (R² = 0.89). Long-term monitoring programs provide excellent record density. Recovery trajectory is well-documented and statistically robust.',
    recommendations: [
      'Continue nest box and nest protection programs',
      'Advocate for international treaty protections on migration corridors',
      'Support anti-poaching enforcement in wintering range countries',
      'Volunteer with local raptor monitoring groups',
    ],
  },
};

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
      // Real Claude API call
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

Based ONLY on the data above (do not invent statistics), provide a structured analysis in JSON with these exact keys:
- "drivers": 2-3 sentences on likely decline drivers specific to this species/region
- "localVsGlobal": 2 sentences comparing local vs global trend
- "confidence": 1-2 sentences stating your confidence based on data density
- "recommendations": array of 4 concrete action items a person can take

Respond with valid JSON only, no markdown.`;

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
            max_tokens: 1024,
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
        // Fallback to demo
        const trend = riskScore?.trend ?? 'stable';
        setAnalysis(DEMO_ANALYSIS[trend] ?? DEMO_ANALYSIS.stable);
        setUsedDemo(true);
      }
    } else {
      // Demo mode with realistic pre-generated analysis
      await new Promise(r => setTimeout(r, 1800)); // simulate thinking
      const trend = riskScore?.trend ?? 'stable';
      setAnalysis(DEMO_ANALYSIS[trend] ?? DEMO_ANALYSIS.stable);
      setUsedDemo(true);
    }

    setAnalyzing(false);
  }, [apiKey, species, riskScore, year]);

  return (
    <div className="analysis-panel glass-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <Brain size={18} className="panel-icon" />
          <h2 className="panel-title">AI Deep Analysis</h2>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
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
              background: riskScore.score >= 70
                ? 'rgba(239,68,68,0.15)'
                : riskScore.score >= 50
                ? 'rgba(249,115,22,0.15)'
                : 'rgba(34,197,94,0.15)',
              borderColor: riskScore.score >= 70
                ? '#ef4444'
                : riskScore.score >= 50
                ? '#f97316'
                : '#22c55e',
            }}
          >
            {riskLoading ? '···' : (
              <>
                <TrendingDown size={12} />
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
            <Key size={13} />
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
                Without a key, demo analysis will be shown. Get yours at{' '}
                <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
                  console.anthropic.com <ExternalLink size={10} />
                </a>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Analyze button */}
      {!analysis && !analyzing && (
        <button className="analyze-btn-main" onClick={runAnalysis}>
          <Brain size={16} />
          {apiKey ? 'Analyze with Claude' : 'Run Demo Analysis'}
        </button>
      )}

      {/* Loading state */}
      {analyzing && (
        <div className="analysis-loading">
          <Loader2 size={24} className="spin" />
          <p>Synthesizing population data…</p>
          <p className="analysis-loading-sub">Grounding analysis in GBIF trends</p>
        </div>
      )}

      {/* Results */}
      {analysis && !analyzing && (
        <div className="analysis-results">
          {usedDemo && (
            <div className="demo-badge">
              <AlertCircle size={13} />
              Demo mode — add Claude API key for real AI analysis
            </div>
          )}

          <div className="analysis-section">
            <h4 className="analysis-section-title">🔍 Decline Drivers</h4>
            <p className="analysis-text">{analysis.drivers}</p>
          </div>

          <div className="analysis-section">
            <h4 className="analysis-section-title">🌍 Local vs. Global Trend</h4>
            <p className="analysis-text">{analysis.localVsGlobal}</p>
          </div>

          <div className="analysis-section">
            <h4 className="analysis-section-title">📊 Data Confidence</h4>
            <p className="analysis-text">{analysis.confidence}</p>
          </div>

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
            Run New Analysis
          </button>
        </div>
      )}
    </div>
  );
}
