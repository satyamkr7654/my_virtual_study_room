import React from 'react';
import { Link } from 'react-router-dom';
import Lamp from './Lamp';

const NotFound = () => (
  <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
    <Lamp className="w-16 h-16" />
    <h1 className="text-3xl font-semibold">Nothing at this address</h1>
    <p className="text-ink-soft">The page may have moved, or the link is incomplete.</p>
    <Link to="/dashboard" className="btn-primary">Go to your rooms</Link>
  </main>
);

export default NotFound;
