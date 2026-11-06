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
- A raiz do CNPJ do próprio escritório e as raízes importadas ficam restritas: só `ORG_OWNER` e quem ela autorizar (`companies.restricted`) veem ou cadastram.
- Por enquanto, escritórios acessam apenas NFS-e, memorandos, usuários e administração; a API responde `MODULE_DISABLED` nas rotas de NF-e/CT-e.
- O limite de usuários do plano conta acessos simultâneos: pessoas distintas com atividade nos últimos 15 minutos; cadastros não têm limite.
- Há dois links de entrada: `/login` (administração da Neeko) e `/e/<slug>` (cada escritório, com a logo dele). O acesso ao Gerencial só vale em sessão aberta por `/login`.
- `ORG_ADMIN` tem todas as permissões e vê todas as empresas, como `ORG_OWNER`; não exclui a proprietária nem acessa a empresa restrita sem a liberação dela.
- MFA opcional para todos os perfis, por decisão da responsável pelo produto (2026-11-06); quem já ativou continua informando o código.
- Revogar sessões ao remover vínculo ou suspender usuário.
- Registrar concessões e alterações de permissões.
- Separar permissão para emitir, cancelar, consultar e configurar credenciais fiscais.

## Matriz

A baseline de papéis e escopos está registrada no [ADR-005](../architecture/decisions/ADR-005-AUTORIZACAO-RBAC.md). A matriz definitiva por módulo/ação deve ser configurável, testada e aprovada antes do MVP. Não assumir que todo gestor pode emitir/cancelar ou que todo cliente pode ver todos os dados financeiros. Emissão, cancelamento e configuração de credenciais fiscais são permissões separadas.

## Permissões implementadas

`companies.read`, `companies.manage`, `fiscal.documents.read`, `fiscal.capture`, `fiscal.credentials.manage`, `fiscal.ciencia.send`, `fiscal.schedule.manage`, `users.manage`, `audit.read`, `memoranda.read`, `memoranda.manage`. Ninguém concede o que não tem. A matriz final por papel segue pendente (ADR-005).
