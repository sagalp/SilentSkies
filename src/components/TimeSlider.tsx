import { useCallback, useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

const MONTHS = [
  'All Year', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MIGRATION_SEASONS = [
  { label: 'Spring Migration', months: [3, 4, 5], color: '#52b788' },
  { label: 'Breeding Peak',    months: [5, 6, 7], color: '#74c69d' },
  { label: 'Autumn Migration', months: [8, 9, 10], color: '#e9c46a' },
  { label: 'Winter Roost',     months: [11, 12, 1], color: '#48cae4' },
];

import { playSliderTick } from '../utils/audio';

interface TimeSliderProps {
  year: number;
  month?: number; // undefined = all year
  minYear?: number;
  maxYear?: number;
  onChange: (year: number) => void;
  onMonthChange?: (month: number | undefined) => void;
  loading?: boolean;
  uiSounds?: boolean;
  uiVolume?: number;
}

const MILESTONE_YEARS = [2000, 2005, 2010, 2015, 2020, 2025];

export function TimeSlider({
  year,
  month,
  minYear = 2000,
  maxYear = 2025,
  onChange,
  onMonthChange,
  loading = false,
  uiSounds = true,
  uiVolume = 0.35,
}: TimeSliderProps) {
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      onChange(val);
      playSliderTick(uiSounds, uiVolume);
    },
    [onChange, uiSounds, uiVolume]
  );

  const handleMonthSelect = useCallback((m: number | undefined) => {
    onMonthChange?.(m);
    setShowMonthPicker(false);
    playSliderTick(uiSounds, uiVolume);
  }, [onMonthChange, uiSounds, uiVolume]);

  const progress = ((year - minYear) / (maxYear - minYear)) * 100;

  const activeSeason = month
    ? MIGRATION_SEASONS.find(s => s.months.includes(month))
    : null;

  const monthLabel = month ? MONTHS[month] : 'All Year';

  return (
    <div className="time-slider-wrap">
      <div className="time-slider-header">
        <Calendar size={14} />
        <span>Migration Year Timeline</span>
        <span className="time-slider-year">{year}</span>
        {loading && <span className="time-loading-badge">Fetching GBIF…</span>}
      </div>

      <div className="time-slider-track-wrap">
        <input
          type="range"
          min={minYear}
          max={maxYear}
          value={year}
          onChange={handleChange}
          className="time-slider-input"
          style={{ '--progress': `${progress}%` } as React.CSSProperties}
          aria-label="Select year"
        />
        <div className="time-slider-milestones">
          {MILESTONE_YEARS.map(y => (
            <button
              key={y}
              className={`milestone-tick ${year === y ? 'active' : ''}`}
              onClick={() => { onChange(y); playSliderTick(uiSounds, uiVolume); }}
              title={`Jump to ${y}`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Month Filter Row */}
      {onMonthChange && (
        <div className="time-month-row">
          <div className="time-month-label-wrap">
            <span className="time-month-label">Season Filter</span>
            {activeSeason && (
              <span className="time-season-badge" style={{ background: activeSeason.color + '22', borderColor: activeSeason.color + '55', color: activeSeason.color }}>
                {activeSeason.label}
              </span>
            )}
          </div>

          <div className="time-month-picker-wrap">
            <button
              className="time-month-select-btn"
              onClick={() => setShowMonthPicker(p => !p)}
              aria-expanded={showMonthPicker}
            >
              <Calendar size={11} />
              <span>{monthLabel}</span>
              <ChevronDown size={11} className={`time-month-chevron ${showMonthPicker ? 'open' : ''}`} />
            </button>

            {showMonthPicker && (
              <div className="time-month-dropdown">
                <button
                  className={`time-month-option ${!month ? 'active' : ''}`}
                  onClick={() => handleMonthSelect(undefined)}
                >
                  <span className="month-option-dot" style={{ background: '#52b788' }} />
                  All Year
                </button>
                {MONTHS.slice(1).map((m, i) => {
                  const idx = i + 1;
                  const season = MIGRATION_SEASONS.find(s => s.months.includes(idx));
                  return (
                    <button
                      key={idx}
                      className={`time-month-option ${month === idx ? 'active' : ''}`}
                      onClick={() => handleMonthSelect(idx)}
                    >
                      <span className="month-option-dot" style={{ background: season?.color || '#4d6b5c' }} />
                      {m}
                      {season && <span className="month-option-season" style={{ color: season.color }}>{season.label.split(' ')[0]}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="time-slider-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#ef4444' }} />
          <span>Low Density (High Risk)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#f59e0b' }} />
          <span>Moderate</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#10b981' }} />
          <span>High Density (Healthy)</span>
        </div>
      </div>
    </div>
  );
}
