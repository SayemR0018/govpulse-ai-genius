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

