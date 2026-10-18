# Security Policy — Open Claude

**Idioma:** Português e inglês resumido abaixo.  
**Escopo:** aplicação Open Claude, APIs, autenticação, banco, armazenamento, IA, integrações MCP/GitHub, automação e deploy.

## Princípios

- Least privilege: cada usuário, serviço e ferramenta recebe apenas os acessos necessários.
- Server-side secrets: nunca exponha tokens, chaves privadas ou a Supabase service-role key no browser, repositório ou logs.
- Defense in depth: autorização no servidor, RLS no banco, validação de entrada e limites de uso.
- Untrusted input: prompts, arquivos, repositórios, resultados de ferramentas e servidores MCP são dados não confiáveis.
- Honest security claims: documentar um controle não prova que ele está habilitado; valide configuração, testes e logs do ambiente real.

## Relato responsável de vulnerabilidades

Não publique tokens, dados pessoais, provas de conceito destrutivas ou detalhes que exponham usuários em issues públicas. Use um canal privado de contato com o mantenedor disponível no perfil do repositório. Inclua versão/commit afetado, impacto, pré-condições e passos mínimos de reprodução. Aguarde coordenação antes de divulgar detalhes exploráveis.

## Requisitos de revisão antes de produção

- [ ] Autenticação, callback OAuth, recuperação e revogação de sessão testados.
- [ ] MFA verificado quando habilitado; não assumir que MFA está ativo para todos.
- [ ] RLS e políticas de Storage revisadas para isolamento entre usuários.
- [ ] CSP e demais headers verificados contra os recursos realmente usados.
- [ ] Rate limiting e proteção contra abuso testados.
- [ ] Segredos ausentes do bundle, logs, issues e histórico Git.
- [ ] MCPs e ferramentas com permissões explícitas e confirmação para ações destrutivas.
- [ ] Code/Cowork executados em sandbox com limites e política de rede adequada.
- [ ] Backups e restauração testados.
- [ ] Dependências, typecheck, build e testes automatizados verificados.
- [ ] Plano de resposta a incidentes, retenção e exclusão de dados documentados.

## MCP e integrações externas

- Servidores MCP só são carregados a partir de configuração administrativa server-side (`MCP_SERVERS_JSON`); tokens ficam em variáveis de ambiente separadas.
- O cliente atual usa Streamable HTTP, negociação de versão do protocolo, timeout e limites de tamanho. Ferramentas só podem ser executadas quando declaram `annotations.readOnlyHint=true`.
- Ferramentas sem indicação de somente leitura, `stdio`, recursos/prompts MCP e autenticação OAuth individual por servidor não estão habilitados nesta versão.
- Revise origem, licença, permissões, esquema e destinos de rede de cada servidor antes de configurá-lo. Não trate uma listagem de terceiros como endosso da Anthropic.
- A tela `/mcp` e a presença de código não comprovam que um conector externo está operacional: execute um teste de ponta a ponta com dados não sensíveis antes de liberar para usuários.

## Operação e divulgação

Mantenha dependências atualizadas, rode os testes antes de releases e rotacione credenciais após qualquer suspeita de exposição. A correção deve ser revisada e publicada sem expor detalhes de exploração desnecessários.

## English summary

Open Claude welcomes responsible security reports. Do not disclose secrets or personal data publicly. Report the affected version, impact, prerequisites and minimal reproduction privately to the repository maintainer. Security documentation is not a certification; production controls must be independently verified.


## Achados atuais do Supabase (2026-10-18)

- O advisor de segurança informa que a proteção contra senhas vazadas está desativada. Habilite a proteção contra senhas comprometidas nas configurações de Authentication do projeto Supabase e teste cadastro/troca de senha antes de produção: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- O advisor sinaliza duas funções `SECURITY DEFINER` de gestão de sessão (`list_my_sessions` e `revoke_my_session`). A revisão das definições confirmou filtro por `auth.uid()` em ambas e grants de execução a `authenticated`, sem grant direto a `anon`. Mantenha os testes de isolamento e reavalie qualquer mudança de definição/grants; o aviso de linter permanece até a configuração ser alterada ou a exceção ser tratada formalmente.
- A consulta de catálogo confirmou RLS habilitado em todas as tabelas do schema `public` encontradas. Isso não substitui testes de autorização com dois usuários distintos nem auditoria de cada política.

Esses itens são achados de revisão, não uma declaração de conformidade ou garantia de segurança.
