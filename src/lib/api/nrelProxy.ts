import { supabase } from '@/integrations/supabase/client';

/**
 * Call NREL APIs through our edge function proxy.
 * The API key is stored server-side and never exposed to the client.
 */
export async function nrelFetch(endpoint: string, params: Record<string, string>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('nrel-proxy', {
    body: { endpoint, params },
  });

  if (error) throw error;
  return data;
}
