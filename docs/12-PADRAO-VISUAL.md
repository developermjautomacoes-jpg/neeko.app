# 12 — Padrão visual e experiência

## Direção de marca

Neeko: tecnologia contábil, automação e gestão. A plataforma segue o frontend aprovado pela diretoria: menu lateral escuro, conteúdo claro, verde-menta #3DEB9F e Inter (`packages/ui/src/tokens.css`). Visual corporativo, limpo, sofisticado e funcional.

## Princípios

- Interface responsiva e consistente.
- Hierarquia visual clara; dashboards sem excesso de cartões.
- Navegação lateral por módulos e contexto de organização/empresa sempre visível.
- Estados vazios úteis, carregamento, erro e sucesso bem definidos.
- Tabelas com filtros, ordenação, paginação e ações claras.
- Acessibilidade: contraste, foco visível, labels e navegação por teclado.
- Componentes e tokens centralizados no pacote `ui`.

## Design tokens

Centralizar cores, tipografia, espaçamento, bordas, sombras, breakpoints e estados em tokens semânticos no pacote `ui`; componentes não devem repetir valores visuais arbitrários. Usar escala de espaçamento baseada em múltiplos de 4px e tokens para `color.brand`, `color.text`, `color.surface`, `color.border`, `color.feedback`, tipografia, foco e estados. A paleta indicada acima é direção de marca, não valores finais: validar contraste e aprovar cores e fontes concretas antes do MVP.

## Convenções de implementação

- Componentes compartilhados ficam em `packages/ui`; regras de negócio e autorização permanecem na API.
- Usar nomes semânticos e consistentes para tokens; evitar nomes atrelados a um componente específico.
- Todo componente interativo deve cobrir foco visível, teclado, label acessível, carregamento, vazio, erro e sucesso quando aplicável.
- O contexto de organização e empresa selecionado deve permanecer visível sem expor dados de outra organização.

## Navegação contextual

- Neeko: visão global e administração.
- Escritório: visão da carteira, colaboradores e operação.
- Empresa: visão restrita aos próprios serviços, documentos e financeiro.

Não misturar dados de tenants em dashboards globais sem agregação autorizada e política explícita.
