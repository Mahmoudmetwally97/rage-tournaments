'use server';

import { cairoLocalToIso } from '@/lib/format';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser, getSupabaseServerClient } from '@/lib/supabase/server';

type Msg = string | null;
const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

const ERR: Record<string, string> = {
  FORBIDDEN: 'ليس لديك صلاحية / Not allowed',
  UNAUTHORIZED: 'سجل دخول أولاً / Sign in first',
  REGISTRATION_CLOSED: 'التسجيل مغلق / Registration closed',
  CHECKIN_CLOSED: 'التشيك إن غير مفتوح / Check-in not open',
  NOT_ACCEPTED: 'لازم يتم قبولك أولاً / You must be accepted first',
  NO_CHECKED_IN_PLAYERS: 'لا يوجد لاعبين عملوا تشيك إن / No checked-in players',
  STAGE_HAS_RESULTS: 'المرحلة فيها نتائج / Stage already has results',
  NOT_COMPLETED: 'البطولة لم تنته / Tournament not finished',
  NOT_PARTICIPANT: 'لست مشاركاً / Not a participant',
  NO_PRIZE_FOR_RANK: 'مركزك بدون جائزة / No prize for your rank',
  CONTACT_REQUIRED: 'اكتب وسيلة التواصل / Add a payout contact',
  ROOM_HAS_RESULTS: 'الغرفة فيها نتائج، مينفعش النقل / Room has results, cannot move',
  ROOM_FULL: 'الغرفة مكتملة / Room is full',
  PLAYER_NOT_IN_STAGE: 'اللاعب مش في المرحلة دي / Player not in this stage',
  STAGE_NOT_FINISHED: 'لسه فيه ماتشات ناقصة نتائج / Some matches have no results yet',
  STAGE_NOT_SEEDED: 'المرحلة لم تتولد بعد / Stage not seeded',
  NO_NEXT_STAGE: 'اعمل مرحلة تانية الأول / Create the next stage first',
  NO_PLAYERS_FOR_STAGE: 'مفيش لاعبين للمرحلة دي (اعمل ترقية الأول) / No players for this stage (advance first)',
  NEXT_STAGE_HAS_RESULTS: 'المرحلة التالية فيها نتائج / Next stage already has results',
  INVALID_IGN: 'اسم اللعبة قصير / In-game name too short'
};

function pretty(m: string): string {
  for (const k of Object.keys(ERR)) if (m.includes(k)) return ERR[k] as string;
  if (m.includes('duplicate key')) return 'مسجل بالفعل أو الاسم مستخدم / Already registered or name taken';
  return m;
}

async function done(back: string, err: Msg): Promise<never> {
  revalidatePath(back);
  const sep = back.includes('?') ? '&' : '?';
  redirect(err ? `${back}${sep}err=${encodeURIComponent(pretty(err))}` : `${back}${sep}ok=1`);
}

async function client() {
  const sb = await getSupabaseServerClient();
  const user = await getCurrentUser();
  if (!sb || !user) redirect('/ar/login');
  return { sb, user };
}

function back(f: FormData, sub = ''): string {
  return `/${s(f, 'locale') || 'ar'}/admin/${s(f, 'slug')}${sub}`;
}

export async function setRegStatus(f: FormData) {
  const { sb } = await client();
  const { error } = await sb.rpc('admin_set_registration_status', {
    p_registration_id: s(f, 'reg_id'),
    p_status: s(f, 'status')
  });
  await done(back(f, '/participants'), error?.message ?? null);
}

export async function setTournamentStatus(f: FormData) {
  const { sb } = await client();
  const { error } = await sb.rpc('admin_set_tournament_status', {
    p_tournament_id: s(f, 'tid'),
    p_status: s(f, 'status')
  });
  await done(back(f), error?.message ?? null);
}

export async function seedStage(f: FormData) {
  const { sb } = await client();
  const { error } = await sb.rpc('admin_seed_stage', { p_tournament_id: s(f, 'tid'), p_stage_order: Number(s(f, 'order') || 1) });
  await done(back(f, `/matches?stage=${s(f, 'order') || 1}`), error?.message ?? null);
}

export async function saveMatch(f: FormData) {
  const { sb } = await client();
  const rows: { registration_id: string; rank: string; kills: string }[] = [];
  for (const [k, v] of f.entries()) {
    if (k.startsWith('rank_')) {
      const id = k.slice(5);
      rows.push({ registration_id: id, rank: String(v), kills: String(f.get(`kills_${id}`) ?? '0') });
    }
  }
  const { error } = await sb.rpc('admin_save_match_results', { p_match_id: s(f, 'match_id'), p_rows: rows });
  await done(back(f, '/matches'), error?.message ?? null);
}

export async function saveScoring(f: FormData) {
  const { sb } = await client();
  const placement: Record<string, number> = {};
  for (const part of s(f, 'placement').split(/[,\n]/)) {
    const [r, p] = part.split(':').map((x) => x.trim());
    if (r && p && !Number.isNaN(Number(p))) placement[r] = Number(p);
  }
  const { error } = await sb.rpc('admin_set_scoring', {
    p_tournament_id: s(f, 'tid'),
    p_placement: placement,
    p_kill: Number(s(f, 'kill') || 1),
    p_rounds: Number(s(f, 'rounds') || 1)
  });
  await done(back(f, '/rules'), error?.message ?? null);
}

export async function saveSettings(f: FormData) {
  const { sb } = await client();
  const patch: Record<string, unknown> = {
    title_ar: s(f, 'title_ar'),
    title_en: s(f, 'title_en'),
    max_participants: Number(s(f, 'max_participants') || 0),
    room_size: Number(s(f, 'room_size') || 25),
    requires_approval: f.get('requires_approval') === 'on',
    contact_url: s(f, 'contact_url'),
    contact_label: s(f, 'contact_label'),
    starts_at: s(f, 'starts_at'),
    checkin_opens_at: s(f, 'checkin_opens_at'),
    checkin_closes_at: s(f, 'checkin_closes_at')
  };
  for (const k of ['starts_at', 'checkin_opens_at', 'checkin_closes_at']) {
    if (patch[k]) patch[k] = cairoLocalToIso(String(patch[k]));
  }
  const { error } = await sb.rpc('admin_update_tournament', { p_tournament_id: s(f, 'tid'), p_patch: patch });
  await done(back(f), error?.message ?? null);
}

export async function saveRules(f: FormData) {
  const { sb } = await client();
  const n = Number(s(f, 'count') || 0);
  const sections = [];
  for (let i = 0; i < n; i++) {
    if (f.get(`del_${i}`) === 'on') continue;
    const sec = {
      title_ar: s(f, `title_ar_${i}`),
      title_en: s(f, `title_en_${i}`),
      body_ar: s(f, `body_ar_${i}`),
      body_en: s(f, `body_en_${i}`)
    };
    if (sec.title_ar || sec.title_en || sec.body_ar || sec.body_en) sections.push(sec);
  }
  if (f.get('add') === '1') sections.push({ title_ar: 'قسم جديد', title_en: 'New section', body_ar: '', body_en: '' });
  const { error } = await sb.rpc('admin_update_tournament', {
    p_tournament_id: s(f, 'tid'),
    p_patch: { rules_sections: sections }
  });
  await done(back(f, '/rules'), error?.message ?? null);
}

export async function addPool(f: FormData) {
  const { sb } = await client();
  const from = Number(s(f, 'rank_from') || 1);
  const to = Number(s(f, 'rank_to') || from);
  const { error } = await sb.from('prize_pools').insert({
    tournament_id: s(f, 'tid'),
    rank_from: from,
    rank_to: to,
    label_ar: s(f, 'label_ar') || `المركز ${from}${to > from ? `-${to}` : ''}`,
    label_en: s(f, 'label_en') || `Rank ${from}${to > from ? `-${to}` : ''}`,
    sort_order: from
  });
  await done(back(f, '/prizes'), error?.message ?? null);
}

export async function deletePool(f: FormData) {
  const { sb } = await client();
  const { error } = await sb.from('prize_pools').delete().eq('id', s(f, 'id'));
  await done(back(f, '/prizes'), error?.message ?? null);
}

export async function addReward(f: FormData) {
  const { sb } = await client();
  const amount = s(f, 'amount');
  const { error } = await sb.from('prize_rewards').insert({
    pool_id: s(f, 'pool_id'),
    kind: s(f, 'kind') || 'other',
    amount: amount ? Number(amount) : null,
    currency: s(f, 'currency') || null,
    text_ar: s(f, 'text_ar') || null,
    text_en: s(f, 'text_en') || null,
    note: s(f, 'note') || null,
    is_placeholder: false
  });
  await done(back(f, '/prizes'), error?.message ?? null);
}

export async function deleteReward(f: FormData) {
  const { sb } = await client();
  const { error } = await sb.from('prize_rewards').delete().eq('id', s(f, 'id'));
  await done(back(f, '/prizes'), error?.message ?? null);
}

export async function addBonus(f: FormData) {
  const { sb } = await client();
  const amount = s(f, 'amount');
  const { error } = await sb.from('tournament_bonuses').insert({
    tournament_id: s(f, 'tid'),
    title_ar: s(f, 'title_ar') || s(f, 'title_en'),
    title_en: s(f, 'title_en') || s(f, 'title_ar'),
    description_ar: s(f, 'description_ar') || null,
    description_en: s(f, 'description_en') || null,
    kind: s(f, 'kind') || 'other',
    amount: amount ? Number(amount) : null,
    is_placeholder: false
  });
  await done(back(f, '/prizes'), error?.message ?? null);
}

export async function deleteBonus(f: FormData) {
  const { sb } = await client();
  const { error } = await sb.from('tournament_bonuses').delete().eq('id', s(f, 'id'));
  await done(back(f, '/prizes'), error?.message ?? null);
}

export async function setClaimStatus(f: FormData) {
  const { sb } = await client();
  const { error } = await sb
    .from('prize_claims')
    .update({ status: s(f, 'status'), staff_note: s(f, 'note') || null })
    .eq('id', s(f, 'id'));
  await done(back(f, '/prizes'), error?.message ?? null);
}

export async function replyIssue(f: FormData) {
  const { sb } = await client();
  const { error } = await sb
    .from('tournament_issues')
    .update({ staff_reply: s(f, 'reply') || null, status: s(f, 'status') || 'resolved' })
    .eq('id', s(f, 'id'));
  await done(back(f, '/support'), error?.message ?? null);
}

/* ---------- player side ---------- */
const play = (f: FormData) => `/${s(f, 'locale') || 'ar'}/tournaments/${s(f, 'slug')}/play`;

export async function playerRegister(f: FormData) {
  const { sb } = await client();
  const code = 'RC-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const { error } = await sb.rpc('register_solo_participant', {
    p_tournament_id: s(f, 'tid'),
    p_ign_snapshot: s(f, 'ign'),
    p_registration_code: code
  });
  await done(play(f), error?.message ?? null);
}

export async function playerCancel(f: FormData) {
  const { sb } = await client();
  const { error } = await sb.rpc('cancel_my_registration', { p_tournament_id: s(f, 'tid') });
  await done(play(f), error?.message ?? null);
}

export async function playerCheckIn(f: FormData) {
  const { sb } = await client();
  const { error } = await sb.rpc('player_check_in', { p_tournament_id: s(f, 'tid') });
  await done(play(f), error?.message ?? null);
}

export async function playerClaim(f: FormData) {
  const { sb } = await client();
  const { error } = await sb.rpc('player_claim_prize', { p_tournament_id: s(f, 'tid'), p_contact: s(f, 'contact') });
  await done(play(f), error?.message ?? null);
}

export async function playerIssue(f: FormData) {
  const { sb, user } = await client();
  const { error } = await sb.from('tournament_issues').insert({
    tournament_id: s(f, 'tid'),
    user_id: user.id,
    subject: s(f, 'subject'),
    body: s(f, 'body')
  });
  await done(play(f), error?.message ?? null);
}

export async function createStage(f: FormData) {
  const { sb } = await client();
  const { error } = await sb.rpc('admin_create_stage', {
    p_tournament_id: s(f, 'tid'),
    p_name_ar: s(f, 'name_ar'),
    p_name_en: s(f, 'name_en'),
    p_qualify_count: Number(s(f, 'qualify') || 1)
  });
  await done(back(f, '/matches'), error?.message ?? null);
}

export async function advanceStage(f: FormData) {
  const { sb } = await client();
  const from = Number(s(f, 'from') || 1);
  const { error } = await sb.rpc('admin_advance_stage', {
    p_tournament_id: s(f, 'tid'),
    p_from_order: from,
    p_top_n: Number(s(f, 'top_n') || 1)
  });
  if (!error) {
    const { error: e2 } = await sb.rpc('admin_seed_stage', { p_tournament_id: s(f, 'tid'), p_stage_order: from + 1 });
    await done(back(f, `/matches?stage=${from + 1}`), e2?.message ?? null);
  }
  await done(back(f, `/matches?stage=${from}`), error?.message ?? null);
}

/** Called from the drag and drop board. Returns an error string instead of redirecting. */
export async function movePlayer(registrationId: string, toGroupId: string, slug: string): Promise<string | null> {
  const { sb } = await client();
  const { error } = await sb.rpc('admin_move_player', { p_registration_id: registrationId, p_to_group_id: toGroupId });
  if (error) return pretty(error.message);
  revalidatePath(`/ar/admin/${slug}/matches`);
  revalidatePath(`/en/admin/${slug}/matches`);
  return null;
}
