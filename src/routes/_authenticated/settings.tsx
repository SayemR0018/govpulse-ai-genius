import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/rfp.functions";
import { Skeleton, ErrorCard } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — GovPulse AI" }] }),
  component: Settings,
  errorComponent: ({ error, reset }) => <ErrorCard error={error as Error} reset={reset} />,
});

function Settings() {
  const fn = useServerFn(getMyProfile);
  const q = useQuery({ queryKey: ["profile"], queryFn: () => fn() });
  if (q.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Workspace and role configuration.</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 text-sm">
        <div className="text-muted-foreground">Display name</div>
        <div className="text-foreground">{q.data?.profile?.display_name ?? "—"}</div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 text-sm">
        <div className="mb-2 text-muted-foreground">Your roles</div>
        <ul className="space-y-1">
          {(q.data?.roles ?? []).map((r, i) => (
            <li key={i} className="rounded-md border border-border px-2 py-1 text-xs">
              {r.role}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 text-sm">
        <div className="mb-2 text-muted-foreground">Organizations</div>
        <ul className="space-y-1">
          {(q.data?.orgs ?? []).map((o) => (
            <li key={o.id} className="rounded-md border border-border px-2 py-1 text-xs">
              {o.name} <span className="text-muted-foreground">({o.plan_tier})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
