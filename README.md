# Open Claude

Open Claude é um workspace de IA pessoal inspirado em fluxos modernos de Chat, Code, Projects, Artifacts e Cowork. O projeto combina conversação, memória, RAG, Skills, ferramentas, MCP, GitHub, execução isolada e automação multi-etapas.

> **Aviso de escopo:** Open Claude é um projeto independente e não é afiliado à Anthropic. A interface e os nomes de modos são implementações próprias inspiradas em padrões de produto conhecidos.

## Navegação

- [Visão geral e arquitetura](docs/ARCHITECTURE.md)
- [Como instalar e executar](docs/USAGE.md)
- [AI Router e modelos](docs/AI_ROUTER.md)
- [Code Agent](docs/CODE_AGENT.md)
- [Cowork Engine](docs/COWORK_ENGINE.md)
- [Agent Engine](docs/AGENT_ENGINE.md)
- [Projects, Files e Storage](docs/PROJECTS_FILES.md)
- [Artifacts](docs/ARTIFACTS.md)
- [Skills](docs/SKILLS_ENGINE.md)
- [Tools](docs/TOOL_ENGINE.md)
- [MCP](docs/MCP_ENGINE.md)
- [Sandbox](docs/SANDBOX_ENGINE.md)
- [Memória](docs/MEMORY_ENGINE.md)
- [RAG](docs/RAG.md)
- [Política de Privacidade](docs/privacy-policy.md)
- [Política de Segurança](docs/security-policy.md)
- [Contribuição](CONTRIBUTING.md)
- [Licença](LICENSE)

## Funcionalidades

### Chat
Conversação com streaming, histórico persistido, Projects, instruções personalizadas, memória, RAG, Skills e seleção explícita de modelo.

### Code
Modo orientado a desenvolvimento: planejamento, contexto de código, revisão, geração de alterações, validação e integração com GitHub quando o ambiente possui as credenciais e permissões necessárias. O Code Agent existente usa validação de caminhos, controle por SHA, limites de arquivos e loop de testes em sandbox.

### Cowork
Modo de delegação multi-etapas. O Cowork Engine cria um plano, respeita dependências, executa tarefas com concorrência limitada, emite eventos, cria checkpoints e permite pause/resume/cancel.

### Modelos
O AI Router possui abstração de provider/model, seleção por estratégia, fallback, timeout, retry, streaming, usage, custo e erros normalizados. Providers compatíveis com OpenAI/Anthropic e OmniRoute/OpenRouter podem ser configurados.

Para OmniRoute/OpenRouter, o modelo gratuito usado como padrão é `nvidia/nemotron-3-ultra-550b-a55b:free`. Outros modelos podem ser expostos por `AI_MODELS` ou cadastrados em **Settings → APIs**.

## Stack

- Frontend: Next.js 16 + React + TypeScript
- Backend: Supabase
- Banco: PostgreSQL + RLS
- Auth: Supabase Auth com sessão SSR
- Storage: Supabase Storage privado
- IA: AI Router / OmniRoute
- RAG: pgvector + embeddings
- Git: GitHub Agent
- Skills: `SKILL.md`
- Segurança: Zod, rate limit, RLS, Permission Engine, sandbox, headers, secret scanning e dependency audit

## Instalação

```bash
git clone https://github.com/joaquimmiguel1200-spec/open-claude.git
cd open-claude
npm install
cp .env.example .env.local
npm run dev
```

Acesse `http://localhost:3000`.

## Configuração mínima

Configure no `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
AI_PROVIDER=omniroute
OMNIROUTE_ENABLED=true
OMNIROUTE_BASE_URL=https://openrouter.ai/api/v1
OMNIROUTE_API_KEY=...
AI_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
AI_ROUTING_STRATEGY=free
```

Opcionalmente, exponha vários modelos no mesmo provider:

```env
AI_MODELS=nvidia/nemotron-3-ultra-550b-a55b:free,openai/gpt-oss-120b:free,google/gemini-2.5-flash:free
```

Os nomes precisam ser modelos aceitos pelo endpoint configurado. O Open Claude não presume que todo modelo listado pelo provider tenha as mesmas capacidades.

## Produção

O alvo recomendado é Vercel para o Next.js e Supabase para Auth/Database/Storage. Configure todas as variáveis de produção e `NEXT_PUBLIC_SITE_URL` com o domínio definitivo.

O CI executa instalação, diagnóstico TypeScript, build de produção e verificações de segurança. O deploy só deve ser considerado concluído quando o deployment estiver `READY`.

## Segurança

- Chaves secretas e service-role ficam no servidor.
- RLS é a fronteira de autorização do banco.
- Inputs são validados com Zod.
- Uploads têm limites de tamanho/MIME/nome.
- Sessões usam SSR e cookies seguros.
- HTTPS/HSTS e headers de segurança são aplicados em produção.
- Conteúdo de RAG, Skills, MCP e ferramentas é tratado como não confiável.
- Execução de código deve passar por sandbox isolado.

## Licença

Este projeto está licenciado sob a **MIT License**. O arquivo legal completo está em [`LICENSE`](LICENSE). A presença de um arquivo de licença na raiz é a forma recomendada pelo GitHub para tornar a licença detectável e mostrar suas condições aos usuários.

## Contribuição

Leia [`CONTRIBUTING.md`](CONTRIBUTING.md) antes de abrir uma alteração. Para vulnerabilidades, use [`SECURITY.md`](SECURITY.md) em vez de publicar detalhes de exploração em uma issue.
