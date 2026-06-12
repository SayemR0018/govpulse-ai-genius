
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
  secs record;
  reqs record;
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

  for seeds in
    select * from (values
      ('DoD Cybersecurity Infrastructure Modernization FY2025', 'Department of Defense',          12000000, 45, 'drafting'::rfp_status,   72),
      ('NASA Ground Systems Modernization Initiative',          'NASA',                            8500000, 30, 'review'::rfp_status,     84),
      ('HHS Patient Data Analytics Platform',                   'Health & Human Services',         3200000, 60, 'ingestion'::rfp_status,   8),
      ('DHS Border Security AI Command Center',                 'Department of Homeland Security',25000000, 15, 'submitted'::rfp_status,  91),
      ('GSA Federal Procurement Automation Suite',              'General Services Administration', 1800000, 75, 'parsing'::rfp_status,    22),
      ('DoE Smart Grid Resilience & Monitoring',                'Department of Energy',            5500000, 90, 'drafting'::rfp_status,   65)
    ) as t(title, agency, budget, due_offset, status, win_prob)
  loop
    insert into public.rfp_projects (org_id, title, issuing_agency, budget, due_date, status, win_probability, created_by)
    values (new_org_id, seeds.title, seeds.agency, seeds.budget, (now()::date + (seeds.due_offset || ' days')::interval)::date, seeds.status, seeds.win_prob, new.id)
    returning id into new_rfp_id;

    for secs in
      select * from (values
        (0, 'Executive Summary', 75,
         'Our team delivers a turnkey solution purpose-built for ' || seeds.agency || ', combining FedRAMP Moderate authorized infrastructure with a proven track record of on-time, on-budget federal program delivery. We propose an integrated approach that aligns directly with the objectives stated in the ' || seeds.title || ' solicitation, anchored by a senior leadership team with more than 75 years of combined civilian and DoD program experience. Our methodology emphasizes zero-trust security architecture, continuous ATO automation, and measurable mission outcomes within the first 90 days of award. We have assembled a small-business led team with cleared personnel, FedRAMP-aligned tooling, and a transition plan engineered to eliminate operational risk while delivering immediate value to the contracting officer and the end-user community.'),
        (1, 'Technical Approach', 82,
         'Our technical approach is built on a microservices reference architecture deployed across two FedRAMP Moderate regions with active-active failover and a documented RTO of fifteen minutes. We will instrument every workload with OpenTelemetry, integrate with the agency''s existing SIEM, and provide STIG-hardened container images on day one. The solution leverages event-driven processing, infrastructure-as-code with Terraform, and policy-as-code with OPA to ensure every change is reviewable, auditable, and reversible. Our cybersecurity posture is anchored in NIST SP 800-53 Rev 5 controls inherited from our authorized platform, with custom controls layered for the unique mission profile of ' || seeds.agency || '. We will deliver a fully functional MVP within 120 days and a production-ready system within nine months, with quarterly independent verification and validation by an accredited 3PAO.'),
        (2, 'Past Performance', 88,
         'Over the past five years our firm has executed seventeen federal contracts totaling over $180M with a customer satisfaction rating averaging 4.7 of 5 across all CPARS evaluations. Directly relevant engagements include a $14M HHS modernization completed six weeks ahead of schedule with zero P1 incidents, a $22M DHS analytics platform that achieved ATO in under nine months, and a $9M GSA procurement automation that reduced cycle time by 64%. Each of these programs required navigating complex stakeholder environments, integrating with legacy mainframe systems, and delivering measurable outcomes on aggressive timelines — the same conditions that define ' || seeds.title || '. References from contracting officers and program managers are available upon request and confirm our consistent ability to exceed performance targets.'),
        (3, 'Pricing & Compliance Matrix', 69,
         'We propose a firm-fixed-price structure of $' || to_char(seeds.budget, 'FM999,999,999') || ' inclusive of all labor, infrastructure, security accreditation, and three years of operations and maintenance. Our pricing reflects a 12% discount versus the GSA Schedule rate and includes a not-to-exceed surge capacity of twenty additional FTE for mission-critical events. The attached compliance matrix maps every Section L and M requirement to a specific paragraph in this proposal, the responsible team member, the supporting evidence, and the verification method. All mandatory personnel hold active clearances at the level required by the SOW, and all proposed software components are listed on the DoD-approved products list or have a documented pathway to inclusion within ninety days of award.')
      ) as t(idx, name, score, draft)
    loop
      insert into public.proposal_sections (rfp_id, section_name, order_index, ai_draft, compliance_score)
      values (new_rfp_id, secs.name, secs.idx, secs.draft, secs.score);
    end loop;

    for reqs in
      select * from (values
        ('Contractor shall maintain a FedRAMP Moderate Authorization to Operate for all systems processing CUI throughout the period of performance.', 'high'::risk_level),
        ('Key personnel must hold an active Secret clearance and a minimum of seven years of relevant federal program experience.',                'high'::risk_level),
        ('Vendor should provide monthly performance dashboards with mission KPIs delivered to the contracting officer and program manager.',         'med'::risk_level)
      ) as t(text_snippet, risk)
    loop
      insert into public.rfp_requirements (rfp_id, text_snippet, risk_level, status)
      values (new_rfp_id, reqs.text_snippet, reqs.risk, 'pending');
    end loop;
  end loop;

  insert into public.content_library (org_id, title, content_body, tags, created_by, reuse_count) values
    (new_org_id, 'Company Overview Boilerplate', 'Founded in 2014, our firm delivers mission-critical software to federal agencies with an unmatched record of on-time, on-budget delivery across DoD, DHS, HHS, and civilian programs.', array['boilerplate','company'], new.id, 12),
    (new_org_id, 'FedRAMP Moderate ATO Statement', 'Our platform holds an active FedRAMP Moderate Authorization to Operate, sponsored by the Department of Homeland Security since 2022 and continuously monitored under the Joint Authorization Board process.', array['compliance','fedramp'], new.id, 9),
    (new_org_id, 'Past Performance — HHS Modernization', 'Delivered a $14M modernization for HHS spanning 18 months, completed 6 weeks ahead of schedule with zero P1 incidents in production and a CPARS rating of Exceptional.', array['past-performance'], new.id, 7);

  return new;
end $function$;
