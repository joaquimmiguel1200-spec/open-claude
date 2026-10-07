# Código de Uso — Open Claude

Última atualização: outubro de 2026

O software aplica as regras de uso por autenticação, autorização, validação server-side, limites, rate limiting, auditoria e controles de recursos.

## Controles
1. Usuários autenticados acessam somente recursos autorizados.
2. Projetos, chats e recursos são vinculados ao proprietário e verificados no backend.
3. Funcionalidades futuras por plano devem ser autorizadas no servidor, nunca apenas no frontend.
4. Endpoints devem validar entrada e limitar abuso.
5. Uploads devem validar proprietário, tamanho e tipo antes de armazenamento/processamento.
6. Code e Cowork devem respeitar permissões e limites próprios.
7. Ações relevantes devem gerar auditoria sem registrar segredos.
8. Suspensão e encerramento devem impedir novas operações protegidas.

## Regra de segurança
Frontend nunca é uma fronteira de segurança. Toda autorização crítica deve ser repetida no servidor e, para dados do banco, reforçada por RLS quando aplicável.

## Estado
Este documento é a especificação operacional; cada item deve ser conferido contra testes automatizados e a infraestrutura real antes de ser declarado concluído.
