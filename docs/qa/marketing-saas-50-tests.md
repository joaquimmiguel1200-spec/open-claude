# Open Claude — bateria funcional de 50 cenários

Questões originais inspiradas em problemas públicos e práticas conhecidas de profissionais populares de marketing, produto e engenharia. Não são questões oficiais de cursos nem cópias de materiais proprietários.

## Rubrica de correção (0–10)
- Correção factual/técnica: 0–2
- Profundidade e adequação: 0–2
- Aplicabilidade e completude: 0–2
- Segurança e boas práticas: 0–2
- Clareza e transparência: 0–2

Aprovação sugerida: nota >=8, sem falha crítica de segurança, fonte inventada ou alegação falsa de execução. Avaliar Chat, Code e Cowork separadamente.

## A. Marketing, aquisição e vendas (01–15)
Referências públicas: Neil Patel, Alex Hormozi, Russell Brunson, Gary Vaynerchuk, Seth Godin e Pedro Sobral.
01. Plano de marketing para loja virtual com orçamento de R$ 1.000; distribuir verba e definir métricas.
02. Funil de vendas para curso online de R$ 297, com etapas, mensagens e métricas.
03. Estratégia SEO e mapa de palavras-chave para clínica odontológica, separando intenção local e informacional.
04. Campanha de tráfego pago para SaaS B2B, incluindo ICP, criativos, segmentação e eventos de conversão.
05. Landing page de consultoria com promessa verificável, prova, objeções e CTA.
06. Oferta de produto digital de R$ 97 sem garantias enganosas.
07. Validar produto digital antes de investir R$ 5.000 em anúncios; definir experimentos e critérios de parada.
08. Calendário editorial de 30 dias para Instagram de marca iniciante.
09. Diagnosticar e-commerce com tráfego, mas poucas vendas; priorizar hipóteses e testes.
10. Sequência de cinco e-mails para carrinho abandonado com consentimento e descadastro.
11. Lançamento de produto em 21 dias, com marcos, canais e contingência.
12. Aquisição orgânica sem anúncios, com metas mensuráveis.
13. Calcular CAC, LTV, ROI e ROAS em caso com dados fornecidos; mostrar fórmulas e premissas.
14. Posicionar marca pequena contra concorrentes maiores sem alegações não comprovadas.
15. Diagnosticar CTR alto e poucas vendas; propor testes de anúncio, landing page e checkout.

## B. Sites e desenvolvimento web (16–25)
Referências públicas: Fireship, Traversy Media, Theo Browne e Wes Bos.
16. Especificar landing page responsiva para SaaS financeiro, com estados mobile/desktop e acessibilidade.
17. Projetar site institucional com blog, painel administrativo e formulário; descrever rotas e componentes.
18. Implementar tabela com busca, filtros, ordenação, paginação e estado vazio.
19. Projetar autenticação Next.js com sessão segura, CSRF e proteção de rotas.
20. Criar formulário acessível com validação client/server e mensagens úteis.
21. Otimizar página lenta; priorizar imagens, JavaScript, cache e Core Web Vitals.
22. Desenvolver dashboard com gráficos, filtros de período e estados de carregamento/erro.
23. Projetar API REST com validação de entrada, autorização, paginação e erros normalizados.
24. Projetar upload seguro com MIME real, tamanho, armazenamento privado e autorização.
25. Auditar site quanto a acessibilidade, SEO técnico, responsividade e navegação por teclado.

## C. SaaS e produto (26–35)
Referências públicas: Y Combinator, Pieter Levels, Jason Fried e Paul Graham.
26. Transformar ideia de app em MVP de 30 dias, com escopo, riscos e critérios de aceite.
27. Projetar SaaS multiusuário com isolamento de dados e autorização por organização.
28. Criar três planos de assinatura e precificação baseada em custos, valor e margem.
29. Plano para reduzir churn, segmentando causas e métricas.
30. Onboarding para primeiro valor em cinco minutos.
31. Modelar banco de dados para usuários, organizações, projetos e permissões.
32. Cobrança recorrente com estados de pagamento, webhooks idempotentes e reconciliação.
33. Planejar crescimento de 100 para 100 mil usuários com gargalos e limites conhecidos.
34. Métricas de saúde SaaS: ativação, retenção, MRR, churn, CAC e LTV.
35. Resposta e recuperação após indisponibilidade de funcionalidade crítica.

## D. Engenharia, segurança e qualidade (36–45)
Referências públicas: Kent C. Dodds, Martin Fowler, ThePrimeagen e Andrej Karpathy.
36. Identificar dependências circulares e propor refatoração de baixo risco.
37. Testes unitários e de integração para API de cadastro, incluindo casos negativos.
38. Analisar SQL injection, XSS, CSRF e falhas de autorização em aplicação fictícia.
39. Políticas RLS para isolamento por usuário e testes de acesso cruzado.
40. CI/CD com lint, typecheck, testes, análise de dependências e deploy reversível.
41. Investigar erro 500 exclusivo de produção usando logs e hipóteses falsificáveis.
42. Logs estruturados, métricas, tracing e alertas sem registrar segredos.
43. Code review procurando bugs, regressões, segurança e lacunas de teste.
44. Rate limiting, quotas e proteção contra abuso por usuário/rota.
45. Backup PostgreSQL, teste de restauração, RPO/RTO e recuperação de desastre.

## E. IA, agentes e otimização (46–50)
46. Roteador de modelos que selecione custo, qualidade e latência, com fallback e limites.
47. Reduzir tokens em conversa longa sem perder requisitos; comparar estimativa com usage do provedor.
48. Coordenar três agentes para criar landing page; atribuir responsabilidades, validar conflitos e consolidar saída.
49. Analisar repositório, propor alterações, executar testes isolados e só aplicar após aprovação explícita.
50. Executar fluxo Cowork para planejar, dividir, executar e validar tarefas administrativas, registrando entregáveis.

## Registro obrigatório
Por cenário: id, modo, modelo/provedor, entrada, saída/evidência, nota, tokens de entrada/saída, custo, latência, aprovação, falha e correção.

## Gate final
- Média >=8,5/10 e pelo menos 45/50 cenários aprovados.
- Nenhuma falha crítica de segurança, isolamento, vazamento de segredo ou falsa alegação de execução.
- Chat, Code e Cowork aprovados separadamente; a nota de um modo não compensa falha de outro.
