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
