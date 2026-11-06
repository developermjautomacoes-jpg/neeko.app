# ADR-005 — Autorização contextual e papéis iniciais

- Status: Aceito como baseline; matriz detalhada antes do MVP
- Data: 2026-11-05

## Contexto

Os papéis iniciais são globais ou ligados a uma organização, enquanto permissões de negócio podem depender também do módulo, ação e empresa.

## Decisão

Aplicar RBAC contextual com negação por padrão. O papel fornece uma base; permissões por módulo/ação e escopo de empresa são verificados no backend em cada endpoint e job. A interface pode ocultar ações, mas não é mecanismo de autorização.

Baseline de capacidades:

| Papel | Escopo base |
|---|---|
| `NEEKO_SUPERADMIN` | Operações globais da plataforma; sem acesso implícito a conteúdo de clientes |
| `ORG_OWNER` | Administração da própria organização e gestão de vínculos; sem concessão automática de ações fiscais ou financeiras sensíveis |
| `ORG_ADMIN` | Operação da própria organização conforme permissões concedidas; sem acesso a outras organizações |
| `STAFF` | Nenhuma permissão de negócio implícita; permissões concedidas por módulo/ação e empresa |
| `COMPANY_USER` | Acesso às empresas explicitamente vinculadas; leitura e envio de documentos conforme permissões concedidas |

Emissão, cancelamento e configuração de credenciais fiscais, assim como operações financeiras sensíveis, exigem permissões distintas e escopo explícito de empresa. Ser proprietário ou administrador não implica automaticamente essas permissões.

## Consequências

- Toda decisão de acesso considera usuário ativo, vínculo ativo, organização, empresa e ação solicitada.
- Grants e revogações, especialmente de permissões privilegiadas, geram auditoria e podem revogar sessões/contextos ativos.
- A matriz completa por ação será aprovada antes do MVP; esta tabela não substitui essa especificação.
- Acesso excepcional de suporte segue a regra do ADR-003 e deve ser temporário, justificado e auditado.
