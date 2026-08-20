import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRfps, getRfp } from "@/lib/rfp.functions";
import { extractRequirements } from "@/lib/ai.functions";
import { useState } from "react";
import { Upload, Sparkles, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ErrorCard, AiSpinner, Skeleton } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/ingest")({
  head: () => ({ meta: [{ title: "Ingest RFP — GovPulse AI" }] }),
  component: IngestPage,
  errorComponent: ({ error, reset }) => <ErrorCard error={error as Error} reset={reset} />,
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
    queryFn: () => (selectedRfp ? getRfpFn({ data: { rfpId: selectedRfp } }) : Promise.reject("No RFP selected")),
    enabled: !!selectedRfp,
  });

  const extract = useMutation({
    mutationFn: () => {
      if (!selectedRfp) throw new Error("Please select an RFP first");
      if (text.trim().length < 20) throw new Error("RFP document text must be at least 20 characters");
      return extractFn({ data: { rfpId: selectedRfp, documentText: text } });
    },
    onSuccess: (res) => {
      const pages = Math.max(1, Math.ceil(text.length / 3000));
      toast.success(`Extracted ${res.count} requirements from ${pages} page${pages > 1 ? "s" : ""}`);
      qc.invalidateQueries({ queryKey: ["rfp", selectedRfp] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Extraction failed"),
  });
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const pageCount = Math.max(1, Math.ceil(text.length / 3000));

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
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {extract.isPending ? <AiSpinner /> : <Sparkles className="h-4 w-4" />}
              Extract with AI
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">Extracted Requirements</h2>
              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" />{pageCount} pages</span>
                <span>{wordCount.toLocaleString()} words</span>
              </div>
            </div>
            <div className="space-y-2">
              {detail.isLoading && <Skeleton className="h-24 w-full" />}
              {!detail.isLoading && (detail.data?.requirements ?? []).length === 0 && (
                <EmptyState icon={Upload} title="No requirements yet" hint="Paste text and run Extract with AI" />
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

