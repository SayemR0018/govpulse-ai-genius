import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).single(),
      context.supabase.from("user_roles").select("role, org_id").eq("user_id", context.userId),
    ]);

    // Multi-tenant isolation: filter organizations explicitly by the user's assigned org_ids
    // to prevent cross-tenant data leakage of unassigned organization metadata.
    const userRoles = roles ?? [];
    const orgIds = [
      ...new Set(userRoles.map((r) => r.org_id).filter((id): id is string => Boolean(id))),
    ];

    let orgs: { id: string; name: string; plan_tier: string }[] = [];
    if (orgIds.length > 0) {
      const { data } = await context.supabase
        .from("organizations")
        .select("id, name, plan_tier")
        .in("id", orgIds);
      orgs = data ?? [];
    }

    return { profile, orgs, roles: userRoles, userId: context.userId };
  });

export const setRolePreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ role: z.enum(["proposal_manager", "sme", "compliance_auditor"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: updatedRows, error } = await context.supabase
      .from("profiles")
      .update({ current_role_preview: data.role })
      .eq("id", context.userId)
      .select("id");
    if (error || !updatedRows || updatedRows.length === 0) {
      throw new Error(error?.message || "Unauthorized or profile not found");
    }
    return { ok: true };
  });

export const listRfps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("rfp_projects")
      .select("*")
      .order("due_date", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getRfp = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ rfpId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    // Validate RFP access first to enforce authorization boundary and acquire org_id
    const rfp = await context.supabase
      .from("rfp_projects")
      .select("*")
      .eq("id", data.rfpId)
      .single();
    if (rfp.error || !rfp.data) throw new Error(rfp.error?.message ?? "RFP not found");

    // Scope org_members specifically to the RFP's organization to prevent cross-org member leakage
    const [reqs, sections, members] = await Promise.all([
      context.supabase
        .from("rfp_requirements")
        .select("*")
        .eq("rfp_id", data.rfpId)
        .order("created_at"),
      context.supabase
        .from("proposal_sections")
        .select("*")
        .eq("rfp_id", data.rfpId)
        .order("order_index"),
      context.supabase.from("org_members").select("user_id").eq("org_id", rfp.data.org_id),
    ]);
    return {
      rfp: rfp.data,
      requirements: reqs.data ?? [],
      sections: sections.data ?? [],
      memberIds: (members.data ?? []).map((m) => m.user_id),
    };
  });

export const createRfp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        title: z.string().min(2),
        issuing_agency: z.string().optional(),
        budget: z.number().optional(),
        due_date: z.string().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("current_org_id")
      .eq("id", context.userId)
      .single();
    if (!prof?.current_org_id) throw new Error("No active org");
    const { data: row, error } = await context.supabase
      .from("rfp_projects")
      .insert({
        org_id: prof.current_org_id,
        title: data.title,
        issuing_agency: data.issuing_agency,
        budget: data.budget,
        due_date: data.due_date,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    // Seed default sections
    const defaults = [
      "Executive Summary",
      "Technical Approach",
      "Past Performance",
      "Pricing",
      "Compliance Matrix",
    ];
    await context.supabase
      .from("proposal_sections")
      .insert(defaults.map((n, i) => ({ rfp_id: row.id, section_name: n, order_index: i })));
    await context.supabase.from("activity_log").insert({
      org_id: prof.current_org_id,
      actor: "System",
      message: `New RFP "${data.title}" created`,
    });
    return row;
  });

export const updateRfpStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        rfpId: z.string().uuid(),
        status: z.enum(["ingestion", "parsing", "drafting", "review", "submitted"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: updatedRows, error } = await context.supabase
      .from("rfp_projects")
      .update({ status: data.status })
      .eq("id", data.rfpId)
      .select("id");
    if (error || !updatedRows || updatedRows.length === 0) {
      throw new Error(error?.message || "Unauthorized or RFP not found");
    }
    return { ok: true };
  });

export const assignRequirement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ requirementId: z.string().uuid(), userId: z.string().uuid().nullable() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: updatedRows, error } = await context.supabase
      .from("rfp_requirements")
      .update({ assigned_user_id: data.userId })
      .eq("id", data.requirementId)
      .select("id");
    if (error || !updatedRows || updatedRows.length === 0) {
      throw new Error(error?.message || "Unauthorized or requirement not found");
    }
    return { ok: true };
  });

export const updateRequirementStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({ requirementId: z.string().uuid(), status: z.enum(["pending", "met", "warning"]) })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: updatedRows, error } = await context.supabase
      .from("rfp_requirements")
      .update({ status: data.status })
      .eq("id", data.requirementId)
      .select("id");
    if (error || !updatedRows || updatedRows.length === 0) {
      throw new Error(error?.message || "Unauthorized or requirement not found");
    }
    return { ok: true };
  });

export const saveSectionEdits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ sectionId: z.string().uuid(), content: z.string() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: cur } = await context.supabase
      .from("proposal_sections")
      .select("version_number")
      .eq("id", data.sectionId)
      .single();
    const nextVersion = (cur?.version_number ?? 1) + 1;
    // Update the section first — RLS will reject unauthorized editors. Only after
    // a successful update do we record a version, so unauthorized callers can never
    // pollute section_versions with phantom history.
    // Check update result with .select("id") to ensure RLS permitted update before creating history
    const { data: updatedRows, error } = await context.supabase
      .from("proposal_sections")
      .update({ human_edits: data.content, version_number: nextVersion })
      .eq("id", data.sectionId)
      .select("id");
    if (error || !updatedRows || updatedRows.length === 0) {
      throw new Error(error?.message || "Unauthorized or section not found");
    }
    const { error: vErr } = await context.supabase.from("section_versions").insert({
      section_id: data.sectionId,
      content: data.content,
      version_number: nextVersion,
      created_by: context.userId,
    });
    if (vErr) throw new Error(vErr.message);
    return { ok: true, version: nextVersion };
  });

export const updateSectionCompliance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        sectionId: z.string().uuid(),
        compliance_status: z.enum(["draft", "approved", "rejected", "needs_review"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: updatedRows, error } = await context.supabase
      .from("proposal_sections")
      .update({ compliance_status: data.compliance_status })
      .eq("id", data.sectionId)
      .select("id");
    if (error || !updatedRows || updatedRows.length === 0) {
      throw new Error(error?.message || "Unauthorized or section not found");
    }
    return { ok: true };
  });

export const listComments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ sectionId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("workspace_comments")
      .select("*")
      .eq("section_id", data.sectionId)
      .order("created_at", { ascending: true });
    return rows ?? [];
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ sectionId: z.string().uuid(), text: z.string().min(1).max(2000) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workspace_comments")
      .insert({ section_id: data.sectionId, user_id: context.userId, text: data.text });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ sectionId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("section_versions")
      .select("*")
      .eq("section_id", data.sectionId)
      .order("version_number", { ascending: false });
    return rows ?? [];
  });

export const listActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    return data ?? [];
  });

export const listLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("content_library")
      .select("*")
      .order("reuse_count", { ascending: false });
    return data ?? [];
  });

export const createLibraryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        title: z.string().min(1),
        content_body: z.string().min(1),
        tags: z.array(z.string()).default([]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("current_org_id")
      .eq("id", context.userId)
      .single();
    if (!prof?.current_org_id) throw new Error("No active org");
    const { error } = await context.supabase.from("content_library").insert({
      org_id: prof.current_org_id,
      title: data.title,
      content_body: data.content_body,
      tags: data.tags,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDashboardKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: activeRfps }, { count: flagsCount }] = await Promise.all([
      context.supabase
        .from("rfp_projects")
        .select("budget, win_probability, due_date")
        .neq("status", "submitted"),
      context.supabase
        .from("rfp_requirements")
        .select("*", { count: "exact", head: true })
        .neq("status", "met")
        .eq("risk_level", "high"),
    ]);

    const active = activeRfps ?? [];
    const totalValue = active.reduce((s, r) => s + Number(r.budget ?? 0), 0);
    const avgWin =
      active.length === 0
        ? 0
        : Math.round(
            active.reduce((s, r) => s + Number(r.win_probability ?? 0), 0) / active.length,
          );
    const flags = flagsCount ?? 0;
    const today = new Date();
    const upcoming = active
      .map((r) =>
        r.due_date
          ? Math.ceil((new Date(r.due_date).getTime() - today.getTime()) / 86400000)
          : null,
      )
      .filter((n): n is number => n !== null && n >= 0)
      .sort((a, b) => a - b)[0];
    return { totalValue, avgWin, flags, daysToNearest: upcoming ?? null };
  });
