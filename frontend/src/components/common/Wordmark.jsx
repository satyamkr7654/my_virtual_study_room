import React from 'react';
import Lamp from './Lamp';

const Wordmark = ({ dark = false }) => (
  <span className="inline-flex items-center gap-2 font-serif font-semibold text-lg">
    <Lamp lit dark={dark} className="w-8 h-8" />
    Virtual Study Room
  </span>
);

export default Wordmark;
