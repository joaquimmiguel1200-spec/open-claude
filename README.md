# Open Claude

<p align="center">
  <strong>Um workspace independente de IA para Chat, Code, Projects, Agents, Artifacts e Cowork.</strong><br/>
  Conversação, contexto de projeto, ferramentas, MCP e automação multi-etapas em uma única aplicação.
</p>

<p align="center">
  <a href="https://github.com/joaquimmiguel1200-spec/open-claude"><img alt="GitHub repository" src="https://img.shields.io/badge/GitHub-Open%20Claude-181717?logo=github" /></a>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" />
  <img alt="License MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
</p>

> **Projeto independente:** Open Claude não é afiliado, endossado ou patrocinado pela Anthropic. “Claude” e marcas relacionadas pertencem aos respectivos titulares. A interface, o código e as integrações deste projeto são independentes.

## Visão geral

O Open Claude reúne experiências de Chat, desenvolvimento assistido, projetos, agentes e execução de tarefas. A arquitetura inclui Next.js, TypeScript, Supabase Auth/PostgreSQL/RLS, um AI Router configurável, Tool/Permission Engines, Skills, RAG e um mecanismo de cliente MCP.

### Áreas do produto

| Área | Objetivo |
|---|---|
| **Chat** | Conversação com histórico, seleção de modelo e contexto de projeto |
| **Code** | Fluxos de trabalho de desenvolvimento e integração com GitHub, conforme permissões configuradas |
| **Cowork** | Planejamento e execução de tarefas multi-etapas |
| **Projects & Files** | Organizar arquivos e contexto por projeto |
| **Agents & Skills** | Catálogo de agentes e instruções especializadas |
| **MCP** | Descobrir e chamar ferramentas externas sob controle de permissões |
| **Artifacts** | Produzir e organizar resultados de trabalho |

> A presença de uma área na documentação descreve a intenção/arquitetura do produto, não constitui, por si só, prova de que todos os fluxos estejam validados em produção. Consulte os testes e os documentos específicos antes de depender de uma capacidade.

## Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Backend:** Next.js Route Handlers
- **Identidade e dados:** Supabase Auth, PostgreSQL e Row Level Security (RLS)
- **IA:** AI Router com configuração de provider/modelo
- **Ferramentas:** Tool Engine, Permission Engine e cliente MCP
- **Execução isolada:** integração de sandbox, sujeita à configuração do ambiente
- **Qualidade:** TypeScript, build e workflows de segurança no GitHub Actions

## Início rápido

Requisitos: Node.js 22.x, npm e um projeto Supabase configurado.

```bash
git clone https://github.com/joaquimmiguel1200-spec/open-claude.git
cd open-claude
npm install
cp .env.example .env.local
npm run dev
```

A aplicação local fica em http://localhost:3000.

Antes de usar funcionalidades que dependem de serviços externos, configure as variáveis necessárias em `.env.local`. Nunca envie arquivos de ambiente com credenciais reais ao Git.

## Configuração

Veja [`.env.example`](.env.example) para a lista de nomes de variáveis suportadas. Configure os valores reais no ambiente local ou no painel de deploy, sem colocá-los no código.

Documentação:
- [Instalação e uso](docs/USAGE.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [AI Router e modelos](docs/AI_ROUTER.md)
- [Configuração de login](docs/AUTH_PROVIDERS.md)
- [Code Agent](docs/CODE_AGENT.md)
- [Cowork Engine](docs/COWORK_ENGINE.md)
- [Agent Engine](docs/AGENT_ENGINE.md)
- [Projects, Files e Storage](docs/PROJECTS_FILES.md)
- [Artifacts](docs/ARTIFACTS.md)
- [Skills](docs/SKILLS_ENGINE.md)
- [Tool Engine](docs/TOOL_ENGINE.md)
- [MCP Engine](docs/MCP_ENGINE.md)
- [Catálogo e política de MCPs](docs/MCP_CATALOG.md)
- [Sandbox](docs/SANDBOX_ENGINE.md)
- [Memória](docs/MEMORY_ENGINE.md)
- [RAG](docs/RAG.md)
- [Política de privacidade](docs/privacy-policy.md)
- [Política de segurança](docs/security-policy.md)
- [Política de segurança do GitHub](SECURITY.md)
- [Contribuição](CONTRIBUTING.md)
- [Código de conduta](CODE_OF_CONDUCT.md)
- [Licença MIT](LICENSE)

## MCPs: segurança em primeiro lugar

O protocolo MCP é um padrão aberto e não uma lista de integrações todas mantidas pela Anthropic. Consulte o [catálogo de MCPs](docs/MCP_CATALOG.md) para distinguir servidores de referência, integrações comunitárias e capacidades ainda não validadas no Open Claude.

Todos os MCPs devem passar pelo Tool Engine e Permission Engine. Segredos ficam no servidor; operações destrutivas exigem autorização; conteúdo vindo de ferramentas externas é considerado não confiável. Não habilite um servidor apenas porque aparece em um catálogo.

## Segurança e privacidade

- Nunca comite tokens, API keys, cookies ou arquivos `.env`.
- Mantenha segredos e service-role keys exclusivamente server-side.
- Use RLS e autorização no servidor para dados privados.
- Revise permissões de ferramentas e integrações externas.
- Execute código em sandbox isolado; não confie em conteúdo de prompts ou arquivos.
- Reporte vulnerabilidades de forma privada seguindo [SECURITY.md](SECURITY.md).

Consulte também a [política de segurança](docs/security-policy.md). Documentação não substitui auditoria nem comprova que toda medida esteja habilitada no deploy atual.

## Desenvolvimento e contribuição

```bash
npm run typecheck
npm run build
npm run audit
```

Leia [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir uma contribuição. Não inclua dados pessoais, credenciais ou vulnerabilidades exploráveis em issues públicas.

## Licença

Este projeto usa a [MIT License](LICENSE). Dependências, servidores MCP e recursos externos podem ter licenças e termos próprios; verifique-os antes de redistribuir ou habilitar integrações.
