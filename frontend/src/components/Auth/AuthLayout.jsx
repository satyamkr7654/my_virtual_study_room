import React from 'react';
import Wordmark from '../common/Wordmark';

/**
 * A desk at night beside the form
 */
const Desk = () => (
  <svg viewBox="0 0 520 420" className="w-full max-w-lg" aria-hidden="true">
    <path d="M196 150 96 356h328L324 150z" fill="#f0b429" />
    <path d="M176 150a84 84 0 0 1 168 0z" fill="#fbfaf6" />
    <path d="M260 66V0" stroke="#fbfaf6" strokeWidth="5" />
    <path d="M0 356h520" stroke="#fbfaf6" strokeWidth="5" />
    {/* open book */}
    <path d="M260 336c-26-18-62-22-104-14v22c42-8 78-4 104 12 26-16 62-20 104-12v-22c-42-8-78-4-104 14z" fill="#fbfaf6" stroke="#0e211d" strokeWidth="4" strokeLinejoin="round" />
    <path d="M260 336v20" stroke="#0e211d" strokeWidth="4" />
    {/* stack and mug, outside the light */}
    <path d="M18 340h74v16H18zM26 322h62v18H26zM20 306h66v16H20z" fill="none" stroke="#51635c" strokeWidth="4" strokeLinejoin="round" />
    <path d="M448 318h40v38h-40zM488 326h8a8 8 0 0 1 0 20h-8" fill="none" stroke="#51635c" strokeWidth="4" strokeLinejoin="round" />
  </svg>
);

const AuthLayout = ({ title, children, footer }) => (
  <div className="min-h-screen lg:grid lg:grid-cols-[1.1fr_1fr]">
    <aside className="hidden lg:flex flex-col justify-between bg-ink-deep text-sheet p-12 overflow-hidden">
      <Wordmark dark />
      <div className="flex flex-col gap-4">
        <p className="font-serif text-4xl leading-tight max-w-md mb-8">Study at the same desk, from anywhere.</p>
        <Desk />
      </div>
    </aside>

    <main className="min-h-screen flex flex-col justify-center px-6 py-10 sm:px-12">
      <div className="w-full max-w-sm mx-auto">
        <div className="lg:hidden mb-10"><Wordmark /></div>
        <h1 className="text-3xl font-semibold mb-6">{title}</h1>
        {children}
        <p className="mt-6 text-ink-soft">{footer}</p>
      </div>
    </main>
  </div>
);

export default AuthLayout;
