import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRfps } from "@/lib/rfp.functions";
import { Skeleton, EmptyState, ErrorCard } from "@/components/ui-kit";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — GovPulse AI" }] }),
  component: Analytics,
  errorComponent: ({ error, reset }) => <ErrorCard error={error as Error} reset={reset} />,
});

function Analytics() {
  const fn = useServerFn(listRfps);
  const q = useQuery({ queryKey: ["rfps"], queryFn: () => fn() });
  const data = (q.data ?? []).map((r) => ({
    name: r.title.slice(0, 14),
    win: r.win_probability ?? 0,
    budget: Number(r.budget ?? 0) / 1000,
  }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team Analytics</h1>
        <p className="text-sm text-muted-foreground">Pipeline value and win probability by RFP.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {q.isLoading && (
          <>
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </>
        )}
        {!q.isLoading && data.length === 0 && (
          <div className="lg:col-span-2">
            <EmptyState
              icon={BarChart3}
              title="No data yet"
              hint="Create an RFP to populate analytics"
            />
          </div>
        )}
        {!q.isLoading && data.length > 0 && (
          <>
            <div className="h-72 rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-2 text-sm font-medium">Win probability</h3>
              <BarList
                data={data.map((item) => ({
                  name: item.name,
                  value: item.win,
                  label: `${item.win}%`,
                }))}
                tone="ai"
              />
            </div>
            <div className="h-72 rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-2 text-sm font-medium">Budget ($K)</h3>
              <BarList
                data={data.map((item) => ({
                  name: item.name,
                  value: item.budget,
                  label: `$${Math.round(item.budget)}K`,
                }))}
                tone="success"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BarList({
  data,
  tone,
}: {
  data: Array<{ name: string; value: number; label: string }>;
  tone: "ai" | "success";
}) {
  const values = data.map((item) => item.value);
  const max = values.length > 0 ? Math.max(...values, 1) : 1;
  const fillClass = tone === "ai" ? "bg-ai" : "bg-success";

  return (
    <div className="mt-4 space-y-3 text-xs">
      {data.map((item) => {
        const pct = max > 0 ? Math.max(3, (item.value / max) * 100) : 3;
        return (
          <div
            key={`${item.name}-${item.label}`}
            className="grid grid-cols-[5.5rem_1fr_3.5rem] items-center gap-3"
          >
            <span className="truncate text-muted-foreground">{item.name}</span>
            <div className="h-3 overflow-hidden rounded-full bg-background">
              <div className={`h-full rounded-full ${fillClass}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-right font-medium text-foreground">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
