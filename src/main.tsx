/**
 * main.tsx — Vite entry point (June 2026).
 *
 * Replaces src/index.tsx in the Vite build. The old CRA entry stays in
 * the repo as a fallback so `react-scripts` can still run if anyone
 * needs to roll back. Vite calls this file via the
 * `<script type="module" src="/src/main.tsx">` tag in index.html.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);
root.render(<App />);
