import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const coworkRoute = readFileSync(new URL('../app/api/cowork/route.ts', import.meta.url), 'utf8')
const codeRoute = readFileSync(new URL('../app/api/code/route.ts', import.meta.url), 'utf8')

test('Cowork runtime honors the validated concurrency requested by the caller', () => {
  assert.match(coworkRoute, /maxConcurrency:\s*concurrency/)
  assert.doesNotMatch(coworkRoute, /maxConcurrency:\s*3\s*\}/)
})

test('Code repository discovery considers a wider set of candidate files', () => {
  assert.match(codeRoute, /requestedPaths[\s\S]*?slice\(0,\s*100\)/)
  assert.match(codeRoute, /autoPaths\.slice\(0,\s*80\)/)
})
