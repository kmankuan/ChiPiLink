/**
 * UI Style Theme Presets
 * Each template defines full CSS variable sets for both light and dark modes.
 * Values are HSL components (without "hsl()") matching Tailwind/shadcn convention.
 */

// Hex → HSL converter (returns "H S% L%" string)
export function hexToHSL(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
      default: h = 0;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const TEMPLATE_PRESETS = {
  default: {
    light: {
      '--background': '40 20% 97%',
      '--foreground': '210 20% 20%',
      '--card': '0 0% 100%',
      '--card-foreground': '210 20% 20%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '210 20% 20%',
      '--primary': '162 63% 18%',
      '--primary-foreground': '60 30% 96%',
      '--secondary': '30 20% 90%',
      '--secondary-foreground': '24 10% 10%',
      '--muted': '30 20% 94%',
      '--muted-foreground': '215 16% 47%',
      '--accent': '24 85% 55%',
      '--accent-foreground': '0 0% 100%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '30 10% 85%',
      '--input': '30 10% 85%',
      '--ring': '162 63% 18%',
    },
    dark: {
      '--background': '222 47% 11%',
      '--foreground': '210 40% 98%',
      '--card': '222 47% 13%',
      '--card-foreground': '210 40% 98%',
      '--popover': '222 47% 11%',
      '--popover-foreground': '210 40% 98%',
      '--primary': '160 60% 45%',
      '--primary-foreground': '222 47% 11%',
      '--secondary': '217 32% 17%',
      '--secondary-foreground': '210 40% 98%',
      '--muted': '217 32% 17%',
      '--muted-foreground': '215 20% 65%',
      '--accent': '24 85% 55%',
      '--accent-foreground': '0 0% 100%',
      '--destructive': '0 62% 30%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '217 32% 20%',
      '--input': '217 32% 20%',
      '--ring': '160 60% 45%',
    },
  },

  elegant: {
    light: {
      '--background': '270 20% 98%',
      '--foreground': '270 30% 15%',
      '--card': '0 0% 100%',
      '--card-foreground': '270 30% 15%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '270 30% 15%',
      '--primary': '263 70% 50%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '270 15% 92%',
      '--secondary-foreground': '270 20% 20%',
      '--muted': '270 10% 94%',
      '--muted-foreground': '270 10% 45%',
      '--accent': '45 90% 50%',
      '--accent-foreground': '270 30% 15%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '270 10% 88%',
      '--input': '270 10% 88%',
      '--ring': '263 70% 50%',
    },
    dark: {
      '--background': '260 40% 8%',
      '--foreground': '270 20% 95%',
      '--card': '260 35% 12%',
      '--card-foreground': '270 20% 95%',
      '--popover': '260 40% 8%',
      '--popover-foreground': '270 20% 95%',
      '--primary': '263 65% 60%',
      '--primary-foreground': '260 40% 8%',
      '--secondary': '260 25% 18%',
      '--secondary-foreground': '270 20% 95%',
      '--muted': '260 25% 18%',
      '--muted-foreground': '270 15% 60%',
      '--accent': '45 85% 55%',
      '--accent-foreground': '260 40% 8%',
      '--destructive': '0 62% 35%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '260 25% 22%',
      '--input': '260 25% 22%',
      '--ring': '263 65% 60%',
    },
  },

  warm: {
    light: {
      '--background': '30 30% 97%',
      '--foreground': '20 25% 15%',
      '--card': '30 20% 100%',
      '--card-foreground': '20 25% 15%',
      '--popover': '30 20% 100%',
      '--popover-foreground': '20 25% 15%',
      '--primary': '24 95% 45%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '30 25% 90%',
      '--secondary-foreground': '20 20% 15%',
      '--muted': '30 20% 93%',
      '--muted-foreground': '20 10% 45%',
      '--accent': '350 80% 55%',
      '--accent-foreground': '0 0% 100%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '30 15% 85%',
      '--input': '30 15% 85%',
      '--ring': '24 95% 45%',
    },
    dark: {
      '--background': '20 30% 8%',
      '--foreground': '30 20% 95%',
      '--card': '20 25% 12%',
      '--card-foreground': '30 20% 95%',
      '--popover': '20 30% 8%',
      '--popover-foreground': '30 20% 95%',
      '--primary': '24 90% 55%',
      '--primary-foreground': '20 30% 8%',
      '--secondary': '20 20% 18%',
      '--secondary-foreground': '30 20% 95%',
      '--muted': '20 20% 18%',
      '--muted-foreground': '30 15% 58%',
      '--accent': '350 75% 55%',
      '--accent-foreground': '0 0% 100%',
      '--destructive': '0 62% 35%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '20 20% 22%',
      '--input': '20 20% 22%',
      '--ring': '24 90% 55%',
    },
  },

  ocean: {
    light: {
      '--background': '210 25% 97%',
      '--foreground': '215 30% 15%',
      '--card': '0 0% 100%',
      '--card-foreground': '215 30% 15%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '215 30% 15%',
      '--primary': '200 90% 40%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '210 20% 92%',
      '--secondary-foreground': '215 20% 15%',
      '--muted': '210 15% 94%',
      '--muted-foreground': '215 12% 45%',
      '--accent': '175 70% 40%',
      '--accent-foreground': '0 0% 100%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '210 12% 86%',
      '--input': '210 12% 86%',
      '--ring': '200 90% 40%',
    },
    dark: {
      '--background': '215 40% 8%',
      '--foreground': '210 25% 95%',
      '--card': '215 35% 12%',
      '--card-foreground': '210 25% 95%',
      '--popover': '215 40% 8%',
      '--popover-foreground': '210 25% 95%',
      '--primary': '200 85% 50%',
      '--primary-foreground': '215 40% 8%',
      '--secondary': '215 28% 18%',
      '--secondary-foreground': '210 25% 95%',
      '--muted': '215 28% 18%',
      '--muted-foreground': '210 18% 60%',
      '--accent': '175 65% 45%',
      '--accent-foreground': '215 40% 8%',
      '--destructive': '0 62% 35%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '215 28% 22%',
      '--input': '215 28% 22%',
      '--ring': '200 85% 50%',
    },
  },

  minimal: {
    light: {
      '--background': '0 0% 100%',
      '--foreground': '0 0% 9%',
      '--card': '0 0% 100%',
      '--card-foreground': '0 0% 9%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '0 0% 9%',
      '--primary': '0 0% 9%',
      '--primary-foreground': '0 0% 98%',
      '--secondary': '0 0% 96%',
      '--secondary-foreground': '0 0% 9%',
      '--muted': '0 0% 96%',
      '--muted-foreground': '0 0% 45%',
      '--accent': '0 0% 96%',
      '--accent-foreground': '0 0% 9%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '0 0% 90%',
      '--input': '0 0% 90%',
      '--ring': '0 0% 9%',
    },
    dark: {
      '--background': '0 0% 4%',
      '--foreground': '0 0% 98%',
      '--card': '0 0% 7%',
      '--card-foreground': '0 0% 98%',
      '--popover': '0 0% 4%',
      '--popover-foreground': '0 0% 98%',
      '--primary': '0 0% 98%',
      '--primary-foreground': '0 0% 9%',
      '--secondary': '0 0% 15%',
      '--secondary-foreground': '0 0% 98%',
      '--muted': '0 0% 15%',
      '--muted-foreground': '0 0% 64%',
      '--accent': '0 0% 15%',
      '--accent-foreground': '0 0% 98%',
      '--destructive': '0 62% 35%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '0 0% 18%',
      '--input': '0 0% 18%',
      '--ring': '0 0% 83%',
    },
  },
};

// Font family → Google Fonts URL mapping
const FONT_URLS = {
  'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'Poppins': 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'DM Sans': null, // Already loaded in index.css
  'Nunito': 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700&display=swap',
  'Lora': 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap',
  'Source Sans 3': 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap',
  'Noto Sans': 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@300;400;500;600;700&display=swap',
  'Rubik': 'https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=swap',
  'Outfit': 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap',
  'Space Grotesk': 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
  'Merriweather': 'https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&display=swap',
  'Playfair Display': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap',
};

// Density CSS variable sets
const DENSITY_VARS = {
  compact: {
    '--density-padding': '0.375rem',
    '--density-padding-lg': '0.75rem',
    '--density-gap': '0.375rem',
    '--density-gap-lg': '0.75rem',
    '--density-text-sm': '0.75rem',
    '--density-text-base': '0.8125rem',
    '--density-text-lg': '0.875rem',
    '--density-line-height': '1.35',
    '--density-radius-scale': '0.8',
  },
  comfortable: {
    '--density-padding': '0.75rem',
    '--density-padding-lg': '1.25rem',
    '--density-gap': '0.5rem',
    '--density-gap-lg': '1rem',
    '--density-text-sm': '0.8125rem',
    '--density-text-base': '0.875rem',
    '--density-text-lg': '1rem',
    '--density-line-height': '1.5',
    '--density-radius-scale': '1',
  },
  spacious: {
    '--density-padding': '1.25rem',
    '--density-padding-lg': '2rem',
    '--density-gap': '0.75rem',
    '--density-gap-lg': '1.5rem',
    '--density-text-sm': '0.875rem',
    '--density-text-base': '1rem',
    '--density-text-lg': '1.125rem',
    '--density-line-height': '1.65',
    '--density-radius-scale': '1.2',
  },
};

/**
 * Apply UI style to the document
 * @param {object} style - { template, primary_color, font_family, border_radius, card_style, density }
 * @param {string} mode - 'light' or 'dark'
 */
export function applyUIStyle(style, mode = 'light') {
  if (!style) return;

  const root = document.documentElement;
  const templateId = style.template || 'default';
  const preset = TEMPLATE_PRESETS[templateId] || TEMPLATE_PRESETS.default;
  const vars = preset[mode] || preset.light;

  // Apply all template CSS variables
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Override primary color if custom hex is provided and differs from template default
  if (style.primary_color) {
    const hsl = hexToHSL(style.primary_color);
    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--ring', hsl);
  }

  // Apply border radius
  if (style.border_radius) {
    root.style.setProperty('--radius', style.border_radius);
  }

  // Apply font family
  if (style.font_family) {
    const fontUrl = FONT_URLS[style.font_family];
    if (fontUrl) {
      // Load font if not already loaded
      const id = `ui-style-font-${style.font_family.replace(/\s/g, '-')}`;
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = fontUrl;
        document.head.appendChild(link);
      }
    }
    root.style.setProperty('--font-sans', `'${style.font_family}', system-ui, sans-serif`);
    document.body.style.fontFamily = `'${style.font_family}', system-ui, sans-serif`;
  }

  // Apply density
  const density = style.density || 'comfortable';
  const densityVars = DENSITY_VARS[density] || DENSITY_VARS.comfortable;
  Object.entries(densityVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.dataset.density = density;

  // Apply card style via data attribute (CSS picks it up)
  root.dataset.cardStyle = style.card_style || 'elevated';
}

/**
 * Clear all dynamically applied styles (reset to CSS defaults)
 */
export function clearUIStyle() {
  const root = document.documentElement;
  const allVars = [
    '--background', '--foreground', '--card', '--card-foreground',
    '--popover', '--popover-foreground', '--primary', '--primary-foreground',
    '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
    '--accent', '--accent-foreground', '--destructive', '--destructive-foreground',
    '--border', '--input', '--ring', '--radius', '--font-sans',
  ];
  allVars.forEach(v => root.style.removeProperty(v));
  document.body.style.fontFamily = '';
  delete root.dataset.cardStyle;
}

export { TEMPLATE_PRESETS };
