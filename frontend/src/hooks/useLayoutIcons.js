/**
 * useLayoutIcons — Fetches configurable navigation icons for a given layout.
 * Falls back to defaults if API unavailable.
 */
import { useState, useEffect } from 'react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API_URL = RESOLVED_API_URL;

export function useLayoutIcons(layoutId) {
  const [icons, setIcons] = useState([]);

  useEffect(() => {
    if (!layoutId) return;
    const fetchIcons = async () => {
      try {
        const res = await fetch(`${API_URL}/api/ticker/layout-icons`);
        if (res.ok) {
          const data = await res.json();
          if (data[layoutId] && data[layoutId].length > 0) {
            setIcons(data[layoutId]);
          }
        }
      } catch (e) {
        // silent — use defaults
      }
    };
    fetchIcons();
  }, [layoutId]);

  return icons;
}
