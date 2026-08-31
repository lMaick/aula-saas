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

O arquivo `.env.example` reserva apenas os nomes das variáveis previstas para uma integração futura. O Supabase ainda não está implementado.
