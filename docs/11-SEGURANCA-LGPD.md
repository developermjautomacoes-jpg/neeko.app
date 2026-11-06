# 11 — Segurança e LGPD

## Controles mínimos

- HTTPS em todos os ambientes não locais.
- Senhas com hash moderno e parâmetros seguros; nunca reversíveis.
- MFA para superadmin e gestores, conforme política.
- Sessões curtas/renováveis, revogação e proteção contra CSRF conforme mecanismo de autenticação.
- Rate limiting, proteção contra brute force e validação de entrada.
- Criptografia em trânsito e em repouso.
- Gestão de segredos fora do Git.
- Backups criptografados e testes de restauração.
- Logs sem credenciais, tokens ou dados fiscais desnecessários.
- Auditoria de login, exportação, emissão, cancelamento, alteração de permissões e acesso administrativo.
- Plano de resposta a incidentes.

## LGPD

Definir com assessoria jurídica:
- papéis de controlador e operador por fluxo;
- bases legais e finalidades;
- avisos de privacidade e contratos;
- minimização e retenção;
- atendimento aos direitos dos titulares;
- compartilhamento com provedores e suboperadores;
- processo de incidente e comunicação;
- descarte seguro e portabilidade quando aplicável.

## Segurança multi-tenant

Criar testes automatizados para acesso cruzado por ID, busca, exportação, anexos, downloads, relatórios, jobs e webhooks.
