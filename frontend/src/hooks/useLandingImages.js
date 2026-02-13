/**
 * useLandingImages — Fetches customizable landing page images from backend.
 * Falls back to defaults if API unavailable.
 */
import { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DEFAULTS = {
  hero: 'https://images.unsplash.com/photo-1656259541897-a13b22104214?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80',
  pinpanclub: 'https://static.prod-images.emergentagent.com/jobs/0e997fa5-7870-4ad7-bfea-6491d7259a17/images/78c324677f3f701890649f9b0d24726815dbbe5114bad3d87b0f6adb5437aab7.png',
  lanterns: 'https://images.unsplash.com/photo-1762889583592-2dda392f5431?crop=entropy&cs=srgb&fm=jpg&w=800&q=80',
  community: 'https://images.unsplash.com/photo-1758275557161-f117d724d769?crop=entropy&cs=srgb&fm=jpg&w=800&q=80'
};

export function useLandingImages() {
  const [images, setImages] = useState(DEFAULTS);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/ticker/landing-images`);
        if (res.ok) {
          const data = await res.json();
          setImages(prev => ({ ...prev, ...data }));
        }
      } catch (e) {
        // silent — use defaults
      }
    };
    fetchImages();
  }, []);

  return images;
}
