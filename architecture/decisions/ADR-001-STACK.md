# ADR-001 — Stack principal

- Status: Aceito
- Data: 2026-11-05

## Contexto

A plataforma exige interface rica, APIs, integrações, processamento assíncrono e manutenção por equipe/agentes.

## Decisão

TypeScript end-to-end: Next.js/React no frontend, NestJS no backend, PostgreSQL e Prisma. Python poderá ser adicionado como serviço especializado quando houver necessidade concreta de IA/processamento.

O código será mantido em monorepo com workspaces pnpm. O monólito modular é a unidade inicial de implantação; aplicações de workers e filas só serão ativadas quando um caso de uso justificar processamento assíncrono.

## Consequências

- Tipos compartilháveis entre frontend e backend.
- Ecossistema unificado.
- Necessidade de disciplina para manter domínios desacoplados.
- Não significa executar todas as tarefas no processo web/API.
- Evitar adicionar serviços, filas ou aplicações sem necessidade funcional e operacional demonstrada.
