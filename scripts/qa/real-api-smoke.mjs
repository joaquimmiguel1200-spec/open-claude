// Bateria de smoke tests reais das APIs do Open Claude.
// Requer BASE_URL e OPEN_CLAUDE_COOKIE. Não compartilhe o cookie.
// CODE_PAYLOAD e COWORK_PAYLOAD podem sobrescrever os payloads seguros padrão.
const base = (process.env.BASE_URL || 'https://open-claude-topaz.vercel.app').replace(/\/$/, '');
const cookie = process.env.OPEN_CLAUDE_COOKIE;
if (!cookie) { console.error('Defina OPEN_CLAUDE_COOKIE com o cookie de sessão autorizado; não o envie no chat.'); process.exit(2); }
const headers = { cookie, 'content-type': 'application/json' };
const codePayload = process.env.CODE_PAYLOAD ? JSON.parse(process.env.CODE_PAYLOAD) : { goal: 'Analise o README e proponha uma melhoria pequena sem aplicar alterações.', repository: 'joaquimmiguel1200-spec/open-claude', branch: 'main', paths: ['README.md'], apply: false };
const coworkPayload = process.env.COWORK_PAYLOAD ? JSON.parse(process.env.COWORK_PAYLOAD) : { goal: 'Crie um plano curto de organização semanal com prioridades e critérios de conclusão. Não envie mensagens nem altere sistemas externos.', maxTasks: 3, concurrency: 1 };
const tests = [
  ['01 health', 'GET', '/api/health'],
  ['02 workspace', 'GET', '/api/workspace'],
  ['03 models', 'GET', '/api/models'],
  ['04 providers', 'GET', '/api/settings/providers'],
  ['05 skills + agent profiles', 'GET', ['/api/settings/skills', '/api/agents/profiles']],
  ['06 MCP registry', 'GET', '/api/mcp'],
  ['07 GitHub connection', 'GET', '/api/github/connection'],
  ['08 Chat real inference', 'POST', '/api/chat', { message: 'Resuma em três pontos o que um SaaS precisa para ter onboarding seguro.', mode: 'chat', stream: false }],
  ['09 Code plan', 'POST', '/api/code', codePayload],
  ['10 Cowork execution', 'POST', '/api/cowork', coworkPayload],
];
let failed = 0;
for (const [name, method, target, body] of tests) {
  const started = Date.now();
  const paths = Array.isArray(target) ? target : [target];
  const results = [];
  for (const path of paths) {
    try {
      const response = await fetch(base + path, { method, headers: path === '/api/health' ? {} : headers, ...(body ? { body: JSON.stringify(body) } : {}) });
      const raw = await response.text();
      let data; try { data = JSON.parse(raw); } catch { data = raw.slice(0, 500); }
      results.push({ path, status: response.status, pass: response.ok, response: typeof data === 'string' ? data : JSON.stringify(data).slice(0, 600) });
      if (!response.ok) failed++;
    } catch (error) { failed++; results.push({ path, pass: false, error: String(error) }); }
  }
  console.log(JSON.stringify({ test: name, pass: results.every(x => x.pass), ms: Date.now() - started, results }));
}
console.log(JSON.stringify({ summary: { total: tests.length, failed, passed: tests.length - failed } }));
process.exit(failed ? 1 : 0);
