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

export async function createTournament(f: FormData) {
  const { sb, user } = await client();
  const locale = s(f, 'locale') || 'ar';
  const fail = (m: string) => done(`/${locale}/admin/new`, m);

  const { data: roles } = await sb.from('user_roles').select('role').eq('user_id', user.id);
  if (!(roles ?? []).some((r) => r.role === 'super_admin')) return fail('FORBIDDEN');

  const titleEn = s(f, 'title_en');
  const titleAr = s(f, 'title_ar') || titleEn;
  if (titleEn.length < 2) return fail('اكتب اسم البطولة / Enter the tournament name');
  let slug = s(f, 'slug').toLowerCase() || titleEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || ['new', 'create'].includes(slug)) {
    return fail('الرابط لازم يكون حروف إنجليزي صغيرة وأرقام وشرطات / Slug must be lowercase letters, numbers and dashes');
  }
  const gameId = s(f, 'game_id');
  if (!gameId) return fail('اختار اللعبة / Choose a game');
  const roomSize = Math.max(2, Number(s(f, 'room_size') || 25));
  const startsRaw = s(f, 'starts_at');
  const startsAt = startsRaw ? cairoLocalToIso(startsRaw) : null;
  const regRaw = s(f, 'registration_deadline');
  const openMin = Math.max(0, Number(s(f, 'checkin_minutes') || 40));
  const checkinOpens = startsAt ? new Date(new Date(startsAt).getTime() - openMin * 60000).toISOString() : null;

  const copyId = s(f, 'copy_from');
  let src: Record<string, any> | null = null;
  if (copyId) {
    const { data } = await sb.from('tournaments').select('*').eq('id', copyId).maybeSingle();
    src = data;
  }

  const row: Record<string, unknown> = {
    slug,
    game_id: gameId,
    title_en: titleEn,
    title_ar: titleAr,
    competition_type: 'solo',
    team_size: 1,
    language: 'both',
    status: f.get('publish') === 'on' ? 'published' : 'draft',
    min_participants: 2,
    max_participants: Math.max(0, Number(s(f, 'max_participants') || 0)),
    room_size: roomSize,
    requires_approval: f.get('requires_approval') === 'on',
    starts_at: startsAt,
    checkin_opens_at: checkinOpens,
    registration_deadline: regRaw ? cairoLocalToIso(regRaw) : null,
    timezone: 'Africa/Cairo',
    created_by: user.id,
    contact_url: s(f, 'contact_url') || src?.contact_url || null,
    contact_label: s(f, 'contact_label') || src?.contact_label || null
  };
  if (src) {
    for (const k of ['game_version', 'description_ar', 'description_en', 'rules_url', 'rules_text_ar', 'rules_text_en', 'rules_sections', 'prize_summary_ar', 'prize_summary_en', 'dispute_window_minutes']) {
      if (src[k] !== undefined) row[k] = src[k];
    }
  }
  const { data: created, error } = await sb.from('tournaments').insert(row).select('id').single();
  if (error || !created) return fail(error?.message ?? 'create failed');
  const tid = created.id as string;

  const rollback = async (m: string) => {
    await sb.from('tournaments').delete().eq('id', tid);
    return fail(m);
  };

  const mgr = await sb.from('tournament_admins').insert({ tournament_id: tid, user_id: user.id, role: 'tournament_manager', assigned_by: user.id });
  if (mgr.error) return rollback(mgr.error.message);

  if (src) {
    const { data: stages } = await sb.from('stages').select('*').eq('tournament_id', src.id).order('stage_order');
    const map: Record<string, string> = {};
    for (const st of stages ?? []) {
      const { data: ns, error: e } = await sb
        .from('stages')
        .insert({ tournament_id: tid, stage_order: st.stage_order, name_ar: st.name_ar, name_en: st.name_en, format: st.format, participant_mode: st.participant_mode, seeding_mode: st.seeding_mode, qualify_count: st.qualify_count, advance_rule: st.advance_rule, config: st.config })
        .select('id')
        .single();
      if (e || !ns) return rollback(e?.message ?? 'stage copy failed');
      map[st.id] = ns.id;
    }
    const { data: rules } = await sb.from('tournament_scoring_rules').select('*').eq('tournament_id', src.id).eq('is_active', true);
    for (const r of rules ?? []) {
      const { error: e } = await sb.from('tournament_scoring_rules').insert({ tournament_id: tid, stage_id: r.stage_id ? (map[r.stage_id] ?? null) : null, version: 1, placement_points: r.placement_points, kill_points: r.kill_points, win_points: r.win_points, round_count: r.round_count, aggregation_mode: r.aggregation_mode, tie_breaker_rules: r.tie_breaker_rules, is_active: true });
      if (e) return rollback(e.message);
    }
    const { data: pools } = await sb.from('prize_pools').select('*').eq('tournament_id', src.id);
    for (const p of pools ?? []) {
      const { data: np, error: e } = await sb.from('prize_pools').insert({ tournament_id: tid, rank_from: p.rank_from, rank_to: p.rank_to, label_ar: p.label_ar, label_en: p.label_en, sort_order: p.sort_order }).select('id').single();
      if (e || !np) return rollback(e?.message ?? 'prize copy failed');
      const { data: rw } = await sb.from('prize_rewards').select('*').eq('pool_id', p.id);
      for (const w of rw ?? []) {
        await sb.from('prize_rewards').insert({ pool_id: np.id, kind: w.kind, amount: w.amount, currency: w.currency, text_ar: w.text_ar, text_en: w.text_en, note: w.note, is_placeholder: w.is_placeholder });
      }
    }
    const { data: bonuses } = await sb.from('tournament_bonuses').select('*').eq('tournament_id', src.id);
    for (const b of bonuses ?? []) {
      await sb.from('tournament_bonuses').insert({ tournament_id: tid, title_ar: b.title_ar, title_en: b.title_en, description_ar: b.description_ar, description_en: b.description_en, kind: b.kind, amount: b.amount, is_placeholder: b.is_placeholder });
    }
  } else {
    const { error: e1 } = await sb.rpc('admin_create_stage', { p_tournament_id: tid, p_name_ar: 'المرحلة الأولى', p_name_en: 'Stage 1', p_qualify_count: 1 });
    if (e1) return rollback(e1.message);
    const { error: e2 } = await sb.rpc('admin_set_scoring', { p_tournament_id: tid, p_placement: { '1': 10, '2': 8, '3': 6, '4': 5, '5': 4, '6': 3, '7': 2, '8': 1 }, p_kill: 1, p_rounds: 1 });
    if (e2) return rollback(e2.message);
  }

  revalidatePath(`/${locale}/admin`);
  redirect(`/${locale}/admin/${slug}?ok=1`);
}
