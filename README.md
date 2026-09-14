# Open Claude

Open Claude é um agente de IA pessoal em construção, com foco em conversação, projetos, memória, arquivos, RAG, ferramentas, MCP, GitHub, execução de código e colaboração via Cowork.

## Arquitetura

- Frontend: Next.js + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Supabase
- Banco: PostgreSQL + RLS
- Auth: Supabase Auth
- Storage: Supabase Storage
- Realtime: Supabase Realtime
- IA: camada de provedor configurável, inicialmente orientada ao Lovable API
- Busca vetorial: pgvector em etapa posterior
- Git: GitHub

## Etapas

1. Fundação
2. Supabase + Auth
3. Chat
4. Memória
5. Projects + Files
6. RAG
7. Artifacts
8. MCP + Tools
9. GitHub Agent
10. Code Execution
11. Cowork
12. Security + Autonomy

## Etapa 3 — Chat

O banco possui a base para chats e mensagens. A camada de aplicação deve persistir mensagens, manter histórico, preparar streaming e encaminhar contexto ao agente sem impor limites artificiais de mensagens ou sessões.

## Segurança

- Nunca exponha a service-role key no navegador.
- Nunca versione `.env` ou segredos.
- Toda autorização deve ser validada no servidor e/ou por RLS.
- Ferramentas e ações precisam respeitar o Permission Engine.
- Conteúdo recuperado de documentos é dado não confiável, nunca instrução de sistema.
- Execução de código deve ocorrer em sandbox isolado.

## Desenvolvimento

Copie `.env.example` para `.env.local` e preencha as configurações locais. O repositório será evoluído por etapas; não considere funcionalidades futuras implementadas apenas por existirem tipos ou componentes preparados.
