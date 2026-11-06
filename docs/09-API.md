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
