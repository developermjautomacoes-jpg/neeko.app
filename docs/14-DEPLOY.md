# 14 — Ambientes e deploy

## Ambientes

- `local`: desenvolvimento individual.
- `development`: integração contínua.
- `staging`: homologação funcional e fiscal.
- `production`: operação real.

## Regras

- Segredos separados por ambiente.
- Banco de produção isolado.
- Migrações revisadas e executadas com plano de rollback.
- Backup antes de mudanças destrutivas.
- Monitoramento de erros, filas, banco e integrações.
- Deploy gradual quando possível.
- Plano de recuperação e teste de restauração.
- Homologação fiscal separada de produção.

## Infraestrutura

Escolher hospedagem após estimar volume, requisitos de residência/transferência de dados, disponibilidade, custo e necessidades de processamento. Não fixar fornecedor antes de comparar requisitos.

## Easypanel (projeto `cursoia`)

Três serviços, com o repositório `developermjautomacoes-jpg/neeko.app` como fonte dos dois apps:

| Serviço | Tipo | Construção | Porta |
|---|---|---|---|
| `neeko-db` | PostgreSQL | — | 5432 (só interna) |
| `neeko-api` | App, sem domínio público | Dockerfile `apps/api/Dockerfile`, caminho de build `/` | 4000 |
| `neeko` | App, com o domínio | Dockerfile `apps/web/Dockerfile`, caminho de build `/` | 3000 |

Variáveis de `neeko-api`: `NODE_ENV=production`, `DATABASE_URL` (conexão interna do `neeko-db`), `CERT_ENCRYPTION_KEY` (`openssl rand -base64 32`), `RUN_MIGRATIONS=true` e, no primeiro início, `BOOTSTRAP_ORG_NAME`, `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`.

Variável de `neeko`: `API_INTERNAL_URL=http://cursoia_neeko-api:4000`.

Mantenha uma só réplica da API: o agendador roda nela. Guarde `CERT_ENCRYPTION_KEY` em cofre: sem ela, os certificados precisam ser importados de novo. Faça backup do `neeko-db`: os XML ficam nele.
