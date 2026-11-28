'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser, getSupabaseServerClient } from '@/lib/supabase/server';

const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const MAX = 3 * 1024 * 1024;

const ERR: Record<string, string> = {
  USERNAME_INVALID: 'اليوزر 3 إلى 20 حرف إنجليزي أو أرقام أو _ أو . / Username must be 3-20 letters, numbers, _ or .',
  USERNAME_TAKEN: 'اليوزر مستخدم / Username is taken',
  TEAM_NAME_TAKEN: 'اسم التيم مستخدم / Team name is taken',
  TOO_MANY_TEAMS: 'الحد الأقصى 3 تيمات تقودها / You can lead up to 3 teams',
  TEAM_TAG_2_TO_5: 'التاج من 2 إلى 5 حروف / Tag must be 2-5 characters',
  TEAM_NAME_TOO_SHORT: 'اسم التيم قصير / Team name is too short',
  FORBIDDEN: 'ليس لديك صلاحية / Not allowed',
  UNAUTHORIZED: 'سجل دخول أولاً / Sign in first'
};
function pretty(m: string): string {
  for (const k of Object.keys(ERR)) if (m.includes(k)) return ERR[k] as string;
  if (m.includes('row-level security')) return ERR.FORBIDDEN as string;
  if (m.includes('chk_')) return 'قيمة غير صالحة / Invalid value';
  return m;
}
function go(url: string, err: string | null): never {
  const sep = url.includes('?') ? '&' : '?';
  redirect(err ? `${url}${sep}err=${encodeURIComponent(pretty(err))}` : `${url}${sep}ok=1`);
}
async function client() {
  const sb = await getSupabaseServerClient();
  const user = await getCurrentUser();
  if (!sb || !user) redirect('/ar/login');
  return { sb, user };
}
function sniff(b: Uint8Array): { ext: string; mime: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: 'png', mime: 'image/png' };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { ext: 'webp', mime: 'image/webp' };
  return null;
}
type SB = Awaited<ReturnType<typeof client>>['sb'];

/** Upload one optional image field. Returns {url} / {skip} / {err}. */
async function uploadImage(sb: SB, bucket: string, folder: string, kind: string, file: FormDataEntryValue | null): Promise<{ url: string } | { skip: true } | { err: string }> {
  if (!(file instanceof File) || file.size === 0) return { skip: true };
  if (file.size > MAX) return { err: 'الصورة أكبر من 3 ميجا / Image is larger than 3 MB' };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const k = sniff(bytes);
  if (!k) return { err: 'الصيغة لازم تكون JPG أو PNG أو WebP / Image must be JPG, PNG or WebP' };
  const path = `${folder}/${kind}-${Date.now()}.${k.ext}`;
  const up = await sb.storage.from(bucket).upload(path, bytes, { contentType: k.mime, cacheControl: '31536000', upsert: false });
  if (up.error) return { err: up.error.message };
  return { url: sb.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}
async function dropOld(sb: SB, bucket: string, url: string | null | undefined, keep?: string) {
  const m = String(url ?? '').match(new RegExp(`/${bucket}/([0-9a-f-]{36}/[^?#]+)`));
  if (m && m[1] !== keep) await sb.storage.from(bucket).remove([decodeURIComponent(m[1] as string)]);
}
const COUNTRY = /^[A-Z]{2}$/;
function bust(locale: string) {
  for (const l of ['ar', 'en']) revalidatePath(`/${l}`, 'layout');
  void locale;
}

export async function saveProfile(f: FormData) {
  const { sb, user } = await client();
  const locale = s(f, 'locale') || 'ar';
  const back = `/${locale}/settings`;
  const { data: cur } = await sb.from('player_profiles').select('username,avatar_url,cover_url').eq('id', user.id).maybeSingle();
  const username = s(f, 'username');
  if (username && username !== cur?.username) {
    const { error } = await sb.rpc('update_username', { p_username: username });
    if (error) return go(back, error.message);
  }
  const country = s(f, 'country');
  const bio = s(f, 'bio');
  if (country && !COUNTRY.test(country)) return go(back, 'بلد غير صالح / Invalid country');
  if (bio.length > 300) return go(back, 'النبذة أطول من 300 حرف / Bio is longer than 300 characters');
  const patch: Record<string, unknown> = { country: country || null, bio: bio || null };
  const av = await uploadImage(sb, 'profile-images', user.id, 'avatar', f.get('avatar'));
  if ('err' in av) return go(back, av.err);
  if ('url' in av) patch.avatar_url = av.url;
  const cv = await uploadImage(sb, 'profile-images', user.id, 'cover', f.get('cover'));
  if ('err' in cv) return go(back, cv.err);
  if ('url' in cv) patch.cover_url = cv.url;
  const { data: upd, error } = await sb.from('player_profiles').update(patch).eq('id', user.id).select('id');
  if (error || !upd?.length) return go(back, error?.message ?? 'FORBIDDEN');
  if ('url' in av) await dropOld(sb, 'profile-images', cur?.avatar_url, undefined);
  if ('url' in cv) await dropOld(sb, 'profile-images', cur?.cover_url, undefined);
  bust(locale);
  return go(back, null);
}

export async function removeProfileImage(f: FormData) {
  const { sb, user } = await client();
  const locale = s(f, 'locale') || 'ar';
  const col = s(f, 'kind') === 'cover' ? 'cover_url' : 'avatar_url';
  const { data: cur } = await sb.from('player_profiles').select('avatar_url,cover_url').eq('id', user.id).maybeSingle();
  const { error } = await sb.from('player_profiles').update({ [col]: null }).eq('id', user.id);
  if (error) return go(`/${locale}/settings`, error.message);
  await dropOld(sb, 'profile-images', (cur as Record<string, string | null> | null)?.[col]);
  bust(locale);
  return go(`/${locale}/settings`, null);
}

function teamFields(f: FormData) {
  const country = s(f, 'country');
  const description = s(f, 'description');
  const email = s(f, 'contact_email');
  return { country, description, email };
}
function checkTeamFields(x: { country: string; description: string; email: string }): string | null {
  if (x.country && !COUNTRY.test(x.country)) return 'بلد غير صالح / Invalid country';
  if (x.description.length > 500) return 'الوصف أطول من 500 حرف / Description is longer than 500 characters';
  if (x.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email)) return 'الإيميل غير صالح / Invalid email';
  return null;
}

export async function createTeamFull(f: FormData) {
  const { sb } = await client();
  const locale = s(f, 'locale') || 'ar';
  const back = `/${locale}/teams/create`;
  const x = teamFields(f);
  const bad = checkTeamFields(x);
  if (bad) return go(back, bad);
  const { data: id, error } = await sb.rpc('create_team', { p_game_id: s(f, 'game_id'), p_name: s(f, 'name'), p_tag: s(f, 'tag') });
  if (error || !id) return go(back, error?.message ?? 'FORBIDDEN');
  const tid = String(id);
  const patch: Record<string, unknown> = { country: x.country || null, description: x.description || null, contact_email: x.email || null };
  let warn: string | null = null;
  const lg = await uploadImage(sb, 'team-logos', tid, 'logo', f.get('logo'));
  if ('err' in lg) warn = lg.err; else if ('url' in lg) patch.logo_url = lg.url;
  const cv = await uploadImage(sb, 'team-logos', tid, 'cover', f.get('cover'));
  if ('err' in cv) warn = cv.err; else if ('url' in cv) patch.cover_url = cv.url;
  await sb.from('teams').update(patch).eq('id', tid);
  bust(locale);
  return go(`/${locale}/teams/${tid}`, warn ? `التيم اتعمل بس: ${warn} / Team created, but: ${warn}` : null);
}

export async function saveTeamProfile(f: FormData) {
  const { sb } = await client();
  const locale = s(f, 'locale') || 'ar';
  const tid = s(f, 'team_id');
  const back = `/${locale}/teams/${tid}`;
  const x = teamFields(f);
  const bad = checkTeamFields(x);
  if (bad) return go(back, bad);
  const { data: cur } = await sb.from('teams').select('logo_url,cover_url').eq('id', tid).maybeSingle();
  const patch: Record<string, unknown> = { country: x.country || null, description: x.description || null, contact_email: x.email || null };
  const lg = await uploadImage(sb, 'team-logos', tid, 'logo', f.get('logo'));
  if ('err' in lg) return go(back, lg.err);
  if ('url' in lg) patch.logo_url = lg.url;
  const cv = await uploadImage(sb, 'team-logos', tid, 'cover', f.get('cover'));
  if ('err' in cv) return go(back, cv.err);
  if ('url' in cv) patch.cover_url = cv.url;
  const { data: upd, error } = await sb.from('teams').update(patch).eq('id', tid).select('id');
  if (error || !upd?.length) return go(back, error?.message ?? 'FORBIDDEN');
  if ('url' in lg) await dropOld(sb, 'team-logos', cur?.logo_url);
  if ('url' in cv) await dropOld(sb, 'team-logos', cur?.cover_url);
  bust(locale);
  return go(back, null);
}

export async function removeTeamImage(f: FormData) {
  const { sb } = await client();
  const locale = s(f, 'locale') || 'ar';
  const tid = s(f, 'team_id');
  const col = s(f, 'kind') === 'cover' ? 'cover_url' : 'logo_url';
  const { data: cur } = await sb.from('teams').select('logo_url,cover_url').eq('id', tid).maybeSingle();
  const { data: upd, error } = await sb.from('teams').update({ [col]: null }).eq('id', tid).select('id');
  if (error || !upd?.length) return go(`/${locale}/teams/${tid}`, error?.message ?? 'FORBIDDEN');
  await dropOld(sb, 'team-logos', (cur as Record<string, string | null> | null)?.[col]);
  bust(locale);
  return go(`/${locale}/teams/${tid}`, null);
}
