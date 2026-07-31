import { useState } from 'react';
import { Search, AlertTriangle, TrendingDown, TrendingUp, Minus, ChevronRight, Layers, BarChart2, CheckCircle2, ShieldAlert, Compass, Loader2 } from 'lucide-react';
import type { Species, IntelligenceAlert } from '../types';
import { useRiskScore } from '../hooks/useRiskScore';
import { WATCH_LIST, IUCN_STATUS_LABELS, IUCN_STATUS_COLORS, PRIORITY_COLORS } from '../data/watchlist';

interface SpeciesPanelProps {
  selected: Species;
  onSelect: (species: Species) => void;
  onAnalyze: () => void;
}

function RiskBadge({ taxonKey }: { taxonKey: string }) {
  const { riskScore, loading } = useRiskScore(taxonKey);

  if (loading) {
    return (
      <span className="risk-badge loading-pill">
        <Loader2 size={10} className="spin-icon" />
      </span>
    );
  }

  if (!riskScore) return null;

  const color =
    riskScore.score >= 70 ? '#ef4444' :
    riskScore.score >= 50 ? '#f59e0b' :
    riskScore.score >= 35 ? '#06b6d4' : '#10b981';

  return (
    <span className="risk-badge" style={{ borderColor: `${color}44`, background: `${color}15`, color }}>
      {riskScore.score}
    </span>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'declining') return <TrendingDown size={14} className="trend-icon decline" />;
  if (trend === 'recovering') return <TrendingUp size={14} className="trend-icon recover" />;
  return <Minus size={14} className="trend-icon stable" />;
}

function IntelligenceAlertBanner({ alert }: { alert: IntelligenceAlert }) {
  const Icon =
    alert.severity === 'critical' ? ShieldAlert :
    alert.severity === 'warning' ? AlertTriangle :
    alert.severity === 'success' ? CheckCircle2 : Compass;

  return (
    <div
      className="risk-alert"
      style={{
        background: `${alert.badgeColor}15`,
        borderColor: `${alert.badgeColor}40`,
        color: alert.badgeColor,
      }}
    >
      <Icon size={16} style={{ flexShrink: 0 }} />
      <div className="alert-content">
        <span className="alert-title">{alert.title}</span>
        <p className="alert-desc">{alert.description}</p>
      </div>
    </div>
  );
}

function SelectedSpeciesCard({ species, onAnalyze }: { species: Species; onAnalyze: () => void }) {
  const { riskScore, loading } = useRiskScore(species.key);
  const iucnColor = IUCN_STATUS_COLORS[species.iucnStatus] || '#71717a';

  return (
    <div className="selected-species-card">
      <div className="selected-species-header">
        <span className="selected-species-emoji">{species.emoji}</span>
        <div className="selected-species-info">
          <h3 className="selected-species-name">{species.name}</h3>
          <p className="selected-species-scientific">{species.scientific}</p>
        </div>
        <span className="iucn-badge" style={{ borderColor: `${iucnColor}44`, color: iucnColor, background: `${iucnColor}15` }}>
          {species.iucnStatus}
        </span>
      </div>

      <div className="species-stats-grid">
        <div className="species-stat">
          <span className="stat-label-sm">IUCN Status</span>
          <span className="stat-value-sm" style={{ color: iucnColor }}>
            {IUCN_STATUS_LABELS[species.iucnStatus]}
          </span>
        </div>
        <div className="species-stat">
          <span className="stat-label-sm">Family</span>
          <span className="stat-value-sm">{species.family}</span>
        </div>

        {loading ? (
          <div className="species-stat full-width skeleton-stat-box">
            <div className="skeleton-line short" />
            <div className="skeleton-line long" />
          </div>
        ) : riskScore ? (
          <>
            <div className="species-stat">
              <span className="stat-label-sm">Ecological Risk</span>
              <span className="stat-value-sm risk-score-display">
                <span
                  className="risk-score-number"
                  style={{
                    color: riskScore.score >= 70 ? '#ef4444' :
                           riskScore.score >= 50 ? '#f59e0b' : '#10b981'
                  }}
                >
                  {riskScore.score}/100
                </span>
                <span className="risk-label">{riskScore.label}</span>
              </span>
            </div>
            <div className="species-stat">
              <span className="stat-label-sm">10-Yr Trend</span>
              <span className="stat-value-sm trend-display">
                <TrendIcon trend={riskScore.trend} />
                {riskScore.percentChange > 0 ? '+' : ''}
                {riskScore.percentChange}%
              </span>
            </div>

            <div className="species-stat full-width">
              <div className="stat-header-flex">
                <span className="stat-label-sm">Occurrence Density (2000–2025)</span>
                <span className="stat-peak">Peak {riskScore.peakYear}</span>
              </div>
              <div className="sparkline">
                {riskScore.yearlyCounts.map((yd) => (
                  <div
                    key={yd.year}
                    className="sparkline-bar"
                    style={{
                      height: `${Math.max(3, yd.normalized * 34)}px`,
                      background: yd.normalized > 0.65
                        ? '#10b981'
                        : yd.normalized > 0.35
                        ? '#f59e0b'
                        : '#ef4444',
                    }}
                    title={`${yd.year}: ${yd.count.toLocaleString()} records`}
                  />
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {!loading && riskScore?.alert && <IntelligenceAlertBanner alert={riskScore.alert} />}

      <button className="analyze-button" onClick={onAnalyze}>
        <span>AI Deep Analysis</span>
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

export function SpeciesPanel({ selected, onSelect, onAnalyze }: SpeciesPanelProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'list' | 'detail'>('list');

  const filtered = WATCH_LIST.filter(s => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.scientific.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'critical' && ['critical', 'high'].includes(s.watchPriority)) ||
      (filter === 'threatened' && ['VU', 'EN', 'CR'].includes(s.iucnStatus));
    return matchSearch && matchFilter;
  });

  return (
    <div className="species-panel glass-panel">
      {/* Panel View Tabs */}
      <div className="panel-mode-tabs">
        <button
          className={`mode-tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          <Layers size={14} />
          <span>Watch List</span>
          <span className="mode-badge">{WATCH_LIST.length}</span>
        </button>
        <button
          className={`mode-tab ${activeTab === 'detail' ? 'active' : ''}`}
          onClick={() => setActiveTab('detail')}
        >
          <BarChart2 size={14} />
          <span>Species Analytics</span>
        </button>
      </div>

      {/* Mode 1: Full Species List */}
      {activeTab === 'list' && (
        <div className="panel-tab-content">
          {/* Search bar */}
          <div className="species-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search species name or scientific..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Filter pills */}
          <div className="filter-tabs">
            {['all', 'critical', 'threatened'].map(f => (
              <button
                key={f}
                className={`filter-tab ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All (20)' : f === 'critical' ? '🔴 Priority' : '⚠️ Threatened'}
              </button>
            ))}
          </div>

          {/* Scrollable species list */}
          <div className="species-list-container">
            {filtered.map(species => (
              <button
                key={species.key}
                className={`species-item ${selected.key === species.key ? 'active' : ''}`}
                onClick={() => {
                  onSelect(species);
                  setActiveTab('detail');
                }}
              >
                <span className="species-item-emoji">{species.emoji}</span>
                <div className="species-item-info">
                  <span className="species-item-name">{species.name}</span>
                  <span className="species-item-sci">{species.scientific}</span>
                </div>
                <div className="species-item-right">
                  <span
                    className="priority-dot"
                    style={{ background: PRIORITY_COLORS[species.watchPriority] }}
                    title={`${species.watchPriority} priority`}
                  />
                  <RiskBadge taxonKey={species.key} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mode 2: Detailed Analytics for Selected Species */}
      {activeTab === 'detail' && (
        <div className="panel-tab-content">
          <SelectedSpeciesCard species={selected} onAnalyze={onAnalyze} />
          <button className="back-to-list-btn" onClick={() => setActiveTab('list')}>
            ← Back to All Species
          </button>
        </div>
      )}
    </div>
  );
}
