import React from 'react';

/**
 * Desk lamp. Lit means someone is in the room.
 */
const Lamp = ({ lit = false, className = 'w-9 h-9', dark = false }) => {
  const metal = dark ? '#fbfaf6' : '#16302a';
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      {lit && <path d="M13 17 7 33h26l-6-16z" fill="#f0b429" />}
      <path d="M11 17a9 9 0 0 1 18 0z" fill={lit ? metal : 'none'} stroke={metal} strokeWidth="2" strokeLinejoin="round" />
      <path d="M20 8V4" stroke={metal} strokeWidth="2" strokeLinecap="round" />
      <path d="M6 35h28" stroke={metal} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

export default Lamp;
