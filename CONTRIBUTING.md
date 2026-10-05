# Contribuindo com o Open Claude

Obrigado por contribuir.

## Antes de começar

1. Leia o [README](README.md) e a documentação em `docs/`.
2. Entenda a arquitetura antes de alterar os engines de IA.
3. Nunca publique API keys, tokens, service-role keys ou dados de usuários.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local
npm run dev
```

Antes de abrir uma alteração:

```bash
npm run build
```

Se a alteração envolver segurança, autenticação, Supabase, sandbox, GitHub ou execução de ferramentas, revise também `SECURITY.md` e a documentação do engine afetado.

## Commits

Use mensagens curtas e descritivas, por exemplo:

- `feat: add cowork task persistence`
- `fix: prevent stale github file writes`
- `docs: explain model configuration`

## Pull requests

Inclua:

- o problema resolvido;
- a solução adotada;
- como testar;
- mudanças de banco/migrations, quando existirem;
- riscos de segurança, quando aplicável.

Não faça merge de uma mudança de engine sem build de produção passando.
