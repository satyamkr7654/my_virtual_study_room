import React from 'react';
import Lamp from './Lamp';

/**
 * Full page loading state
 */
const LoadingSpinner = ({ text = 'Loading' }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-ink-soft" role="status">
    <Lamp lit className="w-12 h-12 animate-pulse" />
    <p>{text}</p>
  </div>
);

export default LoadingSpinner;
