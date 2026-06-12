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
