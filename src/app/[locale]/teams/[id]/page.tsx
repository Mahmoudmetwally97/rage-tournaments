import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n/dictionaries';
import { tr } from '@/lib/admin';
import { getCurrentUser, getSupabaseServerClient } from '@/lib/supabase/server';
import { Btn, Card, Flash, Hidden, Pill, inputCls } from '@/components/admin/ui';
import { TeamLogo } from '@/components/tournaments/TeamLogo';
import { CountrySelect, ImageInput, Label } from '@/components/profile/Fields';
import { countryName, flag } from '@/lib/countries';
import { removeTeamImage, saveTeamProfile } from '../../profile-actions';
import { teamInviteAction, teamRemoveAction } from '../../admin/actions';

export const dynamic = 'force-dynamic';

type Team = { id: string; name: string; tag: string; logo_url: string | null; cover_url: string | null; country: string | null; description: string | null; contact_email: string | null; captain_id: string; captain_username: string; member_count: number; game_name_en: string; game_name_ar: string; created_at: string };
type Member = { user_id: string; username: string; invite_status?: string; avatar_url?: string | null };

export default async function TeamProfilePage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { locale: l, id } = await params;
  const sp = await searchParams;
  if (!isValidLocale(l) || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const locale = l as 'ar' | 'en';
  const supabase = await getSupabaseServerClient();
  if (!supabase) notFound();
  const user = await getCurrentUser();
  const { data: tdata } = await supabase.rpc('public_team', { p_team: id });
  const team = (tdata as Team[] | null)?.[0];
  if (!team) notFound();
  const isCap = !!user && user.id === team.captain_id;
  let members: Member[] = [];
  if (user) {
    const { data } = await supabase.rpc('team_roster', { p_team_id: id });
    members = (data ?? []) as Member[];
  }
  const { data: pub } = await supabase.rpc('team_members_public', { p_team: id });
  const accepted = (pub ?? []) as Member[];
  if (!members.length) members = accepted.map((m) => ({ ...m, invite_status: 'accepted' }));
  const avatars = new Map(accepted.map((m) => [m.user_id, m.avatar_url]));
  const back = `/${locale}/teams/${id}`;
  const count = members.filter((m) => m.invite_status === 'accepted').length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <Link href={`/${locale}/teams`} className="text-xs font-bold text-[#a4a6aa] hover:text-[#e5ed43]">← {tr(locale, 'تيماتي', 'My teams')}</Link>
      <Flash ok={sp.ok} err={sp.err} />
      <section className="clip-card overflow-hidden border border-[#2b2d30] bg-[#101113]">
        <div className="relative h-36 bg-[#16171a] sm:h-48">
          {team.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.cover_url} alt="" className="h-full w-full object-cover" />
          ) : <div className="h-full w-full bg-[linear-gradient(135deg,#16171a,#1d1f12)]" />}
          <div className="absolute inset-0 bg-gradient-to-t from-[#101113] to-transparent" />
        </div>
        <div className="-mt-12 flex flex-wrap items-end gap-4 px-5 pb-5">
          <div className="rounded-sm border-4 border-[#101113] bg-[#101113]"><TeamLogo src={team.logo_url} tag={team.tag} size={96} /></div>
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="truncate text-2xl font-extrabold text-[#f4f4ed] sm:text-3xl">{team.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-[#a4a6aa]">
              <span className="ltr-isolate text-[#e5ed43]">[{team.tag}]</span>
              <span>{locale === 'ar' ? team.game_name_ar : team.game_name_en}</span>
              {team.country && <span>{flag(team.country)} {countryName(team.country, locale)}</span>}
              <span>{team.member_count} {tr(locale, 'عضو', 'members')}</span>
              <span>{tr(locale, 'القائد:', 'Leader:')} <Link className="text-[#f4f4ed] hover:text-[#e5ed43]" href={`/${locale}/u/${team.captain_username}`}>{team.captain_username}</Link></span>
            </p>
          </div>
        </div>
        {(team.description || team.contact_email) && (
          <div className="border-t border-[#2b2d30] px-5 py-4 text-sm text-[#d6d7d2]">
            {team.description && <p className="whitespace-pre-line">{team.description}</p>}
            {team.contact_email && <p className="mt-2 text-xs text-[#a4a6aa]">{tr(locale, 'تواصل:', 'Contact:')} <span className="ltr-isolate text-[#f4f4ed]">{team.contact_email}</span></p>}
          </div>
        )}
      </section>

      <Card title={tr(locale, 'التشكيلة', 'Roster')} right={<Pill on={count >= 5}>{count}/7</Pill>}>
        <ul className="divide-y divide-[#2b2d30]">
          {members.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span className="flex items-center gap-2 text-[#f4f4ed]">
                <TeamLogo src={avatars.get(m.user_id) ?? m.avatar_url} tag={m.username} size={28} />
                <Link href={`/${locale}/u/${m.username}`} className="hover:text-[#e5ed43]">{m.username}</Link>
                {m.user_id === team.captain_id && <Pill on>{tr(locale, 'القائد', 'Leader')}</Pill>}
                {m.invite_status === 'pending' && <Pill>{tr(locale, 'دعوة معلقة', 'Invite pending')}</Pill>}
              </span>
              {isCap && m.user_id !== team.captain_id && (
                <form action={teamRemoveAction}><Hidden values={{ locale, team_id: id, user_id: m.user_id, back }} /><Btn tone="danger">{tr(locale, 'إزالة', 'Remove')}</Btn></form>
              )}
            </li>
          ))}
        </ul>
        {isCap && (
          <>
            <form action={teamInviteAction} className="mt-3 flex flex-wrap gap-2">
              <Hidden values={{ locale, team_id: id, back }} />
              <input name="username" required dir="ltr" autoComplete="off" placeholder={tr(locale, 'يوزر اللاعب على الموقع (مثال: maxx_cf)', 'Player username on the site (e.g. maxx_cf)')} className={`${inputCls} w-full max-w-xs`} />
              <Btn tone="primary">{tr(locale, 'ادعُ لاعب', 'Invite player')}</Btn>
            </form>
            {count < 5 && <p className="mt-2 text-[11px] text-[#6f7276]">{tr(locale, 'محتاج 5 لاعبين قبلوا الدعوة عشان تسجل في بطولة.', 'You need 5 accepted players to register for a tournament.')}</p>}
          </>
        )}
      </Card>

      {isCap && (
        <Card title={tr(locale, 'تعديل بيانات التيم', 'Edit team')}>
          <form action={saveTeamProfile} className="space-y-4">
            <Hidden values={{ locale, team_id: id }} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>{tr(locale, 'اللوجو', 'Logo')}</Label><ImageInput name="logo" locale={locale} hint="500 × 500 px" /></div>
              <div><Label>{tr(locale, 'الكوفر', 'Cover')}</Label><ImageInput name="cover" locale={locale} hint="1920 × 480 px" /></div>
              <div><Label>{tr(locale, 'البلد', 'Country')}</Label><CountrySelect locale={locale} value={team.country} /></div>
              <div><Label>{tr(locale, 'إيميل التواصل', 'Contact email')}</Label><input name="contact_email" type="email" dir="ltr" defaultValue={team.contact_email ?? ''} className={inputCls} /></div>
            </div>
            <div><Label>{tr(locale, 'الوصف', 'Description')}</Label><textarea name="description" rows={4} maxLength={500} defaultValue={team.description ?? ''} className={inputCls} /></div>
            <Btn tone="primary">{tr(locale, 'حفظ', 'Save')}</Btn>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {team.logo_url && <form action={removeTeamImage}><Hidden values={{ locale, team_id: id, kind: 'logo' }} /><Btn tone="danger">{tr(locale, 'شيل اللوجو', 'Remove logo')}</Btn></form>}
            {team.cover_url && <form action={removeTeamImage}><Hidden values={{ locale, team_id: id, kind: 'cover' }} /><Btn tone="danger">{tr(locale, 'شيل الكوفر', 'Remove cover')}</Btn></form>}
          </div>
        </Card>
      )}
    </div>
  );
}
