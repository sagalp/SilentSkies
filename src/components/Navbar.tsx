import logoUrl from '/logo.png';
import { ShieldCheck, Heart, Settings } from 'lucide-react';

interface NavbarProps {
  totalObservations: number;
  loading: boolean;
  onOpenAction: () => void;
  onOpenSettings: () => void;
}

export function Navbar({ totalObservations, loading, onOpenAction, onOpenSettings }: NavbarProps) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <img src={logoUrl} alt="SilentSkies" className="navbar-logo" />
        <div className="navbar-title">
          <span className="navbar-name">SilentSkies</span>
          <span className="navbar-tagline">Global Avian Intelligence</span>
        </div>
      </div>

      <div className="navbar-center">
        <div className="navbar-badge">
          <span className="badge-dot" />
          <ShieldCheck size={12} />
          <span>AI 4 World Hackathon</span>
        </div>
      </div>

      <div className="navbar-right">
        <div className="stat-pill">
          <span className="stat-label">GBIF Occurrences</span>
          <span className="stat-value">
            {loading ? (
              <span className="pulse-text">Fetching…</span>
            ) : (
              `${totalObservations.toLocaleString()} obs`
            )}
          </span>
        </div>

        <button className="navbar-action-btn" onClick={onOpenAction}>
          <Heart size={13} />
          <span>Take Action</span>
        </button>

        <button className="navbar-settings-btn" onClick={onOpenSettings} title="System Settings">
          <Settings size={15} className="settings-btn-gear" />
        </button>
      </div>
    </nav>
  );
}
