# Aula SaaS

Fundação técnica do SaaS para professores particulares, conforme o escopo definido em `PRODUCT.md`.

## Requisitos

- Node.js 20.9 ou superior
- npm

## Execução local

```bash
npm install
copy .env.example .env.local
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Validação

```bash
npm run lint
npm run typecheck
npm run build
```

Preencha `.env.local` com os dois grupos de configuração do Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_SITE_URL` são usados pelo browser;
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e `SITE_URL` são usados por Server Components, Server Actions e pelo proxy.

Em produção, ambos os grupos precisam estar configurados. A URL e a chave publicável podem repetir os mesmos valores nos dois grupos porque atendem fronteiras de execução diferentes. Nunca use uma chave `service_role` em variáveis `NEXT_PUBLIC_*`.

## Assinatura pelo Mercado Pago

Além das variáveis públicas, configure somente no servidor:

- `SUPABASE_SERVICE_ROLE_KEY`: usada exclusivamente pela integração de assinatura para chamar RPCs restritas;
- `MERCADO_PAGO_ACCESS_TOKEN`: Access Token de teste ou produção;
- `MERCADO_PAGO_WEBHOOK_SECRET`: assinatura secreta exibida ao configurar Webhooks;
- `AULA_SAAS_MONTHLY_PRICE_CENTS`: preço mensal em centavos;
- `NEXT_PUBLIC_APP_URL`: origem pública da aplicação, sem caminho.

Cadastre no painel do Mercado Pago a URL de Webhooks `https://SEU_DOMINIO/api/webhooks/mercado-pago` para o evento de assinaturas (`subscription_preapproval`). O retorno do checkout é `https://SEU_DOMINIO/assinatura/retorno`. Em desenvolvimento, use credenciais de teste e uma URL HTTPS pública para receber webhooks; nunca copie tokens para arquivos versionados.

As migrations ficam em `supabase/migrations` e devem ser aplicadas ao projeto Supabase antes de testar autenticação e perfil.
