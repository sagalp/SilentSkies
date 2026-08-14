import { useState, useCallback, useEffect } from 'react';
import { GlobeView } from './components/Globe';
import { TimeSlider } from './components/TimeSlider';
import { SpeciesPanel } from './components/SpeciesPanel';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ActionPanel } from './components/ActionPanel';
import { Navbar } from './components/Navbar';
import { BirdBrowserOverlay } from './components/BirdBrowserOverlay';
import { SettingsModal } from './components/SettingsModal';
import { useGBIF } from './hooks/useGBIF';
import { WATCH_LIST } from './data/watchlist';
import type { Species, GlobePoint } from './types';
import type { AppSettings } from './types/settings';
import { DEFAULT_SETTINGS } from './types/settings';
import { Loader2, Navigation } from 'lucide-react';
import { getBirdIcon, GROUP_COLORS } from './components/BirdIcons';
import './App.css';

import { playUiClick, updateAmbientSound } from './utils/audio';

type SidePanel = 'none' | 'analysis' | 'action';

const WATCHLIST_STORAGE_KEY = 'silentskies_watchlist_keys';
const SETTINGS_STORAGE_KEY = 'silentskies_settings';

function getInitialWatchList(): Species[] {
  const robin = WATCH_LIST.find(s => s.name === 'European Robin') || WATCH_LIST[0];
  try {
    const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (saved) {
      const keys: string[] = JSON.parse(saved);
      if (Array.isArray(keys) && keys.length > 0) {
        const list = WATCH_LIST.filter(s => keys.includes(s.key));
        if (list.length > 0) {
          if (robin && !list.some(s => s.key === robin.key)) {
            return [robin, ...list];
          }
          return list;
        }
      }
    }
  } catch (e) {
    console.error('Failed to load watchlist from localStorage', e);
  }
  return WATCH_LIST.slice(0, 5);
}

function getInitialSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load settings from localStorage', e);
  }
  return DEFAULT_SETTINGS;
}

export default function App() {
  const [year, setYear] = useState(2020);
  const [month, setMonth] = useState<number | undefined>(undefined);
  // User-curated watch list (loaded from localStorage or default first 5)
  const [watchList, setWatchList] = useState<Species[]>(getInitialWatchList);
  const [selectedSpecies, setSelectedSpecies] = useState<Species>(() => {
    const robin = WATCH_LIST.find(s => s.name === 'European Robin');
    if (robin) return robin;
    return watchList[0] || WATCH_LIST[0];
  });
  const [sidePanel, setSidePanel] = useState<SidePanel>('none');
  const [browserOpen, setBrowserOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(getInitialSettings);
  const autoRotate = settings.autoRotate;
  const showRoutes = settings.showRoutes;

  // Global UI Sound Effects Click Listener across the ENTIRE app
  useEffect(() => {
    if (!settings.uiSounds) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const clickable = target.closest('button, [role="button"], a, input[type="submit"], input[type="button"], .species-item, .bbo-card, .bbo-nav-pill, .mode-tab, .filter-tab, .api-key-toggle, .re-analyze-btn, .action-step-btn');
      if (clickable) {
        playUiClick(true, settings.uiVolume ?? 0.35);
      }
    };

    window.addEventListener('click', handleGlobalClick, true);
    return () => window.removeEventListener('click', handleGlobalClick, true);
  }, [settings.uiSounds, settings.uiVolume]);

  // Ambient Nature Breeze Soundscape Sync
  useEffect(() => {
    updateAmbientSound(settings.ambientAudio, settings.ambientVolume);
  }, [settings.ambientAudio, settings.ambientVolume]);

  // Sync watchList to localStorage whenever it changes
  useEffect(() => {
    try {
      const keys = watchList.map(s => s.key);
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(keys));
    } catch (e) {
      console.error('Failed to save watchlist to localStorage', e);
    }
  }, [watchList]);

  const handleUpdateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save settings', e);
      }
      return updated;
    });
  }, []);

  const handleResetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch (e) {}
  }, []);

  const handleResetWatchlist = useCallback(() => {
    const initial = WATCH_LIST.slice(0, 5);
    setWatchList(initial);
    setSelectedSpecies(initial[0]);
  }, []);

  const { points, loading, totalCount } = useGBIF({
    taxonKey: selectedSpecies.key,
    year,
    month,
    limit: settings.pointLimit,
  });

  const handleGlobeClick = useCallback((_lat: number, _lng: number) => {
    handleUpdateSettings({ autoRotate: false });
  }, [handleUpdateSettings]);

  const handlePointClick = useCallback((_pt: GlobePoint) => {
    handleUpdateSettings({ autoRotate: false });
  }, [handleUpdateSettings]);

  const handleSpeciesSelect = useCallback((species: Species) => {
    setSelectedSpecies(species);
  }, []);

  const [selectedPoint, setSelectedPoint] = useState<GlobePoint | null>(null);
  const [analysisTriggerId, setAnalysisTriggerId] = useState<number>(0);

  const handleAnalyze = useCallback((point?: GlobePoint | unknown) => {
    const validPoint = (point && typeof point === 'object' && 'lat' in point && 'lng' in point && typeof (point as GlobePoint).lat === 'number' && typeof (point as GlobePoint).lng === 'number')
      ? (point as GlobePoint)
      : null;
    setSelectedPoint(validPoint);
    setSidePanel('analysis');
    setAnalysisTriggerId(id => id + 1);
  }, []);

  const handleAction = useCallback(() => {
    setSidePanel('action');
  }, []);

  const handleWatchListApply = useCallback((newList: Species[]) => {
    setWatchList(newList);
    // If the currently selected species was removed, switch to first in new list
    if (newList.length > 0 && !newList.find(s => s.key === selectedSpecies.key)) {
      setSelectedSpecies(newList[0]);
    }
  }, [selectedSpecies]);

  const monthLabel = month ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month - 1] : undefined;

  return (
    <div className={`app theme-${settings.accentTheme}`}>
      <Navbar
        totalObservations={totalCount}
        loading={loading}
        onOpenAction={handleAction}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="main-layout">
        {/* Left Sidebar — Species Selector & Risk Analytics */}
        <aside className="left-panel">
          <SpeciesPanel
            selected={selectedSpecies}
            watchList={watchList}
            onSelect={handleSpeciesSelect}
            onAnalyze={handleAnalyze}
            onOpenBrowser={() => setBrowserOpen(true)}
            year={year}
            onYearChange={setYear}
          />
        </aside>

        {/* Globe Viewport Center */}
        <div className="globe-area">
          {/* Non-blocking top glow loading indicator */}
          {loading && <div className="globe-loading-glow-bar" />}

          {/* Top Telemetry HUD Overlay */}
          {settings.hudStyle === 'full' && (
            <div className="telemetry-hud">
              <div className="hud-segment">
                <span className="hud-label">Migration Year</span>
                <span className="hud-value year">
                  {year}{monthLabel ? ` · ${monthLabel}` : ''}
                </span>
              </div>
              <div className="hud-divider" />
              <div className="hud-segment">
                <span className="hud-label">Target Species</span>
                <div className="hud-species-title">
                  {(() => {
                    const HudIcon = getBirdIcon(selectedSpecies.speciesGroup);
                    const groupColor = GROUP_COLORS[selectedSpecies.speciesGroup] ?? '#52b788';
                    return <HudIcon size={16} color={groupColor} />;
                  })()}
                  <span className="hud-value name">{selectedSpecies.name}</span>
                  <span className="hud-sci">{selectedSpecies.scientific}</span>
                </div>
              </div>
              <div className="hud-divider" />
              <div className="hud-segment">
                <span className="hud-label">Global Occurrences</span>
                <span className="hud-value count">
                  {loading ? (
                    <span className="hud-loading-text">
                      <Loader2 size={11} className="spin-icon" /> Syncing GBIF…
                    </span>
                  ) : (
                    `${(totalCount || points.length * 120).toLocaleString()} obs`
                  )}
                </span>
              </div>
            </div>
          )}

          <GlobeView
            points={points}
            selectedSpeciesName={selectedSpecies.name}
            onGlobeClick={handleGlobeClick}
            onPointClick={handlePointClick}
            onOpenAnalysis={handleAnalyze}
            autoRotate={autoRotate}
            autoRotateSpeed={settings.autoRotateSpeed}
            showAtmosphere={settings.showAtmosphere}
            showRoutes={settings.showRoutes}
            uiSounds={settings.uiSounds}
            uiVolume={settings.uiVolume}
          />

          {/* Time Slider Controls Overlay */}
          <div className="time-slider-overlay">
            <TimeSlider
              year={year}
              month={month}
              onChange={setYear}
              onMonthChange={setMonth}
              loading={loading}
              uiSounds={settings.uiSounds}
              uiVolume={settings.uiVolume}
            />
          </div>

          {/* Globe controls top-right */}
          <div className="globe-controls">
            <button
              className={`rotate-btn ${autoRotate ? 'active' : ''}`}
              onClick={() => handleUpdateSettings({ autoRotate: !autoRotate })}
              title="Toggle auto-rotation"
            >
              {autoRotate ? '⏸ Pause' : '▶ Rotate'}
            </button>
            <button
              className={`rotate-btn ${showRoutes ? 'active' : ''}`}
              onClick={() => handleUpdateSettings({ showRoutes: !showRoutes })}
              title="Toggle migration routes"
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Navigation size={11} />
              {showRoutes ? 'Routes On' : 'Routes Off'}
            </button>
          </div>
        </div>

        {/* Right Sidebar — AI Deep Analysis or Action */}
        {sidePanel !== 'none' && (
          <aside className="right-panel">
            {sidePanel === 'analysis' && (
              <AnalysisPanel
                species={selectedSpecies}
                year={year}
                targetPoint={selectedPoint}
                triggerId={analysisTriggerId}
                onClose={() => setSidePanel('none')}
              />
            )}
            {sidePanel === 'action' && (
              <ActionPanel
                species={selectedSpecies}
                onClose={() => setSidePanel('none')}
              />
            )}
          </aside>
        )}
      </main>

      {/* Full-screen Bird Browser Overlay */}
      <BirdBrowserOverlay
        isOpen={browserOpen}
        currentWatchList={watchList}
        onClose={() => setBrowserOpen(false)}
        onApply={handleWatchListApply}
      />

      {/* System Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetSettings={handleResetSettings}
        onResetWatchlist={handleResetWatchlist}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
