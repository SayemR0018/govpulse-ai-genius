import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRfps } from "@/lib/rfp.functions";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — GovPulse AI" }] }),
  component: Analytics,
});

function Analytics() {
  const fn = useServerFn(listRfps);
  const q = useQuery({ queryKey: ["rfps"], queryFn: () => fn() });
  const data = (q.data ?? []).map((r) => ({
    name: r.title.slice(0, 14), win: r.win_probability ?? 0, budget: Number(r.budget ?? 0) / 1000,
  }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team Analytics</h1>
        <p className="text-sm text-muted-foreground">Pipeline value and win probability by RFP.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-72 rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-medium">Win probability</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
              <XAxis dataKey="name" stroke="oklch(0.7 0 0)" fontSize={10} />
              <YAxis stroke="oklch(0.7 0 0)" fontSize={10} />
              <Tooltip contentStyle={{ background: "oklch(0.215 0.03 264)", border: "1px solid oklch(1 0 0 / 0.1)" }} />
              <Bar dataKey="win" fill="oklch(0.62 0.18 268)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-72 rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-medium">Budget ($K)</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
              <XAxis dataKey="name" stroke="oklch(0.7 0 0)" fontSize={10} />
              <YAxis stroke="oklch(0.7 0 0)" fontSize={10} />
              <Tooltip contentStyle={{ background: "oklch(0.215 0.03 264)", border: "1px solid oklch(1 0 0 / 0.1)" }} />
              <Bar dataKey="budget" fill="oklch(0.72 0.17 158)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

