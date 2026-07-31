import { Bird } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Loading occurrence data…' }: LoadingOverlayProps) {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-rings">
          <div className="ring ring-1" />
          <div className="ring ring-2" />
          <div className="ring ring-3" />
          <div className="loading-bird">
            <Bird size={28} />
          </div>
        </div>
        <p className="loading-message">{message}</p>
        <div className="loading-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}
