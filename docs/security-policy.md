# Política de Segurança — Open Claude

Última atualização: outubro de 2026

## 1. Objetivo e escopo
Esta política cobre aplicação Next.js, Vercel, Supabase, APIs, autenticação, banco, Storage, IA, GitHub, MCP, Code, Cowork, sandbox, logs, CI/CD e integrações autorizadas.

## 2. Responsabilidades
A operação deve aplicar menor privilégio, revisão de mudanças, resposta a incidentes e proteção de credenciais. Usuários devem proteger suas contas, tokens e integrações e comunicar falhas.

## 3. Identidade e acesso
Autenticação ocorre server-side nas áreas protegidas. MFA/2FA deve ser habilitado quando disponível. Sessões, cookies e credenciais devem ter escopo e duração adequados. RBAC e RLS devem impedir acesso entre usuários.

## 4. Princípio do menor privilégio
Acesso administrativo, service-role, GitHub e MCP deve ser separado do acesso comum. Chaves secretas nunca podem ser expostas em variáveis NEXT_PUBLIC_ ou no bundle do navegador.

## 5. API e aplicação
Endpoints devem validar autenticação, autorização, schema, tamanho de entrada, rate limiting e tratamento seguro de erros. Entradas devem ser consideradas não confiáveis. A aplicação deve reduzir riscos de SQL injection, XSS, CSRF, SSRF, path traversal e execução indevida.

## 6. Automação e abuso
Rate limiting, honeypots e controles contra automação devem proteger endpoints sensíveis. Força bruta, enumeração, spam e abuso de recursos devem ser detectados e limitados.

## 7. Dados e isolamento
Dados de usuários devem ser isolados por autorização e RLS. Views e funções privilegiadas devem ser revisadas para não criar bypass de RLS. Dados pessoais só devem ser tratados para finalidades legítimas e necessárias.

## 8. Banco e Storage
Tabelas expostas devem usar RLS com políticas específicas. UPDATE deve possuir USING e WITH CHECK quando necessário. Uploads devem validar tamanho, tipo, nome, proprietário e acesso. Buckets privados devem permanecer protegidos por políticas de Storage.

## 9. Criptografia e segredos
HTTPS protege dados em trânsito. Dados armazenados devem usar criptografia fornecida pela infraestrutura e controles adicionais quando apropriados. Chaves e tokens devem permanecer em secret manager/variáveis de ambiente e ser rotacionados quando comprometidos.

## 10. Code, Cowork e sandbox
Code só deve escrever em caminhos autorizados e, quando usado com testes, deve validar alterações em sandbox antes de commit. A sandbox deve aplicar filesystem restrito, capabilities removidas, limites de CPU/memória/processos/tempo e rede desativada por padrão. Cowork deve respeitar permissões das ferramentas subjacentes e não deve receber privilégios implícitos.

## 11. GitHub e MCP
Integrações operam com o menor escopo possível. Operações destrutivas devem exigir autorização adequada. Conteúdo vindo de repositórios, MCP, Skills, RAG e ferramentas é tratado como não confiável e não pode alterar políticas de segurança por instrução textual.

## 12. Logs e auditoria
Eventos de autenticação, permissões, integrações, Code, Cowork e ações administrativas podem ser auditados. Logs não devem conter tokens, senhas ou dados pessoais desnecessários e devem possuir acesso restrito e proteção contra alteração indevida.

## 13. Dependências e desenvolvimento
Dependências devem ser mantidas atualizadas, lockfiles versionados e auditorias executadas. Mudanças passam por typecheck, build, testes e revisão de segurança. CI/CD deve usar secrets protegidos, branches protegidas e versões fixadas quando possível.

## 14. Backups e continuidade
Backups devem ter acesso mínimo, retenção definida e testes de restauração. Recuperação deve validar integridade antes de reabrir o serviço. RPO/RTO devem ser definidos conforme a criticidade comercial.

## 15. Vulnerabilidades
Vulnerabilidades devem ser identificadas, classificadas por risco, reproduzidas de forma segura, corrigidas, testadas e acompanhadas. O canal oficial é definido pela Política de Vulnerabilidades.

## 16. Incidentes
O processo é detecção → contenção → investigação → erradicação → recuperação → validação → comunicação → pós-incidente. Segredos comprometidos devem ser revogados/rotacionados. Incidentes envolvendo dados pessoais serão avaliados para comunicação conforme a legislação aplicável.

## 17. Disponibilidade e monitoramento
Deployments devem ser considerados concluídos apenas quando READY. Logs de erro, disponibilidade, falhas de provider e degradações devem ser monitorados quando a infraestrutura oferecer os recursos.

## 18. Comunicação
Vulnerabilidades e incidentes devem ser comunicados pelo canal oficial apropriado. Informações técnicas sensíveis não devem ser divulgadas publicamente antes de mitigação quando isso aumentar o risco.

## 19. Limitações
Nenhuma aplicação conectada à internet oferece segurança absoluta. A segurança também depende do dispositivo, senha, MFA, tokens, repositórios e integrações controlados pelo usuário.

> Esta política descreve controles técnicos e operacionais previstos no projeto e deve ser revisada periodicamente conforme a infraestrutura real e antes de uma oferta comercial regulada.