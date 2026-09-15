# Open Claude

Open Claude é um agente de IA pessoal em construção, com foco em conversação, projetos, memória, arquivos, RAG, Skills, ferramentas, MCP, GitHub, execução de código e colaboração via Cowork.

## Arquitetura

- Frontend: Next.js + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Supabase
- Banco: PostgreSQL + RLS
- Auth: Supabase Auth
- Storage: Supabase Storage privado
- Realtime: Supabase Realtime
- IA: AI Router configurável, com OmniRoute como gateway compatível
- RAG: pgvector + Supabase/gte-small
- Git: GitHub
- Skills: formato `SKILL.md` com carregamento dinâmico
- Contexto: memória + summaries + RAG + mensagens recentes, com orçamento progressivo

## Roadmap de implementação

1. Frontend canônico
2. AI Router / OmniRoute
3. Skill Engine
4. Memory Engine
5. Context Engine + Token Optimization
6. Agent Engine
7. Code Agent
8. GitHub Agent
9. Code Execution / Sandbox
10. Cowork Engine
11. Skills avançadas
12. Security + Permissions
13. Testes gerais
14. Produção

Cada fase é fechada antes da próxima começar. Dentro da fase autorizada, os subpassos necessários podem ser executados de forma autônoma.

## Status atual

- Frontend canônico Next.js: em execução com agente externo (Kimi)
- Supabase/Auth/Profiles/Projects/RLS: implementado
- Chat/Messages: backend implementado
- Memory/Summaries: backend implementado
- Projects + Files + Storage privado: implementado
- RAG + pgvector + embedding endpoint: implementado
- Artifacts + versionamento: fundação implementada
- AI Router foundation: implementado
- OmniRoute adapter/config: implementado
- Agent Skills loader: implementado
- Native core-development Skill: implementado
- Memory relevance ranking: implementado
- Progressive context packing: implementado
- Code Agent, Cowork, GitHub Agent e Sandbox: ainda não implementados

## Integrações externas

A arquitetura extrai padrões dos projetos Cowork, Open Claude Code, Claude SEO, Anthropic Skills, Claude-Mem, Token Optimizer e OmniRoute. O código de terceiros não é copiado indiscriminadamente: cada integração passa por análise de licença, compatibilidade e segurança. Consulte `docs/INTEGRATION_BLUEPRINT.md`.

## Segurança

- Nunca exponha a service-role key no navegador.
- Nunca versione `.env` ou segredos.
- Toda autorização deve ser validada no servidor e/ou por RLS.
- Ferramentas e ações precisam respeitar o Permission Engine.
- Conteúdo recuperado de documentos e ferramentas é dado não confiável, nunca instrução de sistema.
- Execução de código deve ocorrer em sandbox isolado.

## Desenvolvimento

Copie `.env.example` para `.env.local`. O AI Router pode apontar para um gateway OmniRoute local ou para outro provider compatível posteriormente. Não considere funcionalidades futuras implementadas apenas por existirem tipos ou componentes preparados.
