# Open Claude

Open Claude é um agente de IA pessoal com foco em conversação, projetos, memória, arquivos, RAG, Skills, ferramentas, MCP, GitHub, execução de código e colaboração via Cowork.

## Stack

- Frontend: Next.js 16 + React + TypeScript
- Backend: Supabase
- Banco: PostgreSQL + RLS
- Auth: Supabase Auth com sessão SSR
- Storage: Supabase Storage privado
- IA: AI Router configurável / OmniRoute
- RAG: pgvector + embeddings
- Git: GitHub Agent
- Skills: `SKILL.md`
- Segurança: validação Zod, rate limit, RLS, Permission Engine, sandbox, headers, secret scanning e dependency audit

## Status

A fundação full-stack e os motores de IA foram implementados no repositório. A camada web agora inclui landing page responsiva, autenticação, chat, 404, metadata/OG, favicon, sitemap, robots, consentimento de analytics, headers de segurança e proteção de API.

Os motores internos incluem AI Router, Context, Memory, Skills, Agent, Tool, Permission, GitHub, Code Agent, Sandbox, MCP e Cowork. O E2E de serviços externos ainda depende de credenciais/infraestrutura reais no ambiente de execução.

## Segurança

- API keys e service-role ficam somente no servidor.
- Chaves públicas do Supabase são tratadas como publicáveis; RLS é a fronteira de autorização.
- Queries usam APIs parametrizadas do Supabase; não há concatenação de SQL em rotas web.
- Inputs são validados com Zod e respostas públicas são reduzidas ao necessário.
- Uploads possuem limites de tamanho, MIME e nome.
- Cookies de sessão usam SSR e flags de transporte apropriadas.
- HTTPS é reforçado em produção e HSTS é enviado.
- Segredos são ignorados pelo Git e o CI executa Gitleaks + `npm audit`.
- Conteúdo recuperado de RAG, Skills, MCP e ferramentas é tratado como não confiável.
- Execução de código ocorre somente através de sandbox isolado.

## Produção

Defina as variáveis de `.env.example` na hospedagem. Configure `NEXT_PUBLIC_SITE_URL` com o domínio definitivo. Para analytics, defina `NEXT_PUBLIC_GA_MEASUREMENT_ID`; o script só é carregado após consentimento.

A hospedagem recomendada para o app Next.js é Vercel, com Supabase para Auth/Database/Storage. O domínio personalizado, DNS e certificados são configurações da conta de hospedagem e não podem ser ativados apenas por commits neste repositório.
