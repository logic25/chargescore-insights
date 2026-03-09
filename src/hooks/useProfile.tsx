import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'free' | 'plus' | 'pro' | 'admin';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  organization_id: string | null;
  lookups_used: number;
  lookups_limit: number;
  subscription_status: string;
}

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !data) {
        // Profile might not exist yet (race condition with trigger)
        setProfile({
          id: user.id,
          email: user.email ?? null,
          full_name: null,
          role: 'free',
          organization_id: null,
          lookups_used: 0,
          lookups_limit: 5,
          subscription_status: 'none',
        });
      } else {
        setProfile({
          id: data.id,
          email: (data as any).email ?? null,
          full_name: (data as any).full_name ?? null,
          role: ((data as any).role ?? 'free') as UserRole,
          organization_id: (data as any).organization_id ?? null,
          lookups_used: (data as any).lookups_used ?? 0,
          lookups_limit: (data as any).lookups_limit ?? 5,
          subscription_status: (data as any).subscription_status ?? 'none',
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user, authLoading]);

  const incrementLookup = async () => {
    if (!user || !profile) return false;
    const newCount = profile.lookups_used + 1;
    const { error } = await supabase
      .from('profiles')
      .update({ lookups_used: newCount } as any)
      .eq('id', user.id);
    if (!error) {
      setProfile(prev => prev ? { ...prev, lookups_used: newCount } : null);
    }
    return !error;
  };

  const canDoLookup = profile
    ? profile.role !== 'free' || profile.lookups_used < profile.lookups_limit
    : false;

  const isAtLeast = (role: UserRole): boolean => {
    if (!profile) return false;
    const hierarchy: UserRole[] = ['free', 'plus', 'pro', 'admin'];
    return hierarchy.indexOf(profile.role) >= hierarchy.indexOf(role);
  };

  return { profile, loading: loading || authLoading, incrementLookup, canDoLookup, isAtLeast };
}
