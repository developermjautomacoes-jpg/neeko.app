---
name: "especialista-reforma-tributaria"
description: "Especialista na Reforma Tributária do consumo (EC 132/2023; LC 214/2025 consolidada com LC 227/2026; Decreto 12.955/2026 - Regulamento da CBS; Resolução CGIBS 6/2026 - Regulamento do IBS). Use para IBS, CBS, Imposto Seletivo, split payment, créditos, alíquotas, transição 2026-2033, regimes diferenciados/específicos, CGIBS, ITCMD, multas, cálculo ou parecer com base legal. Simulação Simples x híbrido fica com a skill reforma-tributaria-simples."
---

# Especialista em Reforma Tributária (IBS, CBS e IS)

Base normativa desta skill (texto consolidado lido em out/2026):

| Norma | Conteúdo | Observação |
|---|---|---|
| EC 132/2023 | Cria IBS (art. 156-A CF), CBS (art. 195, V), IS (art. 153, VIII); transição no ADCT | Moldura constitucional |
| LC 214/2025 | Institui IBS, CBS e IS (544 arts. + anexos) | Texto compilado já inclui LC 227/2026 e LC 235/2026 |
| LC 227/2026 | CGIBS, processo administrativo do IBS, distribuição da receita, saldo credor de ICMS, normas gerais do ITCMD; altera LC 214, CTN, LC 123 | DOU 14/01/2026 |
| Decreto 12.955/2026 | Regulamento da CBS (RFB) | DOU 30/04/2026 |
| Resolução CGIBS 6/2026 | Regulamento do IBS (CGIBS) | 30/04/2026 |

**Os dois regulamentos são espelhados no Livro I** (normas comuns, arts. ~1-465 com a mesma numeração em ambos) e cada artigo indica entre parênteses o artigo da LC 214 que regulamenta. Use isso para navegar: ache o artigo na LC e procure "(Art. X da Lei Complementar nº 214" no regulamento.

## Como responder

1. **Classifique a pergunta**: incidência / fato gerador / local / base / alíquota / crédito / apuração e pagamento / split payment / regime diferenciado / regime específico / Simples / importação-exportação / transição / obrigações acessórias e multas / contencioso / ITCMD.
2. **Cite sempre o dispositivo** (LC 214, art. X, § Y, inciso Z) e, quando houver, o artigo do regulamento (Decreto 12.955 para CBS; Resolução CGIBS 6 para IBS). Indique quando a redação veio da LC 227/2026.
3. **Separe norma de parâmetro**: alíquotas de referência de 2027 em diante são fixadas por resolução do Senado (até 31/10 do ano anterior — LC 214, art. 349, § 1º). Antes de usar um percentual de 2027+, **pesquise na web** a resolução vigente; se não houver, trate como premissa parametrizável e diga isso.
4. **Data-base**: esta skill reflete as normas até out/2026. Para temas sensíveis (atos conjuntos RFB/CGIBS, notas técnicas de DF-e, cronogramas de obrigatoriedade, novas LCs), confirme por busca se houve alteração posterior.
5. **Texto literal**: quando o usuário precisar da redação exata, busque o artigo no texto oficial (planalto.gov.br, LC 214 compilada: `https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm`; EC 132: `https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm`) ou nos PDFs que o usuário anexar. Não reconstrua texto legal de memória.
6. **Cálculos**: entregue memória de cálculo (Excel quando pedido arquivo; tabela na resposta quando pontual). Mostre base, alíquota de cada esfera (CBS / IBS-UF / IBS-Município), reduções e créditos separadamente.
7. **Encaminhamentos**: simulação Simples "por dentro" x "por fora" → skill `reforma-tributaria-simples`; mecânica do DAS → `simples-nacional-cgsn140`; tags IBSCBS/cClassTrib no XML → `especialista-nfe`; benefícios de ICMS-ES na transição → `especialista-invest-es`; SPED Fiscal → `especialista-efd-icms-ipi`.

---

## 1. Cronograma da transição

| Ano | CBS | IBS | Tributos atuais |
|---|---|---|---|
| 2026 (teste) | 0,9% (art. 346) | 0,1% estadual (art. 343) | Tudo segue normal. Valor de CBS/IBS é compensável com PIS/Cofins; **dispensado o recolhimento** para quem cumpre as obrigações acessórias (art. 348, § 1º). Não se aplica ao Simples (art. 348, III, "c"). Autos por falta de obrigação acessória: 60 dias para sanar e a multa se extingue (art. 348, §§ 3º-4º) |
| 2027-2028 | Alíquota de referência (Senado) − 0,1 p.p. (art. 347) | 0,05% UF + 0,05% Município (art. 344) | PIS/Cofins extintos (art. 542). IPI zerado exceto ZFM. IS começa (2027) |
| 2029 | Referência | Referência proporcional | ICMS e ISS reduzidos em 10% (LC 87, art. 31-A; LC 116, art. 8º-B — LC 214, arts. 501 e 508) |
| 2030 | idem | idem | ICMS/ISS −20% |
| 2031 | idem | idem | ICMS/ISS −30% |
| 2032 | idem | idem | ICMS/ISS −40%. Benefícios de ICMS/ISS caem na mesma proporção desde 2029 |
| 2033 | Referência | Integral | ICMS e ISS extintos (art. 543) |

- Alíquota de referência: CBS 2027-2033 e IBS 2029-2033 por resolução do Senado (arts. 18, 349); 2034-2035 = 2033 (art. 366); teto em 2030 e 2035 com base na carga 2012-2021 (arts. 367-369).
- Arredondamento ao décimo de p.p. mais próximo (art. 349, § 14).
- Se o Senado não fixar até 22/12, vale a calculada pelo TCU (art. 349, § 2º).
- Fato gerador que atravessa a virada (art. 408): situação que era FG de PIS/Cofins até 31/12/2026 e de CBS em 2027 → exige-se PIS/Cofins, não CBS; receitas em regime de caixa de operações até 2026 pagam PIS/Cofins no recebimento. Em 2029-2032, vale a legislação do ano da primeira ocorrência para ICMS/ISS x IBS.

## 2. Incidência, imunidade, não incidência

- **Incide** sobre operações onerosas com bens (materiais, imateriais, direitos, imóveis; inclui locação, arrendamento, cessão — art. 3º, § 3º) ou serviços (residual) (arts. 3º-4º). Irrelevantes: forma jurídica, lucro, habitualidade quando contribuinte (art. 4º, §§ 3º-4º; inclui ativo não circulante).
- **Não onerosas tributadas** (art. 5º, redação LC 227): fornecimento grátis/abaixo do mercado de bens que geraram crédito para PF contribuinte, sócios, administradores, empregados e parentes até 3º grau; brindes e bonificações (salvo bonificação no próprio documento sem condição — § 1º); devolução de capital/dividendos in natura com bens que geraram crédito; partes relacionadas a valor abaixo do mercado (§§ 2º-7º definem partes relacionadas: controle, coligadas, 25% dos lucros, 20% do capital comum etc.). Tributação pelo valor de mercado (§ 9º). Não se aplica a bens/serviços usados preponderantemente na atividade (§ 8º c/c art. 57, § 3º).
- **Não incide** (art. 6º): relação de emprego e administradores; transferência entre estabelecimentos do mesmo contribuinte (com DF-e obrigatório); participações societárias, fusão/cisão/incorporação, integralização; rendimentos financeiros (fora do regime específico); dividendos e JCP; doação sem contraprestação (se o bem gerou crédito: tributa pelo mercado **ou** anula o crédito — § 2º); repasses públicos a OSC; fundos de cooperativas; contribuições associativas estatutárias (inciso XII, LC 227).
- **Ordem de aplicação** quando cabem vários benefícios (art. 7º-A, LC 227): alíquota zero → suspensão com conversão em zero → isenção → diferimento → redução. Reduções não se somam salvo previsão expressa; vale a maior.
- **Fornecimentos combinados** (art. 7º): discriminar cada um, salvo mesmo tratamento ou principal/acessório.
- **Imunidades** (arts. 8º-9º): exportações; entes públicos (finalidades essenciais); templos; partidos, sindicatos de trabalhadores, educação e assistência sem fins lucrativos (CTN art. 14); livros/jornais/papel; fonogramas nacionais; radiodifusão livre; ouro ativo financeiro. Imunidade não alcança as **aquisições** da entidade (§ 4º).

## 3. Fato gerador, local e base

- **Momento** (art. 10): fornecimento. Transporte: início (ou término, se iniciado no exterior); demais serviços: término. Execução continuada (LC 227): o primeiro entre exigibilidade de cada parcela e pagamento. Pagamento antecipado: antecipação na data de cada parcela, ajuste no fornecimento (excesso segue regra de pagamento indevido); regulamento pode jogar para o período do fornecimento se ≤ 5 dias (§ 7º). Compras públicas: no pagamento (§ 2º).
- **Local = destino** (art. 11): bem móvel → entrega ao destinatário (não presencial: destino final indicado); imóvel e serviços sobre imóvel → local do imóvel; serviço sobre pessoa física/fruído presencialmente → local da prestação; eventos → local do evento; transporte de passageiros → início; transporte de carga → entrega no documento; telecom por cabo → terminal; **residual → domicílio principal do adquirente** (se adquirente no exterior, do destinatário no País). Aquisição centralizada por contribuinte com vários estabelecimentos → matriz para telecom e locação de bem móvel (§ 4º). Adquirente sem cadastro: 2 critérios entre endereço declarado, informações comerciais, cadastro do meio de pagamento, IP/geolocalização (§ 3º).
- **Alíquota do IBS** = alíquota da UF + alíquota do Município de destino (art. 15). Cada ente fixa a sua (vinculada ou não à referência); sem lei, vale a de referência (art. 14). Reduções de regimes diferenciados/específicos incidem sobre a alíquota de cada ente (art. 16, p.ú.).
- **Base** (art. 12): valor integral cobrado (juros, multas, descontos condicionais, frete próprio, tributos, seguros). **Fora da base**: o próprio IBS/CBS ("por fora"), IPI, descontos incondicionais (no documento, sem evento posterior; inclui fidelidade não onerosa do próprio fornecedor), reembolsos por conta de terceiros com documento em nome do terceiro, e **ICMS, ISS, PIS/Cofins de 2026 a 2032** (inciso V), contribuição de iluminação pública. Valor de mercado quando falta valor, sem dinheiro ou partes relacionadas (§ 4º). Arbitramento: art. 13.
- Devolução/cancelamento usa a mesma base e alíquota da operação original (arts. 12, § 7º; 17).

Fórmula prática (por fora): `CBS = Base × alíq. CBS`; `IBS = Base × (alíq. UF + alíq. Mun.)`; com redução de X%: `alíq. efetiva = alíq. × (1 − X)`. Na transição 2026-2032, a base exclui ICMS/ISS/PIS/Cofins destacados.

## 4. Sujeição passiva

- **Contribuinte** (art. 21): quem fornece em atividade econômica, com habitualidade/volume, ou profissionalmente; arrematante em leilão; importador. Obrigatória inscrição (CPF/CNPJ/CIB — cadastro único, art. 59). DTE do IBS unificado e obrigatório para todo CNPJ (art. 59, § 5º, LC 227).
- **Não contribuintes** (art. 26): condomínio edilício, consórcio, SCP, nanoempreendedor (receita < 50% do limite do MEI; motorista/entregador de app conta 25% do bruto — § 10), fundos de investimento (com exceções: FII/Fiagro que não cumprem requisitos, FIDC → contribuintes — §§ 5º-A a 8º-A), produtor rural < R$ 3,6 mi/ano (art. 164, corrigido por IPCA), TAC PF, autogestão em saúde, EFPC, fundos patrimoniais. Podem optar pelo regime regular (§ 1º). Condomínio optante tributa todas as taxas; não optante com taxas < 80% da receita tributa só as demais operações (§ 2º).
- **Plataformas digitais** (arts. 22-23): responsáveis quando fornecedor é do exterior; solidárias com fornecedor nacional que não emite DF-e ou se a plataforma não presta informações (LC 227). Podem emitir DF-e e recolher pelo fornecedor ou ser substitutas tributárias (§§ 12-15).
- **Solidários** (art. 24): quem adquire/transporta sem documento idôneo, leiloeiro, desenvolvedor de software que frauda, quem oculta operação ou abusa da personalidade jurídica. Grupo econômico por si só não gera solidariedade (§ 3º).
- **Imóveis — PF contribuinte** (art. 251): locação com receita > R$ 240 mil no ano anterior **e** mais de 3 imóveis; venda de mais de 3 imóveis (com menos de 5 anos no patrimônio) ou mais de 1 imóvel construído pelo próprio vendedor em 5 anos.

## 5. Extinção do débito, split payment e pagamento

- Modalidades (art. 27): compensação com créditos; pagamento; **split payment**; recolhimento pelo adquirente; pagamento pelo responsável.
- **Prazos (regulamentos, art. 44, § 6º, e art. 45)**: apuração mensal (LC, art. 43), entregue e paga até o **último dia útil do mês seguinte** (calendário do município da matriz). **Apuração assistida** (LC, art. 46; regulamentos, art. 46): RFB/CGIBS apresentam até o **dia 15** do mês seguinte (**dia 20** para obrigados à DeRE); ajustes até o último dia útil; silêncio = saldo presumido correto e crédito constituído. Apuração (própria ou assistida confirmada) = confissão de dívida (art. 45, § 4º).
- Apuração consolidada de todos os estabelecimentos; pagamento e ressarcimento centralizados (art. 42).
- Atraso (art. 29): multa de mora 0,33%/dia limitada a 20% + Selic (1% no mês do pagamento); juros também sobre multas punitivas (§ 5º, LC 227).
- **Split payment** (arts. 31-35, LC 227): procedimento padrão — o originador do pagamento informa ao PSP o vínculo com o DF-e e os valores; PSP consulta o sistema RFB/CGIBS e segrega a diferença entre o destacado e o já extinto; sem consulta, segrega tudo e o excesso volta em 3 dias úteis. Procedimento **simplificado** (opcional, percentual preestabelecido por setor/contribuinte; pagar sem informar IBS/CBS implica opção por ele) — **não gera crédito ao adquirente pelo valor segregado** (art. 33, § 7º). Implantação gradual por ato conjunto; parcelado: segrega em cada parcela; antecipação de recebíveis não muda. PSP não é responsável tributário.
- **Recolhimento pelo adquirente** (art. 36): opcional para adquirente do regime regular quando o meio de pagamento não permite split.
- **Pagamento indevido**: restituição só se a operação não gerou crédito e observado o CTN, art. 166 (art. 38).
- **Ressarcimento** (art. 39; regulamentos, art. 39: pedido até o último dia útil do mês seguinte): prazos de análise 30 dias (programas de conformidade), 60 dias (ativo imobilizado ou pedido ≤ 150% da média mensal de saldo credor dos últimos 24 meses — art. 40) e 180 dias (demais). Sem resposta: paga em 15 dias. Fiscalização suspende (máximo 360 dias). Selic a partir do 2º mês após o pedido. Saldo não pedido fica como crédito.

## 6. Não cumulatividade e créditos

- **Regra** (art. 47): crédito amplo de tudo que foi adquirido, **condicionado à extinção do débito** do fornecedor (pagamento/split/etc.), segregado IBS x CBS (sem compensação cruzada), e com DF-e idôneo. Exceções: uso e consumo pessoal (art. 57) e vedações expressas.
- Enquanto split payment e recolhimento pelo adquirente não estiverem implantados, basta o destaque correto no DF-e (art. 48).
- Compras de optante do Simples (sem opção pelo regime regular) geram crédito igual ao IBS/CBS pago no DAS (art. 47, § 9º; LC 123, art. 23, § 1º-A — percentual da faixa informado no documento). O optante pelo Simples "por dentro" não toma crédito.
- Combustíveis monofásicos: crédito pelo valor do documento, sem comprovar pagamento (§§ 4º-5º).
- **Estorno obrigatório**: perecimento, deterioração, roubo, furto, extravio (imobilizado: proporcional à vida útil) (§§ 6º-7º).
- **Imunes e isentas anulam** os créditos das operações anteriores, proporcionalmente (art. 51) — salvo exportação, livros/papel e radiodifusão. **Alíquota zero mantém** crédito (art. 52). Alíquota reduzida não estorna (art. 47, § 10). Imunes, isentas, alíquota zero, diferimento e suspensão **não geram crédito ao adquirente** (art. 49), salvo crédito presumido.
- Inadimplência por **falência** do adquirente não contribuinte: fornecedor credita o débito extinto (§ 11).
- Ordem de uso (art. 53): débitos vencidos anteriores → débitos do período → períodos seguintes ou ressarcimento. Valor nominal, sem correção. **Prazo de 5 anos** (art. 54). Intransferível, salvo sucessão societária (art. 55) e cooperativas (art. 272).
- **Uso e consumo pessoal — crédito vedado** (art. 57): joias, arte, bebidas alcoólicas, tabaco, armas, bens recreativos/esportivos/estéticos (e sua manutenção); bens e serviços dados grátis a PF contribuinte, sócios, administradores, empregados e parentes (imóvel residencial, veículo, seguro, combustível — § 1º; family office — § 2º). **Não são pessoais** (§ 3º): itens revendidos ou usados na produção; armas de empresa de segurança; recreativos usados por clientes no estabelecimento; uniformes, EPI, alimentação e saúde no local de trabalho, creche no local, plano de saúde e benefícios educacionais por acordo/convenção coletiva, vale-transporte/refeição/alimentação (crédito = débito do fornecedor no regime específico). Venda posterior de bem sem crédito: exclui o custo de aquisição da base (§ 9º).
- Crédito presumido (regimes diferenciados) exige DF-e emitido pelo adquirente e pagamento efetivo (art. 126, § 5º): produtor rural e integrado não contribuinte (art. 168), TAC PF/MEI (art. 169), resíduos de catadores (art. 170), bens móveis usados de PF para revenda (art. 171). Percentuais no Livro II dos regulamentos.

## 7. Regimes de apuração e Simples Nacional

- Regime regular = todas as regras da LC (art. 41). Optante do Simples/MEI segue a LC 123 (DAS com IBS/CBS "por dentro").
- **Opção pelo regime regular de IBS/CBS pelo optante do Simples** ("por fora"/híbrido): LC 123, art. 13, §§ 9º-11 (LC 227) — **semestral**, para semestres iniciados em janeiro e julho, exercida em **setembro e março** anteriores, irretratável no semestre. Quem recebeu ressarcimento no ano corrente ou anterior não pode sair do regime regular (LC 214, art. 41, § 5º).
- Opção pelo Simples para 2027 deve ser feita em **setembro de 2026** (LC 123, art. 87-B, redação LC 214). Sublimite de R$ 3,6 mi passa a valer também para o IBS (art. 13-A).
- ISS no DAS limitado a 5% efetivos, excesso redistribuído a tributos federais e IBS (LC 123, art. 18, § 1º-A, I).
- MEI recolhe IBS/CBS em valores fixos (Anexo VII da LC 123).
- Para comparar cenários ano a ano, use a skill `reforma-tributaria-simples`.

## 8. Regimes diferenciados (Título IV, arts. 125-171)

Reduções aplicadas sobre a alíquota de cada ente (art. 126, § 4º), valem também na importação (§ 1º).

| Tratamento | Itens (artigo; anexo com NCM/NBS) |
|---|---|
| **Alíquota zero** | Cesta Básica Nacional (art. 125, Anexo I); dispositivos médicos (art. 144, Anexo XII; Anexo IV quando comprados pelo poder público ou entidade CEBAS-SUS) e de acessibilidade (art. 145, Anexo XIII; Anexo V nas mesmas compras); **medicamentos** (art. 146, redação LC 227): registrados na Anvisa para doenças raras, negligenciadas, oncologia, diabetes, HIV/IST, cardiovasculares e Farmácia Popular, mais soros e vacinas e compras pelo poder público/CEBAS (lista por ato conjunto a cada 120 dias); saúde menstrual (art. 147); hortícolas, frutas e ovos (art. 148, Anexo XV); automóveis para PcD/TEA e taxistas (arts. 149-155); P&D por ICT sem fins lucrativos (art. 156) |
| **Isenção** | Transporte público coletivo urbano, semiurbano e metropolitano (art. 157) |
| **−60%** | Educação (Anexo II), saúde (Anexo III), dispositivos médicos (Anexo IV), acessibilidade (Anexo V), medicamentos registrados na Anvisa ou manipulados (art. 133), nutrição enteral/parenteral (Anexo VI), alimentos (Anexo VII), higiene e limpeza (Anexo VIII), agropecuários in natura (art. 137), insumos agropecuários (Anexo IX, com diferimento — art. 138), produções artísticas e culturais nacionais (Anexo X), comunicação institucional para o poder público, atividades desportivas, soberania e segurança cibernética (Anexo XI; inclui serviços de segurança da informação de empresa com sócio brasileiro ≥ 20% — LC 227); reabilitação urbana (art. 158; locação −80%) |
| **−30%** | Profissões intelectuais regulamentadas (art. 127): administradores, advogados, arquitetos, assistentes sociais, bibliotecários, biólogos, **contabilistas**, economistas, economistas domésticos, educação física, engenheiros e agrônomos, estatísticos, veterinários e zootecnistas, museólogos, químicos, relações públicas, técnicos industriais e agrícolas |

**Requisitos da PJ para os −30%** (art. 127, § 1º, II): sócios habilitados e fiscalizados pelo conselho; sem sócio PJ; não ser sócia de outra PJ; não exercer atividade diversa das habilitações; serviços-fim prestados diretamente pelos sócios (auxiliares admitidos). Natureza jurídica, sociedade multiprofissional e forma de distribuição de lucros não impedem (§ 2º).

## 9. Regimes específicos (Título V, arts. 172-307) — pontos-chave

- **Combustíveis** (172-180): monofásico, alíquota ad rem uniforme; biocombustíveis entre 40% e 90% da alíquota do fóssil comparável; crédito pelo valor do documento.
- **Serviços financeiros** (181-233): base = receitas − deduções (spread); alíquota nacional uniforme; transição 2027-2033 com soma IBS+CBS de 10,85% (2027-28), 11,00% (2029), 11,15% (2030), 11,30% (2031), 11,50% (2032), 12,50% (2033) (art. 233, LC 227). Adquirente do regime regular toma crédito em hipóteses previstas (ex.: deságio de antecipação de recebíveis).
- **Planos de saúde** (234-243): referência −60%; planos para animais −30%, sem crédito.
- **Concursos de prognósticos** (244-250).
- **Bens imóveis** (251-270): redução de 50% na alienação e demais operações; **70% na locação, cessão e arrendamento** (art. 261); **redutor de ajuste** (custo de aquisição/valor de referência em 31/12/2026, ITBI, laudêmio, contrapartidas — arts. 257-258); **redutor social** R$ 100 mil por imóvel residencial novo, R$ 30 mil por lote, R$ 600/mês por locação residencial (arts. 259-260, corrigidos por IPCA); apuração por obra/CNPJ de obra (art. 270). Transição para operações iniciadas antes de 2029: arts. 484-489.
- **Cooperativas** (271-272): opção por alíquota zero em atos com associados; transferência de créditos.
- **Bares e restaurantes** (273-275): −40%; gorjeta até 15% e valores retidos por plataformas de entrega fora da base; bebidas alcoólicas e produtos de terceiros sem preparo ficam fora do regime.
- **Hotelaria, parques** (276-281): −40%. **Transporte coletivo intermunicipal/interestadual** (282-286): −40%. **Aviação regional** (287): −40%. **Agências de turismo** (288-291).
- **SAF** (292-296): Tributação Específica do Futebol, caixa, sobre receitas recebidas: 4% federais (IRPJ, CSLL, previdência) + 1% CBS + 1% IBS (metade UF, metade Município) (art. 293, § 4º, LC 227); crédito só na compra de direitos desportivos.
- **Missões diplomáticas** (297-299). Disposições comuns e base negativa compensável em 5 anos (arts. 300-307).
- **Regime automotivo da CBS** (arts. 309-315): crédito presumido com percentuais decrescentes até 2032.

## 10. Importação e exportação

- Importação de bens materiais (arts. 64-78): base = valor aduaneiro + II, IS, Siscomex, AFRMM, Cide-Combustíveis, antidumping/compensatórios/salvaguarda e demais encargos até a liberação; **sem** IPI, ICMS e ISS (art. 69); pagamento até a entrega dos bens (art. 76); crédito ao importador do regime regular. Bens imateriais e serviços do exterior: tributa o adquirente no País, crédito se regular (art. 63). Remessas internacionais no RTS: art. 95.
- Exportação imune com manutenção de créditos (arts. 79-83); serviços: fruição no exterior. Regimes aduaneiros especiais, ZPE, Reporto, Reidi, Renaval: suspensões com conversão em alíquota zero (arts. 84-111).
- Documentos: Duimp e DIR passam a ser documentos fiscais (Decreto 12.955, art. 113, XIV-XV), com NF-e cumulativa salvo dispensa por ato conjunto.

## 11. Cashback e devoluções

- Famílias do CadÚnico com renda per capita até ½ salário mínimo (art. 113). Percentuais mínimos (art. 118): **100% CBS e 20% IBS** em botijão de GLP até 13 kg, energia elétrica, água, esgoto, gás canalizado e telecom; **20%/20%** nos demais. Entes podem ampliar por lei.
- Devolução a turista estrangeiro (permanência inferior a 90 dias, bens materiais): art. 471 da LC, dependente de ato conjunto; títulos próprios nos regulamentos.

## 12. Imposto Seletivo (Livro II, arts. 409-438)

- Bens e serviços do Anexo XVII: veículos, embarcações e aeronaves, fumígenos, bebidas alcoólicas, **bebidas açucaradas**, bens minerais, concursos de prognósticos e *fantasy sport* (art. 409). Monofásico, sem crédito (art. 410). Administrado pela RFB (art. 411).
- FG: primeiro fornecimento, arrematação, transferência não onerosa, incorporação ao ativo pelo fabricante, extração, consumo pelo fabricante, importação (art. 412). Não incide em exportação, energia elétrica e telecom, nem em itens com alíquota reduzida dos regimes diferenciados (art. 413).
- Alíquotas em **lei ordinária** (arts. 419-422): fumígenos e bebidas alcoólicas com ad valorem + específica; minerais até 0,25% (LC 227); gás natural como insumo industrial ou combustível de transporte: zero; veículos para PcD/TEA e taxistas: zero. ICMS/ISS fora da base até 2032 (art. 417, § 4º). Pesquise a lei ordinária vigente antes de citar percentuais.

## 13. Transição de créditos e estoques

- **Saldo de PIS/Cofins** (arts. 378-383): continua válido; compensa com CBS ou ressarce/compensa com tributos federais conforme a legislação na data de extinção; créditos sobre depreciação/amortização viram crédito presumido de CBS; devoluções a partir de 2027 de vendas anteriores dão crédito de CBS; **crédito presumido sobre estoque em 1/1/2027** para quem estava no cumulativo, com ST/monofásico ou vedação parcial: 9,25% do estoque (importados: PIS/Cofins-Importação pagos), apurado até junho/2027 e usado em 12 parcelas só contra CBS (art. 381). Prazo de 5 anos.
- **Bens de capital usados** (arts. 406-407): venda de máquinas, veículos e equipamentos do imobilizado há mais de 12 meses → alíquota zero até o valor líquido de aquisição (CBS para bens comprados até 2026 com PIS/Cofins; IBS, a partir de 2029, para bens comprados até 2032 com ICMS, multiplicando o valor líquido por 1,0 se adquiridos até 2028, 0,9 em 2029, 0,8 em 2030, 0,7 em 2031 e 0,6 em 2032). Sem dado de PIS/Cofins: usar 1,65% e 7,6%.
- **Saldo credor de ICMS em 31/12/2032** (LC 227, arts. 132-141): homologação pedida em até 5 anos a partir de 1/1/2033 (Estado responde em 24 meses; silêncio = homologado); atualizado por IPCA; compensa com IBS em **240 parcelas** mensais (ativo permanente: pelo prazo remanescente do CIAP); pode ser transferido a terceiros ou ressarcido pelo CGIBS em 240 parcelas.
- **ICMS-ST no estoque de 31/12/2032** (LC 227, arts. 142-144): inventariar, apurar o ICMS retido e compensar com IBS em 12 parcelas.
- Benefícios de ICMS onerosos (convalidados pela LC 160): compensação pelo Fundo de Compensação (arts. 384-405) — habilitação junto à RFB.

## 14. ZFM, ALC e compras governamentais

- ZFM/ALC (arts. 439-470): alíquota zero na venda de bens nacionais industrializados para contribuintes da área, créditos presumidos de IBS e CBS para a indústria incentivada, CBS zero em operações internas na ZFM. Vigências escalonadas (art. 544).
- Compras públicas (arts. 472-473): toda a arrecadação vai ao ente contratante (alíquotas dos demais zeradas, a do contratante elevada), com redutor de 2027 a 2033; FG no pagamento.

## 15. Documentos fiscais e obrigações acessórias

- DF-e obrigatório em toda operação, inclusive imune, isenta, alíquota zero, suspensa, diferida, doação e transferência entre estabelecimentos (art. 60; Decreto 12.955, art. 115). Informações do DF-e = confissão de dívida.
- DF-e recepcionados (Decreto 12.955, art. 113): NF-e 55, NFC-e 65, NFS-e (padrão nacional obrigatório para municípios desde 2026 — LC 214, art. 62), CT-e 57, CT-e OS 67, BP-e 63, MDF-e 58, GTV-e 64, NF3e 66, NFCom 62, NFGas 76, DC-e 99, NFS-e Via, Duimp, DIR. **Novos** (art. 114): NFAg 75 (água e saneamento), **DeRE** (Declaração de Regimes Específicos) e **NF-e ABI 77** (alienação de imóveis).
- **Não é idôneo** (Decreto, art. 122): emitente ou adquirente com CNPJ inapto, suspenso, nulo ou baixado; operação inexistente; destinatário diverso do real. CNPJ irregular impede emitir (art. 121).
- Cadastro: atualizar domicílio e comunicar venda, encerramento ou paralisação até o último dia útil do mês seguinte (Decreto, art. 108).
- Vigência do Decreto: cadastro e exigência de DF-e do art. 112 a partir do 1º dia do 4º mês após a publicação (≈ 1/8/2026); alguns dispositivos só em 2027 (art. 619).

## 16. Infrações e multas (LC 214, arts. 341-A a 341-H, LC 227)

- **UPF** = R$ 200,00, corrigida anualmente por IPCA (art. 341-C).
- **Lançamento de ofício**: 75% do tributo ou do crédito indevido; **50%** se a declaração descreveu corretamente bem, quantidade e valor; 100% em sonegação, fraude ou conluio; 150% na reincidência em 3 anos (art. 341-F).
- **Acessórias** (art. 341-G), entre outras: falta de inscrição 10 UPF; não atualizar domicílio 10 UPF; declarações e arquivos em atraso ou com erro 20 UPF/período (30 UPF por intimação); software que suprime valores 100 UPF (fornecedor 150 UPF); operação sem documento 100% do tributo de referência; documento inidôneo 66%; crédito indevido ou falta de estorno 66% do crédito; não manifestar o destinatário (confirmação/desconhecimento) 1 UPF por documento; cancelar documento após o FG 66%. Reincidência específica +50%. Erro material sem prejuízo afasta a multa do inciso IV (§ 4º).
- **Tributo de referência**: em 2026, CBS 6% e IBS 12% do valor da operação; 2027-2032, IBS = 2× a referência da CBS (§ 5º).
- **Reduções** (art. 341-H): 50% pagando no prazo de impugnação; 40% parcelando nesse prazo; 30% pagando antes da dívida ativa; 20% parcelando antes da dívida ativa. Participantes do PNCT ou com bons antecedentes: 60/50/40/30%.

## 17. Contencioso e administração (LC 227 e LC 214)

- **IBS** (LC 227, arts. 53-101): impugnação em **20 dias** da intimação; recursos e contrarrazões em 20 dias; rito sumário (instância única) para valores até a alçada (≤ 1.000 UPF) e para exclusão do Simples; recurso de ofício; recurso de uniformização à Câmara Superior do IBS em 10 dias.
- 1ª e 2ª instâncias: 27 Câmaras de Julgamento e 27 Câmaras Recursais virtuais, paritárias (LC 227, arts. 92 e 94).
- Divergência na **legislação comum** IBS/CBS: recurso especial em 10 dias úteis à Câmara Nacional de Integração do Contencioso Administrativo do IBS e da CBS (LC 214, art. 323-G, LC 227), uniformizando decisões do CGIBS e do Carf; harmonização por Comitê de Harmonização e Fórum das Procuradorias (arts. 318-323 da LC; Título X dos regulamentos), com atos conjuntos vinculantes.
- **CBS**: contencioso pelo Decreto 70.235/1972; IS também (art. 411).
- **Consulta**: legislação comum (Título IX dos regulamentos); específica do IBS (Resolução, Título XI, Cap. I).
- **PNCT** (Programa Nacional de Conformidade Tributária, art. 471-A, LC 227): benefícios a bons pagadores (ressarcimento em 30 dias, reduções de multa).
- **CGIBS** (LC 227, arts. 1º-52): entidade pública sob regime especial; Conselho Superior com 27 representantes estaduais e 27 municipais; arrecada, compensa, distribui e uniformiza o IBS.

## 18. ITCMD — normas gerais (LC 227, arts. 145-164)

- Alíquotas **progressivas** por quinhão, legado ou doação, até o teto do Senado (art. 156); cálculo por faixas; causa mortis pela alíquota da abertura da sucessão. Contribuinte: sucessor ou donatário (art. 157).
- Competência (arts. 158-159): **imóveis** → Estado da situação (imóvel no exterior: domicílio do de cujus/doador ou, se este mora fora, do sucessor/donatário); **móveis e direitos** → causa mortis: domicílio do de cujus (se no exterior, do sucessor); doação: domicílio do doador (se no exterior, do donatário); ambos no exterior → local dos bens. Domicílio presumido = o da DIRPF.
- Imunidades no art. 149; **não incide** (art. 150): renúncia pura à herança, consolidação de usufruto, **benefício de previdência complementar aberta ou fechada, seguro e pecúlio**, extinção de fideicomisso, certas transmissões a/de trustee. Incide sobre trusts e similares no exterior (art. 148, § 1º).
- Base (arts. 152-154): valor de mercado, deduzidas dívidas comprovadas; aplicações financeiras pelo valor na data do FG; bens financiados pelo valor menos o saldo devedor; quotas em bolsa pela cotação do dia anterior; demais quotas por metodologia idônea, no mínimo o PL ajustado a mercado. Doações sucessivas somadas para a progressividade (art. 155).

---

## Modelo de resposta

**Pergunta curta**: resposta direta + dispositivo + observação sobre vigência ou parâmetro pendente.

**Parecer/análise de operação**:
1. Fatos e premissas (regime do contribuinte, UF/município de destino, NCM/NBS, ano da operação).
2. Enquadramento: incidência → local → base → alíquota (padrão/reduzida/zero/específica) → crédito do adquirente → forma de extinção.
3. Cálculo com memória (por esfera).
4. Riscos e pontos pendentes de regulamentação (ato conjunto, resolução do Senado, lei ordinária do IS).
5. Fundamentação: LC 214 (artigos), regulamento correspondente, LC 227 quando aplicável.

**Ferramentas web/simuladores**: use esta skill como fonte das regras; mantenha alíquotas de referência, percentuais de crédito presumido e alíquotas do IS **parametrizáveis**, nunca fixas no código; rode a linha do tempo 2026-2033 quando a pergunta envolver transição.