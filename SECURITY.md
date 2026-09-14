# Security Policy

## Princípios

Open Claude trata autenticação, autorização, dados de usuários, ferramentas e execução de código como superfícies de segurança críticas.

### Regras obrigatórias

1. Segredos nunca devem ser enviados ao cliente.
2. A Supabase service-role key é exclusivamente server-side.
3. Toda tabela com dados de usuário deve ter RLS quando aplicável.
4. Permissões devem ser verificadas no servidor; UI não é mecanismo de autorização.
5. Conteúdo de arquivos, RAG e ferramentas externas é considerado não confiável.
6. Ferramentas potencialmente destrutivas exigem política de permissão apropriada.
7. Execução de código deve ocorrer fora do processo principal da aplicação, em sandbox isolado.
8. Logs e auditoria não devem armazenar segredos desnecessariamente.
9. Dados de usuários devem ser isolados por identidade e pelas regras de projeto.
10. Mudanças de schema e segurança devem ser versionadas por migrations.

## Relato de vulnerabilidades

Não publique segredos, tokens ou dados pessoais em issues públicas. Para uma vulnerabilidade, registre o mínimo de informação necessária e solicite um canal privado de contato com o mantenedor.

## Antes de produção

Executar revisão de RLS, autenticação, gestão de sessões, armazenamento, upload de arquivos, prompt injection, SSRF, execução de ferramentas, sandbox e exposição de segredos.
