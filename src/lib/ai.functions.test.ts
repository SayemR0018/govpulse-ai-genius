import { describe, expect, it } from "bun:test";

interface SupabaseUpdateResult {
  data: Array<{ id: string }> | null;
  error: { message: string } | null;
}

describe("AI functions RLS security", () => {
  it("fails generateSectionDraft when update returns 0 updated rows due to RLS restriction", async () => {
    const mockSupabaseDenied = {
      from: (table: string) => {
        if (table === "proposal_sections") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { section_name: "Technical Approach", rfp_id: "rfp-1" },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: () => ({
                select: async (): Promise<SupabaseUpdateResult> => ({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === "rfp_requirements") {
          return {
            select: () => ({
              eq: () => ({
                limit: async () => ({ data: [], error: null }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    };

    const updateCheck = async () => {
      const { data: updatedRows, error: updateErr } = await mockSupabaseDenied
        .from("proposal_sections")
        .update()
        .eq()
        .select();
      if (updateErr || !updatedRows || updatedRows.length === 0) {
        throw new Error(updateErr?.message || "Unauthorized or section not found");
      }
    };

    expect(updateCheck()).rejects.toThrow("Unauthorized or section not found");
  });

  it("fails scoreCompliance when update returns 0 updated rows due to RLS restriction", async () => {
    const mockSupabaseDenied = {
      from: (table: string) => {
        if (table === "proposal_sections") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    section_name: "Technical Approach",
                    ai_draft: "draft",
                    human_edits: null,
                    rfp_id: "rfp-1",
                  },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: () => ({
                select: async (): Promise<SupabaseUpdateResult> => ({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === "rfp_requirements") {
          return {
            select: () => ({
              eq: async () => ({ data: [], error: null }),
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    };

    const updateCheck = async () => {
      const { data: updatedRows, error: updateErr } = await mockSupabaseDenied
        .from("proposal_sections")
        .update()
        .eq()
        .select();
      if (updateErr || !updatedRows || updatedRows.length === 0) {
        throw new Error(updateErr?.message || "Unauthorized or section not found");
      }
    };

    expect(updateCheck()).rejects.toThrow("Unauthorized or section not found");
  });
});
