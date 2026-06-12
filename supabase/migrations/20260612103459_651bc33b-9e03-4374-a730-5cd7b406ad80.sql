
create or replace function public.log_rfp_activity()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.activity_log (org_id, actor, message)
      values (new.org_id, 'system', 'New RFP created: ' || new.title);
  elsif TG_OP = 'UPDATE' and new.status is distinct from old.status then
    insert into public.activity_log (org_id, actor, message)
      values (new.org_id, 'system', new.title || ' moved to ' || new.status::text);
  end if;
  return new;
end $$;

create or replace function public.log_section_activity()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  org uuid;
begin
  select r.org_id into org from public.rfp_projects r where r.id = new.rfp_id;
  if org is null then return new; end if;
  if TG_OP = 'INSERT' then
    insert into public.activity_log (org_id, actor, message)
      values (org, 'AI', 'Section drafted: ' || new.section_name);
  elsif TG_OP = 'UPDATE' and new.compliance_status is distinct from old.compliance_status then
    insert into public.activity_log (org_id, actor, message)
      values (org, 'auditor', new.section_name || ' marked ' || new.compliance_status::text);
  end if;
  return new;
end $$;
