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

Preencha `.env.local` com a URL, a chave pública do Supabase e a URL local do site. Nunca use uma chave `service_role` em variáveis `NEXT_PUBLIC_*`.

As migrations ficam em `supabase/migrations` e devem ser aplicadas ao projeto Supabase antes de testar autenticação e perfil.
