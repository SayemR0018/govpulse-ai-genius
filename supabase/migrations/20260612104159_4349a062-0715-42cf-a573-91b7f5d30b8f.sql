CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  new_org_id uuid;
  display text;
  new_rfp_id uuid;
  seeds record;
  defaults text[] := array['Executive Summary','Technical Approach','Past Performance','Pricing','Compliance Matrix'];
  section_name text;
  idx int;
begin
  display := coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1));

  insert into public.organizations (name) values (display || '''s Organization')
    returning id into new_org_id;

  insert into public.profiles (id, display_name, current_org_id, current_role_preview)
    values (new.id, display, new_org_id, 'proposal_manager');

  insert into public.org_members (org_id, user_id) values (new_org_id, new.id);

  insert into public.user_roles (user_id, org_id, role) values
    (new.id, new_org_id, 'proposal_manager'),
    (new.id, new_org_id, 'sme'),
    (new.id, new_org_id, 'compliance_auditor');

  -- Seed 6 realistic RFPs across all 5 status columns
  for seeds in
    select * from (values
      ('DoD Cloud Migration Services',         'Department of Defense',         2400000, 21, 'ingestion'::rfp_status, 0),
      ('HHS Data Analytics Platform',          'Health & Human Services',       1850000, 35, 'parsing'::rfp_status,   15),
      ('GSA Zero-Trust Network Modernization', 'General Services Administration',3200000, 42, 'drafting'::rfp_status,  68),
      ('VA Patient Portal Redesign',           'Veterans Affairs',               950000, 14, 'drafting'::rfp_status,  45),
      ('NASA Mission Control SaaS',            'NASA',                          5400000, 56, 'review'::rfp_status,    82),
      ('Treasury Fraud Detection AI',          'Department of Treasury',        2750000, -7, 'submitted'::rfp_status, 74)
    ) as t(title, agency, budget, due_offset, status, win_prob)
  loop
    insert into public.rfp_projects (org_id, title, issuing_agency, budget, due_date, status, win_probability, created_by)
    values (new_org_id, seeds.title, seeds.agency, seeds.budget, (now()::date + (seeds.due_offset || ' days')::interval)::date, seeds.status, seeds.win_prob, new.id)
    returning id into new_rfp_id;

    idx := 0;
    foreach section_name in array defaults loop
      insert into public.proposal_sections (rfp_id, section_name, order_index)
      values (new_rfp_id, section_name, idx);
      idx := idx + 1;
    end loop;
  end loop;

  -- Seed a few content library items
  insert into public.content_library (org_id, title, content_body, tags, created_by, reuse_count) values
    (new_org_id, 'Company Overview Boilerplate', 'Founded in 2014, our firm delivers mission-critical software to federal agencies with an unmatched record of on-time, on-budget delivery.', array['boilerplate','company'], new.id, 12),
    (new_org_id, 'FedRAMP Moderate ATO Statement', 'Our platform holds an active FedRAMP Moderate Authorization to Operate, sponsored by the Department of Homeland Security since 2022.', array['compliance','fedramp'], new.id, 9),
    (new_org_id, 'Past Performance — HHS Modernization', 'Delivered $14M modernization for HHS spanning 18 months, completed 6 weeks ahead of schedule with zero P1 incidents in production.', array['past-performance'], new.id, 7);

  return new;
end $function$;