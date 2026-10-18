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

## Operação e divulgação

Mantenha dependências atualizadas, rode os testes antes de releases e rotacione credenciais após qualquer suspeita de exposição. A correção deve ser revisada e publicada sem expor detalhes de exploração desnecessários.

## English summary

Open Claude welcomes responsible security reports. Do not disclose secrets or personal data publicly. Report the affected version, impact, prerequisites and minimal reproduction privately to the repository maintainer. Security documentation is not a certification; production controls must be independently verified.
