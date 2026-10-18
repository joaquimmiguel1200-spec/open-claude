# Configuração de login: Google, Microsoft, GitHub e e-mail

O Open Claude utiliza Supabase Auth com sessões SSR. Os botões de login só devem ser considerados funcionais depois de configurar cada provedor no painel Supabase e no respectivo provedor de identidade.

## Provedores

- Google OAuth
- Microsoft/Azure OAuth
- GitHub OAuth
- E-mail e senha (cadastro, confirmação de e-mail, login e recuperação de senha)

## Configuração operacional

1. Criar/selecionar a aplicação OAuth no provedor e configurar o callback exigido pelo Supabase Auth.
2. Em Supabase Dashboard → Authentication → Providers, habilitar o provedor e preencher Client ID/Secret.
3. Em Authentication → URL Configuration, cadastrar a URL pública de produção e as URLs de callback permitidas para desenvolvimento.
4. Configurar os secrets apenas no painel do provedor/Supabase ou no ambiente server-side. Nunca publicar client secret, service-role key ou tokens no frontend.
5. Validar o fluxo de retorno em desktop e mobile, usuário novo e existente, cancelamento, erro do provedor, sessão expirada, logout e recuperação de conta.
6. Confirmar que o callback redireciona apenas para URLs permitidas e que as páginas privadas verificam a sessão no servidor.
7. Testar políticas de confirmação de e-mail e MFA conforme a política de segurança do projeto.

## Variáveis e segredos

Não crie variáveis públicas para secrets. Os nomes e valores exatos dependem do provedor e da configuração Supabase vigente. Use `.env.example` apenas para nomes de variáveis sem valores reais.

## Checklist de aceite

- [ ] Google OAuth testado ponta a ponta
- [ ] Microsoft OAuth testado ponta a ponta
- [ ] GitHub OAuth testado ponta a ponta
- [ ] Cadastro e login por e-mail testados
- [ ] Confirmação de e-mail e recuperação testadas
- [ ] Logout e expiração/revogação de sessão testados
- [ ] Redirect allowlist validada
- [ ] Nenhum secret enviado ao browser
- [ ] Erros acessíveis e compreensíveis, sem vazar detalhes internos

A documentação não afirma que credenciais de provedores já estejam configuradas. Isso precisa ser validado no ambiente real.
