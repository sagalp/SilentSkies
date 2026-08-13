import { useState, useEffect } from 'react';
import {
  X, Settings, Globe, Cpu, Volume2, Palette, Database,
  Check, RotateCcw, ShieldCheck, Key, Eye, EyeOff, Sliders
} from 'lucide-react';
import type { AppSettings } from '../types/settings';
import { playUiClick, updateAmbientSound } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetSettings: () => void;
  onResetWatchlist?: () => void;
  onClose: () => void;
}

type TabKey = 'globe' | 'ai' | 'audio' | 'display' | 'data';

export function SettingsModal({
  isOpen,
  settings,
  onUpdateSettings,
  onResetSettings,
  onResetWatchlist,
  onClose,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('globe');
  const [showApiKey, setShowApiKey] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(settings.customApiKey);

  useEffect(() => {
    setTempApiKey(settings.customApiKey);
  }, [settings.customApiKey]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof AppSettings) => {
    playUiClick(settings.uiSounds);
    onUpdateSettings({ [key]: !settings[key] });
  };

  const handleSelect = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    playUiClick(settings.uiSounds);
    onUpdateSettings({ [key]: value });
  };

  return (
    <div className="settings-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="settings-sheet">

        {/* ── Header ── */}
        <header className="settings-header">
          <div className="settings-header-title">
            <Settings size={20} className="settings-gear-spin" />
            <div>
              <h2 className="settings-title">System Settings</h2>
              <p className="settings-subtitle">Customize graphics, AI inference engine, audio, and visual HUD preferences</p>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose} title="Close (Esc)">
            <X size={18} />
          </button>
        </header>

        {/* ── Body ── */}
        <div className="settings-body">

          {/* Sidebar Nav */}
          <nav className="settings-nav">
            <button
              className={`settings-nav-item ${activeTab === 'globe' ? 'active' : ''}`}
              onClick={() => { playUiClick(settings.uiSounds); setActiveTab('globe'); }}
            >
              <Globe size={15} />
              <span>Globe & Visuals</span>
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => { playUiClick(settings.uiSounds); setActiveTab('ai'); }}
            >
              <Cpu size={15} />
              <span>AI Engine</span>
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'audio' ? 'active' : ''}`}
              onClick={() => { playUiClick(settings.uiSounds); setActiveTab('audio'); }}
            >
              <Volume2 size={15} />
              <span>Audio & Sounds</span>
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'display' ? 'active' : ''}`}
              onClick={() => { playUiClick(settings.uiSounds); setActiveTab('display'); }}
            >
              <Palette size={15} />
              <span>Theme & Units</span>
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => { playUiClick(settings.uiSounds); setActiveTab('data'); }}
            >
              <Database size={15} />
              <span>Data & Reset</span>
            </button>
          </nav>

          {/* Main Options Pane */}
          <main className="settings-main">

            {/* TAB 1: GLOBE & VISUALS */}
            {activeTab === 'globe' && (
              <div className="settings-pane">
                <h3 className="settings-pane-title">Globe Rendering & Visual Controls</h3>

                {/* Auto Rotate Speed */}
                <div className="settings-group">
                  <div className="settings-row-info">
                    <span className="settings-label">Auto-Rotation Velocity</span>
                    <span className="settings-desc">Adjust the spin speed of the 3D globe viewport</span>
                  </div>
                  <div className="settings-pill-options">
                    {[
                      { label: 'Slow (0.3x)', val: 0.3 },
                      { label: 'Normal (1.0x)', val: 1 },
                      { label: 'Fast (2.5x)', val: 2.5 },
                      { label: 'Hyper (5.0x)', val: 5 },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        className={`settings-pill-btn ${settings.autoRotateSpeed === opt.val ? 'active' : ''}`}
                        onClick={() => handleSelect('autoRotateSpeed', opt.val)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Point Limit Density */}
                <div className="settings-group">
                  <div className="settings-row-info">
                    <span className="settings-label">Occurrence Point Density</span>
                    <span className="settings-desc">Number of GBIF occurrence telemetry points rendered on globe</span>
                  </div>
                  <div className="settings-pill-options">
                    {[
                      { label: 'Low (100 pts)', val: 100 },
                      { label: 'Balanced (250 pts)', val: 250 },
                      { label: 'Ultra (400 pts)', val: 400 },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        className={`settings-pill-btn ${settings.pointLimit === opt.val ? 'active' : ''}`}
                        onClick={() => handleSelect('pointLimit', opt.val)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Atmosphere Toggle */}
                <div className="settings-group">
                  <div className="settings-row-info">
                    <span className="settings-label">Atmosphere Glow Layer</span>
                    <span className="settings-desc">Renders luminous atmospheric glow halo around the planet</span>
                  </div>
                  <button
                    className={`settings-switch ${settings.showAtmosphere ? 'on' : ''}`}
                    onClick={() => handleToggle('showAtmosphere')}
                  >
                    <span className="settings-switch-handle" />
                  </button>
                </div>

                {/* Starfield Toggle */}
                <div className="settings-group">
                  <div className="settings-row-info">
                    <span className="settings-label">Space Starfield & Nebulae</span>
                    <span className="settings-desc">Deep-space background star cluster rendering</span>
                  </div>
                  <button
                    className={`settings-switch ${settings.showStarfield ? 'on' : ''}`}
                    onClick={() => handleToggle('showStarfield')}
                  >
                    <span className="settings-switch-handle" />
                  </button>
                </div>

                {/* Routes Toggle */}
                <div className="settings-group">
                  <div className="settings-row-info">
                    <span className="settings-label">Migration Flyway Arcs</span>
                    <span className="settings-desc">Display animated flyway routes between seasonal stopover zones</span>
                  </div>
                  <button
                    className={`settings-switch ${settings.showRoutes ? 'on' : ''}`}
                    onClick={() => handleToggle('showRoutes')}
                  >
                    <span className="settings-switch-handle" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: AI ENGINE */}
            {activeTab === 'ai' && (
              <div className="settings-pane">
                <h3 className="settings-pane-title">NVIDIA NIM Inference Configuration</h3>

                {/* Model Selection */}
                <div className="settings-group">
                  <div className="settings-row-info">
                    <span className="settings-label">NVIDIA NIM Inference Model</span>
                    <span className="settings-desc">Select model endpoint hosted on NVIDIA NIM cloud infrastructure</span>
                  </div>
                  <div className="settings-stack-options">
                    {[
                      { id: 'openai/gpt-oss-120b', title: 'openai/gpt-oss-120b', desc: 'Recommended · 120B parameter reasoning model with live thought trace stream' },
                      { id: 'meta/llama-3.1-70b-instruct', title: 'meta/llama-3.1-70b-instruct', desc: 'Fast 70B instruct model for rapid population trend summaries' },
                      { id: 'nvidia/neva-22b', title: 'nvidia/neva-22b', desc: 'NVIDIA native vision-language ecosystem model' },
                    ].map(m => (
                      <button
                        key={m.id}
                        className={`settings-card-option ${settings.aiModel === m.id ? 'active' : ''}`}
                        onClick={() => handleSelect('aiModel', m.id)}
                      >
                        <div className="settings-card-header">
                          <span className="settings-card-title">{m.title}</span>
                          {settings.aiModel === m.id && <Check size={14} className="settings-check-icon" />}
                        </div>
                        <p className="settings-card-desc">{m.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Show Reasoning Stream */}
                <div className="settings-group">
                  <div className="settings-row-info">
                    <span className="settings-label">Live AI Reasoning Stream</span>
                    <span className="settings-desc">Display real-time thinking trace terminal box during gpt-oss-120b inference</span>
                  </div>
                  <button
                    className={`settings-switch ${settings.showReasoningStream ? 'on' : ''}`}
                    onClick={() => handleToggle('showReasoningStream')}
                  >
                    <span className="settings-switch-handle" />
                  </button>
                </div>

                {/* Temperature Slider */}
                <div className="settings-group">
                  <div className="settings-row-info">
                    <span className="settings-label">Inference Temperature ({settings.temperature})</span>
                    <span className="settings-desc">Lower = analytical & grounded; Higher = exploratory</span>
                  </div>
                  <div className="settings-slider-wrap">
                    <Sliders size={13} style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={settings.temperature}
                      onChange={e => onUpdateSettings({ temperature: parseFloat(e.target.value) })}
                      className="settings-range"
                    />
                    <span className="settings-slider-val">{settings.temperature}</span>
                  </div>
                </div>

                {/* Custom API Key Input */}
                <div className="settings-group full-width">
                  <div className="settings-row-info">
                    <span className="settings-label">NVIDIA API Key Override</span>
                    <span className="settings-desc">Overrides default key set in `.env`</span>
                  </div>
                  <div className="settings-input-group">
                    <Key size={14} className="settings-input-icon" />
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="nvapi-…"
                      value={tempApiKey}
                      onChange={e => {
                        setTempApiKey(e.target.value);
                        onUpdateSettings({ customApiKey: e.target.value });
                      }}
                      className="settings-text-input"
                    />
                    <button
                      className="settings-eye-btn"
                      onClick={() => setShowApiKey(s => !s)}
                      title={showApiKey ? 'Hide' : 'Show'}
                    >
                      {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: AUDIO & SOUNDS */}
            {activeTab === 'audio' && (
              <div className="settings-pane">
                <h3 className="settings-pane-title">Web Audio Soundscape & Feedback</h3>

                {/* Ambient Soundscape */}
                <div className="settings-group">
                  <div className="settings-row-info">
                    <span className="settings-label">Ambient Nature Breeze Soundscape</span>
                    <span className="settings-desc">Generates continuous low-frequency wind breeze hum via Web Audio API synth</span>
                  </div>
                  <button
                    className={`settings-switch ${settings.ambientAudio ? 'on' : ''}`}
                    onClick={() => {
                      const next = !settings.ambientAudio;
                      handleToggle('ambientAudio');
                      updateAmbientSound(next, settings.ambientVolume);
                    }}
                  >
                    <span className="settings-switch-handle" />
                  </button>
                </div>

                {/* Ambient Volume */}
                <div className="settings-group">
                  <div className="settings-row-info">
                    <span className="settings-label">Ambient Soundscape Volume ({Math.round(settings.ambientVolume * 100)}%)</span>
                    <span className="settings-desc">Volume level of background nature breeze soundscape</span>
                  </div>
                  <div className="settings-slider-wrap">
                    <Volume2 size={13} style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="range"
                      min="0.05"
                      max="1.0"
                      step="0.05"
                      value={settings.ambientVolume}
                      onChange={e => {
                        const vol = parseFloat(e.target.value);
                        onUpdateSettings({ ambientVolume: vol });
                        if (settings.ambientAudio) updateAmbientSound(true, vol);
                      }}
                      className="settings-range"
                    />
                    <span className="settings-slider-val">{Math.round(settings.ambientVolume * 100)}%</span>
                  </div>
                </div>

                {/* UI Sound Effects */}
                <div className="settings-group">
                  <div className="settings-row-info">
                    <span className="settings-label">Interactive UI Sound Effects</span>
                    <span className="settings-desc">Synthesizes tactile audio blips on button clicks and navigation</span>
                  </div>
                  <button
                    className={`settings-switch ${settings.uiSounds ? 'on' : ''}`}
                    onClick={() => handleToggle('uiSounds')}
                  >
                    <span className="settings-switch-handle" />
                  </button>
                </div>

                {/* UI Sound Effects Volume */}
                <div className="settings-group">
                  <div className="settings-row-info">
                    <span className="settings-label">UI Sound Effects Volume ({Math.round((settings.uiVolume ?? 0.35) * 100)}%)</span>
                    <span className="settings-desc">Volume of tactile button clicks and telemetry slider ticks</span>
                  </div>
                  <div className="settings-slider-wrap">
                    <Volume2 size={13} style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="range"
                      min="0.05"
                      max="1.0"
                      step="0.05"
                      value={settings.uiVolume ?? 0.35}
                      onChange={e => {
                        const vol = parseFloat(e.target.value);
                        onUpdateSettings({ uiVolume: vol });
                        playUiClick(true, vol);
                      }}
                      className="settings-range"
                    />
                    <span className="settings-slider-val">{Math.round((settings.uiVolume ?? 0.35) * 100)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: THEME & UNITS */}
            {activeTab === 'display' && (
              <div className="settings-pane">
                <h3 className="settings-pane-title">Appearance & Coordinate Units</h3>

                {/* Accent Theme */}
                <div className="settings-group">
                  <div className="settings-row-info">
                    <span className="settings-label">Bioluminescent Color Theme</span>
                    <span className="settings-desc">Primary accent lighting palette for UI elements and active overlays</span>
                  </div>
                  <div className="settings-theme-grid">
                    {[
                      { id: 'emerald', label: 'Emerald Forest', color: '#52b788' },
                      { id: 'amber', label: 'Cyber Amber', color: '#e9c46a' },
                      { id: 'cyan', label: 'Arctic Cyan', color: '#48cae4' },
                      { id: 'coral', label: 'Solar Coral', color: '#f97316' },
                    ].map(t => (
                      <button
                        key={t.id}
                        className={`settings-theme-btn ${settings.accentTheme === t.id ? 'active' : ''}`}
                        onClick={() => handleSelect('accentTheme', t.id as AppSettings['accentTheme'])}
                        style={{ '--theme-color': t.color } as React.CSSProperties}
                      >
                        <span className="settings-theme-swatch" style={{ background: t.color }} />
                        <span className="settings-theme-name">{t.label}</span>
                        {settings.accentTheme === t.id && <Check size={13} style={{ color: t.color }} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coordinate Format */}
                <div className="settings-group">
                  <div className="settings-row-info">
                    <span className="settings-label">Geographic Coordinate Format</span>
                    <span className="settings-desc">Notation used for latitude and longitude displays</span>
                  </div>
                  <div className="settings-pill-options">
                    {[
                      { label: 'Decimal (45.46°, 9.19°)', val: 'decimal' },
                      { label: 'DMS (45°27\'N, 9°11\'E)', val: 'dms' },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        className={`settings-pill-btn ${settings.coordinateFormat === opt.val ? 'active' : ''}`}
                        onClick={() => handleSelect('coordinateFormat', opt.val as AppSettings['coordinateFormat'])}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Telemetry HUD Style */}
                <div className="settings-group">
                  <div className="settings-row-info">
                    <span className="settings-label">Telemetry HUD Display Style</span>
                    <span className="settings-desc">Top overlay display density</span>
                  </div>
                  <div className="settings-pill-options">
                    {[
                      { label: 'Full Telemetry HUD', val: 'full' },
                      { label: 'Compact HUD', val: 'compact' },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        className={`settings-pill-btn ${settings.hudStyle === opt.val ? 'active' : ''}`}
                        onClick={() => handleSelect('hudStyle', opt.val as AppSettings['hudStyle'])}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: DATA & RESET */}
            {activeTab === 'data' && (
              <div className="settings-pane">
                <h3 className="settings-pane-title">Data Storage & Preference Reset</h3>

                <div className="settings-group vertical">
                  <div className="settings-row-info">
                    <span className="settings-label">Sidebar Watch List Reset</span>
                    <span className="settings-desc">Resets the stored sidebar watch list back to the default 5 species</span>
                  </div>
                  {onResetWatchlist && (
                    <button
                      className="settings-action-btn"
                      onClick={() => { playUiClick(settings.uiSounds); onResetWatchlist(); }}
                    >
                      <RotateCcw size={13} />
                      <span>Reset Watch List to Default</span>
                    </button>
                  )}
                </div>

                <div className="settings-group vertical">
                  <div className="settings-row-info">
                    <span className="settings-label">Restore Default Settings</span>
                    <span className="settings-desc">Reverts all graphics, AI engine, audio, and UI settings to defaults</span>
                  </div>
                  <button
                    className="settings-action-btn danger"
                    onClick={() => { playUiClick(settings.uiSounds); onResetSettings(); }}
                  >
                    <RotateCcw size={13} />
                    <span>Reset All Preferences to Default</span>
                  </button>
                </div>
              </div>
            )}

          </main>
        </div>

        {/* ── Footer ── */}
        <footer className="settings-footer">
          <div className="settings-footer-left">
            <ShieldCheck size={14} style={{ color: 'var(--green-bright)' }} />
            <span>SilentSkies v3.0 · All settings auto-saved</span>
          </div>
          <button className="settings-done-btn" onClick={onClose}>
            <Check size={14} />
            <span>Done</span>
          </button>
        </footer>

      </div>
    </div>
  );
}
