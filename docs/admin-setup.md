# Configuração do painel administrativo

O painel em `/admin` usa Netlify Functions e Supabase. A chave `service_role` não é necessária e não deve ser adicionada ao site.

## 1. Criar e configurar o Supabase

1. Crie um projeto Supabase e guarde as credenciais no gerenciador de segredos, não no Git.
2. No SQL Editor, execute a migração `supabase/migrations/20261123000000_secure_catalog.sql`.
3. Em Authentication, desative a criação pública de contas. Convide somente as pessoas que administrarão a loja.
4. Exija MFA TOTP nas configurações de autenticação. O painel também bloqueia operações administrativas sem uma sessão MFA de nível AAL2.
5. Em Authentication → URL Configuration, mantenha o Site URL na origem pública do site e adicione esta URL exata à lista de Redirect URLs:

   ```text
   https://seu-site.netlify.app/admin/redefinir-senha
   ```

   O formulário `/admin/redefinir-senha` solicita o link e aceita a nova senha. O destino é construído no servidor com `ADMIN_ALLOWED_ORIGIN`; não permita redirecionamentos arbitrários.
6. Para cada pessoa autorizada, copie o UUID da conta e insira-o manualmente pelo SQL Editor:

   ```sql
   insert into public.admin_users (user_id)
   values ('UUID-DA-CONTA-CONVIDADA');
   ```

   A tabela não permite que o navegador conceda ou altere permissões.

## 2. Configurar a Netlify

Cadastre estas variáveis no ambiente de produção da Netlify:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ADMIN_ALLOWED_ORIGIN` — somente a origem do site, por exemplo `https://seu-site.netlify.app`
- `ADMIN_SESSION_SECRET` — segredo aleatório de 32 bytes, codificado em 64 caracteres hexadecimais; assina o prazo máximo das sessões administrativas

Gere o segredo localmente com Node.js e cadastre a saída diretamente no gerenciador de variáveis da Netlify:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Não compartilhe nem versione esse valor. Alterar o segredo invalida as sessões administrativas existentes; os usuários precisarão entrar novamente.

Essas variáveis são lidas por funções no servidor e não usam o prefixo `VITE_`. Nunca cadastre o segredo de sessão ou uma chave `service_role` no frontend ou no repositório.

Depois, publique uma nova implantação. Para desenvolvimento local, use `netlify dev` após configurar as mesmas variáveis em um arquivo `.env` local, que não deve ser enviado ao Git.

## 3. Limites conhecidos

- O projeto Supabase, os convites, as regras de autenticação, os segredos da Netlify e os backups precisam ser configurados no painel de cada serviço.
- Configure limites de tentativas, CAPTCHA quando apropriado, SMTP próprio e proteção contra abuso na autenticação do Supabase. O envio de recuperação usa os limites nativos do Supabase; o repositório não implementa rate limiting distribuído.
- Imagens ficam em um bucket privado; o servidor valida tamanho, formato e assinatura básica antes do envio. Não há varredura antivírus.
- As políticas de banco e armazenamento estão na migração. Elas ainda precisam ser aplicadas e testadas no projeto Supabase de destino antes de disponibilizar o painel.
- Perfumes e roupas publicados no painel aparecem nas respectivas vitrines após atualizar o catálogo e o cache (até 6 minutos). Rascunhos não são exibidos. O estoque público é informativo e não reserva unidades.
- Não há pagamento, pedidos, envio ou venda integrada. A sacola da loja continua demonstrativa; o painel não processa transações.

## 4. Controles de segurança existentes

- `/admin` é uma rota pública que mostra apenas o formulário de entrada quando não há sessão; esconder ou conhecer a URL não concede acesso.
- Cada função administrativa valida a sessão no servidor, confirma a conta em `admin_users` e exige AAL2 para operações do painel. A sessão usa cookie HttpOnly, SameSite=Strict, assinatura do prazo e validade limitada. O banco também aplica RLS e validações nas funções SQL.
- IDs enviados pelo navegador são validados, mas não concedem permissão: as operações continuam sujeitas à identidade, MFA e políticas do banco.
- A chave `service_role` não é usada. A chave publishable/anon não é uma credencial de administrador; tabelas e operações dependem das políticas RLS.
- Segredos de servidor ficam nas variáveis da Netlify e não devem ser incluídos no Git. Código JavaScript enviado ao navegador pode ser inspecionado; a segurança não depende de esconder a implementação.
- Entradas são validadas no servidor e no banco, e o React escapa texto renderizado. Isso reduz riscos comuns de injeção, mas não substitui atualizações, monitoramento, revisão de dependências e configuração segura dos provedores.
- Não existem pedidos, cupons nem integração de pagamento. Não se deve apresentar a sacola demonstrativa como venda real; uma integração futura precisará validar preços e estoque no servidor e confirmar pagamentos por webhook do provedor.
