# ADR-004 — Identidade, organização e empresa

- Status: Aceito
- Data: 2026-11-05

## Contexto

Uma pessoa pode trabalhar com mais de um escritório; cada escritório administra uma carteira de empresas. A Neeko também opera a plataforma e pode ter uma organização interna.

## Decisão

- `User` representa a identidade global de uma pessoa, sem duplicação por tenant.
- `OrganizationMembership` vincula usuário e organização, com estado e papel contextual. O vínculo deve ser único por par usuário-organização.
- `Company` pertence a exatamente uma organização. A organização interna Neeko não compartilha empresas nem dados de clientes dos escritórios.
- `CompanyAccess` (ou entidade equivalente) limita o acesso de um usuário às empresas autorizadas. A permissão organizacional ampla, se necessária, deve ser explícita e validada pelo backend.
- Relações entre entidades tenant-scoped devem preservar `organizationId` nas chaves, constraints e consultas para impedir referências cruzadas.
- O tenant e o usuário efetivos são derivados da sessão e dos vínculos ativos. IDs fornecidos pelo cliente não definem o escopo.

## Consequências

- Usuários podem alternar entre organizações somente por vínculos ativos e autorizados.
- Acesso à empresa é validado além do acesso à organização sempre que o recurso for company-scoped.
- Suspender/remover um vínculo invalida seu uso em novas requisições e sessões/contextos relacionados.
- Mudanças de vínculo, empresa e escopo de acesso são auditáveis.
- A política de retenção e exclusão de identidade/dados pessoais deve ser definida antes do lançamento.
