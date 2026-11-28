import type { SupabaseClient, User } from '@supabase/supabase-js';

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');

/** Name/avatar taken from the OAuth provider (Discord or Google). */
export function providerIdentity(user: User) {
  const m = (user.user_metadata ?? {}) as Record<string, unknown>;
  const provider = str(user.app_metadata?.provider);
  const username =
    str(m.username) || str(m.user_name) || str(m.preferred_username) || str(m.full_name) || str(m.name) || user.email?.split('@')[0] || 'Player';
  return {
    provider,
    username: username.replace(/[^\p{L}\p{N}_.\- ]/gu, '').slice(0, 24) || 'Player',
    displayName: str(m.full_name) || str(m.name) || username,
    avatar: str(m.avatar_url) || str(m.picture),
    discordHandle: provider === 'discord' ? str(m.user_name) || str(m.name) : ''
  };
}

/**
 * Makes sure the signed-in user has a player_profiles row. Inserts only the user's own row
 * (RLS: id = auth.uid()). Never touches user_roles, so OAuth sign-in cannot grant any role.
 */
export async function ensureProfile(supabase: SupabaseClient, user: User, locale: string) {
  const { data: existing } = await supabase.from('player_profiles').select('id').eq('id', user.id).maybeSingle();
  if (existing) return;
  const id = providerIdentity(user);
  for (let i = 0; i < 4; i++) {
    const username = i === 0 ? id.username : `${id.username.slice(0, 18)}${Math.floor(1000 + Math.random() * 9000)}`;
    const { error } = await supabase.from('player_profiles').insert({
      id: user.id,
      username,
      display_name: id.displayName.slice(0, 40),
      preferred_locale: locale === 'en' ? 'en' : 'ar',
      discord_handle: id.discordHandle || null
    });
    if (!error) return;
    if (error.code !== '23505') return; // only retry on a username clash
  }
}
