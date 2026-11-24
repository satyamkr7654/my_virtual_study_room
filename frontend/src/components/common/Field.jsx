import React, { useId } from 'react';

/**
 * Labelled input
 */
const Field = ({ label, hint, className = '', ...input }) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1.5">{label}</label>
      <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} className={`field ${className}`} {...input} />
      {hint && <p id={`${id}-hint`} className="text-sm text-ink-soft mt-1">{hint}</p>}
    </div>
  );
};

export default Field;
