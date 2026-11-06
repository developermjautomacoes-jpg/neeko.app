# Índice da base normativa NF-e / NFC-e

Todos os textos estão em `references/docs/` (extraídos dos PDFs oficiais, quebra de página preservada).
Use `scripts/buscar.py "<termo>" --doc <prefixo>` para localizar o trecho e a página.

Base atualizada até **outubro/2026**. Datas de produção abaixo; compare sempre com a data de emissão da nota.

## Precedência

1. NT mais recente que trata do campo/regra (a NT altera o MOC; versão maior da mesma NT prevalece).
2. MOC 7.0 (nov/2020) — base do leiaute e das regras não alteradas depois.
3. Legislação (Ajustes SINIEF, LC 214/2025, legislação da UF) — citada pelas NTs; a skill não tem o texto da legislação.

Quando uma regra aparece no MOC e numa NT, cite a NT (e mencione que alterou o MOC).
Regras marcadas "Facul." no MOC dependem da UF autorizadora; "Obrig." valem para todas.

## Manual de Orientação do Contribuinte 7.0

| Arquivo | Conteúdo | Quando consultar |
|---|---|---|
| MOC70_AnexoI_Leiaute_Regras | Leiaute de todos os grupos (A–ZZ) com ID, tipo, ocorrência e tamanho; regras de preenchimento (3.2); regras de validação por campo (4.2.1); tabelas de cStat/rejeição/denegação (4.4, págs. 143–153) | Quase sempre: formato de campo, obrigatoriedade, código de rejeição |
| MOC70_VisaoGeral | Chave de acesso e DV, séries reservadas, GTIN, responsável técnico, cBenef, CCC, eventos (cancelamento, CC-e, manifestação, EPEC, prorrogação), web services, assinatura | Eventos, chave, web services, conceitos |
| MOC70_AnexoII_DANFE | DANFE: campos, fontes, tamanhos, folhas adicionais, código de barras CODE-128C | Dúvidas de impressão do DANFE NF-e |
| MOC70_AnexoIII_Contingencia_NFe | FS-DA, SVC-AN/SVC-RS, EPEC, transmissão posterior | Contingência NF-e (tpEmis 2,3,4,5,6,7) |
| MOC70_AnexoIV_Contingencia_NFCe | Contingência off-line NFC-e (tpEmis 9) — transmissão até o fim do 1º dia útil seguinte | Contingência NFC-e |

## Manuais complementares

| Arquivo | Conteúdo |
|---|---|
| Manual_DANFE_NFCe_QRCode_v6.0 (mar/2025) | Leiaute do DANFE NFC-e, QR Code v2 e v3, URLs de consulta por UF |
| NT2020.004_v1.10_DANFE_Simplificado_Etiqueta | DANFE Simplificado formato etiqueta |
| BP2018.001_Boas_Praticas_NFCe | Boas práticas para soluções emissoras de NFC-e |

## Notas Técnicas vigentes

| Arquivo | Assunto | Produção |
|---|---|---|
| NT2025.002_v1.52_RTC_IBS_CBS_IS | Reforma Tributária: grupos IBSCBS/IS (UB), cClassTrib, finNFe débito/crédito, compras governamentais (BB), antecipação (BC), totais W03, DFeReferenciado (VC), totais do item (VB) | Schema 10/11/2025; **UB12-10 (IBSCBS obrigatório, rej. 1115) 03/08/2026**; VC02-14 (devolução só via DFeReferenciado) e monofásico de combustíveis (v1.50) 03/11/2026 |
| NT2026.008_v1.00_RTC_Valor_Liquido | Valor líquido do produto; IBS/CBS compõem vProd sem somar de novo em vNFTot; vICMSPrevisto (grupo NB) | 03/11/2026; NB01-30 em 01/03/2027 |
| NT2026.006_v1.00_RTC_Split_Payment | Grupo YC e evento 110300 (vinculação da transação de pagamento) — preparatório, uso real previsto 2027 | 03/11/2026 |
| NT2026.007_v1.10_Emissao_sem_IE_LCC | NF-e sem IE por contribuinte exclusivo de IBS/CBS (só via SVRS); validação LCC-RFB e CCC | 03/11/2026 |
| NT2026.010_v1.00_DANFE_RTC | Leiaute do DANFE com IBS/CBS/IS | 01/12/2026 |
| NT2026.002_v1.11_Offline_Alerta_DANFE_Simpl_Tp2 | Autorização com alerta, emissão offline, DANFE Simplificado Tipo 2 (tpImp=6), limite NFC-e sem destinatário por UF, vedações de referenciamento (BA) | Alertas 05/10/2026; I08-180, BA02-35, VC02-40 em 14/12/2026 |
| NT2026.003_v1.00_DANFE_Simpl_Tipo2 | Especificação do DANFE Simplificado Tipo 2 (Ajuste SINIEF 13/26) | 03/08/2026 |
| NT2026.009_v1.00_RV_CFOP | I08-140: CFOP de devolução; aceita 1.949/2.949 e notas de crédito tipo 03/06 | 17/09/2026 |
| NT2026.004_v1.01_Schema_CNPJ_Alfa | Schema com CNPJ e chave alfanuméricos | 01/07/2026 |
| NTCJ2025.001_v1.00_CNPJ_Alfa | Regras-base do CNPJ alfanumérico (formação, DV) para todos os DF-e | 06/07/2026 |
| NT2026.001_v1.02b_PAA | Provedor de Assinatura e Autorização (grupo/regras ZG, P) | 05/10/2026 |
| NT2024.002_v1.00_ECONF | Evento 110750 Conciliação Financeira / 110751 cancelamento; NF-e sempre via SVRS | 02/09/2024 |
| NT2024.003_v1.10_Produtos_Agro | Agrotóxicos, guias de trânsito (grupo ZF), exceções MEI | 10/11/2025 (última alteração de RV 05/2026) |
| NT2023.003_v1.40_CFOP_NFCe | CFOPs permitidos na NFC-e | 05/10/2026 |
| NT2023.002_v1.01_Emitente_CPF_NFCe | NFC-e por produtor rural PF; fim da denegação | 02/02/2026 |
| NT2023.001_v1.60_Monofasica_Combustiveis | Tributação monofásica de combustíveis (CST 02/15/53/61, grupo LA) | 01/10/2025 — layout reformulado pela NT 2025.002 v1.50 em 03/11/2026 |
| NT2025.001_v1.03_QRCode_v3 | QR Code v3 da NFC-e; resposta síncrona para lote de 1 NF-e; RV YA03-10/YA04-10 | 03/11/2025 |
| NT2022.002_v1.30a_Equiparacao_Exportacao | Destinatário estrangeiro / equiparação à exportação (E03a, E12, E14, E16a, BA02a) | 06/04/2026 |
| NT2021.003_v1.50_GTIN | Validação de GTIN no CCG por grupos de NCM | Grupo IV 01/10/2025; **Grupo V 01/09/2027** |
| NT2021.002_v1.12_Nota_Fiscal_Facil | NFF (tpEmis 3), série 000–999 | vigente |
| NT2020.001_v1.60_Manifestacao_Destinatario | Manifestação do destinatário; conclusiva em até **90 dias** (Ajuste SINIEF 14/26) | 01/06/2026 |
| NT2019.001_v1.70_Regras_Validacao | cBenef x CST (N12-85 etc.), crédito presumido, regras ativadas por UF | ativações por UF até 06/04/2026 |
| NT2018.005_v1.52_Leiaute_RespTecnico | Responsável técnico (ZD), ICMS ST retido no CST 60, repasse ST | PR até 23/02/2026 |
| NT2016.003_v3.70_Tabela_NCM | Tabela NCM e uTrib comércio exterior | 01/04/2024 |
| NT2014.002_v1.40_DistribuicaoDFe | Web service de distribuição de DF-e (com CNPJ alfanumérico) | vigente |
| NT2014.001_v1.41_EPEC | Evento Prévio de Emissão em Contingência | vigente |

## O que a base NÃO tem

- Arquivos XSD oficiais (valide formato pelo leiaute; avise que o schema oficial é a palavra final).
- Tabelas de apoio do Portal: CFOP com indDevol, cBenef x CST por UF, cClassTrib, códigos de município, unidades.
- Texto da legislação (Ajustes SINIEF, LC 214/2025, RICMS das UFs).
- Bases da SEFAZ: cadastro (CCC/LCC), CCG/GTIN, duplicidade, eventos.
- Versões substituídas (NT 2026.002 v1.00/v1.10/v1.10a, NT 2026.004 v1.00, manuais de contingência 2009/2016, NT 2012.001, manual SVAN 2008, emissor gratuito SP) foram excluídas de propósito.
