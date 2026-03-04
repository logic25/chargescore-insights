import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

let cachedKey: string | null = null;
let fetchPromise: Promise<string> | null = null;

async function fetchKey(): Promise<string> {
  if (cachedKey !== null) return cachedKey;
  if (fetchPromise) return fetchPromise;

  fetchPromise = supabase.functions
    .invoke('get-maps-key')
    .then(({ data, error }) => {
      if (error) throw error;
      cachedKey = data?.key || '';
      return cachedKey;
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

export function useGoogleMapsKey() {
  const [key, setKey] = useState<string>(cachedKey ?? '');
  const [loading, setLoading] = useState(cachedKey === null);

  useEffect(() => {
    if (cachedKey !== null) {
      setKey(cachedKey);
      setLoading(false);
      return;
    }
    fetchKey()
      .then((k) => { setKey(k); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { key, loading };
}

export { fetchKey as getGoogleMapsKey };
