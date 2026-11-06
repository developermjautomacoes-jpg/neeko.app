# ADR-003 — Autenticação e autorização

- Status: Aceito (política base; provedor pendente)
- Data: 2026-11-05

## Decisão

Usar uma identidade global por pessoa, sessões seguras e autorização contextual por organização e empresa. MFA será obrigatório para perfis privilegiados. A escolha entre provedor próprio ou serviço gerenciado fica pendente de comparação de custo, segurança, recuperação de conta, MFA, auditoria e integração; não bloqueará o desenho dos contratos internos de identidade.

## Regras

Autorização sempre no backend; negar por padrão; revogar sessões e registrar alterações de privilégios.

Superadmin não recebe acesso irrestrito implícito ao conteúdo dos tenants. Acesso excepcional de suporte deve ter justificativa, autorização apropriada e auditoria.
