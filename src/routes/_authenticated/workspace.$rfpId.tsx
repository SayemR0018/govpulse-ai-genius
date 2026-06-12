import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRfp, saveSectionEdits, listComments, addComment, listVersions, updateSectionCompliance } from "@/lib/rfp.functions";
import { generateSectionDraft, improveTone, autocomplete, scoreCompliance } from "@/lib/ai.functions";
import { useEffect, useState } from "react";
import { Sparkles, Loader2, Wand2, MessageCircle, History, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useUiStore, can } from "@/stores/ui";
import { Skeleton, EmptyState, ErrorCard, AiSpinner } from "@/components/ui-kit";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/workspace/$rfpId")({
  head: () => ({ meta: [{ title: "Drafting Workspace — GovPulse AI" }] }),
  component: Workspace,
  errorComponent: ({ error, reset }) => <ErrorCard error={error as Error} reset={reset} />,
});

function Workspace() {
  const { rfpId } = Route.useParams();
  const role = useUiStore((s) => s.role);
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
          {sections.length === 0 && !rfp.isLoading && (
            <EmptyState icon={History} title="No sections yet" hint="Generate from requirements" />
          )}
          {rfp.isLoading && <Skeleton className="h-16 w-full" />}
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
            {can.editSection(role) && <>
              <AiBtn icon={Sparkles} label="Draft" loading={draft.isPending} onClick={() => draft.mutate()} />
              <AiBtn icon={Wand2} label="Improve tone" loading={tone.isPending} onClick={() => tone.mutate()} />
              <AiBtn icon={Sparkles} label="Autocomplete" loading={complete.isPending} onClick={() => complete.mutate()} />
              <button onClick={() => save.mutate()} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">Save</button>
            </>}
            {!can.editSection(role) && (
              <span className="text-[11px] text-muted-foreground">Read-only for {role.replace("_", " ")}</span>
            )}
          </div>
        </div>
        <textarea
          value={content} onChange={(e) => setContent(e.target.value)} readOnly={!can.editSection(role)}
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
                {score.isPending ? (
                  <div className="flex flex-col items-center gap-2">
                    <AiSpinner size={48} />
                    <span className="text-[11px] text-slate-500">Calculating…</span>
                  </div>
                ) : (
                  <Ring value={active.compliance_score ?? 0} />
                )}
                <button onClick={() => score.mutate()} className="mt-3 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-accent">
                  {score.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Re-score
                </button>
              </div>
              <div className="text-muted-foreground">Auditor actions</div>
              {can.approveReject(role) ? <div className="flex gap-2">
                <button onClick={() => setCompliance.mutate("approved")} className="inline-flex items-center gap-1 rounded-md bg-success/20 px-2 py-1 text-success">
                  <CheckCircle2 className="h-3 w-3" /> Approve
                </button>
                <button onClick={() => setCompliance.mutate("rejected")} className="inline-flex items-center gap-1 rounded-md bg-destructive/20 px-2 py-1 text-destructive">
                  <XCircle className="h-3 w-3" /> Reject
                </button>
              </div> : <div className="text-[11px] text-muted-foreground">Only compliance auditors can approve/reject.</div>}
              <div className="text-muted-foreground">Status: <span className="text-foreground">{active.compliance_status}</span></div>
            </div>
          )}
          {tab === "comments" && (
            <div className="space-y-2">
              {(comments.data ?? []).length === 0 && (
                <EmptyState icon={MessageCircle} title="No comments yet" hint="Start the conversation" />
              )}
              {(comments.data ?? []).map((c) => (
                <div key={c.id} className="rounded-md border border-border p-2">
                  <div className="text-foreground">{c.text}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</div>
                </div>
              ))}
              {can.comment(role) && <form onSubmit={(e) => { e.preventDefault(); if (comment) sendComment.mutate(); }} className="flex gap-1">
                <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add comment…"
                  className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs" />
                <button className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">Send</button>
              </form>}
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
              {(versions.data ?? []).length === 0 && (
                <li><EmptyState icon={History} title="No versions saved yet" hint="Save the editor to snapshot" /></li>
              )}
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

