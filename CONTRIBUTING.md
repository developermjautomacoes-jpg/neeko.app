# Contribuindo

## Padrões

- Commits pequenos e descritivos.
- Preferir Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Branches sugeridas: `feature/nome`, `fix/nome`, `docs/nome`.
- TypeScript estrito; evitar `any`.
- Componentes visuais não contêm regras fiscais/financeiras.
- Toda mudança de arquitetura relevante exige ADR.

## Pull request / revisão

Descrever:
1. Problema resolvido.
2. Escopo e módulos afetados.
3. Alterações no banco/API.
4. Impacto em tenant, empresa e permissões.
5. Testes executados.
6. Riscos, migração e rollback.

## Segurança

Nunca enviar `.env`, tokens, certificados, chaves privadas, dados pessoais ou documentos reais.
