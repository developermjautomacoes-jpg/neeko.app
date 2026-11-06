# ADR-002 — Estratégia multi-tenant

- Status: Aceito
- Data: 2026-11-05

## Contexto

Neeko administra a plataforma; escritórios possuem carteiras de empresas e usuários próprios.

## Decisão

Banco PostgreSQL compartilhado com `organizationId` em todas as entidades tenant-scoped, validação de escopo no backend, índices e constraints compostos. Avaliar Row-Level Security como defesa adicional.

`Company` pertence a uma única `Organization`. Toda consulta, mutação, exportação, download ou job deve obter o escopo do contexto autenticado e validar também a empresa quando aplicável. Identificadores enviados pelo cliente são seletores, nunca prova de autorização.

## Consequências

- Menor custo operacional inicial.
- Exige testes rigorosos contra acesso cruzado.
- Migração para isolamento físico pode ser avaliada para clientes especiais no futuro.
- Row-Level Security permanece como defesa adicional a ser avaliada; não substitui autorização e escopo aplicados pela aplicação.
