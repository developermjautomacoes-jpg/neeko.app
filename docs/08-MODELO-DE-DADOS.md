# 08 — Modelo de dados conceitual

Este documento é conceitual; não é schema pronto para produção.

## Entidades-base

- `User`: identidade global de acesso, não duplicada por tenant.
- `Organization`: escritório/tenant ou organização interna Neeko.
- `OrganizationMembership`: vínculo único por usuário-organização, com papel contextual e status.
- `Company`: pessoa jurídica atendida, pertencente a exatamente uma organização.
- `CompanyMembership` ou `CompanyAccess`: acesso explícito do usuário a empresas específicas.
- `Subscription` / `Plan`: plano e limites.
- `Role` / `Permission`: autorização.
- `AuditEvent`: trilha de auditoria.
- `Document`: arquivo e metadados.
- `Contract`: contrato e vigência.
- `Memorandum`: comunicado/solicitação.
- `FinancialAccount`, `Payable`, `Receivable`, `Transaction`, `Reconciliation`.
- `FiscalDocument`, `FiscalOperation`, `FiscalProviderConfig`, `FiscalEmission`.

## Campos transversais

Entidades tenant-scoped devem conter, conforme aplicável:
- `id` UUID;
- `organizationId`;
- `companyId`;
- `createdAt`, `updatedAt`;
- `createdBy`, `updatedBy`;
- `status`;
- `deletedAt` apenas quando exclusão lógica for justificada.

## Integridade

- Índices compostos iniciados por `organizationId` em tabelas tenant-scoped.
- Chaves estrangeiras/constraints compostas devem impedir que vínculos de usuário ou dados de empresa atravessem organizações.
- Um usuário só acessa empresas da organização selecionada quando seu vínculo e o escopo da empresa estiverem ativos e autorizados.
- Unicidade contextual: por exemplo, CNPJ por organização conforme regra de negócio.
- Chaves estrangeiras e restrições no banco.
- Valores monetários em Decimal com escala definida.
- Guardar datas de competência e timestamps com timezone de forma explícita.
- Não armazenar XML/documentos grandes como campos indiscriminados sem avaliar object storage.

## Privacidade

Classificar campos pessoais, limitar acesso, definir retenção e permitir atendimento a solicitações de titulares conforme política jurídica.

O modelo é conceitual e deve ser refinado antes da migration inicial. Ver [ADR-004](../architecture/decisions/ADR-004-IDENTIDADE-ORGANIZACAO-EMPRESA.md) para as decisões de identidade e pertencimento.
