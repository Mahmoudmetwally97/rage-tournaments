'use server';

import { cairoLocalToIso } from '@/lib/format';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser, getSupabaseServerClient } from '@/lib/supabase/server';

type Msg = string | null;
const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

const ERR: Record<string, string> = {
  USERNAME_TAKEN: 'الاسم ده مستخدم عند لاعب تاني / That name is already used by another player',
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
  INVALID_IGN: 'اسم اللعبة قصير / In-game name too short',
  TEAM_NAME_TOO_SHORT: 'اسم التيم قصير / Team name too short',
  TEAM_TAG_2_TO_5: 'التاج من 2 ل 5 حروف / Tag must be 2 to 5 characters',
  TEAM_NAME_TAKEN: 'اسم التيم مستخدم / Team name already taken',
  TOO_MANY_TEAMS: 'وصلت الحد الأقصى للتيمات / Team limit reached',
  FORBIDDEN_NOT_TEAM_CAPTAIN: 'قائد التيم بس يقدر يعمل ده / Only the team leader can do this',
  PLAYER_NOT_FOUND: 'مفيش لاعب بالاسم ده / No player with that username',
  TEAM_FULL: 'التيم مكتمل / Team is full',
  NO_INVITE: 'مفيش دعوة / No invite found',
  CAPTAIN_CANNOT_LEAVE: 'القائد مينفعش يخرج / The leader cannot leave',
  ROSTER_LOCKED: 'التشكيلة اتقفلت بعد التسجيل / Roster is locked after registration',
  NOT_A_TEAM_TOURNAMENT: 'دي بطولة فردية / This is not a team tournament',
  TEAM_GAME_MISMATCH: 'التيم للعبة تانية / Team is for another game',
  TEAM_NOT_FULL: 'التيم ناقص لاعبين (لازم 5 قبلوا الدعوة) / Team needs 5 accepted players',
  TOO_MANY_PLAYERS: 'عدد اللاعبين أكبر من المسموح / Too many players',
  ALREADY_REGISTERED_OR_PLAYER_IN_ANOTHER_TEAM: 'التيم مسجل أو لاعب مسجل مع تيم تاني / Team already registered, or a player is in another team',
  NEED_AT_LEAST_2_TEAMS: 'لازم تيمين على الأقل عملوا تشيك إن / At least 2 checked-in teams needed',
  WAITING_FOR_TEAMS: 'لسه الماتش مستني التيمات / Match is waiting for its teams',
  NO_DRAWS: 'مفيش تعادل، لازم فايز / No draws, there must be a winner',
  BAD_SCORE: 'نتيجة غير صالحة / Invalid score',
  RESULT_LOCKED: 'الماتش التالي اتلعب، مينفعش تعديل / Next match already played',
  LAST_SUPER_ADMIN: 'ده آخر أدمن، مينفعش يتشال / This is the last admin and cannot be removed',
  CANNOT_CHANGE_SELF: 'مينفعش تغير صلاحياتك بنفسك / You cannot change your own role',
  OWNER_ONLY: 'المالك بس يقدر يدّي أو يشيل صلاحية أدمن / Only the owner can grant or remove admin',
  OWNER_PROTECTED: 'المالك محمي، مينفعش يتغير / The owner is protected',
  BAD_ROLE: 'صلاحية غير صالحة / Invalid role',
  MATCH_NOT_FOUND: 'الماتش مش موجود / Match not found'
};

function pretty(m: string): string {
  for (const k of Object.keys(ERR)) if (m.includes(k)) return ERR[k] as string;
  if (m.includes('tournaments_slug_key')) return 'الرابط مستخدم في بطولة تانية / This slug is already used';
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


const COVER_BUCKET = 'tournament-covers';
const COVER_MAX = 3 * 1024 * 1024;

function sniffImage(b: Uint8Array): { ext: string; mime: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: 'png', mime: 'image/png' };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { ext: 'webp', mime: 'image/webp' };
  return null;
}

function coverPathFromUrl(url: string | null | undefined): string | null {
  const m = String(url ?? '').match(new RegExp(`/${COVER_BUCKET}/([0-9a-f-]{36}/[^?#]+)`));
  return m ? decodeURIComponent(m[1] as string) : null;
}

/** Validate + upload a cover with the caller's own session (storage RLS decides), then point the tournament at it. Returns an error string or null. */
async function applyCover(sb: Awaited<ReturnType<typeof client>>['sb'], tid: string, file: File): Promise<Msg> {
  if (file.size > COVER_MAX) return 'الصورة أكبر من 3 ميجا / Image is larger than 3 MB';
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return 'الصيغة لازم تكون JPG أو PNG أو WebP / Image must be JPG, PNG or WebP';
  const { data: cur } = await sb.from('tournaments').select('cover_image_url').eq('id', tid).maybeSingle();
  const path = `${tid}/cover-${Date.now()}.${kind.ext}`;
  const up = await sb.storage.from(COVER_BUCKET).upload(path, bytes, { contentType: kind.mime, cacheControl: '31536000', upsert: false });
  if (up.error) return up.error.message.includes('row-level security') ? 'FORBIDDEN' : up.error.message;
  const url = sb.storage.from(COVER_BUCKET).getPublicUrl(path).data.publicUrl;
  const { data: upd, error } = await sb.from('tournaments').update({ cover_image_url: url }).eq('id', tid).select('id');
  if (error || !upd?.length) {
    await sb.storage.from(COVER_BUCKET).remove([path]);
    return error?.message ?? 'FORBIDDEN';
  }
  const old = coverPathFromUrl(cur?.cover_image_url);
  if (old && old !== path) await sb.storage.from(COVER_BUCKET).remove([old]);
  return null;
}

function revalidatePublic(f: FormData) {
  for (const l of ['ar', 'en']) {
    revalidatePath(`/${l}/tournaments/${s(f, 'slug')}`);
    revalidatePath(`/${l}/tournaments`);
    revalidatePath(`/${l}`);
  }
}

export async function saveCover(f: FormData) {
  const { sb } = await client();
  const file = f.get('cover');
  if (!(file instanceof File) || file.size === 0) return done(back(f), 'اختار صورة الأول / Choose an image first');
  const err = await applyCover(sb, s(f, 'tid'), file);
  revalidatePublic(f);
  await done(back(f), err);
}

export async function removeCover(f: FormData) {
  const { sb } = await client();
  const tid = s(f, 'tid');
  const { data: cur } = await sb.from('tournaments').select('cover_image_url').eq('id', tid).maybeSingle();
  const { data: upd, error } = await sb.from('tournaments').update({ cover_image_url: null }).eq('id', tid).select('id');
  if (error || !upd?.length) return done(back(f), error?.message ?? 'FORBIDDEN');
  const old = coverPathFromUrl(cur?.cover_image_url);
  if (old) await sb.storage.from(COVER_BUCKET).remove([old]);
  revalidatePublic(f);
  await done(back(f), null);
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
    is_test: f.get('is_test') === 'on',
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
  const { sb, user } = await client();
  const { data: prof } = await sb.from('player_profiles').select('username').eq('id', user.id).maybeSingle();
  const uname = (prof?.username ?? s(f, 'ign')).toLowerCase().replace(/\s+/g, '-');
  const { error } = await sb.rpc('register_solo_participant', {
    p_tournament_id: s(f, 'tid'),
    p_ign_snapshot: s(f, 'ign'),
    p_registration_code: 'rage-' + uname,
    p_contact_email: s(f, 'email')
  });
  await done(play(f), error?.message === 'INVALID_EMAIL' ? 'Enter a valid Gmail address' : (error?.message ?? null));
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
  const isTeam = s(f, 'format') === 'sd_single';
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
    competition_type: isTeam ? 'team' : 'solo',
    team_size: isTeam ? 5 : 1,
    substitute_slots: isTeam ? 2 : 0,
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
  } else if (isTeam) {
    const { error: e1 } = await sb.rpc('admin_make_team_stage', { p_tournament_id: tid });
    if (e1) return rollback(e1.message);
  } else {
    const { error: e1 } = await sb.rpc('admin_create_stage', { p_tournament_id: tid, p_name_ar: 'المرحلة الأولى', p_name_en: 'Stage 1', p_qualify_count: 1 });
    if (e1) return rollback(e1.message);
    const { error: e2 } = await sb.rpc('admin_set_scoring', { p_tournament_id: tid, p_placement: { '1': 10, '2': 8, '3': 6, '4': 5, '5': 4, '6': 3, '7': 2, '8': 1 }, p_kill: 1, p_rounds: 1 });
    if (e2) return rollback(e2.message);
  }

  const cover = f.get('cover');
  if (cover instanceof File && cover.size > 0) {
    const ce = await applyCover(sb, tid, cover);
    if (ce) {
      revalidatePath(`/${locale}/admin`);
      redirect(`/${locale}/admin/${slug}?err=${encodeURIComponent(ce)}`);
    }
  }
  revalidatePath(`/${locale}/admin`);
  redirect(`/${locale}/admin/${slug}?ok=1`);
}

/* ---------- teams (SD) ---------- */
const teamsUrl = (f: FormData) => {
  const b = s(f, 'back');
  return /^\/(ar|en)\/teams(\/[0-9a-f-]{36})?$/.test(b) ? b : `/${s(f, 'locale') || 'ar'}/teams`;
};

export async function createTeamAction(f: FormData) {
  const { sb } = await client();
  const { error } = await sb.rpc('create_team', { p_game_id: s(f, 'game_id'), p_name: s(f, 'name'), p_tag: s(f, 'tag') });
  await done(teamsUrl(f), error?.message ?? null);
}

export async function teamInviteAction(f: FormData) {
  const { sb } = await client();
  const { error } = await sb.rpc('team_invite', { p_team_id: s(f, 'team_id'), p_username: s(f, 'username') });
  await done(teamsUrl(f), error?.message ?? null);
}

export async function teamRespondAction(f: FormData) {
  const { sb } = await client();
  const { error } = await sb.rpc('team_respond', { p_team_id: s(f, 'team_id'), p_accept: s(f, 'accept') === '1' });
  await done(teamsUrl(f), error?.message ?? null);
}

export async function teamRemoveAction(f: FormData) {
  const { sb } = await client();
  const { error } = await sb.rpc('team_remove_member', { p_team_id: s(f, 'team_id'), p_user_id: s(f, 'user_id') });
  await done(teamsUrl(f), error?.message ?? null);
}

export async function playerRegisterTeam(f: FormData) {
  const { sb } = await client();
  const { data: team } = await sb.from('teams').select('name').eq('id', s(f, 'team_id')).maybeSingle();
  const code = 'rage-' + String(team?.name ?? 'team').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, '-').replace(/^-+|-+$/g, '');
  const { error } = await sb.rpc('register_team', { p_tournament_id: s(f, 'tid'), p_team_id: s(f, 'team_id'), p_registration_code: code || 'rage-team' });
  await done(play(f), error?.message ?? null);
}

export async function seedBracket(f: FormData) {
  const { sb } = await client();
  const { error } = await sb.rpc('admin_seed_bracket', { p_tournament_id: s(f, 'tid'), p_stage_order: 1 });
  await done(back(f, '/matches'), error?.message ?? null);
}

export async function saveTeamMatch(f: FormData) {
  const { sb } = await client();
  const { error } = await sb.rpc('admin_save_team_match', { p_match_id: s(f, 'match_id'), p_score_a: Number(s(f, 'score_a')), p_score_b: Number(s(f, 'score_b')) });
  await done(back(f, '/matches'), error?.message ?? null);
}


const LOGO_BUCKET = 'team-logos';
const LOGO_MAX = 2 * 1024 * 1024;

export async function saveTeamLogo(f: FormData) {
  const { sb } = await client();
  const tid = s(f, 'team_id');
  const file = f.get('logo');
  if (!(file instanceof File) || file.size === 0) return done(teamsUrl(f), 'اختار صورة الأول / Choose an image first');
  if (file.size > LOGO_MAX) return done(teamsUrl(f), 'الصورة أكبر من 2 ميجا / Image is larger than 2 MB');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return done(teamsUrl(f), 'الصيغة لازم تكون JPG أو PNG أو WebP / Image must be JPG, PNG or WebP');
  const { data: cur } = await sb.from('teams').select('logo_url').eq('id', tid).maybeSingle();
  const path = `${tid}/logo-${Date.now()}.${kind.ext}`;
  const up = await sb.storage.from(LOGO_BUCKET).upload(path, bytes, { contentType: kind.mime, cacheControl: '31536000', upsert: false });
  if (up.error) return done(teamsUrl(f), up.error.message.includes('row-level security') ? 'FORBIDDEN' : up.error.message);
  const url = sb.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
  const { data: upd, error } = await sb.from('teams').update({ logo_url: url }).eq('id', tid).select('id');
  if (error || !upd?.length) {
    await sb.storage.from(LOGO_BUCKET).remove([path]);
    return done(teamsUrl(f), error?.message ?? 'FORBIDDEN');
  }
  const m = String(cur?.logo_url ?? '').match(new RegExp(`/${LOGO_BUCKET}/([0-9a-f-]{36}/[^?#]+)`));
  if (m && m[1] !== path) await sb.storage.from(LOGO_BUCKET).remove([decodeURIComponent(m[1] as string)]);
  for (const l of ['ar', 'en']) revalidatePath(`/${l}/tournaments`, 'layout');
  await done(teamsUrl(f), null);
}

export async function removeTeamLogo(f: FormData) {
  const { sb } = await client();
  const tid = s(f, 'team_id');
  const { data: cur } = await sb.from('teams').select('logo_url').eq('id', tid).maybeSingle();
  const { data: upd, error } = await sb.from('teams').update({ logo_url: null }).eq('id', tid).select('id');
  if (error || !upd?.length) return done(teamsUrl(f), error?.message ?? 'FORBIDDEN');
  const m = String(cur?.logo_url ?? '').match(new RegExp(`/${LOGO_BUCKET}/([0-9a-f-]{36}/[^?#]+)`));
  if (m) await sb.storage.from(LOGO_BUCKET).remove([decodeURIComponent(m[1] as string)]);
  for (const l of ['ar', 'en']) revalidatePath(`/${l}/tournaments`, 'layout');
  await done(teamsUrl(f), null);
}

export async function setUserRole(f: FormData) {
  const { sb } = await client();
  const loc = s(f, 'locale') || 'ar';
  const q = s(f, 'q');
  const target = `/${loc}/admin/team${q ? `?q=${encodeURIComponent(q)}` : ''}`;
  const { error } = await sb.rpc('admin_set_role', { p_user: s(f, 'user'), p_role: s(f, 'role') });
  return done(target, error ? error.message : null);
}

export async function setTournamentRole(f: FormData) {
  const { sb } = await client();
  const slug = s(f, 'slug');
  const target = `/${s(f, 'locale') || 'ar'}/admin/${slug}`;
  const username = s(f, 'username');
  let uid = s(f, 'user');
  if (!uid) {
    const { data } = await sb.rpc('admin_list_users', { p_q: username });
    const hit = (data ?? []).find((u: { username: string; id: string }) => u.username.toLowerCase() === username.toLowerCase());
    if (!hit) return done(target, 'PLAYER_NOT_FOUND');
    uid = hit.id;
  }
  const { error } = await sb.rpc('admin_set_tournament_role', { p_tournament: s(f, 'tid'), p_user: uid, p_level: s(f, 'level') });
  return done(target, error ? error.message : null);
}

export async function setPublicName(f: FormData) {
  const { sb } = await client();
  const { error } = await sb.rpc('admin_set_public_name', {
    p_registration: s(f, 'reg_id'),
    p_name: s(f, 'name'),
    p_hidden: s(f, 'hidden') === '1'
  });
  return done(back(f, '/participants'), error ? error.message : null);
}

export async function setUserPublicName(f: FormData) {
  const { sb } = await client();
  const loc = s(f, 'locale') || 'ar';
  const q = s(f, 'q');
  const target = `/${loc}/admin/team${q ? `?q=${encodeURIComponent(q)}` : ''}`;
  const mode = s(f, 'mode');
  const name = mode === 'undo' ? null : mode === 'hide' ? null : s(f, 'name') || null;
  const hidden = mode === 'hide';
  const { error } = await sb.rpc('admin_set_user_public_name', { p_user: s(f, 'user'), p_name: name, p_hidden: hidden });
  return done(target, error ? error.message : null);
}

export async function resolveNameFlag(f: FormData) {
  const { sb } = await client();
  const loc = s(f, 'locale') || 'ar';
  const { error } = await sb.rpc('admin_resolve_name_flag', { p_flag: s(f, 'flag'), p_status: s(f, 'status') || 'dismissed' });
  return done(`/${loc}/admin/team`, error ? error.message : null);
}
