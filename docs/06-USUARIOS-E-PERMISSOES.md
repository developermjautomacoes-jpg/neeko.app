# 06 — Usuários e permissões

## Papéis iniciais

- `NEEKO_SUPERADMIN`: administração global.
- `ORG_OWNER`: proprietário/gestor do escritório.
- `ORG_ADMIN`: administração operacional do escritório.
- `STAFF`: colaborador com permissões atribuídas.
- `COMPANY_USER`: usuário da empresa cliente.

## Modelo de autorização
Adotar RBAC com escopo contextual:
- papel global;
- vínculo com organização;
- permissões por módulo/ação;
- escopo de empresas autorizadas;
- eventual restrição por recurso.

O usuário é uma identidade global. Papel e permissões organizacionais vêm de um vínculo ativo com a organização; o acesso a cada empresa é validado separadamente, salvo grant organizacional amplo explícito. Toda autorização ocorre no backend, com negação por padrão. Consultar [ADR-003](../architecture/decisions/ADR-003-AUTENTICACAO.md), [ADR-004](../architecture/decisions/ADR-004-IDENTIDADE-ORGANIZACAO-EMPRESA.md) e [ADR-005](../architecture/decisions/ADR-005-AUTORIZACAO-RBAC.md).

Exemplos de ações: `companies.read`, `companies.manage`, `fiscal.documents.read`, `fiscal.nfse.issue`, `financial.payables.manage`, `contracts.manage`, `memoranda.create`, `audit.read`.

## Princípios

- Menor privilégio.
- Negar por padrão.
- Validar autorização em cada endpoint e job.
- MFA obrigatório para perfis privilegiados; para os demais, aplicar política baseada em risco.
- Revogar sessões ao remover vínculo ou suspender usuário.
- Registrar concessões e alterações de permissões.
- Separar permissão para emitir, cancelar, consultar e configurar credenciais fiscais.

## Matriz

A baseline de papéis e escopos está registrada no [ADR-005](../architecture/decisions/ADR-005-AUTORIZACAO-RBAC.md). A matriz definitiva por módulo/ação deve ser configurável, testada e aprovada antes do MVP. Não assumir que todo gestor pode emitir/cancelar ou que todo cliente pode ver todos os dados financeiros. Emissão, cancelamento e configuração de credenciais fiscais são permissões separadas.

## Permissões implementadas

`companies.read`, `companies.manage`, `fiscal.documents.read`, `fiscal.capture`, `fiscal.credentials.manage`, `fiscal.ciencia.send`, `fiscal.schedule.manage`, `users.manage`, `audit.read`. Ninguém concede o que não tem. A matriz final por papel segue pendente (ADR-005).
