
-- Fix search_path on touch_updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- Revoke public/anon execute on security-definer helpers; allow authenticated only
revoke execute on function public.is_org_member(uuid, uuid) from public, anon;
revoke execute on function public.has_role(uuid, uuid, public.app_role) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Tighten "auth users create org" policy: must be the caller, no anonymous true
drop policy if exists "auth users create org" on public.organizations;
create policy "auth users create org" on public.organizations for insert to authenticated
  with check (auth.uid() is not null);
