# Política de Desenvolvimento Seguro — Open Claude

Mudanças devem passar por revisão, typecheck/build, testes aplicáveis, auditoria de dependências e análise de segurança antes de produção. Entradas externas são não confiáveis; autorização deve ocorrer no servidor; segredos não entram no bundle; APIs devem aplicar autenticação, autorização, validação e rate limiting.

Mudanças de banco devem ser verificadas com RLS/advisors. Código de execução deve permanecer isolado e não receber credenciais privilegiadas.
