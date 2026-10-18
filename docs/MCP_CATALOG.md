# Catálogo de MCPs e política de integração

> Estado do catálogo: referência inicial verificada em 17 de outubro de 2026. A inclusão nesta lista não significa que o servidor esteja instalado, conectado ou validado em produção no Open Claude.

## O que significa “oficial”

O Model Context Protocol (MCP) foi criado pela Anthropic e, em dezembro de 2025, doado à Agentic AI Foundation, sob a Linux Foundation. Portanto, não existe uma lista única que signifique “todos os MCPs oficiais disponíveis no Claude”: há servidores de referência mantidos no ecossistema MCP, conectores de terceiros disponíveis no Claude e servidores comunitários registrados.

Fontes primárias:
- [Documentação MCP da Anthropic](https://docs.anthropic.com/en/docs/mcp)
- [Anúncio da doação do MCP à Agentic AI Foundation](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation)
- [Repositório de servidores de referência MCP](https://github.com/modelcontextprotocol/servers)
- [Registro oficial/comunitário de servidores MCP](https://registry.modelcontextprotocol.io/)

## Servidores de referência do ecossistema MCP

O repositório de referência lista atualmente estes exemplos principais:

| Servidor | Capacidade | Estado neste catálogo |
|---|---|---|
| Everything | Ferramentas e recursos de teste para validar clientes MCP | Referência para testes; não habilitar em produção |
| Fetch | Buscar e converter conteúdo web | Candidato a integração, com proteção contra SSRF |
| Filesystem | Operações de arquivos com diretórios autorizados | Candidato a integração, limitado a diretórios isolados |
| Git | Consultar e operar repositórios Git | Candidato a integração, com permissões e confirmação para escrita |
| Memory | Grafo de conhecimento/memória persistente | Candidato a integração, com isolamento por usuário |
| Sequential Thinking | Ferramentas de raciocínio sequencial | Candidato a integração |
| Time | Fuso horário e operações temporais | Candidato a integração |

A disponibilidade e a manutenção dos pacotes podem mudar. Antes de habilitar cada servidor, confirmar o repositório de origem, licença, versão publicada, atividade de manutenção, permissões solicitadas e advisories de segurança. O próprio projeto de servidores de referência alerta que seus exemplos não devem ser tratados automaticamente como soluções prontas para produção.

## Servidores que já tiveram implementação de referência, mas foram arquivados

GitHub, GitLab, Google Drive, Google Maps, PostgreSQL, Puppeteer, Redis, Sentry e Slack aparecem no histórico/coleção arquivada de servidores. Isso **não** deve ser interpretado como garantia de manutenção oficial atual. Para integrações ativas, prefira o mantenedor atual e o registro MCP, verificando identidade e pacote antes de instalar.

## Arquitetura e critérios obrigatórios no Open Claude

O mecanismo existente documenta transporte stdio e HTTP JSON-RPC, handshake MCP, descoberta/chamada de ferramentas, resources e prompts. O catálogo não declara que todos os servidores acima já estejam conectados.

Cada integração deve:
1. Ser desativada por padrão até que um administrador a configure.
2. Guardar tokens e headers somente no servidor, nunca em variáveis `NEXT_PUBLIC_*` ou no browser.
3. Passar pelo Tool Engine e Permission Engine existentes.
4. Validar schema de entrada/saída e aplicar timeout, cancelamento, limites e logs sem segredos.
5. Tratar descrições, prompts, resources e resultados do servidor como dados não confiáveis (incluindo prompt injection).
6. Exigir confirmação explícita para operações destrutivas, publicação, envio externo ou escrita de arquivos.
7. Restringir filesystem a diretórios permitidos; restringir fetch/HTTP para evitar SSRF, acesso a IPs privados e redirecionamentos perigosos.
8. Isolar configurações, credenciais, logs e memória por usuário/tenant.
9. Executar processos locais apenas em ambiente controlado; nunca iniciar comandos arbitrários recebidos do cliente.
10. Ter testes de permissão, isolamento entre usuários, falhas de transporte, timeout, credenciais e chamadas de ferramentas.

## Critério de conclusão

Uma integração só pode ser marcada como **implementada e validada** depois de conectar a um servidor real em ambiente de teste, listar capacidades, executar ao menos uma chamada permitida, provar que uma chamada não autorizada é bloqueada e registrar o resultado dos testes. Adicionar um nome ao catálogo ou ao menu não é integração funcional.
