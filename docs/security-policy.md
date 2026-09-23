# Política de Segurança — Open Claude

Última atualização: setembro de 2026

A segurança do Open Claude utiliza múltiplas camadas para reduzir acesso não autorizado, exposição de informações e execução indevida.

## 1. Autenticação e autorização
Áreas protegidas dependem de autenticação. Autenticação não concede automaticamente acesso: cada operação deve verificar autorização.

## 2. Isolamento e colaboração
Dados de um usuário não devem ficar acessíveis a outro sem autorização. RLS reforça o isolamento. Projetos colaborativos usam permissões específicas.

## 3. Segredos
Chaves, tokens e credenciais devem ficar em secrets/variáveis de ambiente e nunca no frontend, commits, logs ou arquivos públicos.

## 4. API
APIs devem usar autenticação server-side, validação, autorização, rate limiting, tratamento de erros, limites de tamanho e respostas controladas.

## 5. Arquivos
Uploads devem ter limite de tamanho, validação de tipo, propriedade, acesso controlado, armazenamento privado quando apropriado e prevenção contra execução indevida.

## 6. Execução de código
Código do agente deve usar sandbox isolado quando disponível, com limites de CPU, memória, tempo, armazenamento, processos e rede. Credenciais da aplicação não devem ser expostas ao código executado.

## 7. GitHub e MCP
Operações GitHub respeitam permissões concedidas; ações destrutivas podem exigir confirmação. MCP é tratado como integração externa e respeita autenticação, escopo e permissões.

## 8. Auditoria
Alterações de permissões, integrações, GitHub, ferramentas, exclusões e ações administrativas podem gerar logs. Logs não devem armazenar segredos ou conteúdo sensível desnecessário.

## 9. Banco e aplicação
O banco deve utilizar RLS, foreign keys, constraints, índices, queries parametrizadas e privilégios mínimos. A aplicação deve utilizar HTTPS, cookies seguros, headers de segurança, CSP quando compatível, CSRF quando aplicável, validação, prevenção contra XSS/SQL injection e rate limiting.

## 10. Vulnerabilidades
Vulnerabilidades devem ser investigadas e corrigidas conforme gravidade e não devem ser exploradas contra usuários, infraestrutura ou terceiros. Problemas devem ser comunicados pelo canal oficial antes de divulgação pública quando isso for necessário para mitigação.

## 11. Limitações
Nenhum sistema conectado à internet garante segurança absoluta; a segurança também depende de contas, dispositivos, credenciais e integrações do usuário.