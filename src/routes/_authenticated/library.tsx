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

