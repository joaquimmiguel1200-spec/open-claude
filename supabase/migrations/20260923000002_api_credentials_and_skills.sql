-- Open Claude: user API credentials and skill catalog
create table if not exists public.api_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  provider text not null check (provider in ('openai','openrouter','anthropic','custom')),
  base_url text,
  model text,
  encrypted_key text not null,
  key_last4 text not null default '',
  enabled boolean not null default true,
  priority integer not null default 100,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);
create index if not exists api_credentials_user_priority_idx on public.api_credentials(user_id, enabled, priority);
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text not null,
  instructions text not null,
  source text not null default 'builtin' check (source in ('builtin','user','imported')),
  enabled boolean not null default true,
  version text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id,name)
);
create index if not exists skills_owner_enabled_idx on public.skills(owner_id,enabled);
create table if not exists public.user_skills (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  enabled boolean not null default true,
  priority integer not null default 100,
  created_at timestamptz not null default now(),
  primary key(user_id,skill_id)
);
alter table public.api_credentials enable row level security;
alter table public.skills enable row level security;
alter table public.user_skills enable row level security;
drop policy if exists "api_credentials_owner_select" on public.api_credentials for select to authenticated using ((select auth.uid())=user_id);
create policy "api_credentials_owner_select" on public.api_credentials for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "api_credentials_owner_insert" on public.api_credentials for insert to authenticated with check ((select auth.uid())=user_id);
create policy "api_credentials_owner_insert" on public.api_credentials for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "api_credentials_owner_update" on public.api_credentials for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "api_credentials_owner_update" on public.api_credentials for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "api_credentials_owner_delete" on public.api_credentials for delete to authenticated using ((select auth.uid())=user_id);
create policy "api_credentials_owner_delete" on public.api_credentials for delete to authenticated using ((select auth.uid())=user_id);
drop policy if exists "skills_builtin_or_owner_select" on public.skills for select to authenticated using (owner_id is null or owner_id=(select auth.uid()));
create policy "skills_builtin_or_owner_select" on public.skills for select to authenticated using (owner_id is null or owner_id=(select auth.uid()));
drop policy if exists "skills_owner_insert" on public.skills for insert to authenticated with check ((select auth.uid())=owner_id);
create policy "skills_owner_insert" on public.skills for insert to authenticated with check ((select auth.uid())=owner_id);
drop policy if exists "skills_owner_update" on public.skills for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
create policy "skills_owner_update" on public.skills for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
drop policy if exists "skills_owner_delete" on public.skills for delete to authenticated using ((select auth.uid())=owner_id);
create policy "skills_owner_delete" on public.skills for delete to authenticated using ((select auth.uid())=owner_id);
drop policy if exists "user_skills_owner_all" on public.user_skills for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "user_skills_owner_all" on public.user_skills for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

-- Built-in catalog: inspired by public Agent Skills patterns and the open repositories reviewed for Open Claude.
insert into public.skills(owner_id,name,description,instructions,source,enabled,version,tags)
select null,x.name,x.description,x.instructions,'builtin',true,'1.0.0',string_to_array(x.tags,',')
from (values
('coding-agent','Software engineering workflow for planning, editing, testing, reviewing and safely iterating on code.','Plan before changing code. Inspect relevant files and dependencies. Make minimal coherent edits. Run tests/build/typecheck. If a test fails, diagnose the actual failure and iterate. Never claim a command passed without evidence.','coding,development,engineering'),
('debugging','Systematic production and local debugging workflow.','Reproduce the failure when possible. Trace request boundaries, logs, inputs, persistence and external providers. Identify the first causal error, fix it at the source, then rerun the failing path and regression checks.','debug,diagnostics,errors'),
('web-app-testing','Browser-oriented verification workflow for web applications.','Verify critical routes, forms, navigation, API responses and console/runtime errors. Test the happy path and the failure path.','browser,testing,qa'),
('web-artifacts-builder','Build polished web interfaces and interactive artifacts with accessible responsive UI.','Use semantic HTML and accessible controls. Keep states explicit: loading, empty, error and success. Prefer reusable components and responsive layouts.','frontend,ui,web'),
('mcp-builder','Design and integrate Model Context Protocol servers and tools.','Define narrow tool contracts, validate inputs, enforce permissions, minimize returned data and handle transport failures. Never expose secrets through tool output.','mcp,tools,integration'),
('skill-creator','Create reusable Agent Skills from a clear SKILL.md contract.','Write a concise name and trigger description, then instructions, examples and safety boundaries. Keep skills composable and progressively loaded. Reject secrets and unsafe permission bypasses.','skills,authoring,agents'),
('seo','Technical and content SEO workflow for websites.','Inspect metadata, canonical URLs, robots, sitemap, structured data, headings, internal links, performance and search intent. Make evidence-based changes and avoid keyword stuffing.','seo,content,web'),
('data-analysis','Analyze tabular data with validation, cleaning, calculations and clear outputs.','Inspect schema and missing values first. Validate assumptions. Prefer reproducible transformations, explicit formulas and concise summaries. Flag uncertainty and data-quality issues.','data,analysis,spreadsheets'),
('pdf','PDF reading, extraction and document-processing workflow.','Extract text and tables while preserving structure when possible. For scanned documents use OCR when available. Validate page ranges and output files after transformations.','pdf,documents'),
('docx','Word document creation and editing workflow.','Preserve structure and formatting requirements. Use professional styles, headings, tables and references. Validate the resulting document and avoid corrupting existing content.','docx,documents'),
('pptx','Presentation creation and editing workflow.','Plan narrative and slide hierarchy first. Use consistent layouts, readable typography, concise text and validated charts. Review generated slides for overflow and visual defects.','pptx,presentations'),
('xlsx','Spreadsheet creation, editing and analysis workflow.','Inspect workbook structure and formulas before editing. Preserve formulas and formatting where required, validate calculations, and ensure the final workbook opens without formula errors.','xlsx,spreadsheets'),
('token-optimizer','Context and token efficiency workflow inspired by agent token-optimization patterns.','Prefer concise context, deduplicate repeated instructions, summarize stale history, retrieve only relevant files and keep tool outputs bounded. Never remove information needed for correctness.','tokens,context,optimization'),
('persistent-memory','Long-term memory workflow inspired by memory-agent patterns.','Capture stable preferences, decisions and project facts when useful. Avoid secrets and unnecessary personal data. Retrieve memories by relevance and recency, and let current user instructions override stale memory.','memory,context'),
('cowork','Collaborative workspace workflow for project-level agent work.','Separate planning from execution, track artifacts and state, ask for permission before consequential actions, and keep project context scoped.','cowork,projects,agents'),
('open-claude-code','Coding-agent workflow inspired by open coding-agent projects.','Inspect repository structure, create a plan, make focused changes, run verification, summarize changed files and surface remaining risks.','code,agent,github'),
('open-claude-cowork','Computer/workspace-agent workflow inspired by open Cowork projects.','Treat filesystem, browser and external actions as tools with explicit permissions. Keep actions reversible where possible and report exactly what changed.','cowork,automation'),
('omniroute','Multi-provider AI routing workflow inspired by OmniRoute patterns.','Select providers by configured priority, strategy and availability. Retry transient failures, preserve normalized errors and never log API keys or prompt secrets.','routing,providers,ai')
) as x(name,description,instructions,tags)
where not exists(select 1 from public.skills s where s.owner_id is null and s.name=x.name);
