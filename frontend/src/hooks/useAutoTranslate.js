/**
 * useAutoTranslate — Core React hook for bidirectional auto-translation.
 * Usage:
 *   const { translate, toFieldKey, ready } = useAutoTranslate();
 *   const result = translate('Phone Number', 'en');
 *   // => { en: 'Phone Number', es: 'Número de Teléfono', zh: '电话号码' }
 */
import { useState, useEffect, useCallback } from 'react';
import {
  fetchDictionary,
  translate as coreTranslate,
  toFieldKey as coreToFieldKey,
  invalidateDictCache,
} from '@/utils/autoTranslate';

export default function useAutoTranslate() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetchDictionary().then(() => setReady(true));
  }, []);

  const translate = useCallback((text, fromLang = 'en') => {
    return coreTranslate(text, fromLang);
  }, []);

  const toFieldKey = useCallback((label) => {
    return coreToFieldKey(label);
  }, []);

  const refresh = useCallback(async () => {
    invalidateDictCache();
    await fetchDictionary();
  }, []);

  return { translate, toFieldKey, ready, refresh };
}
