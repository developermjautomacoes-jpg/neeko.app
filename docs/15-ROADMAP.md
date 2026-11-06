# 15 — Roadmap inicial

## Fase 0 — Fundação e decisões
- Revisar stack, monólito modular e tenancy.
- Registrar ADRs.
- Definir modelo de identidade, organização e empresa.
- Definir matriz de papéis/permissões.
- Definir design tokens e convenções.
- Resultado: arquitetura aprovada e backlog refinado.

Critérios de saída:
- ADRs de stack, tenancy, autenticação/identidade e autorização têm status e decisões explícitas.
- Modelo conceitual distingue identidade global, vínculo organizacional e acesso à empresa.
- A baseline de papéis não concede acesso fiscal/financeiro sensível implicitamente; a matriz detalhada está listada como gate do MVP.
- O plano da Fase 1 define estrutura, verificações de segurança e critérios para considerar as aplicações executáveis.
- Provedor de autenticação e valores finais da marca permanecem decisões abertas até comparação/validação documentada.

## Fase 1 — Esqueleto técnico
- Criar monorepo e workspaces.
- Inicializar Next.js, NestJS e Prisma.
- Configurar lint, format, testes e CI.
- Configurar PostgreSQL local e migrations iniciais.
- Implementar health checks e configuração segura.
- Resultado: aplicações executando localmente.

Critérios de aceite:
- Instalação reproduzível com pnpm e instruções verificadas em README.
- Web e API iniciam localmente; health check da API confirma disponibilidade sem revelar configuração sensível.
- Configuração valida variáveis obrigatórias e falha com mensagem clara quando ausentes/inválidas.
- PostgreSQL local e migration mínima funcionam sem dados reais; nenhuma credencial é versionada.
- TypeScript em modo strict, lint, formatação e testes executam pelos scripts documentados.
- CI valida instalação, lint, tipos e testes; não publica nem implanta ambientes automaticamente nesta fase.
- Não incluir emissão fiscal real, cálculo tributário, permissões fictícias permissivas ou dependências de serviços ainda não aprovados.

## Fase 2 — Identidade e multi-tenancy
- Login, sessão, recuperação e MFA conforme desenho.
- Organizações, vínculos, empresas e permissões.
- Guards/policies no backend.
- Auditoria básica.
- Testes de isolamento.
- Resultado: ambientes segregados e verificáveis.

## Fase 3 — Operação administrativa
- Dashboard inicial.
- Cadastro de escritórios, colaboradores e empresas.
- Memorandos.
- Contratos e alertas.
- Resultado: MVP administrativo.

## Fase 4 — BPO financeiro
- Contas a pagar/receber.
- Categorias, anexos e fluxo de caixa.
- Aprovações e conciliação em etapas.
- Resultado: BPO operacional inicial.

## Fase 5 — Documentos fiscais
- Selecionar provedores e validar cobertura.
- Captura/importação e armazenamento.
- NF-e, NFS-e, CT-e e NFC-e conforme viabilidade.
- Resultado: consulta documental homologada.

## Fase 6 — Emissão NFS-e
- Mapear municípios e contribuintes.
- Configurar credenciais e autorização.
- Homologação, idempotência, auditoria e cancelamento.
- Resultado: emissão controlada em produção.

## Fase 7 — Fiscal Simples Nacional e MEI
- Requisitos normativos por competência e vigência.
- Rotinas, alertas, cálculos e relatórios com testes.
- Resultado: módulo fiscal evolutivo.

## Fase 8 — Comercialização e escala
- Planos, limites, cobrança e onboarding.
- Observabilidade, suporte, SLA e recuperação.
- Otimização e eventual extração de serviços.

## Ordem recomendada

Não iniciar por emissão fiscal ou cálculos tributários. Primeiro garantir identidade, tenancy, permissões, auditoria e cadastro. São a fundação de segurança de todo o produto.
