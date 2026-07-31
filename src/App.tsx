import { useState, useCallback } from 'react';
import { GlobeView } from './components/Globe';
import { TimeSlider } from './components/TimeSlider';
import { SpeciesPanel } from './components/SpeciesPanel';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ActionPanel } from './components/ActionPanel';
import { Navbar } from './components/Navbar';
import { useGBIF } from './hooks/useGBIF';
import { WATCH_LIST } from './data/watchlist';
import type { Species, GlobePoint } from './types';
import { Loader2 } from 'lucide-react';
import './App.css';

type SidePanel = 'none' | 'analysis' | 'action';

export default function App() {
  const [year, setYear] = useState(2020);
  const [selectedSpecies, setSelectedSpecies] = useState<Species>(WATCH_LIST[0]);
  const [sidePanel, setSidePanel] = useState<SidePanel>('none');
  const [autoRotate, setAutoRotate] = useState(true);

  const { points, loading, totalCount } = useGBIF({
    taxonKey: selectedSpecies.key,
    year,
    limit: 400,
  });

  const handleGlobeClick = useCallback((_lat: number, _lng: number) => {
    setAutoRotate(false);
  }, []);

  const handlePointClick = useCallback((_pt: GlobePoint) => {
    setAutoRotate(false);
  }, []);

  const handleSpeciesSelect = useCallback((species: Species) => {
    setSelectedSpecies(species);
  }, []);

  const handleAnalyze = useCallback(() => {
    setSidePanel('analysis');
  }, []);

  const handleAction = useCallback(() => {
    setSidePanel('action');
  }, []);

  return (
    <div className="app">
      <Navbar
        totalObservations={totalCount}
        loading={loading}
        onOpenAction={handleAction}
      />

      <main className="main-layout">
        {/* Left Sidebar — Species Selector & Risk Analytics */}
        <aside className="left-panel">
          <SpeciesPanel
            selected={selectedSpecies}
            onSelect={handleSpeciesSelect}
            onAnalyze={handleAnalyze}
          />
        </aside>

        {/* Globe Viewport Center */}
        <div className="globe-area">
          {/* Non-blocking top glow loading indicator */}
          {loading && <div className="globe-loading-glow-bar" />}

          {/* Top Telemetry HUD Overlay */}
          <div className="telemetry-hud">
            <div className="hud-segment">
              <span className="hud-label">MIGRATION YEAR</span>
              <span className="hud-value year">{year}</span>
            </div>
            <div className="hud-divider" />
            <div className="hud-segment species-segment">
              <span className="hud-label">TARGET SPECIES</span>
              <div className="hud-species-title">
                <span className="hud-emoji">{selectedSpecies.emoji}</span>
                <span className="hud-value name">{selectedSpecies.name}</span>
                <span className="hud-sci">{selectedSpecies.scientific}</span>
              </div>
            </div>
            <div className="hud-divider" />
            <div className="hud-segment">
              <span className="hud-label">GLOBAL OCCURRENCES</span>
              <span className="hud-value count">
                {loading ? (
                  <span className="hud-loading-text">
                    <Loader2 size={12} className="spin-icon" /> Syncing GBIF...
                  </span>
                ) : (
                  `${(totalCount || points.length * 120).toLocaleString()} obs`
                )}
              </span>
            </div>
          </div>

          <GlobeView
            points={points}
            selectedSpeciesName={selectedSpecies.name}
            onGlobeClick={handleGlobeClick}
            onPointClick={handlePointClick}
            autoRotate={autoRotate}
          />

          {/* Time Slider Controls Overlay */}
          <div className="time-slider-overlay">
            <TimeSlider
              year={year}
              onChange={setYear}
              loading={loading}
            />
          </div>

          {/* Globe controls top-right */}
          <div className="globe-controls">
            <button
              className={`rotate-btn ${autoRotate ? 'active' : ''}`}
              onClick={() => setAutoRotate(r => !r)}
              title="Toggle auto-rotation"
            >
              {autoRotate ? '⏸ Pause Globe' : '▶ Rotate Globe'}
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
    </div>
  );
}
