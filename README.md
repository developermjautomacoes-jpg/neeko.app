# Neeko Platform

Plataforma SaaS multiempresa para gestão contábil, fiscal e financeira, voltada inicialmente a escritórios contábeis, empresas do Simples Nacional e MEI.

## Objetivo

Entregar um ambiente único no qual a Neeko administra a plataforma, escritórios gerenciam suas carteiras e as empresas atendidas acompanham seus serviços, documentos e rotinas.

## Stack inicial adotada

- **Frontend:** Next.js + React + TypeScript
- **Backend:** NestJS + TypeScript
- **Banco:** PostgreSQL
- **ORM:** Prisma
- **UI:** Tailwind CSS + shadcn/ui
- **Cache e filas:** Redis (introduzir conforme necessidade)
- **Arquitetura:** monólito modular, com limites claros entre domínios
- **Entrega inicial:** aplicação web responsiva, preparada para PWA
- **Integrações fiscais:** camada híbrida/adaptadores; avaliar provedores e integrações oficiais por documento e município

> Esta é a baseline técnica. Não significa que todos os serviços precisam ser implantados no primeiro MVP.

## Princípios inegociáveis

1. Isolamento de dados por organização (tenant) e por empresa.
2. Autorização validada no backend em toda operação.
3. Nenhuma regra fiscal crítica exclusivamente no frontend.
4. Auditoria para ações sensíveis, especialmente emissão/cancelamento fiscal e movimentações financeiras.
5. Segredos, certificados e tokens nunca versionados no Git.
6. Integrações externas atrás de adaptadores, sem acoplar o domínio ao fornecedor.
7. Testes automatizados para regras fiscais, permissões e isolamento multi-tenant.
8. Valores monetários com `Decimal`, nunca `float`.
9. Datas, fusos e competência fiscal tratados explicitamente.
10. LGPD e retenção documental consideradas desde o desenho.

## Perfis principais

- **Neeko Superadmin:** administração global da plataforma e operações próprias da Neeko.
- **Gestor do escritório:** administra apenas seu tenant, colaboradores e empresas atendidas.
- **Colaborador:** permissões concedidas pelo escritório, por módulo e empresa.
- **Usuário da empresa cliente:** acesso restrito à(s) própria(s) empresa(s) e aos serviços habilitados.

## Repositório e execução

A estrutura detalhada está em [`docs/04-ESTRUTURA-DO-PROJETO.md`](docs/04-ESTRUTURA-DO-PROJETO.md).

Pré-requisitos: Node.js 22, pnpm 9 e PostgreSQL 16 (`docker compose up -d`).

```bash
pnpm install
cp .env.example .env          # preencha CERT_ENCRYPTION_KEY e BOOTSTRAP_*
pnpm --filter @neeko/api build
pnpm dev:api                  # http://localhost:4000/api/v1/health
pnpm dev:web                  # http://localhost:3000
```

Testes da API: `pnpm test`, com um banco vazio em `TEST_DATABASE_URL`. Deploy: [`docs/14-DEPLOY.md`](docs/14-DEPLOY.md).

Não execute migrações em produção sem revisão e backup.

## Documentação essencial

- [Visão geral](docs/01-VISAO-GERAL.md)
- [Requisitos funcionais](docs/02-REQUISITOS-FUNCIONAIS.md)
- [Arquitetura](docs/03-ARQUITETURA.md)
- [Estrutura](docs/04-ESTRUTURA-DO-PROJETO.md)
- [Multi-tenancy](docs/05-MULTI-TENANCY.md)
- [Usuários e permissões](docs/06-USUARIOS-E-PERMISSOES.md)
- [Módulos](docs/07-MODULOS.md)
- [Modelo de dados](docs/08-MODELO-DE-DADOS.md)
- [API](docs/09-API.md)
- [Integrações fiscais](docs/10-INTEGRACOES-FISCAIS.md)
- [Segurança e LGPD](docs/11-SEGURANCA-LGPD.md)
- [Padrão visual](docs/12-PADRAO-VISUAL.md)
- [Testes](docs/13-TESTES.md)
- [Deploy](docs/14-DEPLOY.md)
- [Roadmap](docs/15-ROADMAP.md)
- [Plano de implementação inicial](docs/16-PLANO-IMPLEMENTACAO.md)
