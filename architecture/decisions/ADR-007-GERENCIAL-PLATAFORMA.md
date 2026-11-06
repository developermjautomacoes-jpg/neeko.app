# ADR-007 — Gerencial da plataforma

- Status: Aceito
- Data: 2026-11-06

## Decisão

- A administração da Neeko (`NEEKO_SUPERADMIN`) cadastra escritórios, planos, limites, vencimento e suspensão, e vê apenas dados gerenciais e totais de uso.
- Não há acesso ao conteúdo dos escritórios pela plataforma. O suporte acontece por acesso remoto à máquina do escritório, a pedido dele.
- A cobrança é controlada manualmente, sem gateway. Vencimento gera alerta, não bloqueio automático; suspender é decisão explícita.
- Verificação em duas etapas (TOTP) é obrigatória para administração da Neeko, `ORG_OWNER` e `ORG_ADMIN`, com códigos de recuperação de uso único. `MFA_RESET_EMAIL` é o recurso de emergência ao iniciar a API.
