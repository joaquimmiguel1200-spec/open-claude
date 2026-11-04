# Open Claude — plano de testes funcionais e de API

## Como executar
Cada cenário deve ser enviado ao Open Claude em uma sessão autenticada, com provedor real ativo. Registre o prompt, modo, skills/agentes acionados, modelo, provedor, duração, tokens, evidência e nota de 0 a 10. Não marque como aprovado se a API estiver indisponível, se a execução for simulada ou se não houver evidência verificável.

**Rubrica (10 pontos):** precisão técnica/factual (2), profundidade (2), aplicabilidade (2), segurança (2), clareza (2).

## 50 cenários
### Marketing, vendas e posicionamento
1. Plano de marketing para e-commerce com orçamento de R$ 1.000.
2. Funil para curso online de R$ 297 com métricas por etapa.
3. Pesquisa de palavras-chave e SEO local para clínica odontológica.
4. Campanha de tráfego pago para SaaS B2B com hipótese, segmentação e orçamento.
5. Landing page de consultoria com proposta, prova, objeções e CTA.
6. Oferta para produto digital de R$ 97 sem promessas não comprovadas.
7. Validação de produto digital antes de investir R$ 5.000 em anúncios.
8. Calendário editorial de 30 dias para Instagram.
9. Diagnóstico de tráfego alto e vendas baixas.
10. Sequência de cinco e-mails de recuperação de carrinho.
11. Plano de lançamento de 21 dias com marcos e contingências.
12. Aquisição orgânica sem anúncios com métricas.
13. Cálculo e interpretação de CAC, LTV, ROI e ROAS a partir de dados fictícios.
14. Posicionamento de marca pequena contra concorrentes maiores.
15. Diagnóstico de CTR alto e conversão baixa com plano de testes A/B.

### Sites e aplicações web
16. Landing page SaaS responsiva, acessível e com estados de interação.
17. Arquitetura de site institucional com blog, painel e formulário.
18. Tabela com busca, filtros, ordenação e paginação.
19. Autenticação segura com sessão e autorização no Next.js.
20. Formulário acessível com validação e mensagens de erro.
21. Otimização de Core Web Vitals com plano de medição.
22. Dashboard com gráficos e filtros por período.
23. API REST com validação, autorização e erros normalizados.
24. Upload seguro com limite, validação MIME e controle de acesso.
25. Auditoria de acessibilidade, SEO técnico e experiência mobile.

### SaaS e produto
26. Escopo de MVP entregável em 30 dias.
27. Arquitetura multi-tenant com isolamento de dados.
28. Três planos de assinatura e estratégia de preço.
29. Plano de redução de churn com hipóteses mensuráveis.
30. Onboarding até o primeiro valor em cinco minutos.
31. Modelagem de usuários, organizações, projetos e permissões.
32. Cobrança recorrente com estados e idempotência.
33. Escalabilidade de 100 a 100.000 usuários.
34. Métricas de saúde de SaaS e fórmulas de cálculo.
35. Recuperação de indisponibilidade de funcionalidade crítica.

### Engenharia e segurança
36. Refatoração de dependências circulares.
37. Testes unitários e de integração para API de cadastro.
38. Análise de SQL injection, XSS e CSRF com correções.
39. Políticas RLS com isolamento por usuário.
40. CI/CD com testes, análise estática e deploy seguro.
41. Diagnóstico de erro 500 exclusivo de produção.
42. Logs, métricas e tracing com privacidade.
43. Code review com severidade, evidências e testes.
44. Rate limiting e mitigação de abuso.
45. Backup, restauração e disaster recovery PostgreSQL.

### IA, agentes e tokens
46. Roteador de modelos por custo, qualidade e latência.
47. Redução de contexto e tokens sem perder informação essencial.
48. Três agentes colaborando para construir uma landing page.
49. Agente Code lendo repositório, propondo mudança e testando em sandbox.
50. Cowork planejando, delegando, executando e validando projeto SaaS.

## 10 testes de API
Executar com usuário autenticado e chave real configurada. Nunca imprimir ou registrar a chave.
1. GET /api/health — status do app e dependências não secretas.
2. GET /api/models — modelos configurados sem expor credenciais.
3. POST /api/settings/providers/test — inferência OpenRouter, latência e uso.
4. POST /api/chat — SSE, persistência, skills e cancelamento.
5. POST /api/code com apply:false — plano de edição sem escrita.
6. POST /api/code/terminal — execução isolada, comandos permitidos e rede bloqueada.
7. POST /api/cowork — plano, agentes/skills administrativos, execução e auditoria.
8. GET/POST /api/agents/profiles — CRUD e isolamento por usuário.
9. GET /api/mcp?mode=code e ?mode=cowork — isolamento dos conectores por modo.
10. Testes negativos — 401/403, payload inválido, rate limit, IDOR e bloqueio de comandos de shell.

## Resultado
Todos os cenários começam como PENDENTES. Aprovar somente após execução real com evidência.
| ID | Modo | Resultado | Nota | Modelo | Tokens | Latência | Evidência |
|---|---|---|---:|---|---:|---:|---|
| 01–50 | Chat/Code/Cowork | Pendente de execução com API real | — | — | — | — | — |
| API 01–10 | Rotas API | Pendente de execução com API real | — | — | — | — | — |
