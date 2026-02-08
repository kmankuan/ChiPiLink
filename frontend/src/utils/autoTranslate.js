/**
 * Core Auto-Translate Utility
 * Shared across all modules for bidirectional multilingual auto-translation.
 * Fetches dictionary from backend API, falls back to built-in defaults.
 */

const API = process.env.REACT_APP_BACKEND_URL;

// In-memory cache
let _dictCache = null;
let _dictPromise = null;
let _reverseEs = null;
let _reverseZh = null;

/**
 * Fetch dictionary from API (cached, singleton promise)
 */
export async function fetchDictionary() {
  if (_dictCache) return _dictCache;
  if (_dictPromise) return _dictPromise;

  _dictPromise = (async () => {
    try {
      const res = await fetch(`${API}/api/translations/dictionary`);
      if (res.ok) {
        const data = await res.json();
        _dictCache = data.entries || [];
      } else {
        _dictCache = [];
      }
    } catch {
      _dictCache = [];
    }
    // Build reverse lookup maps
    _reverseEs = new Map();
    _reverseZh = new Map();
    for (const entry of _dictCache) {
      if (entry.es) _reverseEs.set(entry.es.toLowerCase(), entry);
      if (entry.zh) _reverseZh.set(entry.zh.toLowerCase(), entry);
    }
    return _dictCache;
  })();

  return _dictPromise;
}

/**
 * Invalidate cache (call after admin adds/edits terms)
 */
export function invalidateDictCache() {
  _dictCache = null;
  _dictPromise = null;
  _reverseEs = null;
  _reverseZh = null;
}

/**
 * Translate a term bidirectionally.
 * @param {string} text - The text to translate
 * @param {string} fromLang - Source language: 'en', 'es', or 'zh'
 * @returns {{ en: string, es: string, zh: string }}
 */
export function translate(text, fromLang = 'en') {
  if (!text || !_dictCache) return { en: '', es: '', zh: '' };
  const key = text.trim().toLowerCase();

  if (fromLang === 'en') {
    const entry = _dictCache.find(e => e.en?.toLowerCase() === key);
    if (entry) return { en: text, es: entry.es || '', zh: entry.zh || '' };
    // Try without trailing 's'
    if (key.endsWith('s')) {
      const singular = _dictCache.find(e => e.en?.toLowerCase() === key.slice(0, -1));
      if (singular) return { en: text, es: singular.es || '', zh: singular.zh || '' };
    }
    return { en: text, es: '', zh: '' };
  }

  if (fromLang === 'es' && _reverseEs) {
    const entry = _reverseEs.get(key);
    if (entry) {
      const enLabel = entry.en?.replace(/\b\w/g, c => c.toUpperCase()) || '';
      return { en: enLabel, es: text, zh: entry.zh || '' };
    }
    return { en: '', es: text, zh: '' };
  }

  if (fromLang === 'zh' && _reverseZh) {
    const entry = _reverseZh.get(key);
    if (entry) {
      const enLabel = entry.en?.replace(/\b\w/g, c => c.toUpperCase()) || '';
      return { en: enLabel, es: entry.es || '', zh: text };
    }
    return { en: '', es: '', zh: text };
  }

  return { en: '', es: '', zh: '' };
}

/**
 * Generate a field key from a label string.
 * @param {string} label
 * @returns {string} snake_case key
 */
export function toFieldKey(label) {
  if (!label) return '';
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '');
}
