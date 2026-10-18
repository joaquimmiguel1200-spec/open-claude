# Open Claude

Workspace independente de IA para Chat, Code, Projects, Artifacts e Cowork, com infraestrutura para memória, RAG, Skills, ferramentas, MCP, integração com GitHub e execução isolada.

> **Aviso:** Open Claude não é afiliado, patrocinado ou endossado pela Anthropic. “Claude” e outras marcas pertencem aos respectivos titulares. Este projeto implementa fluxos próprios inspirados em padrões de ferramentas de IA.

[![CI](https://github.com/joaquimmiguel1200-spec/open-claude/actions/workflows/ci.yml/badge.svg)](https://github.com/joaquimmiguel1200-spec/open-claude/actions/workflows/ci.yml) ![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg) ![Next.js](https://img.shields.io/badge/Next.js-16-black)

## Índice

- [Recursos](#recursos)
- [Arquitetura](#arquitetura)
- [Começar](#começar)
- [Configuração](#configuração)
- [Autenticação OAuth](#autenticação-oauth)
- [MCPs e integrações](#mcps-e-integrações)
- [Segurança](#segurança)
- [Documentação](#documentação)
- [Licença e contribuições](#licença-e-contribuições)

## Recursos

| Área | Objetivo |
|---|---|
| **Chat** | Conversas, histórico, seleção de modelos, instruções e contexto |
| **Code** | Fluxo de desenvolvimento com validação de alterações e integração GitHub quando configurada |
| **Cowork** | Planejamento e execução de tarefas multi-etapas com checkpoints e cancelamento |
| **Projects & Files** | Organização de trabalho e arquivos |
| **AI Router** | Abstração de provider/modelo, streaming, timeout, retry e fallback conforme configuração |
| **MCP** | Descoberta e chamada de ferramentas MCP por transportes implementados e configurados |
| **Segurança** | Supabase Auth, RLS, validação de entradas, limites e permissões |

Os recursos dependem de configuração, credenciais, permissões e disponibilidade dos serviços externos. Uma integração documentada não significa que esteja habilitada na implantação.

## Arquitetura

- **Frontend e rotas:** Next.js + React + TypeScript
- **Identidade e dados:** Supabase Auth, PostgreSQL, RLS e Storage
- **IA:** AI Router com provider e modelo configuráveis
- **Integrações:** GitHub Agent, MCP e ferramentas autorizadas
- **Deploy:** Vercel

## Começar

Requisitos: Node.js 22 e npm.

```bash
git clone https://github.com/joaquimmiguel1200-spec/open-claude.git
cd open-claude
npm install
cp .env.example .env.local
npm run dev
```

Abra http://localhost:3000. Antes de usar serviços reais, preencha as variáveis necessárias no arquivo local. Nunca envie `.env.local` ao Git.

## Configuração

Variáveis comuns (a lista efetiva depende dos módulos habilitados):

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
AI_PROVIDER=omniroute
OMNIROUTE_ENABLED=true
OMNIROUTE_BASE_URL=https://openrouter.ai/api/v1
OMNIROUTE_API_KEY=
AI_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
AI_ROUTING_STRATEGY=free
```

Configure secrets em variáveis de ambiente protegidas no ambiente de deploy. Nunca use prefixo `NEXT_PUBLIC_` em chaves privadas, tokens de provider, chaves service-role ou chaves de criptografia.

## Autenticação OAuth

A interface oferece entrada por Google, Microsoft e GitHub, além de e-mail e senha. Para que os botões funcionem em produção, cada provider precisa ser habilitado no painel Supabase Auth, com Client ID/Secret válidos e URLs de callback permitidas para o domínio local e de produção. O callback configurado na aplicação é `/auth/callback`. A presença dos botões, sozinha, não configura credenciais de terceiros.

## MCPs e integrações

O motor MCP documentado suporta descoberta e execução de ferramentas e operações de resources/prompts nos transportes descritos em [MCP Engine](docs/MCP_ENGINE.md). Cada servidor externo precisa ser configurado explicitamente e receber apenas as credenciais e permissões necessárias. Não há um único pacote público que habilite automaticamente “todos os MCPs da Anthropic”: os servidores disponíveis dependem do produto, do provider, das licenças e da configuração. Consulte a documentação oficial do [Model Context Protocol](https://modelcontextprotocol.io/) e a [documentação da Anthropic](https://docs.anthropic.com/) antes de habilitar integrações.

## Segurança

- Leia [SECURITY.md](SECURITY.md) e a [Política de Segurança](docs/security-policy.md).
- Use credenciais de menor privilégio e mantenha secrets no servidor.
- Revise RLS e políticas de Storage para todas as tabelas/buckets com dados de usuários.
- Trate arquivos, prompts, resultados de ferramentas e respostas MCP como dados não confiáveis.
- Execute código apenas em sandbox isolado e com permissões explícitas.
- Não declare conformidade ou segurança total sem testes e revisão independentes.
- Reporte vulnerabilidades de forma privada ao mantenedor; não publique exploits ou dados pessoais em issues.

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md)
- [Uso](docs/USAGE.md)
- [AI Router](docs/AI_ROUTER.md)
- [Code Agent](docs/CODE_AGENT.md)
- [Cowork Engine](docs/COWORK_ENGINE.md)
- [Agent Engine](docs/AGENT_ENGINE.md)
- [MCP Engine](docs/MCP_ENGINE.md)
- [Sandbox](docs/SANDBOX_ENGINE.md)
- [Skills](docs/SKILLS_ENGINE.md)
- [Tools](docs/TOOL_ENGINE.md)
- [Projects e Files](docs/PROJECTS_FILES.md)
- [Artifacts](docs/ARTIFACTS.md)
- [Memória](docs/MEMORY_ENGINE.md)
- [RAG](docs/RAG.md)
- [Política de Privacidade](docs/privacy-policy.md)
- [Política de Segurança](docs/security-policy.md)
- [Contribuição](CONTRIBUTING.md)

## Licença e contribuições

Distribuído sob a licença [MIT](LICENSE). Consulte [CONTRIBUTING.md](CONTRIBUTING.md) antes de contribuir. Ao enviar contribuições, certifique-se de que tem direito de licenciar o conteúdo proposto e que não incluiu secrets ou dados pessoais.

