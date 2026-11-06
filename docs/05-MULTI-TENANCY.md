# 05 — Multi-tenancy e segregação

## Modelo

- A Neeko é a operadora global da plataforma.
- Cada escritório é uma `Organization`/tenant.
- Cada empresa atendida pertence a um tenant.
- Um usuário pode ter vínculos com mais de uma organização, se autorizado.
- Empresas próprias da Neeko devem ser representadas por uma organização interna específica, sem misturar com os tenants dos escritórios.

## Regras

1. Toda entidade de negócio pertencente a escritório deve carregar `organizationId`.
2. Dados específicos de empresa também devem carregar `companyId` ou referência inequívoca.
3. O backend deriva e valida o contexto de tenant a partir da sessão e dos vínculos autorizados.
4. Nunca confiar em `organizationId`/`companyId` livremente enviados pelo frontend.
5. Consultas, atualizações, exclusões, exports, downloads e jobs devem aplicar o mesmo escopo.
6. Verificar isolamento em testes negativos: usuário do tenant A não acessa tenant B.
7. Avaliar PostgreSQL Row-Level Security como defesa adicional, sem substituir autorização da aplicação.

## Emissão fiscal

A emissão é executada por usuário autorizado em nome do contribuinte emissor. Guardar a relação entre operador, organização, empresa contribuinte, autorização/credencial usada, provedor, ambiente, protocolo e resultado, sem registrar segredos em logs.

## Acesso Neeko

Superadmin pode administrar tenants conforme política interna, mas o acesso a conteúdo de clientes deve ser auditável, justificado e restrito por função. Suporte não deve implicar acesso irrestrito por padrão.
