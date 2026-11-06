# 04 — Estrutura do projeto

Estrutura-alvo do monorepo:

```text
neeko-platform/
├── AGENTS.md
├── README.md
├── apps/
│   ├── web/                 # Next.js
│   ├── api/                 # NestJS
│   └── workers/             # Jobs e filas
├── packages/
│   ├── ui/                  # Design system
│   ├── shared/              # Tipos e schemas compartilhados
│   ├── config/              # ESLint, TSConfig etc.
│   └── integrations-sdk/    # Contratos de adaptadores
├── database/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed/
│   └── docs/
├── docs/
├── architecture/
│   ├── diagrams/
│   └── decisions/
├── infrastructure/
│   ├── docker/
│   ├── observability/
│   └── deployment/
└── scripts/
```

## Organização interna do backend

```text
apps/api/src/
├── common/
├── config/
├── modules/
│   ├── identity/
│   ├── tenancy/
│   ├── organizations/
│   ├── companies/
│   ├── access-control/
│   ├── audit/
│   ├── fiscal/
│   ├── documents/
│   ├── financial/
│   ├── contracts/
│   ├── memoranda/
│   ├── notifications/
│   └── integrations/
└── main.ts
```

Cada módulo deve separar, conforme complexidade: `domain`, `application`, `infrastructure` e `presentation`. Evitar criar camadas vazias sem necessidade.
