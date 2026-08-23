// @ts-ignore
import { describe, expect, it } from "bun:test";

// Mock Supabase client to test both old and new logic
function createMockSupabase(dataset: {
  rfps: Array<{ id: string; budget: number | null; win_probability: number | null; due_date: string | null; status: string }>;
  reqs: Array<{ id: string; risk_level: string; status: string }>;
}) {
  return {
    from: (table: string) => {
      if (table === "rfp_projects") {
        return {
          select: (cols: string, opts?: { count?: "exact"; head?: boolean }) => {
            let filtered = [...dataset.rfps];
            const chain = {
              neq: (col: string, val: string) => {
                filtered = filtered.filter((item: any) => item[col] !== val);
                return chain;
              },
              then: (resolve: Function) => {
                // Simulate JSON network serialization overhead when full rows are returned
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
          select: (cols: string, opts?: { count?: "exact"; head?: boolean }) => {
            let filtered = [...dataset.reqs];
            const chain = {
              neq: (col: string, val: string) => {
                filtered = filtered.filter((item: any) => item[col] !== val);
                return chain;
              },
              eq: (col: string, val: string) => {
                filtered = filtered.filter((item: any) => item[col] === val);
                return chain;
              },
              then: (resolve: Function) => {
                if (opts?.head) {
                  // Database head query returns no row payload over network
                  resolve({ data: null, count: filtered.length, error: null });
                } else {
                  // Returning all rows simulates transferring full JSON data payload over HTTP
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

// Logic implementations for benchmarking
async function getDashboardKpisOriginal(supabase: any) {
  const { data: rfps } = await supabase
    .from("rfp_projects")
    .select("budget, win_probability, due_date, status");
  const { data: reqs } = await supabase
    .from("rfp_requirements")
    .select("risk_level, status")
    .neq("status", "met");
  const list = rfps ?? [];
  const active = list.filter((r: any) => r.status !== "submitted");
  const totalValue = active.reduce((s: number, r: any) => s + Number(r.budget ?? 0), 0);
  const avgWin =
    active.length === 0
      ? 0
      : Math.round(active.reduce((s: number, r: any) => s + Number(r.win_probability ?? 0), 0) / active.length);
  const flags = (reqs ?? []).filter((r: any) => r.risk_level === "high").length;
  const today = new Date();
  const upcoming = active
    .map((r: any) => (r.due_date ? Math.ceil((new Date(r.due_date).getTime() - today.getTime()) / 86400000) : null))
    .filter((n: any): n is number => n !== null && n >= 0)
    .sort((a: number, b: number) => a - b)[0];
  return { totalValue, avgWin, flags, daysToNearest: upcoming ?? null };
}

async function getDashboardKpisOptimized(supabase: any) {
  const [{ data: activeRfps }, { count: flagsCount }] = await Promise.all([
    supabase
      .from("rfp_projects")
      .select("budget, win_probability, due_date")
      .neq("status", "submitted"),
    supabase
      .from("rfp_requirements")
      .select("*", { count: "exact", head: true })
      .neq("status", "met")
      .eq("risk_level", "high"),
  ]);

  const active = activeRfps ?? [];
  const totalValue = active.reduce((s: number, r: any) => s + Number(r.budget ?? 0), 0);
  const avgWin =
    active.length === 0
      ? 0
      : Math.round(active.reduce((s: number, r: any) => s + Number(r.win_probability ?? 0), 0) / active.length);
  const flags = flagsCount ?? 0;
  const today = new Date();
  const upcoming = active
    .map((r: any) => (r.due_date ? Math.ceil((new Date(r.due_date).getTime() - today.getTime()) / 86400000) : null))
    .filter((n: any): n is number => n !== null && n >= 0)
    .sort((a: number, b: number) => a - b)[0];
  return { totalValue, avgWin, flags, daysToNearest: upcoming ?? null };
}

describe("getDashboardKpis", () => {
  const dataset = {
    rfps: Array.from({ length: 5000 }).map((_, i) => ({
      id: `rfp-${i}`,
      budget: (i % 10) * 10000,
      win_probability: (i % 100),
      due_date: new Date(Date.now() + (i % 30 + 1) * 86400000).toISOString(),
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
