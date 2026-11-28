/**
 * Minimal PostgREST client.
 * Uses plain fetch against the project's REST endpoint with the public anon key,
 * so no extra dependency is needed. RLS is enforced server side by Supabase.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export class SupabaseRestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'SupabaseRestError';
  }
}

export async function sbSelect<T>(
  table: string,
  query: Record<string, string> = {}
): Promise<T[]> {
  if (!isSupabaseConfigured()) {
    throw new SupabaseRestError('Supabase environment variables are not set', 0);
  }

  const params = new URLSearchParams(query);
  const url = `${SUPABASE_URL}/rest/v1/${table}${params.size ? `?${params.toString()}` : ''}`;

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: 'application/json'
    },
    // Tournament content changes rarely; revalidate every 30s so admin edits show up quickly.
    next: { revalidate: 30 }
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new SupabaseRestError(`${table}: ${res.status} ${body.slice(0, 200)}`, res.status);
  }

  return (await res.json()) as T[];
}
