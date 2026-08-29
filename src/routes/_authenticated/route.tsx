import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  FileInput,
  Library,
  BarChart3,
  Settings,
  Sparkles,
  Bell,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { useUiStore, type RolePreview } from "@/stores/ui";
import { setRolePreview } from "@/lib/rfp.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppShell,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ingest", label: "Ingest RFP", icon: FileInput },
  { to: "/library", label: "Content Library", icon: Library },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const role = useUiStore((s) => s.role);
  const setRole = useUiStore((s) => s.setRole);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("current_role_preview")
      .single()
      .then(({ data }) => {
        if (data?.current_role_preview) setRole(data.current_role_preview as RolePreview);
      });
  }, [setRole]);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  async function switchRole(r: RolePreview) {
    try {
      await setRolePreview({ data: { role: r } });
      setRole(r);
      toast.success(`Viewing as ${r.replace("_", " ")}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="flex items-center gap-2 px-5 py-5 text-sm font-semibold">
          <Sparkles className="h-5 w-5 text-ai" /> GovPulse AI
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV.map((n) => {
            const active =
              pathname === n.to || (n.to !== "/dashboard" && pathname.startsWith(n.to));
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                  active
                    ? "bg-ai-soft text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto p-3">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-background/60 px-6 backdrop-blur">
          <div className="text-sm text-muted-foreground">Acme Federal Solutions</div>
          <div className="flex items-center gap-3">
            <select
              value={role}
              onChange={(e) => switchRole(e.target.value as RolePreview)}
              className="rounded-md border border-border bg-card px-2 py-1 text-xs"
              title="Demo role switcher"
            >
              <option value="proposal_manager">Proposal Manager</option>
              <option value="sme">Subject Matter Expert</option>
              <option value="compliance_auditor">Compliance Auditor</option>
            </select>
            <button className="rounded-md border border-border p-2 hover:bg-accent">
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
