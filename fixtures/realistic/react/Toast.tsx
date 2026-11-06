import { useEffect } from 'react';
import { useMotionDuration } from './theme/useReducedMotion';

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const duration = useMotionDuration(200);
  useEffect(() => {
    const timer = window.setTimeout(onDone, 4000);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="toast" role="status" style={{ transitionDuration: `${duration}ms` }}>
      <span className="t-body-small">{message}</span>
      <button type="button" className="btn btn-secondary" onClick={onDone} aria-label="Dismiss">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </div>
  );
}
