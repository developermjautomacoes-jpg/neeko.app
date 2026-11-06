---
name: simples-nacional-cgsn140
description: >-
  Consultoria e cálculo do Simples Nacional com base na LC 123/2006 (Estatuto Nacional da ME/EPP) e na Resolução CGSN nº 140/2018 que a regulamenta. Use SEMPRE que mencionar Simples Nacional, LC 123/2006, alíquota efetiva, DAS, PGDAS-D, Anexo I/II/III/IV/V, fator "r", RBT12, sublimite, MEI/SIMEI, vedação ao Simples, CNAE impeditivo, exclusão do Simples, parcelamento, licitações/acesso a mercados para ME/EPP, ou pedir para calcular o imposto de uma empresa optante — mesmo sem citar "CGSN 140" ou "LC 123". Cobre: cálculo de alíquota efetiva e partilha do DAS por Anexo; consulta a regras gerais; auditoria de enquadramento (CNAE, fator r, limites); e referência ampla a qualquer artigo da Resolução ou da LC 123/2006, inclusive temas fora da Resolução (licitações, associativismo, Inova Simples). Cálculo numérico: entregar Excel com memória de cálculo.
---

# Simples Nacional — LC 123/2006 e Resolução CGSN nº 140/2018

Skill de referência fiscal para cálculo e consulta do Simples Nacional (regime tributário brasileiro de ME/EPP). A **LC 123/2006** (Estatuto Nacional da Microempresa e da Empresa de Pequeno Porte) é a lei de base que institui o regime; a **Resolução CGSN nº 140/2018** regulamenta e detalha essa lei operacionalmente. Use a Resolução para o dia a dia de cálculo (é mais didática e já consolida a mecânica), e a LC 123/2006 quando a dúvida for sobre o texto legal em si, a redação exata de um dispositivo, alterações promovidas por leis complementares posteriores (LC 147/2014, LC 155/2016, LC 214/2025, LC 227/2026 etc.) ou fundamentação jurídica mais formal.

## Quando usar cada referência

| Preciso de... | Arquivo |
|---|---|
| Tabelas de alíquota nominal, PD, partilha e fator "r" (Anexos I a V) | `references/anexos-aliquotas.md` |
| Vedações ao ingresso (art. 15), sublimites (art. 9-12), exclusão (art. 81-84), obrigações acessórias | `references/regras-gerais.md` |
| Regras do MEI/SIMEI (limites, valor fixo, ocupações permitidas) | `references/mei.md` |
| Saber se um CNAE é impeditivo ou ambíguo | `references/cnae-listas.md` |
| Texto integral de qualquer artigo da Resolução CGSN 140/2018 não coberto acima | `references/resolucao-completa.md` |
| Texto integral da LC 123/2006 (lei de base) — redação exata de um artigo, histórico de alterações, fundamentação legal formal, dispositivos fora do escopo da Resolução (ex.: acesso a mercados/licitações, associativismo, estímulo ao crédito, Inova Simples, regras civis e empresariais) | `references/lc123-integra.txt` (texto integral, ~44 páginas — busque por número do artigo ou palavra-chave, não carregue o arquivo inteiro) |

Leia apenas o(s) arquivo(s) relevante(s) para a pergunta — não carregue tudo de uma vez.

**Nota sobre numeração**: os artigos citados neste SKILL.md e nos demais arquivos de referência (ex.: "art. 25", "art. 26", "art. 21") seguem a numeração da **Resolução CGSN nº 140/2018**, que não coincide com a numeração da LC 123/2006 (ex.: a alíquota efetiva do Simples está no art. 18 da LC 123/2006, não no art. 21). Ao citar a LC 123/2006 diretamente, confira o número do artigo em `references/lc123-integra.txt` em vez de assumir que é o mesmo da Resolução.

## 1. Cálculo de alíquota efetiva e DAS (entrega: Excel)

Sempre que o usuário pedir para calcular o valor devido do Simples Nacional, siga este roteiro e **entregue uma planilha Excel com a memória de cálculo** (não apenas o resultado em texto). Antes de gerar o arquivo, consulte também `/mnt/skills/public/xlsx/SKILL.md` para os padrões de formatação de planilha.

### Passo a passo

1. **Identifique a natureza da receita** e o Anexo aplicável (art. 25):
   - Anexo I — revenda de mercadorias (comércio)
   - Anexo II — venda de produtos industrializados (indústria)
   - Anexo III — locação de bens móveis e serviços do inciso III do §1º art. 25 (e serviços do inciso V quando fator r ≥ 28%)
   - Anexo IV — construção civil, vigilância/limpeza/conservação, advocacia
   - Anexo V — serviços do inciso V do §1º art. 25 quando fator r < 28%
   - Se a empresa tem mais de uma atividade, **segregue as receitas** por Anexo (art. 25, §1º) — o cálculo é feito em separado para cada uma.

2. **Se a atividade cair no inciso V do art. 25 (Anexo III ou V)**, calcule o **fator "r"** (art. 26):
   - fator r = FS12 (folha de salários + encargos dos últimos 12 meses, incluindo pró-labore, CPP e FGTS) ÷ RBT12 (receita bruta acumulada 12 meses)
   - fator r ≥ 0,28 → tributa pelo Anexo III
   - fator r < 0,28 → tributa pelo Anexo V
   - Casos de início de atividade: ver §6º e §7º do art. 26 em `references/anexos-aliquotas.md`.

3. **Calcule o RBT12** (receita bruta acumulada nos 12 meses anteriores ao PA, art. 21-22):
   - Empresa já em atividade há 12+ meses: soma efetiva dos últimos 12 meses.
   - Início de atividade no próprio ano: RBT12 = receita do mês × 12 (1º mês) ou média aritmética dos meses anteriores × 12 (meses 2 a 12).
   - Se RBT12 = 0, considere R$ 1,00 só para fins de cálculo da alíquota.

4. **Localize a faixa** de RBT12 na tabela do Anexo correspondente e obtenha a **alíquota nominal** e a **parcela a deduzir (PD)**.

5. **Calcule a alíquota efetiva** (art. 21, II):
   ```
   Alíquota efetiva = (RBT12 × Alíquota nominal − PD) / RBT12
   ```

6. **Aplique a alíquota efetiva sobre a receita bruta do mês (PA)** para obter o valor total do DAS:
   ```
   Valor do DAS = Receita bruta do mês × Alíquota efetiva
   ```

7. **Faça a partilha entre os tributos** (IRPJ, CSLL, COFINS, PIS/Pasep, CPP, ICMS/ISS/IPI conforme o Anexo) usando os percentuais de repartição da faixa de RBT12 — não da alíquota nominal, e sim aplicando o percentual efetivo de cada tributo:
   ```
   % efetivo do tributo = Alíquota efetiva × % de repartição do tributo naquela faixa
   ```
   - Atenção ao teto de 5% para ISS (Anexos II a V): se o percentual efetivo do ISS ultrapassar 5%, o excedente é redistribuído aos tributos federais conforme a tabela de redistribuição de cada Anexo.
   - Se RBT12 ultrapassar a 5ª faixa mas a empresa não excedeu o sublimite, use a fórmula específica de ICMS/ISS descrita no art. 21, III, "b" (ver `anexos-aliquotas.md`).

8. **Verifique sublimites e limites** (ver `regras-gerais.md`) — se RBT12 ultrapassar o sublimite estadual de ICMS/ISS (art. 9º-12) ou o limite de R$ 4.800.000,00, aplique as regras de ultrapassagem do art. 24 (cálculo segmentado por faixa de receita).

9. **Monte a planilha Excel** com abas/seções claras:
   - Dados de entrada (RBT12, receita do mês, Anexo, fator r se aplicável)
   - Memória de cálculo (alíquota nominal, PD, alíquota efetiva — com a fórmula visível/replicável em célula, não só o valor)
   - Partilha por tributo (tabela com % de repartição e valor de cada tributo)
   - Valor total do DAS
   - Use fórmulas nativas do Excel (não apenas valores fixos) para que o usuário possa alterar a receita e recalcular.

### Casos especiais a checar antes de fechar o cálculo
- Regime de caixa vs. competência (art. 16-20)
- Devoluções e cancelamentos de documento fiscal (art. 17-18)
- Substituição tributária / tributação concentrada de ICMS, PIS/COFINS (art. 25, §6º-§8º)
- Exportação (desconsidera percentuais de ICMS/ISS/PIS/COFINS/IPI — art. 25, §3º)
- Escritório de serviços contábeis com ISS fixo municipal (art. 25, VIII e §11)

## 2. Consulta a regras gerais

Para perguntas sobre vedações ao Simples, exclusão, parcelamento, obrigações acessórias, restituição/compensação, contencioso etc., leia `references/regras-gerais.md`. Se a resposta específica não estiver lá, procure o artigo correspondente em `references/resolucao-completa.md`.

## 3. Auditoria de enquadramento

Quando o usuário pedir para verificar se uma empresa pode optar/permanecer no Simples:
1. Confira o CNAE em `references/cnae-listas.md` (impeditivo = não pode optar; ambíguo = pode optar se exercer só a atividade permitida).
2. Confira as vedações do art. 15 (composição societária, atividade financeira, débitos, etc.) em `regras-gerais.md`.
3. Confira se RBT12 está dentro do limite de R$ 4.800.000,00 e do sublimite estadual vigente.
4. Se a atividade envolve o inciso V do art. 25, calcule o fator "r" para saber o enquadramento correto (Anexo III x V) — isso também é auditoria de enquadramento, não só de tributação.
5. Reporte achados em formato claro (pode ser texto ou planilha, conforme a preferência do usuário) apontando o artigo que fundamenta cada achado.

## 4. Referência ampla

Se a pergunta do usuário for sobre um tema não coberto pelos arquivos temáticos acima (ex.: transação tributária, processo administrativo, certificação digital, DTE-SN, NFS-e), leia `references/resolucao-completa.md` e cite o número do artigo na resposta.

Se a pergunta exigir a redação exata da lei (não da Resolução), tratar de tema fora do escopo da Resolução CGSN 140/2018 (ex.: licitações públicas, sociedade de propósito específico, investidor-anjo, Inova Simples, protesto de títulos, acesso à Justiça) ou pedir o histórico de alterações de um dispositivo (quem alterou, quando, redação anterior), leia `references/lc123-integra.txt` e cite o artigo/parágrafo da LC 123/2006 na resposta.
