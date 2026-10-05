# Como usar o Open Claude

## 1. Chat

Entre na aplicação, crie uma conversa e escolha um modelo disponível. O histórico é persistido no Supabase. As instruções personalizadas podem ser salvas no perfil e são incorporadas ao contexto das mensagens.

## 2. Projects

Crie um projeto para agrupar conversas e contexto. Use instruções do projeto para definir regras específicas do trabalho.

## 3. Code

O modo Code deve ser usado para tarefas de desenvolvimento. Para automação de repositório, o ambiente precisa ter GitHub configurado e permissões adequadas. O Code Agent não sobrescreve arquivos existentes sem validar o SHA atual e pode executar testes em sandbox quando um runner está disponível.

Fluxo esperado:

1. entender o objetivo;
2. localizar contexto;
3. propor/gerar alterações;
4. validar alterações;
5. executar testes isolados quando disponíveis;
6. revisar falhas e repetir dentro do limite;
7. somente então persistir alterações no GitHub.

## 4. Cowork

Cowork é para delegar trabalho que possui várias etapas. O runtime cria um plano, respeita dependências e pode executar tarefas independentes em paralelo dentro do limite configurado.

O runtime possui eventos para criação/início/fim de tarefas, falhas, checkpoints, pause, resume e cancelamento.

## 5. Modelos

O endpoint `/api/models` retorna os modelos efetivamente configurados para o usuário. Modelos cadastrados em Settings → APIs têm prioridade conforme sua configuração; o provider OmniRoute/OpenRouter também pode expor vários modelos através de `AI_MODELS`.

## 6. Variáveis importantes

- `AI_PROVIDER`: provider principal.
- `AI_MODEL`: modelo padrão.
- `AI_ROUTING_STRATEGY`: estratégia de roteamento.
- `AI_MODELS`: lista opcional de modelos disponíveis no provider OmniRoute.
- `OMNIROUTE_API_KEY`: chave secreta.
- `GITHUB_TOKEN`: credencial do GitHub Agent quando GitHub automation estiver habilitada.

Nunca coloque valores secretos no frontend ou no Git.
