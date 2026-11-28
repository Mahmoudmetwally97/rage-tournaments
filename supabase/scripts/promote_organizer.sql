-- Promote an existing signed-up account to tournament organizer.
-- Run after the person has registered through /[locale]/register (auth user + player_profiles row exist).
-- Usage: replace the email, then run in the Supabase SQL editor (or psql with the service role).
--
-- Roles live in public.user_roles (player | moderator | super_admin) and per-tournament
-- authority lives in public.tournament_admins (tournament_manager | referee | moderator).

WITH target AS (
  SELECT p.id AS profile_id
  FROM public.player_profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(u.email) = lower('mahmoudmetwally1997@gmail.com')
)
INSERT INTO public.user_roles (user_id, role)
SELECT profile_id, 'super_admin' FROM target
ON CONFLICT (user_id, role) DO NOTHING;

WITH target AS (
  SELECT p.id AS profile_id
  FROM public.player_profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(u.email) = lower('mahmoudmetwally1997@gmail.com')
)
INSERT INTO public.tournament_admins (tournament_id, user_id, role, assigned_by)
SELECT t.id, target.profile_id, 'tournament_manager', target.profile_id
FROM target
CROSS JOIN public.tournaments t
WHERE t.slug = 'rage-cup'
ON CONFLICT (tournament_id, user_id, role) DO NOTHING;

-- Verify:
SELECT u.email, r.role
FROM public.user_roles r
JOIN public.player_profiles p ON p.id = r.user_id
JOIN auth.users u ON u.id = p.id
WHERE lower(u.email) = lower('mahmoudmetwally1997@gmail.com');
