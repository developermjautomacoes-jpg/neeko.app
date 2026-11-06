# 13 — Estratégia de testes

## Pirâmide

- Unitários: regras de domínio e cálculos.
- Integração: serviços, banco, filas e adaptadores.
- E2E: fluxos de usuário e autorização.
- Contrato: APIs e provedores externos.
- Segurança: isolamento multi-tenant, RBAC e validação de entrada.

## Casos obrigatórios

1. Usuário do tenant A não lê/edita registros do tenant B.
2. Usuário sem vínculo não acessa empresa mesmo conhecendo o ID.
3. Colaborador sem permissão não emite/cancela NFS-e.
4. Cliente final não acessa outra empresa da carteira.
5. Jobs e exports mantêm o escopo original.
6. Requisições repetidas de emissão não geram duplicidade.
7. Valores monetários mantêm precisão.
8. Auditoria registra operador e contexto sem expor segredos.

## Dados de teste

Usar fixtures fictícias e CNPJs de teste claramente identificados. Nunca usar documentos reais de clientes.
