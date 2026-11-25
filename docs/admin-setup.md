# Configuração do painel administrativo

O painel em `/admin` usa Netlify Functions e Supabase. A chave `service_role` não é necessária e não deve ser adicionada ao site.

## 1. Criar e configurar o Supabase

1. Crie um projeto Supabase e guarde as credenciais no gerenciador de segredos, não no Git.
2. No SQL Editor, execute a migração `supabase/migrations/20261123000000_secure_catalog.sql`.
3. Em Authentication, desative a criação pública de contas. Convide somente as pessoas que administrarão a loja.
4. Exija MFA TOTP nas configurações de autenticação. O painel também bloqueia operações administrativas sem uma sessão MFA de nível AAL2.
5. Para cada pessoa autorizada, copie o UUID da conta e insira-o manualmente pelo SQL Editor:

   ```sql
   insert into public.admin_users (user_id)
   values ('UUID-DA-CONTA-CONVIDADA');
   ```

   A tabela não permite que o navegador conceda ou altere permissões.

## 2. Configurar a Netlify

Cadastre estas variáveis no ambiente de produção da Netlify:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ADMIN_ALLOWED_ORIGIN` — somente a origem do site, por exemplo `https://studiomaze.netlify.app`
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
- Configure limites de tentativas e proteção contra abuso na autenticação do Supabase. Este repositório não implementa rate limiting distribuído.
- Imagens ficam em um bucket privado; o servidor valida tamanho, formato e assinatura básica antes do envio. Não há varredura antivírus.
- As políticas de banco e armazenamento estão na migração. Elas ainda precisam ser aplicadas e testadas no projeto Supabase de destino antes de disponibilizar o painel.
- Perfumes e roupas publicados no painel aparecem nas respectivas vitrines após atualizar o catálogo e o cache (até 6 minutos). Rascunhos não são exibidos. O estoque público é informativo e não reserva unidades.
- Não há pagamento, pedidos, envio ou venda integrada. A sacola da loja continua demonstrativa; o painel não processa transações.
