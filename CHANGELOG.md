# Changelog

Mudanças relevantes da Neeko Platform serão registradas aqui.

## [0.1.0] - Inicialização

- Criada documentação base do produto.
- Definida stack inicial TypeScript, Next.js, NestJS, PostgreSQL e Prisma.
- Definida arquitetura inicial de monólito modular.
- Documentados requisitos, domínios, multi-tenancy, segurança, integrações e roadmap.

## [Não lançado]

- Criados monorepo, API NestJS, web Next.js, PostgreSQL com Prisma e testes.
- Login e senha individuais, RBAC por organização e empresa, auditoria e gestão de usuários.
- Exclusão de escritório com confirmação pelo nome e reinício da senha provisória do gestor.
- Gerencial de escritórios, planos e limites, com verificação em duas etapas opcional (ADR-007).
- Planos Piloto, Neeko Essencial, Neeko Profissional e Neeko Premium (CNPJs e usuários simultâneos), cliente piloto sem cobrança e perfil do escritório com logo no menu e nos relatórios.
- Memorando como cadastro único das empresas, com PDF, Word e histórico.
- Captura de NFS-e, NF-e e CT-e, certificados cifrados, Ciência da Operação, agendamento, Excel, XML e DANFSe (ADR-006).

- Consolidada a baseline da Fase 0 para stack, tenancy, identidade e autorização contextual.
- Registradas decisões ADR para identidade/empresa e RBAC inicial.
- Refinados critérios de saída da Fase 0 e aceite da Fase 1.
- Documentado o plano inicial de implementação e os gates pendentes antes do MVP.
