/**
 * useLandingImages — Fetches customizable landing page images from backend.
 * Falls back to defaults if API unavailable.
 */
import { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DEFAULTS = {
  hero: 'https://images.unsplash.com/photo-1656259541897-a13b22104214?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80',
  pinpanclub: 'https://static.prod-images.emergentagent.com/jobs/0e997fa5-7870-4ad7-bfea-6491d7259a17/images/ef6eac2ed986b5b78b05a26b8d149d2f8eb29df31e372ae0d99939f38b1b80e7.png',
  lanterns: 'https://images.unsplash.com/photo-1762889583592-2dda392f5431?crop=entropy&cs=srgb&fm=jpg&w=800&q=80',
  community: 'https://images.unsplash.com/photo-1758275557161-f117d724d769?crop=entropy&cs=srgb&fm=jpg&w=800&q=80',
  mosaic_pingpong_chess: 'https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/5040d9d6499bad13e30dd00fe426cdce65332c563ef20104137ceb126b095e4b.png',
  mosaic_kids_learning: 'https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/3eaf9b70f2c8a242db6fd32a793b16c215104f30755b70c8b63aa38dd331f753.png',
  mosaic_culture: 'https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/535181b7a5a2144892c75ca15c73f9320f5739017de399d05ced0e60170f39e7.png',
  mosaic_gathering: 'https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/0416cce781984810906e615303474bfe2089c65f53db816a6bf448f34cbd3bda.png'
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
