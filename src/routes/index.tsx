import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GovPulse AI — Enterprise Grant & RFP Response Automation" },
      {
        name: "description",
        content:
          "AI-powered RFP ingestion, drafting, and compliance review for federal proposal teams.",
      },
      { property: "og:title", content: "GovPulse AI" },
      {
        property: "og:description",
        content:
          "AI-powered RFP ingestion, drafting, and compliance review for federal proposal teams.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <Sparkles className="h-5 w-5 text-ai" />
          GovPulse AI
        </div>
        <Link
          to="/auth"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Sign in
        </Link>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-24 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Enterprise demo build
        </div>
        <h1 className="bg-clip-text text-5xl font-semibold tracking-tight md:text-6xl">
          Win more federal contracts.
          <span className="block bg-[image:var(--gradient-ai)] bg-clip-text text-transparent">
            In a fraction of the time.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Ingest RFPs, extract compliance requirements, draft sections, and ship audit-ready
          proposals — all in one AI-native workspace.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-ai)] hover:opacity-90"
          >
            Launch demo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
