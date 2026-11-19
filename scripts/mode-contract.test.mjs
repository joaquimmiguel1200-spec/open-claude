import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = async (path) => readFile(new URL('../' + path, import.meta.url), 'utf8')

test('Code mode generates a preview before any GitHub write', async () => {
  const ui = await source('app/chat/page.tsx')
  const api = await source('app/api/code/route.ts')
  assert.match(ui, /apply:false/)
  assert.match(ui, /applyCodePreview/)
  assert.match(ui, /apply:true/)
  assert.match(api, /if \(!apply\) return NextResponse\.json/)
  assert.match(api, /Only edit files supplied in CONTEXT/)
})

test('Code mode scopes edits to explicitly selected paths', async () => {
  const api = await source('app/api/code/route.ts')
  assert.match(api, /snapshots\.filter\(\(file\) => paths\.includes\(file\.path\)\)/)
  assert.match(api, /O modelo tentou alterar um caminho não autorizado/)
})

test('Code sandbox uses a package-registry allowlist instead of unrestricted egress', async () => {
  const runner = await source('src/lib/sandbox/vercel-sandbox-runner.ts')
  assert.match(runner, /'registry\.npmjs\.org'/)
  assert.match(runner, /'registry\.yarnpkg\.com'/)
  assert.match(runner, /'deny-all'/)
  assert.doesNotMatch(runner, /networkPolicy:\s*request\.allowNetwork\s*\?\s*'allow-all'/)
})

test('Cowork UI calls its orchestration endpoint with the expected goal contract', async () => {
  const ui = await source('app/chat/page.tsx')
  const api = await source('app/api/cowork/route.ts')
  assert.match(ui, /fetch\('\/api\/cowork'/)
  assert.match(ui, /JSON\.stringify\(\{goal:submitted/)
  assert.match(api, /const goal = String\(body\?\.goal/)
  assert.match(api, /createCoworkRuntime/)
})

test('Cowork persists both the user request and execution outcome', async () => {
  const api = await source('app/api/cowork/route.ts')
  assert.match(api, /role: 'user',[\s\S]*?content: goal/)
  assert.match(api, /role: 'assistant',[\s\S]*?result\.status === 'completed'/)
})

test('Code and Cowork terminals require authentication and apply per-user limits', async () => {
  const codeTerminal = await source('app/api/code/terminal/route.ts')
  const coworkTerminal = await source('app/api/cowork/terminal/route.ts')
  for (const route of [codeTerminal, coworkTerminal]) {
    assert.match(route, /requireUser\(\)/)
    assert.match(route, /rateLimit\(/)
    assert.match(route, /runPersistentTerminal\(/)
  }
})

test('Persistent terminal validates paths and isolates workspace names by user scope', async () => {
  const terminal = await source('src/lib/sandbox/persistent-terminal.ts')
  assert.match(terminal, /function safePath/)
  assert.match(terminal, /part === '\.\.'/)
  assert.match(terminal, /createHash\('sha256'\)\.update\(input\.scope\)/)
})


test('Cowork creates a task plan dynamically and validates dependency graphs', async () => {
  const planner = await source('src/lib/cowork/cowork-planner.ts')
  const runtime = await source('src/lib/cowork/cowork-runtime.ts')
  const route = await source('app/api/cowork/route.ts')
  assert.match(planner, /export function parseCoworkPlan/)
  assert.match(planner, /const visit = \(id: string\): boolean/)
  assert.match(runtime, /input\.plan \?\? createCoworkPlan/)
  assert.match(route, /mode: 'cowork-planning'/)
  assert.match(route, /dynamicPlanUsed/)
})


test('Code can discover a repository workspace when no paths are supplied', async () => {
  const types = await source('src/types/github.ts')
  const github = await source('src/lib/github/github-client.ts')
  const api = await source('app/api/code/route.ts')
  const terminal = await source('app/api/code/terminal/route.ts')
  assert.match(types, /listFiles\(/)
  assert.match(github, /branches\/\$\{encodeURIComponent\(ref \|\| repository\.default_branch\)\}/)
  assert.match(api, /const candidatePaths = requestedPaths\.length \? requestedPaths : autoPaths/)
  assert.match(api, /allowedDirectories/)
  assert.match(terminal, /requestedPaths\.length \? requestedPaths : tree/)
})


test('Cowork persists event history and supports retrieving runs by owner-scoped API', async () => {
  const api = await source('app/api/cowork/route.ts')
  const migration = await source('supabase/migrations/20261119013039_cowork_run_persistence.sql')
  assert.match(api, /from\('cowork_runs'\)\.upsert/)
  assert.match(api, /export async function GET/)
  assert.match(api, /\.eq\('user_id', user\.id\)/)
  assert.match(migration, /enable row level security/)
  assert.match(migration, /auth\.uid\(\)/)
})

test('Workspace navigation follows the dashboard sequence and current brand theme', async () => {
  const chat = await source('app/chat/page.tsx')
  assert.match(chat, /label:'Início'.*label:'Projetos'.*label:'Chat'.*label:'Code'.*label:'Cowork'.*label:'Agentes'/s)
  assert.ok(chat.includes('Final workspace navigation tokens'))
  assert.ok(chat.includes('.claude-sidebar{background:linear-gradient(180deg,#10182d'))
  assert.ok(chat.includes('.claude-nav button.active'))
})

test('Code and Cowork terminals share the same isolated project or chat workspace', async () => {
  const code = await source('app/api/code/terminal/route.ts')
  const cowork = await source('app/api/cowork/terminal/route.ts')
  const terminal = await source('src/lib/sandbox/persistent-terminal.ts')
  assert.ok(code.includes('workspace:project:${projectId}'))
  assert.ok(code.includes('workspace:chat:${chatId}'))
  assert.ok(cowork.includes('workspace:project:${projectId}'))
  assert.ok(cowork.includes('workspace:chat:${chatId}'))
  assert.ok(terminal.includes('(input.files ?? []).slice(0, 50)'))
})
