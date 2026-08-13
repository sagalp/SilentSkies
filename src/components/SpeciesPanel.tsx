import { useState } from 'react';
import {
  Search, AlertTriangle, TrendingDown, TrendingUp, Minus,
  ChevronRight, Layers, BarChart2, CheckCircle2, ShieldAlert,
  Compass, Loader2, BookOpen,
} from 'lucide-react';
import type { Species, IntelligenceAlert } from '../types';
import { useRiskScore } from '../hooks/useRiskScore';
import { IUCN_STATUS_LABELS, IUCN_STATUS_COLORS, PRIORITY_COLORS } from '../data/watchlist';
import { getBirdIcon, GROUP_COLORS } from './BirdIcons';

interface SpeciesPanelProps {
  selected: Species;
  watchList: Species[];
  onSelect: (species: Species) => void;
  onAnalyze: () => void;
  onOpenBrowser: () => void;
  year: number;
  onYearChange: (year: number) => void;
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
    riskScore.score >= 70 ? '#e63946' :
    riskScore.score >= 50 ? '#e9c46a' :
    riskScore.score >= 35 ? '#48cae4' : '#52b788';

  return (
    <span className="risk-badge" style={{ borderColor: `${color}44`, background: `${color}14`, color }}>
      {riskScore.score}
    </span>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'declining') return <TrendingDown size={13} className="trend-icon decline" />;
  if (trend === 'recovering') return <TrendingUp size={13} className="trend-icon recover" />;
  return <Minus size={13} className="trend-icon stable" />;
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
        background: `${alert.badgeColor}13`,
        borderColor: `${alert.badgeColor}38`,
        color: alert.badgeColor,
      }}
    >
      <Icon size={15} style={{ flexShrink: 0 }} />
      <div className="alert-content">
        <span className="alert-title">{alert.title}</span>
        <p className="alert-desc">{alert.description}</p>
      </div>
    </div>
  );
}

/* ─── SVG Sparkline with clickable year bars ─────────── */
function SparklineChart({
  yearlyCounts,
  peakYear,
  activeYear,
  onYearClick,
}: {
  yearlyCounts: { year: number; count: number; normalized: number }[];
  peakYear: number;
  activeYear: number;
  onYearClick: (year: number) => void;
}) {
  const W = 260;
  const H = 48;
  const PAD_B = 14;
  const chartH = H - PAD_B;
  const n = yearlyCounts.length;
  const barW = n > 0 ? W / n : 10;

  const pts = yearlyCounts.map((yd, i) => {
    const x = i * barW + barW / 2;
    const y = chartH - Math.max(2, yd.normalized * (chartH - 4));
    return { x, y, ...yd };
  });

  const pathD = pts.length > 1
    ? `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const areaD = pts.length > 1
    ? `M ${pts[0].x} ${chartH} L ${pts[0].x} ${pts[0].y} ` +
      pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') +
      ` L ${pts[pts.length - 1].x} ${chartH} Z`
    : '';

  return (
    <div className="sparkline-svg-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} height={H} width="100%" preserveAspectRatio="none">
        <defs>
          <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#52b788" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#52b788" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="spark-line-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e63946" />
            <stop offset="50%" stopColor="#e9c46a" />
            <stop offset="100%" stopColor="#52b788" />
          </linearGradient>
        </defs>
        {areaD && <path d={areaD} fill="url(#spark-grad)" />}
        {pathD && (
          <path d={pathD} fill="none" stroke="url(#spark-line-grad)"
            strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        )}
        {pts.map((p) => {
          const isActive = p.year === activeYear;
          const isPeak = p.year === peakYear;
          return (
            <g key={p.year}>
              <rect x={p.x - barW / 2} y={0} width={barW} height={chartH}
                className="sparkline-hit-area" onClick={() => onYearClick(p.year)}>
                <title>{p.year}: {p.count.toLocaleString()} records — click to jump</title>
              </rect>
              {isPeak && !isActive && <circle cx={p.x} cy={p.y} r={3} fill="#e9c46a" opacity={0.8} />}
              {isActive && (
                <>
                  <circle cx={p.x} cy={p.y} r={4} fill="#52b788" />
                  <circle cx={p.x} cy={p.y} r={7} fill="none" stroke="#52b788" strokeWidth="1.2" opacity={0.5} />
                  <text x={Math.min(Math.max(p.x, 14), W - 14)} y={H - 1}
                    className="sparkline-year-label" textAnchor="middle" fontSize="7"
                    fill="#74c69d" fontFamily="JetBrains Mono, monospace">{p.year}</text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─── Analytics card for selected species ────────────── */
function SelectedSpeciesCard({
  species,
  onAnalyze,
  year,
  onYearChange,
}: {
  species: Species;
  onAnalyze: () => void;
  year: number;
  onYearChange: (year: number) => void;
}) {
  const { riskScore, loading } = useRiskScore(species.key);
  const iucnColor = IUCN_STATUS_COLORS[species.iucnStatus] || '#4d6b5c';
  const BirdIcon = getBirdIcon(species.speciesGroup);
  const groupColor = GROUP_COLORS[species.speciesGroup] ?? '#52b788';

  return (
    <div className="selected-species-card">
      <div className="selected-species-header">
        <span className="selected-species-svg-icon" style={{ color: groupColor }} title={species.speciesGroup}>
          <BirdIcon size={34} color={groupColor} />
        </span>
        <div className="selected-species-info">
          <h3 className="selected-species-name">{species.name}</h3>
          <p className="selected-species-scientific">{species.scientific}</p>
        </div>
        <span className="iucn-badge"
          style={{ borderColor: `${iucnColor}44`, color: iucnColor, background: `${iucnColor}14` }}>
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
                <span className="risk-score-number" style={{
                  color: riskScore.score >= 70 ? '#e63946' :
                         riskScore.score >= 50 ? '#e9c46a' : '#52b788',
                }}>
                  {riskScore.score}/100
                </span>
                <span className="risk-label">{riskScore.label}</span>
              </span>
            </div>
            <div className="species-stat">
              <span className="stat-label-sm">10-Yr Trend</span>
              <span className="stat-value-sm trend-display">
                <TrendIcon trend={riskScore.trend} />
                {riskScore.percentChange > 0 ? '+' : ''}{riskScore.percentChange}%
              </span>
            </div>
            <div className="species-stat full-width">
              <div className="stat-header-flex">
                <span className="stat-label-sm">Occurrence Density 2000–2025</span>
                <span className="stat-peak">Peak {riskScore.peakYear}</span>
              </div>
              <SparklineChart
                yearlyCounts={riskScore.yearlyCounts}
                peakYear={riskScore.peakYear}
                activeYear={year}
                onYearClick={onYearChange}
              />
              <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', textAlign: 'center' }}>
                Click any point to jump to that year
              </p>
            </div>
          </>
        ) : null}
      </div>

      {!loading && riskScore?.alert && <IntelligenceAlertBanner alert={riskScore.alert} />}

      <button className="analyze-button" onClick={onAnalyze}>
        <span>AI Deep Analysis</span>
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

/* ─── Main SpeciesPanel ─────────────────────────────── */
export function SpeciesPanel({
  selected, watchList, onSelect, onAnalyze, onOpenBrowser, year, onYearChange,
}: SpeciesPanelProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'list' | 'detail'>('list');

  const filtered = watchList.filter(s => {
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
          <Layers size={13} />
          <span>Watch List</span>
          <span className="mode-badge">{watchList.length}</span>
        </button>
        <button
          className={`mode-tab ${activeTab === 'detail' ? 'active' : ''}`}
          onClick={() => setActiveTab('detail')}
        >
          <BarChart2 size={13} />
          <span>Analytics</span>
        </button>
      </div>

      {/* Watch List tab */}
      {activeTab === 'list' && (
        <div className="panel-tab-content">
          {/* Browse button */}
          <button className="browse-birds-btn" onClick={onOpenBrowser}>
            <BookOpen size={13} />
            <span>Browse All Birds</span>
            <span className="browse-birds-hint">Customize list</span>
          </button>

          <div className="species-search">
            <Search size={13} />
            <input
              type="text"
              placeholder="Search watch list…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-tabs">
            {['all', 'critical', 'threatened'].map(f => (
              <button
                key={f}
                className={`filter-tab ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? `All (${watchList.length})` : f === 'critical' ? '🔴 Priority' : '⚠️ Threatened'}
              </button>
            ))}
          </div>

          <div className="species-list-container">
            {filtered.length === 0 ? (
              <div style={{ padding: '20px 12px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
                No species match. <button style={{ background: 'none', border: 'none', color: 'var(--green-mid)', cursor: 'pointer', fontSize: '12px' }} onClick={onOpenBrowser}>Browse all birds →</button>
              </div>
            ) : (
              filtered.map(species => {
                const BirdIcon = getBirdIcon(species.speciesGroup);
                const groupColor = GROUP_COLORS[species.speciesGroup] ?? '#52b788';
                return (
                  <button
                    key={species.key}
                    className={`species-item ${selected.key === species.key ? 'active' : ''}`}
                    onClick={() => { onSelect(species); setActiveTab('detail'); }}
                  >
                    <span className="species-item-svg-icon" style={{ color: groupColor }}>
                      <BirdIcon size={20} color={selected.key === species.key ? groupColor : 'var(--text-muted)'} />
                    </span>
                    <div className="species-item-info">
                      <span className="species-item-name">{species.name}</span>
                      <span className="species-item-sci">{species.scientific}</span>
                    </div>
                    <div className="species-item-right">
                      <span className="priority-dot"
                        style={{ background: PRIORITY_COLORS[species.watchPriority] }}
                        title={`${species.watchPriority} priority`} />
                      <RiskBadge taxonKey={species.key} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Analytics tab */}
      {activeTab === 'detail' && (
        <div className="panel-tab-content">
          <SelectedSpeciesCard
            species={selected}
            onAnalyze={onAnalyze}
            year={year}
            onYearChange={onYearChange}
          />
          <button className="back-to-list-btn" onClick={() => setActiveTab('list')}>
            ← Back to Watch List
          </button>
        </div>
      )}
    </div>
  );
}
