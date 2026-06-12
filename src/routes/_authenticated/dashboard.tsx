import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardKpis, listRfps, listActivity, updateRfpStatus, createRfp } from "@/lib/rfp.functions";
import { useState } from "react";
import { DollarSign, TrendingUp, AlertTriangle, CalendarClock, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useUiStore, can } from "@/stores/ui";
import { Skeleton, EmptyState, ErrorCard, Avatar } from "@/components/ui-kit";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — GovPulse AI" }] }),
  component: Dashboard,
  errorComponent: ({ error, reset }) => <ErrorCard error={error as Error} reset={reset} />,
});

const COLUMNS = [
  { key: "ingestion", label: "Ingestion" },
  { key: "parsing", label: "Parsing" },
  { key: "drafting", label: "Drafting" },
  { key: "review", label: "Review" },
  { key: "submitted", label: "Submitted" },
] as const;

function Dashboard() {
  const qc = useQueryClient();
  const role = useUiStore((s) => s.role);
  const kpisFn = useServerFn(getDashboardKpis);
  const rfpsFn = useServerFn(listRfps);
  const activityFn = useServerFn(listActivity);
  const updateStatus = useServerFn(updateRfpStatus);
  const createRfpFn = useServerFn(createRfp);

  const kpis = useQuery({ queryKey: ["kpis"], queryFn: () => kpisFn() });
  const rfps = useQuery({ queryKey: ["rfps"], queryFn: () => rfpsFn() });
  const activity = useQuery({ queryKey: ["activity"], queryFn: () => activityFn(), refetchInterval: 30_000 });

  const moveMutation = useMutation({
    mutationFn: (vars: { rfpId: string; status: typeof COLUMNS[number]["key"] }) =>
      updateStatus({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rfps"] }); qc.invalidateQueries({ queryKey: ["activity"] }); toast.success("Status updated"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const [newTitle, setNewTitle] = useState("");
  const create = useMutation({
    mutationFn: () => createRfpFn({ data: { title: newTitle, due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) } }),
    onSuccess: () => { setNewTitle(""); qc.invalidateQueries({ queryKey: ["rfps"] }); qc.invalidateQueries({ queryKey: ["activity"] }); toast.success("RFP created"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create RFP"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live view of active bids, compliance posture, and AI activity.</p>
        </div>
        {can.create(role) && (
        <form onSubmit={(e) => { e.preventDefault(); if (newTitle) create.mutate(); }} className="flex gap-2">
          <input
            value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New RFP title…"
            className="rounded-md border border-input bg-card px-3 py-2 text-sm"
          />
          <button className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> Create
          </button>
        </form>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {kpis.isLoading ? (
          <>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</>
        ) : (
          <>
            <Kpi icon={DollarSign} label="Active bids value" value={`$${(kpis.data?.totalValue ?? 0).toLocaleString()}`} />
            <Kpi icon={TrendingUp} label="Avg win probability" value={`${kpis.data?.avgWin ?? 0}%`} tone="success" />
            <Kpi icon={AlertTriangle} label="Open high-risk flags" value={String(kpis.data?.flags ?? 0)} tone="warn" />
            <Kpi icon={CalendarClock} label="Days to next due" value={kpis.data?.daysToNearest == null ? "—" : String(kpis.data.daysToNearest)} />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">RFP Pipeline</h2>
          {rfps.isLoading && <Skeleton className="h-40 w-full" />}
          {!rfps.isLoading && (rfps.data ?? []).length === 0 && (
            <EmptyState icon={Plus} title="No active RFPs" hint="Create your first RFP above to start the pipeline" />
          )}
          {!rfps.isLoading && (rfps.data ?? []).length > 0 && (
          <div className="grid grid-cols-5 gap-3">
            {COLUMNS.map((col) => (
              <div key={col.key}
                onDragOver={(e) => { if (can.assign(role)) e.preventDefault(); }}
                onDrop={(e) => {
                  if (!can.assign(role)) return;
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) moveMutation.mutate({ rfpId: id, status: col.key });
                }}
                className="flex min-h-[180px] flex-col gap-2 rounded-lg border border-border bg-background/40 p-2"
              >
                <div className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{col.label}</div>
                {(rfps.data ?? []).filter((r) => r.status === col.key).map((r) => (
                  <div key={r.id}
                    draggable={can.assign(role)}
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", r.id)}
                    className="cursor-grab rounded-md border border-border bg-card p-2 text-xs hover:border-ai active:cursor-grabbing"
                  >
                    <div className="font-medium text-foreground">{r.title}</div>
                    <div className="mt-1 text-muted-foreground">{r.issuing_agency ?? "—"}</div>
                    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                      <span>${Number(r.budget ?? 0).toLocaleString()}</span>
                      <span>{r.due_date ?? ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4 text-ai" /> AI Activity
          </h2>
          {activity.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (activity.data ?? []).length === 0 ? (
            <EmptyState icon={Sparkles} title="No activity yet" hint="Create an RFP to get started" />
          ) : (
            <ul className="space-y-2 text-xs">
              {(activity.data ?? []).map((a) => (
                <li key={a.id} className="flex items-start gap-2 rounded-md border border-border bg-background/40 p-2">
                  <Avatar name={a.actor} />
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground">{a.message}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })} · {a.actor}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone?: "success" | "warn" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warn" ? "text-warn" : "text-ai";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

