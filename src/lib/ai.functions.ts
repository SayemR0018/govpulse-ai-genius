import { createServerFn } from "@tanstack/react-start";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const requirementSchema = z.object({
  text_snippet: z.string(),
  risk_level: z.enum(["high", "med", "low"]),
});

export const extractRequirements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ rfpId: z.string().uuid(), documentText: z.string().min(20).max(100000) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");
    try {
      const { createLovableAiGatewayProvider, DEFAULT_MODEL } =
        await import("@/lib/ai-gateway.server");
      const gateway = createLovableAiGatewayProvider(key);
      const sanitizedDoc = data.documentText.slice(0, 15000).trim();
      const { object } = await generateObject({
        model: gateway(DEFAULT_MODEL),
        schema: z.object({ requirements: z.array(requirementSchema).max(40) }),
        prompt: `You are a federal proposal compliance analyst. Extract distinct, atomic compliance requirements from the following RFP/SOW text. For each, classify risk level: high (mandatory shall/must, certifications, deadlines, security), med (should, expected qualifications), low (informational, preferences).\n\nDOCUMENT:\n${sanitizedDoc}`,
      });

      const rows = object.requirements.map((r) => ({
        rfp_id: data.rfpId,
        text_snippet: r.text_snippet,
        risk_level: r.risk_level,
        status: "pending" as const,
      }));
      if (rows.length === 0) return { count: 0 };
      const { error } = await context.supabase.from("rfp_requirements").insert(rows);
      if (error) throw new Error(error.message);
      return { count: rows.length };
    } catch (err) {
      console.error("[AI Functions] extractRequirements failed:", err);
      throw new Error(err instanceof Error ? err.message : "Failed to extract requirements");
    }
  });

export const generateSectionDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({ sectionId: z.string().uuid(), instructions: z.string().max(2000).optional() })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");
    const { data: section, error } = await context.supabase
      .from("proposal_sections")
      .select("section_name, rfp_id")
      .eq("id", data.sectionId)
      .single();
    if (error || !section) throw new Error("Section not found");

    try {
      const { data: reqs } = await context.supabase
        .from("rfp_requirements")
        .select("text_snippet, risk_level")
        .eq("rfp_id", section.rfp_id)
        .limit(20);
      const reqList = (reqs ?? []).map((r) => `- [${r.risk_level}] ${r.text_snippet}`).join("\n");
      const { createLovableAiGatewayProvider, DEFAULT_MODEL } =
        await import("@/lib/ai-gateway.server");
      const gateway = createLovableAiGatewayProvider(key);
      const { text: draft } = await generateText({
        model: gateway(DEFAULT_MODEL),
        system:
          "You are an expert federal proposal writer. Use clear, evidence-driven prose. Avoid filler.",
        prompt: `Write a concise, persuasive draft for the proposal section titled "${section.section_name}". Address these requirements:\n${reqList}\n\n${data.instructions ?? ""}`,
      });
      const { data: updatedRows, error: updateError } = await context.supabase
        .from("proposal_sections")
        .update({ ai_draft: draft })
        .eq("id", data.sectionId)
        .select("id");
      if (updateError || !updatedRows || updatedRows.length === 0) {
        throw new Error(updateError?.message || "Unauthorized or section not found");
      }
      return { draft };
    } catch (err) {
      console.error("[AI Functions] generateSectionDraft failed:", err);
      throw new Error(err instanceof Error ? err.message : "Failed to generate draft");
    }
  });

export const improveTone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        text: z.string().min(1).max(20000),
        tone: z.string().max(100).default("authoritative and concise"),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");
    try {
      const { createLovableAiGatewayProvider, DEFAULT_MODEL } =
        await import("@/lib/ai-gateway.server");
      const gateway = createLovableAiGatewayProvider(key);
      const { text: out } = await generateText({
        model: gateway(DEFAULT_MODEL),
        system: "You are an expert proposal editor. Return only the rewritten text — no preamble.",
        prompt: `Rewrite the following passage in a ${data.tone} tone, preserving meaning and length:\n\n${data.text}`,
      });
      return { text: out };
    } catch (err) {
      console.error("[AI Functions] improveTone failed:", err);
      throw new Error(err instanceof Error ? err.message : "Failed to rewrite tone");
    }
  });

export const autocomplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ precedingText: z.string().min(1).max(50000) }).parse(i),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");
    try {
      const { createLovableAiGatewayProvider, DEFAULT_MODEL } =
        await import("@/lib/ai-gateway.server");
      const gateway = createLovableAiGatewayProvider(key);
      const { text: out } = await generateText({
        model: gateway(DEFAULT_MODEL),
        system: "You are a proposal-writing assistant.",
        prompt: `Continue the following proposal passage with 1-2 additional sentences. Maintain voice. Return only the new sentences:\n\n${data.precedingText.slice(-1500)}`,
      });
      return { text: out };
    } catch (err) {
      console.error("[AI Functions] autocomplete failed:", err);
      throw new Error(err instanceof Error ? err.message : "Failed to generate completion");
    }
  });

export const scoreCompliance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ sectionId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: section } = await context.supabase
      .from("proposal_sections")
      .select("section_name, ai_draft, human_edits, rfp_id")
      .eq("id", data.sectionId)
      .single();
    if (!section) throw new Error("not found");

    try {
      const { data: reqs } = await context.supabase
        .from("rfp_requirements")
        .select("text_snippet, risk_level")
        .eq("rfp_id", section.rfp_id);
      const key = process.env.LOVABLE_API_KEY;
      if (!key) throw new Error("LOVABLE_API_KEY missing");
      const { createLovableAiGatewayProvider, DEFAULT_MODEL } =
        await import("@/lib/ai-gateway.server");
      const gateway = createLovableAiGatewayProvider(key);
      const draftContent = (section.human_edits || section.ai_draft || "(empty)").slice(0, 15000);
      const { object } = await generateObject({
        model: gateway(DEFAULT_MODEL),
        schema: z.object({ score: z.number().min(0).max(100), gaps: z.array(z.string()).max(8) }),
        prompt: `Score how well this draft addresses the requirements (0-100) and list specific gaps.\nREQUIREMENTS:\n${(reqs ?? []).map((r) => `- [${r.risk_level}] ${r.text_snippet}`).join("\n")}\n\nDRAFT:\n${draftContent}`,
      });
      const { data: updatedRows, error: updateError } = await context.supabase
        .from("proposal_sections")
        .update({ compliance_score: object.score })
        .eq("id", data.sectionId)
        .select("id");
      if (updateError || !updatedRows || updatedRows.length === 0) {
        throw new Error(updateError?.message || "Unauthorized or section not found");
      }
      return object;
    } catch (err) {
      console.error("[AI Functions] scoreCompliance failed:", err);
      throw new Error(err instanceof Error ? err.message : "Failed to score compliance");
    }
  });
