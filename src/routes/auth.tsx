import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — GovPulse AI" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Account created. Signing you in…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  function mockSso(provider: string) {
    toast.info(`${provider} SSO is a demo placeholder — use email/password for now.`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-ai" /> GovPulse AI
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "Welcome back" : "Create your workspace"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin" ? "Sign in to your enterprise workspace." : "We'll provision an organization for you."}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button onClick={() => mockSso("Google")} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Google</button>
          <button onClick={() => mockSso("Microsoft")} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Microsoft</button>
        </div>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm">
            <span className="text-muted-foreground">Email</span>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Password</span>
            <input
              type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <button
            type="submit" disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

*** Add File: src/routes/_authenticated/route.tsx
import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, FileInput, Library, BarChart3, Settings, Sparkles, Bell, LogOut } from "lucide-react";
import { toast } from "sonner";

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
  const [role, setRole] = useState<string>("proposal_manager");

  useEffect(() => {
    supabase.from("profiles").select("current_role_preview").single().then(({ data }) => {
      if (data?.current_role_preview) setRole(data.current_role_preview);
    });
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  async function switchRole(r: string) {
    setRole(r);
    await supabase.from("profiles").update({ current_role_preview: r as never }).eq("id", (await supabase.auth.getUser()).data.user!.id);
    toast.success(`Viewing as ${r.replace("_", " ")}`);
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="flex items-center gap-2 px-5 py-5 text-sm font-semibold">
          <Sparkles className="h-5 w-5 text-ai" /> GovPulse AI
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV.map((n) => {
            const active = pathname === n.to || (n.to !== "/dashboard" && pathname.startsWith(n.to));
            return (
              <Link
                key={n.to} to={n.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                  active ? "bg-ai-soft text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto p-3">
          <button onClick={signOut} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
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
              onChange={(e) => switchRole(e.target.value)}
              className="rounded-md border border-border bg-card px-2 py-1 text-xs"
              title="Demo role switcher"
            >
              <option value="proposal_manager">Proposal Manager</option>
              <option value="sme">Subject Matter Expert</option>
              <option value="compliance_auditor">Compliance Auditor</option>
            </select>
            <button className="rounded-md border border-border p-2 hover:bg-accent"><Bell className="h-4 w-4" /></button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

*** Add File: src/routes/_authenticated/dashboard.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardKpis, listRfps, listActivity, updateRfpStatus, createRfp } from "@/lib/rfp.functions";
import { useState } from "react";
import { DollarSign, TrendingUp, AlertTriangle, CalendarClock, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — GovPulse AI" }] }),
  component: Dashboard,
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
  const kpisFn = useServerFn(getDashboardKpis);
  const rfpsFn = useServerFn(listRfps);
  const activityFn = useServerFn(listActivity);
  const updateStatus = useServerFn(updateRfpStatus);
  const createRfpFn = useServerFn(createRfp);

  const kpis = useQuery({ queryKey: ["kpis"], queryFn: () => kpisFn() });
  const rfps = useQuery({ queryKey: ["rfps"], queryFn: () => rfpsFn() });
  const activity = useQuery({ queryKey: ["activity"], queryFn: () => activityFn() });

  const moveMutation = useMutation({
    mutationFn: (vars: { rfpId: string; status: typeof COLUMNS[number]["key"] }) =>
      updateStatus({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rfps"] }),
  });

  const [newTitle, setNewTitle] = useState("");
  const create = useMutation({
    mutationFn: () => createRfpFn({ data: { title: newTitle, due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) } }),
    onSuccess: () => { setNewTitle(""); qc.invalidateQueries({ queryKey: ["rfps"] }); toast.success("RFP created"); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live view of active bids, compliance posture, and AI activity.</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (newTitle) create.mutate(); }} className="flex gap-2">
          <input
            value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New RFP title…"
            className="rounded-md border border-input bg-card px-3 py-2 text-sm"
          />
          <button className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> Create
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi icon={DollarSign} label="Active bids value" value={`$${(kpis.data?.totalValue ?? 0).toLocaleString()}`} />
        <Kpi icon={TrendingUp} label="Avg win probability" value={`${kpis.data?.avgWin ?? 0}%`} tone="success" />
        <Kpi icon={AlertTriangle} label="Open high-risk flags" value={String(kpis.data?.flags ?? 0)} tone="warn" />
        <Kpi icon={CalendarClock} label="Days to next due" value={kpis.data?.daysToNearest === null || kpis.data === undefined ? "—" : String(kpis.data.daysToNearest)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">RFP Pipeline</h2>
          <div className="grid grid-cols-5 gap-3">
            {COLUMNS.map((col) => (
              <div key={col.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) moveMutation.mutate({ rfpId: id, status: col.key });
                }}
                className="flex min-h-[180px] flex-col gap-2 rounded-lg border border-border bg-background/40 p-2"
              >
                <div className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{col.label}</div>
                {(rfps.data ?? []).filter((r) => r.status === col.key).map((r) => (
                  <div key={r.id}
                    draggable
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
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4 text-ai" /> AI Activity
          </h2>
          <ul className="space-y-2 text-xs">
            {(activity.data ?? []).length === 0 && (
              <li className="text-muted-foreground">No activity yet. Create an RFP to get started.</li>
            )}
            {(activity.data ?? []).map((a) => (
              <li key={a.id} className="rounded-md border border-border bg-background/40 p-2">
                <div className="text-foreground">{a.message}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString()} · {a.actor}</div>
              </li>
            ))}
          </ul>
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

*** Add File: src/routes/_authenticated/index.tsx
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
  beforeLoad: () => { throw redirect({ to: "/dashboard" }); },
});

*** Add File: src/routes/_authenticated/ingest.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRfps, getRfp } from "@/lib/rfp.functions";
import { extractRequirements } from "@/lib/ai.functions";
import { useState } from "react";
import { Upload, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ingest")({
  head: () => ({ meta: [{ title: "Ingest RFP — GovPulse AI" }] }),
  component: IngestPage,
});

const SAMPLE = `SECTION L — INSTRUCTIONS TO OFFERORS
1. The Offeror shall submit a written technical proposal not to exceed 50 pages.
2. Offeror must hold an active FedRAMP Moderate ATO at time of award.
3. All key personnel shall possess a minimum of 5 years of relevant federal experience.
4. Offeror should provide three (3) past performance references from the last 5 years.
5. Pricing must be submitted on Attachment B in fully-loaded labor rates by year.
6. The Government anticipates award by 30 September. Late proposals will not be accepted.
`;

function IngestPage() {
  const qc = useQueryClient();
  const rfpsFn = useServerFn(listRfps);
  const getRfpFn = useServerFn(getRfp);
  const extractFn = useServerFn(extractRequirements);
  const rfps = useQuery({ queryKey: ["rfps"], queryFn: () => rfpsFn() });
  const [selectedRfp, setSelectedRfp] = useState<string | null>(null);
  const [text, setText] = useState(SAMPLE);

  const detail = useQuery({
    queryKey: ["rfp", selectedRfp],
    queryFn: () => getRfpFn({ data: { rfpId: selectedRfp! } }),
    enabled: !!selectedRfp,
  });

  const extract = useMutation({
    mutationFn: () => extractFn({ data: { rfpId: selectedRfp!, documentText: text } }),
    onSuccess: (res) => {
      toast.success(`Extracted ${res.count} requirements`);
      qc.invalidateQueries({ queryKey: ["rfp", selectedRfp] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Extraction failed"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">RFP Ingestion Hub</h1>
        <p className="text-sm text-muted-foreground">Upload an RFP, then let AI extract compliance requirements.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(rfps.data ?? []).map((r) => (
          <button
            key={r.id} onClick={() => setSelectedRfp(r.id)}
            className={`rounded-md border px-3 py-1.5 text-xs ${selectedRfp === r.id ? "border-ai bg-ai-soft" : "border-border hover:bg-accent"}`}
          >
            {r.title}
          </button>
        ))}
        {rfps.data?.length === 0 && (
          <Link to="/dashboard" className="text-xs text-muted-foreground underline">Create an RFP first →</Link>
        )}
      </div>

      {selectedRfp && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium"><Upload className="h-4 w-4" /> Document</h2>
            <textarea
              value={text} onChange={(e) => setText(e.target.value)} rows={18}
              className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs"
              placeholder="Paste RFP text here (or upload — wire your PDF parser to populate this)…"
            />
            <button
              onClick={() => extract.mutate()}
              disabled={extract.isPending || text.length < 50}
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {extract.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Extract with AI
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-medium">Extracted Requirements</h2>
            <div className="space-y-2">
              {(detail.data?.requirements ?? []).length === 0 && (
                <div className="text-xs text-muted-foreground">No requirements yet — run Extract with AI.</div>
              )}
              {(detail.data?.requirements ?? []).map((r) => (
                <div key={r.id} className="rounded-md border border-border bg-background/40 p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                      r.risk_level === "high" ? "bg-risk-high/20 text-risk-high"
                      : r.risk_level === "med" ? "bg-risk-med/20 text-risk-med"
                      : "bg-risk-low/20 text-risk-low"
                    }`}>{r.risk_level}</span>
                    <span className="text-[10px] text-muted-foreground">{r.status}</span>
                  </div>
                  <div className="mt-1 text-foreground">{r.text_snippet}</div>
                </div>
              ))}
            </div>
            {selectedRfp && detail.data && (
              <Link to="/workspace/$rfpId" params={{ rfpId: selectedRfp }} className="mt-3 inline-block text-xs text-ai underline">
                Open drafting workspace →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

*** Add File: src/routes/_authenticated/workspace.$rfpId.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRfp, saveSectionEdits, listComments, addComment, listVersions, updateSectionCompliance } from "@/lib/rfp.functions";
import { generateSectionDraft, improveTone, autocomplete, scoreCompliance } from "@/lib/ai.functions";
import { useEffect, useState } from "react";
import { Sparkles, Loader2, Wand2, MessageCircle, History, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workspace/$rfpId")({
  head: () => ({ meta: [{ title: "Drafting Workspace — GovPulse AI" }] }),
  component: Workspace,
});

function Workspace() {
  const { rfpId } = Route.useParams();
  const qc = useQueryClient();
  const getRfpFn = useServerFn(getRfp);
  const saveFn = useServerFn(saveSectionEdits);
  const draftFn = useServerFn(generateSectionDraft);
  const toneFn = useServerFn(improveTone);
  const completeFn = useServerFn(autocomplete);
  const scoreFn = useServerFn(scoreCompliance);
  const commentsFn = useServerFn(listComments);
  const addCommentFn = useServerFn(addComment);
  const versionsFn = useServerFn(listVersions);
  const complianceFn = useServerFn(updateSectionCompliance);

  const rfp = useQuery({ queryKey: ["rfp", rfpId], queryFn: () => getRfpFn({ data: { rfpId } }) });
  const sections = rfp.data?.sections ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = sections.find((s) => s.id === activeId) ?? sections[0];
  useEffect(() => { if (!activeId && sections[0]) setActiveId(sections[0].id); }, [sections, activeId]);

  const [content, setContent] = useState("");
  useEffect(() => { if (active) setContent(active.human_edits || active.ai_draft || ""); }, [active?.id]);

  const [tab, setTab] = useState<"compliance" | "comments" | "versions">("compliance");
  const comments = useQuery({ queryKey: ["comments", active?.id], queryFn: () => commentsFn({ data: { sectionId: active!.id } }), enabled: !!active });
  const versions = useQuery({ queryKey: ["versions", active?.id], queryFn: () => versionsFn({ data: { sectionId: active!.id } }), enabled: !!active });

  const draft = useMutation({
    mutationFn: () => draftFn({ data: { sectionId: active!.id } }),
    onSuccess: (r) => { setContent(r.draft); qc.invalidateQueries({ queryKey: ["rfp", rfpId] }); toast.success("AI draft ready"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Draft failed"),
  });
  const tone = useMutation({
    mutationFn: () => toneFn({ data: { text: content, tone: "authoritative and concise" } }),
    onSuccess: (r) => { setContent(r.text); toast.success("Rewritten"); },
  });
  const complete = useMutation({
    mutationFn: () => completeFn({ data: { precedingText: content || "Introduction." } }),
    onSuccess: (r) => { setContent((c) => c + " " + r.text); },
  });
  const save = useMutation({
    mutationFn: () => saveFn({ data: { sectionId: active!.id, content } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rfp", rfpId] }); qc.invalidateQueries({ queryKey: ["versions", active?.id] }); toast.success("Saved"); },
  });
  const score = useMutation({
    mutationFn: () => scoreFn({ data: { sectionId: active!.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rfp", rfpId] }),
  });
  const [comment, setComment] = useState("");
  const sendComment = useMutation({
    mutationFn: () => addCommentFn({ data: { sectionId: active!.id, text: comment } }),
    onSuccess: () => { setComment(""); qc.invalidateQueries({ queryKey: ["comments", active?.id] }); },
  });
  const setCompliance = useMutation({
    mutationFn: (status: "approved" | "rejected" | "needs_review") =>
      complianceFn({ data: { sectionId: active!.id, compliance_status: status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rfp", rfpId] }),
  });

  return (
    <div className="grid h-[calc(100vh-7rem)] grid-cols-[220px_1fr_320px] gap-4">
      <aside className="overflow-auto rounded-2xl border border-border bg-card p-3">
        <h2 className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Sections</h2>
        <ul className="space-y-1">
          {sections.map((s) => {
            const pct = s.compliance_score ?? 0;
            return (
              <li key={s.id}>
                <button onClick={() => setActiveId(s.id)}
                  className={`w-full rounded-md px-2 py-2 text-left text-xs transition ${active?.id === s.id ? "bg-ai-soft text-foreground" : "text-muted-foreground hover:bg-accent"}`}>
                  <div className="font-medium text-foreground">{s.section_name}</div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded bg-background">
                    <div className="h-full bg-ai" style={{ width: `${pct}%` }} />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="text-xs uppercase text-muted-foreground">{rfp.data?.rfp.title}</div>
            <h2 className="text-lg font-semibold">{active?.section_name ?? "Loading…"}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <AiBtn icon={Sparkles} label="Draft" loading={draft.isPending} onClick={() => draft.mutate()} />
            <AiBtn icon={Wand2} label="Improve tone" loading={tone.isPending} onClick={() => tone.mutate()} />
            <AiBtn icon={Sparkles} label="Autocomplete" loading={complete.isPending} onClick={() => complete.mutate()} />
            <button onClick={() => save.mutate()} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">Save</button>
          </div>
        </div>
        <textarea
          value={content} onChange={(e) => setContent(e.target.value)}
          className="flex-1 resize-none bg-background p-6 text-sm leading-relaxed focus:outline-none"
          placeholder="Click Draft to generate an AI starting point, or start typing…"
        />
      </section>

      <aside className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex border-b border-border text-xs">
          {([
            ["compliance", "Compliance", ShieldCheck],
            ["comments", "Comments", MessageCircle],
            ["versions", "Versions", History],
          ] as const).map(([k, l, Icon]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex-1 px-3 py-2 ${tab === k ? "border-b-2 border-ai text-foreground" : "text-muted-foreground"}`}>
              <Icon className="mx-auto mb-1 h-4 w-4" /> {l}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-3 text-xs">
          {tab === "compliance" && active && (
            <div className="space-y-3">
              <div className="flex flex-col items-center justify-center py-4">
                <Ring value={active.compliance_score ?? 0} />
                <button onClick={() => score.mutate()} className="mt-3 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-accent">
                  {score.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Re-score
                </button>
              </div>
              <div className="text-muted-foreground">Auditor actions</div>
              <div className="flex gap-2">
                <button onClick={() => setCompliance.mutate("approved")} className="inline-flex items-center gap-1 rounded-md bg-success/20 px-2 py-1 text-success">
                  <CheckCircle2 className="h-3 w-3" /> Approve
                </button>
                <button onClick={() => setCompliance.mutate("rejected")} className="inline-flex items-center gap-1 rounded-md bg-destructive/20 px-2 py-1 text-destructive">
                  <XCircle className="h-3 w-3" /> Reject
                </button>
              </div>
              <div className="text-muted-foreground">Status: <span className="text-foreground">{active.compliance_status}</span></div>
            </div>
          )}
          {tab === "comments" && (
            <div className="space-y-2">
              {(comments.data ?? []).map((c) => (
                <div key={c.id} className="rounded-md border border-border p-2">
                  <div className="text-foreground">{c.text}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
                </div>
              ))}
              <form onSubmit={(e) => { e.preventDefault(); if (comment) sendComment.mutate(); }} className="flex gap-1">
                <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add comment…"
                  className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs" />
                <button className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">Send</button>
              </form>
            </div>
          )}
          {tab === "versions" && (
            <ul className="space-y-2">
              {(versions.data ?? []).map((v) => (
                <li key={v.id} className="rounded-md border border-border p-2">
                  <div className="flex justify-between"><span>v{v.version_number}</span><span className="text-[10px] text-muted-foreground">{new Date(v.created_at).toLocaleString()}</span></div>
                  <div className="mt-1 line-clamp-3 text-muted-foreground">{v.content}</div>
                </li>
              ))}
              {(versions.data ?? []).length === 0 && <li className="text-muted-foreground">No saved versions yet.</li>}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

function AiBtn({ icon: Icon, label, onClick, loading }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; loading?: boolean }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="inline-flex items-center gap-1 rounded-md bg-ai-soft px-3 py-1.5 text-xs text-foreground hover:bg-ai/30 disabled:opacity-60">
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3 text-ai" />} {label}
    </button>
  );
}

function Ring({ value }: { value: number }) {
  const r = 36, c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} stroke="currentColor" strokeWidth="8" fill="none" className="text-border" />
      <circle cx="50" cy="50" r={r} stroke="currentColor" strokeWidth="8" fill="none"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        className="text-ai" transform="rotate(-90 50 50)" />
      <text x="50" y="55" textAnchor="middle" className="fill-foreground text-lg font-semibold">{value}%</text>
    </svg>
  );
}

*** Add File: src/routes/_authenticated/library.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listLibrary, createLibraryItem } from "@/lib/rfp.functions";
import { useState } from "react";
import { Plus, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "Content Library — GovPulse AI" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const qc = useQueryClient();
  const fn = useServerFn(listLibrary);
  const createFn = useServerFn(createLibraryItem);
  const q = useQuery({ queryKey: ["library"], queryFn: () => fn() });
  const [filter, setFilter] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const create = useMutation({
    mutationFn: () => createFn({ data: { title, content_body: body, tags: [] } }),
    onSuccess: () => { setTitle(""); setBody(""); qc.invalidateQueries({ queryKey: ["library"] }); },
  });

  const items = (q.data ?? []).filter((i) =>
    !filter || i.title.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Content Library</h1>
        <p className="text-sm text-muted-foreground">Reusable boilerplate, past performance, and bios.</p>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search…"
          className="w-full rounded-md border border-input bg-card py-2 pl-9 pr-3 text-sm" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <div key={i.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="text-sm font-medium">{i.title}</div>
            <div className="mt-1 line-clamp-4 text-xs text-muted-foreground">{i.content_body}</div>
            <div className="mt-2 text-[10px] text-muted-foreground">Reused {i.reuse_count} times</div>
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-muted-foreground">No items yet.</div>}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (title && body) create.mutate(); }}
        className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-2 text-sm font-medium">Add item</h3>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
          className="mb-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Content body" rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <button className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>
    </div>
  );
}

*** Add File: src/routes/_authenticated/analytics.tsx
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

*** Add File: src/routes/_authenticated/settings.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/rfp.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — GovPulse AI" }] }),
  component: Settings,
});

function Settings() {
  const fn = useServerFn(getMyProfile);
  const q = useQuery({ queryKey: ["profile"], queryFn: () => fn() });
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
            <li key={i} className="rounded-md border border-border px-2 py-1 text-xs">{r.role}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 text-sm">
        <div className="mb-2 text-muted-foreground">Organizations</div>
        <ul className="space-y-1">
          {(q.data?.orgs ?? []).map((o) => (
            <li key={o.id} className="rounded-md border border-border px-2 py-1 text-xs">{o.name} <span className="text-muted-foreground">({o.plan_tier})</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
