/**
 * useLeaflet — lazily loads Leaflet from CDN once and signals readiness.
 *
 * Why CDN instead of npm? Leaflet + react-leaflet add ~200 KB to the bundle.
 * For a hackathon demo, the CDN approach keeps the build lightweight.
 * This hook centralises the injection so it happens exactly once per page,
 * regardless of how many map components are mounted.
 */

import { useState, useEffect } from 'react';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

// Module-level promise so concurrent consumers share one load
let leafletLoadPromise = null;

function loadLeaflet() {
  if (window.L) return Promise.resolve();          // already loaded
  if (leafletLoadPromise) return leafletLoadPromise; // load in progress

  leafletLoadPromise = new Promise((resolve, reject) => {
    // Inject CSS
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    // Inject cyber-theme tooltip overrides once
    if (!document.getElementById('leaflet-cyber-styles')) {
      const style = document.createElement('style');
      style.id = 'leaflet-cyber-styles';
      style.innerHTML = `
        .cyber-tooltip {
          background: rgba(15, 23, 42, 0.85) !important;
          border: 1px solid rgba(6, 182, 212, 0.3) !important;
          color: #fff !important;
          font-family: monospace !important;
          font-size: 0.75rem !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          box-shadow: 0 0 8px rgba(6, 182, 212, 0.25) !important;
          font-weight: bold !important;
        }
        .leaflet-container { background: #0f172a !important; }
      `;
      document.head.appendChild(style);
    }

    // Inject JS
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.crossOrigin = '';
    script.onload  = resolve;
    script.onerror = () => {
      leafletLoadPromise = null; // allow retry on error
      reject(new Error('Failed to load Leaflet from CDN'));
    };
    document.body.appendChild(script);
  });

  return leafletLoadPromise;
}

/**
 * Returns { leafletReady: boolean }.
 * Components should wait for leafletReady before using window.L.
 */
export function useLeaflet() {
  const [leafletReady, setLeafletReady] = useState(!!window.L);

  useEffect(() => {
    if (window.L) return; // nothing to do
    loadLeaflet()
      .then(() => setLeafletReady(true))
      .catch(err => console.error('[useLeaflet]', err));
  }, []);

  return { leafletReady };
}
