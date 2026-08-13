import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  X, Search, Check, BookOpen, SlidersHorizontal,
  ChevronRight, AlertTriangle, ShieldAlert,
} from 'lucide-react';
import type { Species } from '../types';
import { WATCH_LIST, IUCN_STATUS_COLORS, PRIORITY_COLORS } from '../data/watchlist';
import { getBirdIcon, GROUP_COLORS } from './BirdIcons';

interface BirdBrowserOverlayProps {
  isOpen: boolean;
  currentWatchList: Species[];
  onClose: () => void;
  onApply: (watchList: Species[]) => void;
}

type FilterKey = 'all' | 'threatened' | 'critical';

/* ─── Mini IUCN badge ───────────────────────────────── */
function IucnBadge({ status }: { status: string }) {
  const color = IUCN_STATUS_COLORS[status] ?? '#4d6b5c';
  return (
    <span
      className="bbo-iucn"
      style={{ color, borderColor: `${color}44`, background: `${color}15` }}
    >
      {status}
    </span>
  );
}

/* ─── Single bird card ─────────────────────────────── */
function BirdCard({
  species,
  isInList,
  isActive,
  onToggle,
}: {
  species: Species;
  isInList: boolean;
  isActive: boolean;
  onToggle: () => void;
}) {
  const BirdIcon = getBirdIcon(species.speciesGroup);
  const groupColor = GROUP_COLORS[species.speciesGroup] ?? '#52b788';
  const priorityColor = PRIORITY_COLORS[species.watchPriority];
  const isCritical = species.watchPriority === 'critical';

  return (
    <button
      className={`bbo-card ${isInList ? 'in-list' : ''} ${isActive ? 'preview' : ''}`}
      onClick={onToggle}
      style={{ '--group-color': groupColor } as React.CSSProperties}
    >
      {/* Checked overlay */}
      {isInList && (
        <span className="bbo-card-check">
          <Check size={12} strokeWidth={3} />
        </span>
      )}

      {/* Critical badge */}
      {isCritical && (
        <span className="bbo-critical-flag">
          <AlertTriangle size={10} />
        </span>
      )}

      {/* Icon area */}
      <div className="bbo-card-icon-wrap" style={{ background: `${groupColor}18`, borderColor: `${groupColor}28` }}>
        <BirdIcon size={38} color={isInList ? groupColor : 'var(--text-muted)'} />
      </div>

      {/* Info */}
      <div className="bbo-card-info">
        <span className="bbo-card-name">{species.name}</span>
        <span className="bbo-card-sci">{species.scientific}</span>
        <div className="bbo-card-meta">
          <IucnBadge status={species.iucnStatus} />
          <span
            className="bbo-priority-pip"
            style={{ background: priorityColor }}
            title={`${species.watchPriority} priority`}
          />
        </div>
      </div>

      {/* Bottom region tags */}
      <div className="bbo-card-regions">
        {species.nativeRegions.slice(0, 2).map(r => (
          <span key={r} className="bbo-region-tag">{r}</span>
        ))}
        {species.nativeRegions.length > 2 && (
          <span className="bbo-region-tag muted">+{species.nativeRegions.length - 2}</span>
        )}
      </div>
    </button>
  );
}

/* ─── Group section in the grid ─────────────────────── */
function GridGroup({
  groupName,
  species,
  watchSet,
  onToggle,
}: {
  groupName: string;
  species: Species[];
  watchSet: Set<string>;
  onToggle: (s: Species) => void;
}) {
  const BirdIcon = getBirdIcon(groupName);
  const groupColor = GROUP_COLORS[groupName] ?? '#52b788';
  const inListCount = species.filter(s => watchSet.has(s.key)).length;

  return (
    <section className="bbo-group" id={`bbo-group-${groupName.replace(/\s+/g, '-')}`}>
      <div className="bbo-group-header">
        <span className="bbo-group-icon" style={{ color: groupColor }}>
          <BirdIcon size={18} color={groupColor} />
        </span>
        <h3 className="bbo-group-title">{groupName}</h3>
        <span className="bbo-group-meta">
          {species.length} species
          {inListCount > 0 && (
            <span className="bbo-group-inlist" style={{ color: groupColor }}>
              · {inListCount} watching
            </span>
          )}
        </span>
      </div>
      <div className="bbo-grid">
        {species.map(s => (
          <BirdCard
            key={s.key}
            species={s}
            isInList={watchSet.has(s.key)}
            isActive={false}
            onToggle={() => onToggle(s)}
          />
        ))}
      </div>
    </section>
  );
}

/* ─── Left nav group pill ─────────────────────────── */
function NavPill({
  groupName,
  count,
  watchCount,
  onClick,
}: {
  groupName: string;
  count: number;
  watchCount: number;
  onClick: () => void;
}) {
  const BirdIcon = getBirdIcon(groupName);
  const groupColor = GROUP_COLORS[groupName] ?? '#52b788';

  return (
    <button className="bbo-nav-pill" onClick={onClick}>
      <span className="bbo-nav-icon" style={{ color: groupColor }}>
        <BirdIcon size={15} color={groupColor} />
      </span>
      <span className="bbo-nav-name">{groupName}</span>
      <span className="bbo-nav-counts">
        {watchCount > 0 && (
          <span className="bbo-nav-watching" style={{ color: groupColor }}>{watchCount}</span>
        )}
        <span className="bbo-nav-total">{count}</span>
      </span>
    </button>
  );
}

/* ─── Main Overlay ─────────────────────────────────── */
export function BirdBrowserOverlay({ isOpen, currentWatchList, onClose, onApply }: BirdBrowserOverlayProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [pendingList, setPendingList] = useState<Set<string>>(new Set(currentWatchList.map(s => s.key)));

  // Sync pending list when overlay opens
  useEffect(() => {
    if (isOpen) {
      setPendingList(new Set(currentWatchList.map(s => s.key)));
      setSearch('');
      setFilter('all');
    }
  }, [isOpen, currentWatchList]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const toggleSpecies = useCallback((species: Species) => {
    setPendingList(prev => {
      const next = new Set(prev);
      if (next.has(species.key)) {
        // Don't allow emptying the watch list
        if (next.size <= 1) return prev;
        next.delete(species.key);
      } else {
        next.add(species.key);
      }
      return next;
    });
  }, []);

  const handleApply = () => {
    const ordered = WATCH_LIST.filter(s => pendingList.has(s.key));
    onApply(ordered);
    onClose();
  };

  const handleSelectAll = () => setPendingList(new Set(WATCH_LIST.map(s => s.key)));
  const handleClearAll = () => {
    // Keep at least 1
    const first = WATCH_LIST[0];
    setPendingList(new Set([first.key]));
  };

  // Filtered + grouped species
  const grouped = useMemo(() => {
    const lower = search.toLowerCase();
    const result: Record<string, Species[]> = {};
    for (const s of WATCH_LIST) {
      // Text filter
      if (lower && !s.name.toLowerCase().includes(lower) &&
          !s.scientific.toLowerCase().includes(lower) &&
          !s.speciesGroup.toLowerCase().includes(lower) &&
          !s.family.toLowerCase().includes(lower)) continue;
      // Status filter
      if (filter === 'threatened' && !['VU', 'EN', 'CR'].includes(s.iucnStatus)) continue;
      if (filter === 'critical' && s.watchPriority !== 'critical') continue;
      if (!result[s.speciesGroup]) result[s.speciesGroup] = [];
      result[s.speciesGroup].push(s);
    }
    return result;
  }, [search, filter]);

  const groups = Object.keys(grouped).sort();
  const totalVisible = groups.reduce((n, g) => n + grouped[g].length, 0);
  const pendingCount = pendingList.size;
  const hasChanges = pendingCount !== currentWatchList.length ||
    currentWatchList.some(s => !pendingList.has(s.key));

  const scrollToGroup = (groupName: string) => {
    const el = document.getElementById(`bbo-group-${groupName.replace(/\s+/g, '-')}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!isOpen) return null;

  return (
    <div className="bbo-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bbo-sheet">

        {/* ── Header ── */}
        <header className="bbo-header">
          <div className="bbo-header-left">
            <BookOpen size={18} className="bbo-header-icon" />
            <div>
              <h2 className="bbo-title">Bird Browser</h2>
              <p className="bbo-subtitle">
                Select species for your watch list · {pendingCount} of {WATCH_LIST.length} selected
              </p>
            </div>
          </div>

          <div className="bbo-header-center">
            <div className="bbo-search-wrap">
              <Search size={14} className="bbo-search-icon" />
              <input
                autoFocus
                type="text"
                placeholder="Search species, family, or group…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bbo-search-input"
              />
              {search && (
                <button className="bbo-search-clear" onClick={() => setSearch('')}>×</button>
              )}
            </div>
          </div>

          <div className="bbo-header-right">
            <button className="bbo-close-btn" onClick={onClose} title="Close (Esc)">
              <X size={18} />
            </button>
          </div>
        </header>

        {/* ── Filter Bar ── */}
        <div className="bbo-filter-bar">
          <div className="bbo-filter-tabs">
            <SlidersHorizontal size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            {(['all', 'threatened', 'critical'] as FilterKey[]).map(f => (
              <button
                key={f}
                className={`bbo-filter-tab ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? `All Species (${WATCH_LIST.length})` :
                 f === 'threatened' ? (
                   <><AlertTriangle size={11} /> Threatened</>
                 ) : (
                   <><ShieldAlert size={11} /> Critical Priority</>
                 )}
              </button>
            ))}
          </div>
          <div className="bbo-bulk-actions">
            <button className="bbo-bulk-btn" onClick={handleSelectAll}>Select All</button>
            <span className="bbo-bulk-sep" />
            <button className="bbo-bulk-btn danger" onClick={handleClearAll}>Clear All</button>
          </div>
        </div>

        {/* ── Body: Nav + Grid ── */}
        <div className="bbo-body">

          {/* Left nav */}
          <nav className="bbo-nav">
            <p className="bbo-nav-heading">Groups</p>
            {Object.keys(WATCH_LIST.reduce((acc, s) => { acc[s.speciesGroup] = true; return acc; }, {} as Record<string, boolean>)).sort().map(g => {
              const groupSpecies = WATCH_LIST.filter(s => s.speciesGroup === g);
              const watchCount = groupSpecies.filter(s => pendingList.has(s.key)).length;
              return (
                <NavPill
                  key={g}
                  groupName={g}
                  count={groupSpecies.length}
                  watchCount={watchCount}
                  onClick={() => scrollToGroup(g)}
                />
              );
            })}
          </nav>

          {/* Species grid */}
          <main className="bbo-main">
            {totalVisible === 0 ? (
              <div className="bbo-empty">
                <Search size={32} style={{ color: 'var(--text-dim)', marginBottom: 10 }} />
                <p>No species match your filters.</p>
                <button className="bbo-bulk-btn" style={{ marginTop: 10 }} onClick={() => { setSearch(''); setFilter('all'); }}>
                  Clear Filters
                </button>
              </div>
            ) : (
              groups.map(g => (
                <GridGroup
                  key={g}
                  groupName={g}
                  species={grouped[g]}
                  watchSet={pendingList}
                  onToggle={toggleSpecies}
                />
              ))
            )}
          </main>
        </div>

        {/* ── Footer ── */}
        <footer className="bbo-footer">
          <div className="bbo-footer-info">
            <span className="bbo-footer-count">
              <span className="bbo-footer-num">{pendingCount}</span>
              {' '}species in watch list
            </span>
            {!hasChanges && (
              <span className="bbo-footer-unchanged">No changes</span>
            )}
          </div>
          <div className="bbo-footer-actions">
            <button className="bbo-cancel-btn" onClick={onClose}>Cancel</button>
            <button
              className={`bbo-apply-btn ${hasChanges ? 'has-changes' : ''}`}
              onClick={handleApply}
            >
              <Check size={14} />
              Apply Watch List
              {hasChanges && <ChevronRight size={14} />}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
