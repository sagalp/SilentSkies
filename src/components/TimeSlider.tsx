import { useCallback } from 'react';
import { Calendar } from 'lucide-react';

interface TimeSliderProps {
  year: number;
  minYear?: number;
  maxYear?: number;
  onChange: (year: number) => void;
  loading?: boolean;
}

const MILESTONE_YEARS = [2000, 2005, 2010, 2015, 2020, 2025];

export function TimeSlider({
  year,
  minYear = 2000,
  maxYear = 2025,
  onChange,
  loading = false,
}: TimeSliderProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange]
  );

  const progress = ((year - minYear) / (maxYear - minYear)) * 100;

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
              onClick={() => onChange(y)}
              title={`Jump to ${y}`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

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
