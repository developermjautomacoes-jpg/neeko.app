# ADR-006 — Captura de notas antes do MVP

- Status: Aceito
- Data: 2026-11-06

## Contexto

A diretoria pediu que a captura de notas em uso no sistema da Facilitar fosse levada para a Neeko, reescrita em NestJS, com a interface da Neeko e login individual. O roadmap só previa integrações fiscais reais depois da Fase 1; esta decisão registra a antecipação.

## Decisão

- Reescrever em TypeScript a captura de NFS-e (ADN) e de NF-e/CT-e (DistDFe), a Ciência da Operação e o agendamento, sem compartilhar dados, banco ou certificados com o sistema da Facilitar.
- Escopo por `organizationId` e `Company` em todas as tabelas e consultas; XML guardado comprimido no PostgreSQL.
- Autenticação própria: e-mail e senha individuais (scrypt), sessão opaca em cookie httpOnly, senha provisória trocada no primeiro acesso. Não há senha compartilhada. A interface interna permite trocar por provedor depois.
- `.pfx` e senha cifrados com AES-256-GCM, com a organização como dado autenticado; chave em `CERT_ENCRYPTION_KEY`, fora do banco. A chave privada só existe em memória.
- A verificação TLS do servidor nunca é desligada, ao contrário do sistema de origem. A raiz ICP-Brasil vem da cadeia do certificado ou de `FISCAL_CA_FILE`.
- Prisma sem motor binário (`engineType = "client"`, adaptador `pg`); `migrate.ts` aplica `database/prisma/migrations` quando `RUN_MIGRATIONS=true`.
- Interface com CSS Modules e tokens em `packages/ui`, seguindo o frontend aprovado pela diretoria (menu escuro, conteúdo claro, verde-menta), em vez de Tailwind e shadcn/ui: reaproveita as telas portadas com menos risco.
- Agendador dentro da API, em uma só instância, enquanto não houver necessidade real de fila.

## Memorando como cadastro único

O memorando é o único lugar de cadastro: salvá-lo cria ou atualiza a `Company`. Certificado não cria empresa. Cancelar o memorando ou registrar a saída tira a empresa das capturas, e as notas guardadas continuam. Cada empresa tem um memorando ativo por vez, e a numeração é por organização e ano.

## Fora desta entrega

Emissão de notas; NFC-e e notas emitidas pela SEFAZ-ES; referência de emissão própria; portal por empresa.

## Consequências

- Regras fiscais vieram do sistema em operação e das NTs citadas no código; a validação com certificado real é feita em homologação antes de produção.
- O mesmo CNPJ em dois sistemas disputa a sequência de NSU da SEFAZ: a captura noturna de NF-e/CT-e nasce desligada por empresa.
