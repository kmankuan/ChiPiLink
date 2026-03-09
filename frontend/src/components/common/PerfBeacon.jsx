/**
 * PerfBeacon — Reports frontend performance metrics to the backend.
 * Runs once after page load. Tracks: page load time, DOM ready, JS errors.
 */
import { useEffect, useRef } from 'react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;
let _jsErrorCount = 0;

// Count JS errors globally
if (typeof window !== 'undefined') {
  window.addEventListener('error', () => { _jsErrorCount++; });
  window.addEventListener('unhandledrejection', () => { _jsErrorCount++; });
}

export default function PerfBeacon() {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    // Wait for page to fully load
    const timer = setTimeout(() => {
      sent.current = true;
      try {
        const perf = performance.getEntriesByType('navigation')[0];
        const load_ms = perf ? Math.round(perf.loadEventEnd - perf.startTime) : 0;
        const dom_ready_ms = perf ? Math.round(perf.domContentLoadedEventEnd - perf.startTime) : 0;

        // Measure average API latency from resource timing
        const apiEntries = performance.getEntriesByType('resource')
          .filter(r => r.name.includes('/api/'))
          .map(r => r.responseEnd - r.startTime);
        const api_latency_ms = apiEntries.length > 0
          ? Math.round(apiEntries.reduce((s, v) => s + v, 0) / apiEntries.length)
          : 0;

        fetch(`${API}/api/admin/system-monitor/frontend-perf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ load_ms, dom_ready_ms, js_errors: _jsErrorCount, api_latency_ms }),
        }).catch(() => {}); // Fire and forget
      } catch {}
    }, 5000); // Report 5s after mount

    return () => clearTimeout(timer);
  }, []);

  return null;
}
