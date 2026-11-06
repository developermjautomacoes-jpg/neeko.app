---
name: reforma-tributaria-simples
description: >-
  Consultoria sobre a Reforma Tributária (IBS, CBS, Imposto Seletivo — LC 214/2025 e alterações da LC 227/2026), com foco na transição do Simples Nacional. Use SEMPRE que mencionar reforma tributária, IBS, CBS, Imposto Seletivo, LC 214/2025, "por dentro"/"por fora" do Simples na reforma, opção pelo regime regular de IBS/CBS, redução de 30%/60% de alíquota, alíquota de referência, transição 2026-2033, simulação ano a ano, calculadora/simulador da reforma, ou decidir entre permanecer no Simples e migrar para o modelo híbrido — mesmo sem citar "LC 214". Cobre: (1) simulação ano a ano da transição completa (2026-2033) comparando permanecer no Simples x modelo híbrido, identificando em que ano compensa trocar; (2) consulta a qualquer dispositivo da LC 214/2025; (3) apoio a calculadoras web da reforma, com base legal e fórmulas. Cálculo numérico: Excel com memória de cálculo, salvo pedido de ferramenta web — nesse caso, construa o site usando as regras desta skill como fonte da verdade.
---

# Especialista em Reforma Tributária — LC 214/2025

Skill de referência fiscal sobre a Reforma Tributária brasileira (Emenda Constitucional 132/2023 regulamentada pela LC 214/2025, com alterações da LC 227/2026), que institui o IBS (Imposto sobre Bens e Serviços), a CBS (Contribuição Social sobre Bens e Serviços) e o IS (Imposto Seletivo).

## Quando usar cada referência

| Preciso de... | Arquivo |
|---|---|
| Simular a transição completa ano a ano (2026-2033) e comparar permanecer no Simples x modelo híbrido | `references/transicao-simples-nacional.md` |
| Redução de 30% para profissões regulamentadas (inclui contabilistas) | `references/transicao-simples-nacional.md`, seção específica |
| Cronograma de alíquotas ano a ano e o que substitui o quê (PIS/COFINS/IPI em 2027, ICMS/ISS entre 2029-2033) | `references/transicao-simples-nacional.md`, tabela de transição |
| Qualquer outro artigo da LC 214/2025 não coberto acima (regime regular, regimes diferenciados/específicos, IS, split payment, obrigações acessórias, Comitê Gestor do IBS etc.) | `references/lc214-integra.txt` (texto integral, 178 páginas — busque por número do artigo ou palavra-chave, não carregue o arquivo inteiro) |
| Mecânica de cálculo do próprio Simples Nacional (RBT12, fator "r", Anexos I-V, alíquota efetiva) | skill `simples-nacional-cgsn140` |

## 1. Simulação ano a ano da transição (entrega: Excel, salvo pedido de ferramenta web)

Sempre que o usuário pedir para avaliar se compensa permanecer no Simples ou migrar para o modelo híbrido durante a Reforma Tributária:

1. Leia `references/transicao-simples-nacional.md` — em especial a seção "Cronograma da transição, ano a ano" — para entender os dois cenários e o calendário completo 2026-2033.
2. **Não compare apenas "hoje" x "2033"**: simule **cada ano da transição** (2026, 2027, 2028, ..., até 2033), já que a carga muda progressivamente conforme PIS/COFINS/IPI são extintos em 2027 e ICMS/ISS são substituídos gradualmente pelo IBS entre 2029 e 2033.
3. Para cada ano do horizonte, calcule dois cenários lado a lado, usando as alíquotas de CBS/IBS daquele ano específico (tabela em `transicao-simples-nacional.md`):
   - **Permanecer no Simples ("por dentro")**: aplique a mecânica da skill `simples-nacional-cgsn140` (RBT12, Anexo, fator "r", alíquota efetiva, partilha) sobre a receita informada, com a partilha do ano incorporando CBS/IBS na proporção vigente naquele ano. Sem crédito cheio para o adquirente (LC 214/2025, art. 47, § 9º).
   - **Modelo híbrido ("por fora")**: os demais tributos seguem no Simples, mas CBS/IBS são apurados e recolhidos pelo regime regular à alíquota do ano (crescente conforme o cronograma), com direito a apropriação de créditos das aquisições (LC 214/2025, art. 47, caput e §§ 1º-2º) e, se aplicável, a redução de 30% do art. 127 (relevante para escritórios contábeis e outras profissões regulamentadas).
4. Sempre que possível, **busque na internet as alíquotas de referência vigentes** (federal/estadual/municipal) para os anos em que a lei ainda não fixou o percentual definitivo — apenas os testes de 2026-2032 do IBS e o teste de CBS de 2026 estão fixados diretamente em lei; os demais dependem de resolução do Senado e podem não estar disponíveis à frente do tempo.
5. Monte a entrega com:
   - Dados de entrada (receita, Anexo, RBT12, se a atividade se enquadra no art. 127, horizonte de anos a simular)
   - Uma linha do tempo ano a ano (2026 a 2033) com a carga tributária efetiva de cada cenário lado a lado
   - Identificação do(s) ano(s), se houver, em que as curvas se cruzam — ou seja, em que ano passa a compensar trocar de regime
   - Recomendação sobre o ponto de decisão, com as ressalvas sobre alíquotas de referência ainda não fixadas

## 2. Desenvolvimento de calculadora/simulador web da reforma tributária

Quando o pedido for para **construir um site/ferramenta** (não apenas calcular um caso pontual):

- Use esta skill como fonte da verdade para as regras de negócio (fórmulas dos cenários, cronograma ano a ano, condições do art. 127) — não invente regras.
- O simulador deve rodar a linha do tempo completa (2026-2033), não apenas o ano corrente e 2033 — essa é a comparação que o usuário precisa para decidir entre permanecer no Simples ou ir para o modelo híbrido, inclusive identificando em que ano a decisão muda.
- Antes de codificar valores de alíquota de referência, sinalize ao usuário que esses percentuais mudam por resolução/regulamento e devem ser parametrizáveis (não hardcoded como se fossem definitivos), ou busque os valores mais recentes na internet.
- Consulte `/mnt/skills/public/frontend-design/SKILL.md` para os padrões de design do ambiente antes de gerar HTML/React.
- Estruture os inputs do simulador em torno dos mesmos dados de entrada listados na seção 1 acima.

## 3. Consulta a qualquer dispositivo da LC 214/2025

Se a pergunta não estiver coberta pelas referências temáticas, busque o artigo em `references/lc214-integra.txt` (por número do artigo ou palavra-chave) e cite o número do artigo/parágrafo na resposta. Lembre o usuário, quando relevante, que a LC 214/2025 já foi alterada pela LC 227/2026 e outras leis futuras podem seguir alterando o texto — para temas sensíveis a mudanças recentes, vale confirmar por busca na internet se há alteração posterior à consolidação usada nesta skill.
