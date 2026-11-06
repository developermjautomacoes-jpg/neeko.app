# 03 — Arquitetura

## Decisão inicial

Monólito modular em TypeScript, dividido em aplicações `web`, `api` e `workers`, compartilhando contratos e bibliotecas versionadas no monorepo.

## Componentes

- `web`: Next.js/React; interface e experiência do usuário.
- `api`: NestJS; autenticação, autorização, regras de domínio e API.
- `workers`: consumidores de filas e tarefas assíncronas.
- `packages/ui`: design system e componentes reutilizáveis.
- `packages/shared`: tipos, validações e contratos compartilhados.
- `database`: schema Prisma, migrations e seeds.
- `integrations`: adaptadores para serviços externos.

## Fluxo lógico

Browser → Web → API → módulos de domínio → PostgreSQL.
Tarefas demoradas: API → fila → worker → provedor externo → atualização de status/evento.

## Domínios sugeridos

Identity & Access, Tenancy, Organizations, Companies, Fiscal, Documents, Financial, Contracts, Memoranda, Notifications, Billing, Audit e Integrations.

## Regras de dependência

- Domínios não devem importar internals uns dos outros.
- Comunicação entre domínios por serviços públicos, eventos internos ou contratos explícitos.
- Integrações externas ficam atrás de interfaces/adaptadores.
- UI consome API; não acessa banco diretamente.
- Worker reutiliza serviços de aplicação, sem duplicar regra de negócio.

## Escalabilidade

Começar como monólito modular. Extrair um domínio para serviço independente somente quando houver justificativa mensurável de escala, isolamento operacional ou ciclo de implantação.

## Decisões futuras

Registrar em `architecture/decisions/` qualquer mudança de banco, autenticação, tenancy, filas, armazenamento de documentos ou provedor fiscal.
