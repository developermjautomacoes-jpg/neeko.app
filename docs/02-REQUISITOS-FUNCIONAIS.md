# 02 — Requisitos funcionais

Prioridade: P0 = indispensável à fundação; P1 = MVP; P2 = evolução.

| ID | Requisito | Prioridade |
|---|---|---|
| RF-001 | Autenticar usuários e encerrar sessões | P0 |
| RF-002 | Administrar organizações/escritórios | P0 |
| RF-003 | Cadastrar empresas vinculadas a um escritório | P0 |
| RF-004 | Isolar dados por organização e empresa | P0 |
| RF-005 | Permissões por papel, módulo e empresa | P0 |
| RF-006 | Registrar auditoria de ações sensíveis | P0 |
| RF-007 | Dashboard com indicadores e pendências | P1 |
| RF-008 | Cadastro e gestão de colaboradores | P1 |
| RF-009 | Memorandos, solicitações e comunicados | P1 |
| RF-010 | Contratos, anexos, vigência e alertas | P1 |
| RF-011 | Cadastro de documentos e anexos | P1 |
| RF-012 | BPO: contas a pagar e receber | P1 |
| RF-013 | BPO: fluxo de caixa e conciliação | P2 |
| RF-014 | Consulta/importação de NF-e, NFS-e, CT-e e NFC-e | P2 |
| RF-015 | Emissão de NFS-e por contribuinte autorizado | P2 |
| RF-016 | Rotinas e indicadores do Simples Nacional e MEI | P2 |
| RF-017 | Relatórios exportáveis | P2 |
| RF-018 | Planos, limites e cobrança SaaS | P2 |

## Requisitos não funcionais

- Segurança: autenticação robusta, autorização server-side e segregação multi-tenant.
- Disponibilidade: definir SLO após escolha de infraestrutura.
- Desempenho: paginação, filtros indexados e processamento assíncrono para tarefas pesadas.
- Observabilidade: logs estruturados, métricas, rastreamento e alertas.
- Acessibilidade: navegação por teclado, contraste e semântica.
- Responsividade: desktop, tablet e celular.
- Manutenibilidade: módulos com fronteiras claras e testes automatizados.
