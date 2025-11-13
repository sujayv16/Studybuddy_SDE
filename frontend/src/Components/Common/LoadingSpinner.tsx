import React from 'react';

const LoadingSpinner: React.FC<{size?: number, label?: string}> = ({ size = 40, label }) => {
  const style: React.CSSProperties = { width: size, height: size }; 
  return (
    <div className="d-flex align-items-center justify-content-center" aria-live="polite" aria-busy="true">
      <div className="spinner-border text-primary" role="status" style={style}>
        <span className="visually-hidden">Loading...</span>
      </div>
      {label && <small className="ms-2 text-muted">{label}</small>}
    </div>
  );
};

export default LoadingSpinner;
