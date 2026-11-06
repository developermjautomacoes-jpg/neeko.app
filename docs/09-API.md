# 09 — Diretrizes de API

## Padrões

- API REST versionada: `/api/v1`.
- JSON com schemas validados.
- Paginação por cursor ou limit/offset padronizado.
- Filtros e ordenação com allowlist.
- Erros com código estável, mensagem segura e correlation ID.
- Idempotência para operações de emissão, pagamentos e webhooks.
- OpenAPI/Swagger publicado apenas em ambientes protegidos conforme política.

## Recursos iniciais sugeridos

- `/auth`
- `/me`
- `/organizations`
- `/organizations/:organizationId/members`
- `/companies`
- `/companies/:companyId`
- `/contracts`
- `/memoranda`
- `/audit-events`

## Segurança

O contexto de organização/empresa deve ser validado no backend. O identificador na URL não concede acesso. Não retornar stack traces, tokens, certificados ou dados de outros tenants.

## Webhooks

- Validar assinatura e origem.
- Implementar idempotência.
- Persistir evento recebido antes de processar.
- Reprocessamento seguro e fila de falhas.
- Não aceitar comandos arbitrários em payload.

## Rotas implementadas

Base `/api/v1`. Sessão por cookie httpOnly; a organização vem da sessão, nunca da requisição.

- `POST /auth/login`, `/auth/logout`, `/auth/password`, `/auth/mfa/setup|enable|verify`; `GET|PATCH /me`
- `/platform/plans`, `/platform/offices`, `/platform/offices/:id/status`, `/platform/offices/:id/reset-manager`
- `GET|POST /users`, `PATCH /users/:id`, `POST /users/:id/reset-password`
- `GET|POST /certificates`, `DELETE /certificates/:id`
- `GET|POST /memoranda`, `GET|PUT /memoranda/:id`, `POST /memoranda/:id/status`, `POST /memoranda/:id/client`, `GET /memoranda/team`, `GET /memoranda/lookup/cnpj/:cnpj`, `GET /memoranda/lookup/ie/:cnpj`
- `PATCH /companies/:id/nfse-mode`
- `GET /fiscal/companies`, `GET|PUT /fiscal/procurator`, `GET|PUT /fiscal/schedule`
- `/fiscal/nfse/:id/`: `capture`, `documents`, `verify`, `diagnose`, `restart`, `xmls`, `zip`
- `/fiscal/dfe/`: `companies`, `:id/auto-capture`, `:id/auto-ciencia`, `:id/ciencia/mark`, `:id/ciencia/send`, `:id/:servico/capture|documents|restart|zip`
