import { AlertTriangle, RefreshCw, Inbox } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-800 ${className}`} />;
}

export function AiSpinner({ size = 16 }: { size?: number }) {
  return (
    <span
      aria-label="AI working"
      className="inline-block animate-spin rounded-full"
      style={{
        width: size,
        height: size,
        background: "conic-gradient(from 0deg, transparent, #6366f1)",
        WebkitMask: "radial-gradient(circle, transparent 55%, black 56%)",
        mask: "radial-gradient(circle, transparent 55%, black 56%)",
      }}
    />
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  hint,
  action,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
      <Icon className="h-8 w-8 text-slate-500" />
      <div className="text-sm font-medium text-slate-200">{title}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
      {action}
    </div>
  );
}

export function ErrorCard({ error, reset }: { error: Error; reset?: () => void }) {
  const router = useRouter();
  return (
    <div className="mx-auto my-12 max-w-md rounded-xl border border-rose-900/60 bg-slate-900/60 p-6 text-center shadow-lg">
      <AlertTriangle className="mx-auto h-8 w-8 text-rose-400" />
      <h2 className="mt-2 text-base font-semibold text-white">Something went wrong</h2>
      <p className="mt-1 text-xs text-slate-400">{error.message || "Unexpected error"}</p>
      <button
        onClick={() => { reset?.(); router.invalidate(); }}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        <RefreshCw className="h-4 w-4" /> Retry
      </button>
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  const initial = ((name || "").trim() || "?").charAt(0).toUpperCase();
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600/30 text-[10px] font-semibold text-indigo-300">
      {initial}
    </span>
  );
}
