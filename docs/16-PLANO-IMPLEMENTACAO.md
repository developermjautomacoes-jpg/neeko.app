# 16 — Plano de implementação inicial

## Estado

O repositório saiu da Fase 0: tem API, web, banco, autenticação individual e o módulo de notas antecipado pelo [ADR-006](../architecture/decisions/ADR-006-NOTAS-FISCAIS.md). A baseline de arquitetura está definida, mas não equivale a uma aprovação de produto para regras fiscais ou acessos sensíveis.

## Decisões consolidadas

- Monorepo pnpm, TypeScript strict, Next.js, NestJS, PostgreSQL e Prisma; começar como monólito modular.
- Banco compartilhado com escopo obrigatório por organização; `Company` pertence a uma organização.
- Identidade global de usuário, vínculos organizacionais e autorização contextual por empresa.
- RBAC com negação por padrão; emitir/cancelar/configurar credenciais fiscais e ações financeiras sensíveis requerem permissões separadas.
- Integrações fiscais reais e cálculos tributários não fazem parte do esqueleto nem serão simulados como produção.

ADRs: [ADR-001](../architecture/decisions/ADR-001-STACK.md), [ADR-002](../architecture/decisions/ADR-002-MULTI-TENANCY.md), [ADR-003](../architecture/decisions/ADR-003-AUTENTICACAO.md), [ADR-004](../architecture/decisions/ADR-004-IDENTIDADE-ORGANIZACAO-EMPRESA.md), [ADR-005](../architecture/decisions/ADR-005-AUTORIZACAO-RBAC.md).

## Próxima entrega — Fase 1

1. Criar workspaces e estrutura `apps/web`, `apps/api`, `packages/ui`, `packages/shared` e `database/prisma`. Adicionar workers somente quando houver um job assíncrono real.
2. Inicializar Next.js e NestJS, configurar TypeScript strict, lint, formatação, testes e CI.
3. Configurar PostgreSQL local e Prisma com schema/migration mínimos para fundação, sem seed com dados reais.
4. Implementar health checks e validação explícita de configuração; manter segredos fora do repositório.
5. Documentar setup e comandos e validar instalação limpa e execução local.

### Aceite da Fase 1

- Setup local repetível a partir das instruções documentadas.
- Web e API iniciam; o health check não expõe segredos nem detalhes internos desnecessários.
- Configuração inválida ou incompleta falha explicitamente.
- Lint, verificação de tipos e testes passam pelos scripts documentados.
- PostgreSQL e migration inicial executam localmente.
- Sem integrações fiscais reais, regras tributárias, credenciais versionadas ou permissões de negócio implicitamente amplas.

## Gates antes do MVP

- Comparar e escolher provedor de autenticação após avaliar segurança, MFA, recuperação, auditoria, custo e integração.
- Aprovar matriz detalhada de permissões por módulo/ação e por empresa.
- Validar migrações e testes negativos de isolamento multi-tenant.
- Aprovar valores finais de cores/fontes após validação de contraste e acessibilidade.
- Para qualquer regra fiscal, registrar fonte normativa, vigência, UF/município e cenário antes de implementação.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Acesso cruzado entre organizações ou empresas | Escopo no backend, constraints compostas e testes negativos desde a fundação |
| Escolha prematura de autenticação | Manter contrato interno neutro até comparação documentada; não armazenar credenciais em código |
| Escopo fiscal crescer antes da fundação | Manter emissão e cálculo fora das Fases 0 e 1 |
| Iniciar serviços sem necessidade | Adicionar workers, filas e infraestrutura apenas por caso de uso demonstrado |
