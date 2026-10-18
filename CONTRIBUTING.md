# Contribuindo com o Open Claude

Obrigado por contribuir com o Open Claude.

## Antes de começar

1. Leia o [README](README.md), [SECURITY.md](SECURITY.md) e a documentação relevante em `docs/`.
2. Confirme o comportamento real no código antes de declarar um recurso pronto.
3. Nunca publique API keys, tokens, service-role keys, chaves de criptografia ou dados de usuários.
4. Para integrações de terceiros, confira licença, origem, permissões e requisitos de credenciais.

## Desenvolvimento

Requisitos: Node.js 22 e npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Antes de abrir um pull request, execute:

```bash
npm run typecheck
npm run build
```

O build pode depender de variáveis de ambiente válidas. Nunca use credenciais de produção para testes locais.

## Segurança, autenticação e MCP

Mudanças em auth, Supabase, RLS, sandbox, GitHub, ferramentas ou MCP precisam incluir testes de autorização e casos negativos. Não marque integrações como funcionais sem executar um teste com credenciais e configuração válidas em ambiente apropriado. Ações externas/destrutivas devem ter limites de permissão e aprovação explícita.

## Commits

Use mensagens curtas e descritivas, por exemplo:

- `feat: add cowork task persistence`
- `fix: prevent stale github file writes`
- `docs: clarify mcp implementation status`

## Pull requests

Inclua o problema, a solução, passos de teste, mudanças de banco/migrations e riscos de segurança. Não faça merge de mudanças de engine sem typecheck e build de produção passando.


## Checklist de release

Antes de cada deploy de produção, confirme com evidências:

- [ ] Typecheck e build passam no CI.
- [ ] Nenhuma credencial ou dado pessoal entrou no diff.
- [ ] Cadastro, confirmação de e-mail, login, recuperação e logout foram testados.
- [ ] Google, Microsoft e GitHub OAuth foram testados ponta a ponta no ambiente configurado.
- [ ] MFA e revogação de sessões foram testados, inclusive isolamento entre usuários.
- [ ] RLS e Storage foram testados com duas contas de teste e acessos negativos.
- [ ] Exportação, exclusão, retenção e restauração de backup foram verificadas.
- [ ] AI Router, MCP, Code e Cowork foram testados com credenciais e serviços reais de teste.
- [ ] Logs de build e erros de runtime foram revisados.
- [ ] URL canônica, callbacks OAuth e deploy apontam para o commit esperado.

## Código de conduta

Seja respeitoso, construtivo e inclusivo. Não publique dados pessoais, credenciais, ameaças, assédio ou ataques pessoais. Relate vulnerabilidades por um canal privado ao mantenedor conforme `SECURITY.md`. Mantenedores podem moderar conteúdo que viole essas regras.
