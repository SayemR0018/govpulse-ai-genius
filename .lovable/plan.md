# GovPulse AI — Build Plan

Enterprise grant/RFP response platform. Build the full surface end-to-end, with AI wired through Lovable AI Gateway and real auth via Lovable Cloud.

## 1. Stack adaptations (vs. original spec)

- **AI**: Lovable AI Gateway (`google/gemini-3-flash-preview`) instead of OpenAI directly. No `OPENAI_API_KEY` needed — `LOVABLE_API_KEY` is auto-provisioned.
- **Backend**: TanStack `createServerFn` instead of Supabase Edge Functions. Same security model (server-only secrets), simpler.
- **DB**: Lovable Cloud (Supabase under the hood). Real email/password auth + a demo role-switcher overlay.
- Everything else (schema, screens, design system) matches your spec.

## 2. Route map

```
/                        Executive Dashboard          (_authenticated)
/ingest                  RFP Ingestion Hub            (_authenticated)
/ingest/:rfpId           Ingestion for one RFP        (_authenticated)
/workspace/$rfpId        AI Drafting Workspace (HERO) (_authenticated)
/library                 Content Library              (_authenticated)
/analytics               Team Analytics               (_authenticated)
/settings                Settings + org switcher      (_authenticated)
/auth                    Login / Signup + SSO sim     (public)
```

All app routes live under integration-managed `_authenticated/`. `/auth` is public.

## 3. Component tree

```
__root.tsx
└─ QueryClientProvider + AuthListener + Toaster
   ├─ /auth → AuthShell (SignIn / SignUp tabs, mock SSO buttons, role preview)
   └─ _authenticated/route.tsx (managed gate)
      └─ AppLayout
         ├─ Sidebar (Dashboard, Active RFPs, Library, Analytics, Settings)
         ├─ Topbar (RoleSwitcher, NotificationsBell, OrgSwitcher, UserMenu)
         └─ <Outlet />
            ├─ DashboardPage
            │   ├─ KpiCards (4)
            │   ├─ RfpKanban (5 columns, dnd-kit, status drag updates)
            │   └─ ActivityFeed
            ├─ IngestPage
            │   ├─ PdfDropzone + DocPreview
            │   └─ RequirementExtractorTable (risk badges, assignee dropdown)
            ├─ WorkspacePage  [HERO]
            │   ├─ SectionTreeSidebar (completion %, drag-to-reorder)
            │   ├─ SectionEditor (Tiptap) + AiActionBar
            │   └─ RightTabs: ComplianceRing | CommentsThread | VersionHistory
            ├─ LibraryPage (search, tag filter, reuse count)
            ├─ AnalyticsPage (recharts: win-rate, throughput, SME load)
            └─ SettingsPage (org, members, role assignment)
```

Shared UI: shadcn (already in project) + RiskBadge, StatusPill, ComplianceRing, SkeletonLoader, AiSpinner.

## 4. Database schema (migration)

Enums:

```sql
create type app_role as enum ('proposal_manager', 'sme', 'compliance_auditor');
create type rfp_status as enum ('ingestion','parsing','drafting','review','submitted');
create type risk_level as enum ('high','med','low');
create type req_status as enum ('pending','met','warning');
```

Tables (all with GRANTs + RLS):

1. `organizations(id, name, plan_tier, created_at)`
2. `org_members(org_id, user_id, joined_at)` — membership join
3. `user_roles(id, user_id, org_id, role app_role, unique(user_id,org_id,role))` — separate from profiles
4. `profiles(id=auth.uid, display_name, avatar_url, current_org_id)`
5. `rfp_projects(id, org_id, title, issuing_agency, budget, due_date, status, win_probability, created_by, created_at)`
6. `rfp_requirements(id, rfp_id, text_snippet, risk_level, status, assigned_user_id)`
7. `proposal_sections(id, rfp_id, section_name, ai_draft, human_edits, version_number, compliance_status, assigned_to)`
8. `section_versions(id, section_id, content, version_number, created_by, created_at)` — append-only history
9. `workspace_comments(id, section_id, user_id, text, created_at)`
10. `content_library(id, org_id, title, content_body, tags text[], reuse_count, created_at)`

Security definer functions: `has_role(uid, org, role)`, `is_org_member(uid, org)`.

RLS pattern: every table scopes to `is_org_member(auth.uid(), org_id)`; writes additionally gated by role per spec:

- Proposal Manager: full RW on rfp_projects, requirements, sections (incl. assignments).
- SME: SELECT all; UPDATE sections only WHERE `assigned_to = auth.uid()`; INSERT comments.
- Compliance Auditor: UPDATE `compliance_status` on sections + `status` on requirements.

Profile auto-create trigger on `auth.users` insert.

## 5. Server functions (`createServerFn`)

All in `src/lib/*.functions.ts`, secrets read inside `.handler()`. AI helper lives in `src/lib/ai-gateway.server.ts`.

| Function                                                                             | Purpose                                                                                    |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `extractRequirements({ rfpId, documentText })`                                       | AI: parse PDF text → structured requirements list with risk levels (Output schema via Zod) |
| `generateSectionDraft({ sectionId, prompt, context })`                               | AI: produce initial section draft                                                          |
| `improveTone({ sectionId, text, tone })`                                             | AI: rewrite selection                                                                      |
| `autocomplete({ sectionId, precedingText })`                                         | AI: short continuation                                                                     |
| `regenerateSection({ sectionId })`                                                   | AI: re-draft from requirements                                                             |
| `scoreCompliance({ sectionId })`                                                     | AI: returns score 0–100 + flagged gaps                                                     |
| `estimateWinProbability({ rfpId })`                                                  | AI: aggregate score                                                                        |
| `assignRequirement / updateSectionStatus / addComment / createRfp / updateRfpStatus` | Standard CRUD with `requireSupabaseAuth`                                                   |
| `switchActiveRole({ role })`                                                         | Demo-only: writes selected role to `profiles.current_role_preview`                         |

PDF upload → text extraction handled client-side with `pdfjs-dist` (Worker-safe via web worker) to avoid Node-only deps on the server; extracted text posted to `extractRequirements`.

For the streaming inline editor actions (autocomplete), use a server route `src/routes/api/ai/stream.ts` with `streamText` + `useChat`-style transport. Non-stream calls go through server functions.

## 6. State management

- **Server state**: TanStack Query (already in template). All DB reads via `useSuspenseQuery` in loaders; mutations via `useMutation` + `queryClient.invalidateQueries`.
- **Auth/session**: single `onAuthStateChange` listener in `__root.tsx` (per integration pattern).
- **UI state**: React local state + a small `useUiStore` (Zustand) for: active org id, demo role preview, sidebar collapse, current editor selection. Zustand chosen over Context to avoid re-render cascades in the editor.
- **Editor**: Tiptap with collaboration extension disabled (single-user edits + version snapshots on save).

## 7. Design system

- Base: `bg-slate-950` dark canvas, white/`bg-slate-900` cards, `emerald-500` success, `indigo-500` AI ops, `amber-500` warn, `rose-500` risk.
- Tokens added to `src/styles.css` as semantic vars (`--ai`, `--ai-foreground`, `--success`, `--risk-high/med/low`) so components never hardcode colors.
- Lucide icons only.
- Skeleton loaders on every async surface; `AiSpinner` (rotating conic-gradient ring) for in-flight AI calls.
- Hover/focus states standardized via shadcn variants.

## 8. Auth + Role switcher

- Real Lovable Cloud email/password signup → trigger creates profile + default org + `proposal_manager` role.
- `/auth` shows mock SSO buttons (Google/Microsoft) that visually trigger and fall back to email/password (no real OAuth setup unless requested later).
- Topbar `RoleSwitcher` lets the demo viewer preview any of the 3 roles. Stored on `profiles.current_role_preview`; UI gating reads from it; **RLS still enforces real roles** (the switcher only hides/shows UI affordances — it can't escalate DB privileges).

## 9. Packages to add

- `@tanstack/react-query` (present), `zustand`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@tiptap/react` + starter-kit + placeholder, `recharts`, `pdfjs-dist`, `date-fns`, `zod` (present), `ai`, `@ai-sdk/openai-compatible`.

## 10. Build sequence (single pass)

1. Migration + GRANTs + RLS + triggers
2. AI gateway helper + 1–2 server functions
3. Auth shell + `_authenticated` layout + topbar/sidebar
4. Dashboard (Kanban + KPIs + feed with mock activity)
5. Ingestion (dropzone + extract pipeline)
6. Workspace (Tiptap + AI action bar + right tabs)
7. Library + Analytics + Settings
8. Polish: skeletons, empty states, hover/focus pass, head() metadata per route

## 11. Open questions before I build

1. **PDF parsing**: OK to parse client-side with pdfjs-dist (keeps server worker-light)? If you want server-side OCR for scanned PDFs, that's a meaningfully bigger lift.
2. **Drag-and-drop on Kanban**: confirm dragging a card should actually update `rfp_projects.status` in the DB (not just visual).
3. **Mock activity feed**: synthesize from real events (inserts/updates) via a `lov-activity` table written by triggers, or a static rotating mock list? Real is better long-term, mock is faster.
4. **SSO buttons**: visual-only for the demo, or wire real Google sign-in via the Lovable broker (requires `supabase--configure_social_auth` for Google)?
