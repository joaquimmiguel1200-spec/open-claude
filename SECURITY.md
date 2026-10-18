# Security Policy

## Escopo

Open Claude é um projeto independente. Segurança envolve autenticação, autorização, dados de usuários, uploads, ferramentas, integrações MCP, provedores de IA, execução de código e pipelines de deploy.

## Como reportar uma vulnerabilidade

**Não publique detalhes de uma vulnerabilidade não corrigida em uma issue pública.** Use o recurso privado de relato de vulnerabilidades do GitHub, se estiver habilitado no repositório:  
https://github.com/joaquimmiguel1200-spec/open-claude/security/advisories/new

Se o formulário privado não estiver disponível, abra uma issue pública sem detalhes exploráveis pedindo um canal privado de contato. Não inclua tokens, dados pessoais, URLs privadas ou payloads de exploração.

Ao relatar, inclua versão/commit afetado, impacto, passos mínimos de reprodução e uma sugestão de mitigação, quando possível. Aguarde uma resposta antes de divulgar publicamente os detalhes.

## Princípios obrigatórios

1. Segredos nunca devem ser enviados ao cliente, registrados em logs ou comitados.
2. A chave Supabase service-role é exclusivamente server-side.
3. Tabelas com dados de usuário devem ter RLS quando aplicável e testes de isolamento.
4. Permissões são verificadas no servidor; a interface não é um mecanismo de autorização.
5. Conteúdo de arquivos, RAG, Skills, MCP e ferramentas externas é dado não confiável.
6. Ferramentas destrutivas ou que enviam dados externamente exigem autorização apropriada e, quando aplicável, confirmação explícita.
7. Execução de código deve ocorrer fora do processo principal em sandbox isolado e limitado.
8. Logs de auditoria devem minimizar dados pessoais e nunca registrar segredos desnecessariamente.
9. Dados, credenciais, arquivos e memória devem ser isolados por usuário/tenant.
10. Mudanças de schema e segurança devem ser versionadas por migrations e testadas.
11. MCPs devem ser avaliados quanto a origem, manutenção, licença, permissões, prompt injection, SSRF e dependências.
12. Erros externos devem ser normalizados para não revelar tokens, stack traces ou dados privados.

## Processo de resposta

- Confirmar recebimento e avaliar impacto/reprodutibilidade.
- Priorizar contenção e correção de acordo com severidade.
- Criar correção e testes sem publicar segredos ou detalhes exploráveis.
- Comunicar mitigação e versão corrigida quando disponíveis.
- Não declarar uma vulnerabilidade resolvida antes de validar a correção.

## Checklist antes de produção

- [ ] Revisão de autenticação, autorização, MFA e sessões
- [ ] RLS e testes de isolamento multiusuário
- [ ] Proteção de uploads e validação de entrada
- [ ] CSP e headers de segurança
- [ ] Rate limiting, abuso automatizado e limites de custo
- [ ] Rotação de tokens e secrets
- [ ] Prompt injection e autorização das ferramentas/MCPs
- [ ] SSRF e limites de rede
- [ ] Sandbox, limites de CPU/memória/tempo e limpeza
- [ ] Backups e teste de recuperação
- [ ] Monitoramento, retenção e minimização de logs
- [ ] Testes de build e segurança em CI

Este documento descreve requisitos de segurança; não afirma que cada item já foi auditado ou está ativo em todos os ambientes.
