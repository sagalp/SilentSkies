import { Bird, ShieldCheck, Heart } from 'lucide-react';

interface NavbarProps {
  totalObservations: number;
  loading: boolean;
  onOpenAction: () => void;
}

export function Navbar({ totalObservations, loading, onOpenAction }: NavbarProps) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-icon">
          <Bird size={20} />
        </div>
        <div className="navbar-title">
          <span className="navbar-name">SilentSkies</span>
          <span className="navbar-tagline">Global Avian Intelligence</span>
        </div>
      </div>

      <div className="navbar-center">
        <div className="navbar-badge">
          <span className="badge-dot" />
          <ShieldCheck size={13} />
          <span>AI 4 WORLD HACKATHON</span>
        </div>
      </div>

      <div className="navbar-right">
        <div className="stat-pill">
          <span className="stat-label">GBIF Occurrences</span>
          <span className="stat-value">
            {loading ? (
              <span className="pulse-text">Loading GBIF data...</span>
            ) : (
              `${totalObservations.toLocaleString()} records`
            )}
          </span>
        </div>

        <button className="navbar-action-btn" onClick={onOpenAction}>
          <Heart size={14} />
          <span>Take Action</span>
        </button>
      </div>
    </nav>
  );
}
