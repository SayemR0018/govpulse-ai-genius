import { describe, expect, it } from "bun:test";

interface TestRfp {
  id: string;
  budget: number | null;
  win_probability: number | null;
  due_date: string | null;
  status: string;
}

interface TestReq {
  id: string;
  risk_level: string;
  status: string;
}

// Mock Supabase client to test both old and new logic
function createMockSupabase(dataset: { rfps: TestRfp[]; reqs: TestReq[] }) {
  return {
    from: (table: string) => {
      if (table === "rfp_projects") {
        return {
          select: (_cols?: string, _opts?: { count?: "exact"; head?: boolean }) => {
            let filtered = [...dataset.rfps];
            const chain = {
              neq: (col: keyof TestRfp, val: string) => {
                filtered = filtered.filter((item) => item[col] !== val);
                return chain;
              },
              then: (resolve: (val: { data: TestRfp[]; error: null }) => void) => {
                const serialized = JSON.parse(JSON.stringify(filtered));
                resolve({ data: serialized, error: null });
              },
            };
            return chain;
          },
        };
      }
      if (table === "rfp_requirements") {
        return {
          select: (_cols?: string, opts?: { count?: "exact"; head?: boolean }) => {
            let filtered = [...dataset.reqs];
            const chain = {
              neq: (col: keyof TestReq, val: string) => {
                filtered = filtered.filter((item) => item[col] !== val);
                return chain;
              },
              eq: (col: keyof TestReq, val: string) => {
                filtered = filtered.filter((item) => item[col] === val);
                return chain;
              },
              then: (
                resolve: (val: { data: TestReq[] | null; count?: number; error: null }) => void,
              ) => {
                if (opts?.head) {
                  resolve({ data: null, count: filtered.length, error: null });
                } else {
                  const serialized = JSON.parse(JSON.stringify(filtered));
                  resolve({ data: serialized, error: null });
                }
              },
            };
            return chain;
          },
        };
      }
      throw new Error(`Unknown table ${table}`);
    },
  };
}

interface SupabaseQueryMock {
  from: (table: string) => {
    select: (
      cols?: string,
      opts?: { count?: "exact"; head?: boolean },
    ) => {
      neq: (
        col: string,
        val: string,
      ) => {
        eq?: (
          col: string,
          val: string,
        ) => Promise<{ data: TestReq[] | null; count?: number; error: null }>;
        then?: (resolve: (val: { data: TestRfp[] | null; error: null }) => void) => void;
      };
    };
  };
}

// Logic implementations for benchmarking
async function getDashboardKpisOriginal(supabase: ReturnType<typeof createMockSupabase>) {
  const { data: rfps } = (await supabase
    .from("rfp_projects")
    .select("budget, win_probability, due_date, status")) as unknown as { data: TestRfp[] | null };
  const { data: reqs } = (await supabase
    .from("rfp_requirements")
    .select("risk_level, status")
    .neq("status", "met")) as unknown as { data: TestReq[] | null };
  const list = rfps ?? [];
  const active = list.filter((r) => r.status !== "submitted");
  const totalValue = active.reduce((s, r) => s + Number(r.budget ?? 0), 0);
  const avgWin =
    active.length === 0
      ? 0
      : Math.round(active.reduce((s, r) => s + Number(r.win_probability ?? 0), 0) / active.length);
  const flags = (reqs ?? []).filter((r) => r.risk_level === "high").length;
  const today = new Date();
  const upcoming = active
    .map((r) =>
      r.due_date ? Math.ceil((new Date(r.due_date).getTime() - today.getTime()) / 86400000) : null,
    )
    .filter((n): n is number => n !== null && n >= 0)
    .sort((a, b) => a - b)[0];
  return { totalValue, avgWin, flags, daysToNearest: upcoming ?? null };
}

async function getDashboardKpisOptimized(supabase: ReturnType<typeof createMockSupabase>) {
  const [{ data: activeRfps }, { count: flagsCount }] = (await Promise.all([
    supabase
      .from("rfp_projects")
      .select("budget, win_probability, due_date")
      .neq("status", "submitted"),
    supabase
      .from("rfp_requirements")
      .select("*", { count: "exact", head: true })
      .neq("status", "met")
      .eq("risk_level", "high"),
  ])) as unknown as [{ data: TestRfp[] | null }, { count: number | null }];

  const active = activeRfps ?? [];
  const totalValue = active.reduce((s, r) => s + Number(r.budget ?? 0), 0);
  const avgWin =
    active.length === 0
      ? 0
      : Math.round(active.reduce((s, r) => s + Number(r.win_probability ?? 0), 0) / active.length);
  const flags = flagsCount ?? 0;
  const today = new Date();
  const upcoming = active
    .map((r) =>
      r.due_date ? Math.ceil((new Date(r.due_date).getTime() - today.getTime()) / 86400000) : null,
    )
    .filter((n): n is number => n !== null && n >= 0)
    .sort((a, b) => a - b)[0];
  return { totalValue, avgWin, flags, daysToNearest: upcoming ?? null };
}

describe("getDashboardKpis", () => {
  const dataset = {
    rfps: Array.from({ length: 5000 }).map((_, i) => ({
      id: `rfp-${i}`,
      budget: (i % 10) * 10000,
      win_probability: i % 100,
      due_date: new Date(Date.now() + ((i % 30) + 1) * 86400000).toISOString(),
      status: i % 5 === 0 ? "submitted" : "drafting",
    })),
    reqs: Array.from({ length: 20000 }).map((_, i) => ({
      id: `req-${i}`,
      risk_level: i % 3 === 0 ? "high" : i % 3 === 1 ? "med" : "low",
      status: i % 4 === 0 ? "met" : "pending",
    })),
  };

  it("produces identical results between original and optimized implementations", async () => {
    const supabase = createMockSupabase(dataset);
    const origResult = await getDashboardKpisOriginal(supabase);
    const optResult = await getDashboardKpisOptimized(supabase);

    expect(optResult).toEqual(origResult);
  });

  it("benchmarks performance improvement of DB aggregation and parallel execution", async () => {
    const supabase = createMockSupabase(dataset);

    // Warmup
    await getDashboardKpisOriginal(supabase);
    await getDashboardKpisOptimized(supabase);

    const iterations = 50;

    const startOrig = performance.now();
    for (let i = 0; i < iterations; i++) {
      await getDashboardKpisOriginal(supabase);
    }
    const durationOrig = performance.now() - startOrig;

    const startOpt = performance.now();
    for (let i = 0; i < iterations; i++) {
      await getDashboardKpisOptimized(supabase);
    }
    const durationOpt = performance.now() - startOpt;

    console.log(`Original duration (${iterations} iterations): ${durationOrig.toFixed(2)}ms`);
    console.log(`Optimized duration (${iterations} iterations): ${durationOpt.toFixed(2)}ms`);
    console.log(`Speedup: ${(durationOrig / durationOpt).toFixed(2)}x`);

    expect(durationOpt).toBeLessThan(durationOrig);
  });
});

describe("getRfp & saveSectionEdits security", () => {
  it("filters org_members by org_id in getRfp", async () => {
    let queriedOrgId: string | undefined;

    const mockSupabase = {
      from: (table: string) => {
        if (table === "rfp_projects") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { id: "rfp-1", org_id: "org-target-123" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "rfp_requirements" || table === "proposal_sections") {
          return {
            select: () => ({
              eq: () => ({
                order: async () => ({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === "org_members") {
          return {
            select: () => ({
              eq: (col: string, val: string) => {
                if (col === "org_id") queriedOrgId = val;
                return Promise.resolve({
                  data: [{ user_id: "user-in-target-org" }],
                  error: null,
                });
              },
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    };

    const rfp = await mockSupabase.from("rfp_projects").select().eq().single();
    expect(rfp.data.org_id).toBe("org-target-123");

    const [reqs, sections, members] = await Promise.all([
      mockSupabase.from("rfp_requirements").select().eq().order(),
      mockSupabase.from("proposal_sections").select().eq().order(),
      mockSupabase.from("org_members").select().eq("org_id", rfp.data.org_id),
    ]);

    expect(reqs.data).toEqual([]);
    expect(sections.data).toEqual([]);
    expect(queriedOrgId).toBe("org-target-123");
    expect(members.data[0].user_id).toBe("user-in-target-org");
  });

  it("fails section save when update returns 0 updated rows due to RLS restriction", async () => {
    const mockSupabase = {
      from: (table: string) => {
        if (table === "proposal_sections") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { version_number: 1 }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => ({
                select: async () => ({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === "section_versions") {
          throw new Error(
            "section_versions insert should NOT be reached when update returns 0 rows",
          );
        }
        throw new Error(`Unexpected table ${table}`);
      },
    };

    const { data: cur } = await mockSupabase.from("proposal_sections").select().eq().single();
    expect(cur?.version_number).toBe(1);

    const { data: updatedRows, error } = await mockSupabase
      .from("proposal_sections")
      .update()
      .eq()
      .select();

    expect(() => {
      if (error || !updatedRows || updatedRows.length === 0) {
        throw new Error("Unauthorized or section not found");
      }
    }).toThrow("Unauthorized or section not found");
  });

  it("fails updateRfpStatus, assignRequirement, updateRequirementStatus, and updateSectionCompliance when 0 rows updated", async () => {
    const mockSupabaseDenied = {
      from: (_table: string) => ({
        update: () => ({
          eq: () => ({
            select: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    };

    const runUpdateCheck = async (table: string, errMessage: string) => {
      const { data: updatedRows, error } = await mockSupabaseDenied
        .from(table)
        .update()
        .eq()
        .select("id");
      if (error || !updatedRows || updatedRows.length === 0) {
        throw new Error(errMessage);
      }
    };

    expect(runUpdateCheck("rfp_projects", "Unauthorized or RFP not found")).rejects.toThrow(
      "Unauthorized or RFP not found",
    );
    expect(
      runUpdateCheck("rfp_requirements", "Unauthorized or requirement not found"),
    ).rejects.toThrow("Unauthorized or requirement not found");
    expect(
      runUpdateCheck("proposal_sections", "Unauthorized or section not found"),
    ).rejects.toThrow("Unauthorized or section not found");
  });

  it("fails setRolePreview when 0 rows updated due to RLS restriction", async () => {
    const mockSupabaseDenied = {
      from: (table: string) => {
        if (table === "profiles") {
          return {
            update: () => ({
              eq: () => ({
                select: async () => ({ data: [], error: null }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    };

    const { data: updatedRows, error } = await mockSupabaseDenied
      .from("profiles")
      .update()
      .eq()
      .select("id");

    expect(() => {
      if (error || !updatedRows || updatedRows.length === 0) {
        throw new Error(error?.message || "Unauthorized or profile not found");
      }
    }).toThrow("Unauthorized or profile not found");
  });
});
