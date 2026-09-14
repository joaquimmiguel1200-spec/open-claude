# Open Claude

Open Claude é um agente de IA pessoal em construção, com foco em conversação, projetos, memória, arquivos, RAG, ferramentas, MCP, GitHub, execução de código e colaboração via Cowork.

## Arquitetura

- Frontend: Next.js + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Supabase
- Banco: PostgreSQL + RLS
- Auth: Supabase Auth
- Storage: Supabase Storage privado
- Realtime: Supabase Realtime
- IA: camada de provedor configurável, inicialmente orientada ao Lovable API
- RAG: pgvector + Supabase/gte-small
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

## Status atual

- Etapa 1 — frontend canônico Next.js: em execução com agente de código externo (Kimi); Lovable não é obrigatório para o frontend canônico
- Etapa 2 — backend de Auth/Profiles/Projects/RLS: implementado
- Etapa 3 — backend de Chat/Messages: implementado
- Etapa 4 — backend de Memory/Summaries: implementado
- Etapa 5 — backend de Projects + Files + Storage privado: implementado
- Etapa 6 — backend de RAG + pgvector + embedding endpoint: implementado
- Etapa 7 — backend de Artifacts + versionamento: fundação implementada

## Etapa 5 — Projects + Files

Projects são o limite de workspace para chats, memória e arquivos, com papéis `owner`, `editor` e `viewer`.

Arquivos possuem um catálogo em `public.files` e bytes em um bucket privado `open-claude-files`. O catálogo guarda dono, projeto/chat, nome, pasta virtual, MIME, tamanho, checksum, origem e caminho de Storage. A autorização é aplicada por RLS no banco e por políticas em `storage.objects`.

## Etapa 6 — RAG

O RAG usa `public.rag_chunks` para armazenar trechos de arquivos e embeddings de 384 dimensões. O modelo inicial é `Supabase/gte-small`, executado diretamente em uma Edge Function autenticada, sem depender de uma API externa de embeddings.

A recuperação usa pgvector/HNSW com vetores normalizados e também mantém busca lexical para ranking híbrido. `match_rag_chunks()` filtra por usuário, Project e arquivo, aplica limiar de similaridade e limita o retorno a 50 resultados.

O pipeline esperado é: arquivo → extração de texto → chunking → chunks pendentes → embedding → chunks prontos → recuperação → contexto para o agente. O texto recuperado é sempre tratado como dado não confiável e nunca como instrução de sistema.

## Etapa 7 — Artifacts

A fundação de Artifacts usa `public.artifacts` e `public.artifact_versions` para representar artefatos editáveis e seu histórico de versões. Artefatos podem ser pessoais ou vinculados a Projects/chats. O conteúdo textual por versão é limitado a 10 MiB e protegido por RLS.

A camada visual de editor/preview, renderização e execução isolada ainda pertence à implementação frontend e às etapas posteriores. Execução de código não faz parte desta fundação.

## Segurança

- Nunca exponha a service-role key no navegador.
- Nunca versione `.env` ou segredos.
- Toda autorização deve ser validada no servidor e/ou por RLS.
- Ferramentas e ações precisam respeitar o Permission Engine.
- Conteúdo recuperado de documentos é dado não confiável, nunca instrução de sistema.
- Execução de código deve ocorrer em sandbox isolado.

## Desenvolvimento

Copie `.env.example` para `.env.local` e preencha as configurações locais. O repositório será evoluído por etapas; não considere funcionalidades futuras implementadas apenas por existirem tipos ou componentes preparados.
