import './Loader.css';

export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="page-loader">
      <div className="loader-spinner" />
      <p>{message}</p>
    </div>
  );
}

export function InlineLoader({ message = 'Loading...' }) {
  return (
    <div className="inline-loader">
      <div className="loader-dots">
        <span /><span /><span />
      </div>
      <p>{message}</p>
    </div>
  );
}

export function SkeletonCard({ count = 3 }) {
  return (
    <div className="skeleton-container">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-line skeleton-text" />
          <div className="skeleton-line skeleton-text short" />
        </div>
      ))}
    </div>
  );
}

export function Toast({ message, type = 'success', visible }) {
  return (
    <div className={`toast-notification ${type} ${visible ? 'show' : ''}`}>
      {type === 'success' && '✓'} {type === 'error' && '✗'} {type === 'info' && 'ℹ'} {message}
    </div>
  );
}
