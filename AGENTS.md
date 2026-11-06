# Instruções para agentes de desenvolvimento — Neeko Platform

## Missão

Construir a Neeko Platform seguindo a documentação deste repositório. Priorize segurança, clareza arquitetural, consistência e entregas pequenas verificáveis.

## Antes de alterar código

1. Leia `README.md` e os documentos relevantes em `docs/`.
2. Identifique o módulo/domínio afetado.
3. Verifique se a alteração cruza limites de tenant, empresa, permissões, dados fiscais ou financeiros.
4. Apresente um plano curto para mudanças estruturais antes de executá-las.

## Regras obrigatórias

- Use TypeScript com `strict: true`.
- Frontend Next.js; backend NestJS; PostgreSQL; Prisma.
- Comece com monólito modular. Não crie microsserviços sem ADR aprovado.
- Não implemente regra fiscal com base em suposição. Exija fonte normativa, vigência, UF/município e cenário.
- Não invente endpoints, credenciais, certificados, layouts ou capacidades de provedores.
- Não simule emissão fiscal como se fosse real. Mock deve estar claramente identificado.
- Nunca coloque segredo em código, documentação de exemplo ou commit.
- Não use dados reais de clientes em fixtures, screenshots ou testes.
- Toda consulta/mutação de dados de negócio deve ser escopada pelo tenant e, quando aplicável, pela empresa.
- Não confie em `tenantId`, `companyId`, role ou permissões enviados pelo cliente sem validação no servidor.
- Registre auditoria de operações sensíveis.
- Use `Decimal` para dinheiro e quantidades com precisão relevante.
- Adicione testes para autorização, isolamento multi-tenant e caminhos de erro.
- Não faça refatorações amplas não solicitadas.
- Não apague documentação nem altere contratos de API sem atualizar os documentos correspondentes.

## Fluxo de trabalho

1. Planejar.
2. Implementar a menor unidade funcional.
3. Testar.
4. Revisar segurança e isolamento.
5. Atualizar documentação e changelog.
6. Informar arquivos alterados, comandos executados, resultados e pendências.

## Critérios de aceite

Uma funcionalidade só está concluída quando:
- atende aos requisitos documentados;
- valida autorização no backend;
- respeita tenant e empresa;
- tem tratamento de erros;
- tem testes relevantes;
- não expõe segredos ou dados de outro cliente;
- documentação está atualizada.

## Primeira tarefa recomendada

Executar a Fase 0 do `docs/15-ROADMAP.md`: validar a arquitetura proposta, registrar decisões em ADRs e produzir um plano de implementação. Não criar integrações fiscais reais nesta fase.
