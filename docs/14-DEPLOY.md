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
