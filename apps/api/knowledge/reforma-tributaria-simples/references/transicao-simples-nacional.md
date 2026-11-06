# Transição do Simples Nacional para o IBS/CBS

Base legal consolidada para os três cenários de comparação de carga tributária de uma empresa optante pelo Simples Nacional durante a Reforma Tributária (LC 214/2025, com alterações da LC 227/2026).

## Os três cenários

### 1. Carga atual (regime vigente hoje, sem IBS/CBS)
Cálculo padrão do Simples Nacional pela Resolução CGSN nº 140/2018 — use a skill `simples-nacional-cgsn140` para toda a mecânica de RBT12, fator "r", alíquota efetiva e partilha por Anexo (I a V). Este cenário é a linha de base: representa o que a empresa paga hoje (ICMS/ISS/PIS/COFINS embutidos no DAS, sem IBS/CBS).

### 2. Simples Nacional com IBS/CBS "por dentro" (regra padrão/default)
É a regra geral: o optante pelo Simples continua recolhendo tudo dentro do DAS, agora incluindo as parcelas de IBS e CBS, que substituem progressivamente ICMS/ISS/PIS/COFINS na partilha do Anexo aplicável (arts. 1º a 41 da LC 214/2025 tratam do regime regular; o Simples segue sua sistemática própria via LC 123/2006 alterada).

Efeitos práticos:
- **Sem apropriação de créditos pelo optante do Simples** (LC 214/2025, art. 47, § 9º, I): quem compra do Simples "por dentro" transfere ao cliente (se este for do regime regular) crédito presumido equivalente ao valor do IBS/CBS embutido no Simples (art. 47, § 9º, II) — não ao valor cheio da alíquota do regime regular.
- Alíquota efetiva continua calculada pela mecânica de RBT12 × alíquota nominal do Anexo, com a parcela de IBS/CBS integrada à partilha (arts. 13, § 9º a § 11, e 18 da LC 123/2006, na redação dada pelos arts. 516-517 da LC 214/2025 e pela LC 227/2026).
- Teto de 5% para ISS no percentual efetivo, com o excedente redistribuído proporcionalmente aos tributos federais e ao IBS (LC 123/2006, art. 18, § 1º-B, I, incluído pela LC 227/2026).
- Exportação: a redução do valor a recolher no Simples correspondente às alíquotas efetivas de IBS e CBS segue os Anexos I a V (LC 123/2006, art. 18, §§ 14 e 14-A).

### 3. Simples Nacional com IBS/CBS "por fora" (opção pelo regime regular apenas para IBS/CBS)
O optante pelo Simples pode optar por apurar e recolher IBS e CBS **fora** do DAS, pelas regras do regime regular da LC 214/2025 — mantendo o Simples só para os demais tributos (LC 214/2025, art. 41, § 3º; LC 123/2006, art. 13, § 9º, incluído pela LC 227/2026: *"É facultado ao optante pelo Simples Nacional apurar e recolher o IBS e a CBS de acordo com o regime regular aplicável a esses tributos, hipótese em que as parcelas a eles relativas não serão cobradas pelo regime único."*).

Efeitos práticos:
- **Direito pleno a créditos de IBS/CBS** nas aquisições, como qualquer contribuinte do regime regular (LC 214/2025, art. 47, caput e §§ 1º-2º) — diferença central em relação ao cenário "por dentro".
- IBS/CBS calculados pela alíquota cheia do regime regular sobre o valor da operação (não pela alíquota efetiva do Simples), com direito a apropriação de créditos das aquisições.
- A opção é **semestral e irretratável** para cada semestre (janeiro-junho / julho-dezembro), exercida nos meses de setembro e março (ou setembro e abril, conforme redação) imediatamente anteriores a cada semestre, na forma regulamentada pelo CGSN (LC 123/2006, art. 13, §§ 10-11, na redação da LC 227/2026).
- **Vedação de retorno**: quem já usufruiu ressarcimento de créditos de IBS/CBS não pode voltar ao regime do Simples para esses tributos (LC 214/2025, art. 41, §§ 5º-6º).
- Útil sobretudo para empresas com clientes no regime regular que valorizam o crédito cheio (ex.: indústria, atacado, B2B) — o "por dentro" tende a ser mais vantajoso para quem vende a consumidor final ou a outros optantes do Simples.

## Redução de 30% para profissões regulamentadas (relevante para escritórios contábeis)

LC 214/2025, art. 127: alíquotas do IBS e da CBS reduzidas em 30% para serviços prestados por profissionais de atividade intelectual científica, literária ou artística fiscalizados por conselho profissional — inclui **contabilistas** (inciso VII), advogados, administradores, economistas, engenheiros, entre outros (lista completa incisos I a XVIII).

Condições para pessoa jurídica (art. 127, § 1º, II):
- sócios com habilitação profissional vinculada ao objeto social, fiscalizados por conselho de classe;
- não ter pessoa jurídica como sócia nem ser sócia de outra PJ;
- não exercer atividade diversa da habilitação dos sócios;
- serviços da atividade-fim prestados diretamente pelos sócios (admitidos auxiliares/colaboradores).

Essa redução se aplica **apenas ao regime regular** — ou seja, é relevante para o cenário "por fora" (ou para quem já está no regime regular fora do Simples). Um escritório de contabilidade optante do Simples "por dentro" não usufrui diretamente dessa redução; ela pode, no entanto, ser um argumento a favor de migrar para o regime regular ("por fora") dependendo do peso de IBS/CBS na operação.

## Cronograma da transição, ano a ano (2026-2033)

Necessário para simular a evolução da carga **ano a ano**, não apenas comparar o início (hoje) com o fim (2033) — é isso que permite avaliar, para cada ano da transição, se compensa mais permanecer 100% no Simples ("por dentro") ou migrar para o modelo híbrido ("por fora").

### O que substitui o quê, e quando

- **PIS/Pasep, COFINS e IPI (tributos federais)**: extintos a partir de **1º de janeiro de 2027**, substituídos integralmente pela CBS a partir dessa data (LC 214/2025, arts. 378-381 tratam da transição de créditos). Não há substituição gradual desses tributos — a virada é integral em 2027.
- **ICMS e ISS (tributos estaduais/municipais)**: continuam integralmente em vigor até 2028; a partir de **2029** o IBS passa a ser cobrado em paralelo, em proporção crescente, e a Lei Complementar nº 87/1996 (Lei Kandir, ICMS) e a LC 116/2003 (ISS) só são revogadas a partir de **1º de janeiro de 2033** (LC 214/2025, art. 543) — ou seja, a substituição de ICMS/ISS pelo IBS é gradual entre 2029 e 2032, com virada completa em 2033.
- **2026 é ano de teste/calibração** para ambos CBS e IBS: os tributos são cobrados a alíquotas simbólicas (ver tabela abaixo), mas o valor pago é compensável/restituível — não representa custo adicional real, serve para testar a arrecadação e calibrar as alíquotas de referência dos anos seguintes.

### Tabela de alíquotas por ano (para simulação)

| Ano | CBS (substitui PIS/COFINS/IPI) | IBS (substitui ICMS/ISS) | Situação dos tributos antigos |
|---|---|---|---|
| 2026 | 0,9% (teste, compensável — não é custo real) | 0,1% (teste, compensável — não é custo real) | PIS/COFINS/IPI/ICMS/ISS 100% em vigor, sem nenhuma redução |
| 2027 | Alíquota de referência da CBS, reduzida em 0,1 p.p. (arts. 347, 353-359) | 0,1% | PIS/COFINS/IPI **extintos**, substituídos pela CBS; ICMS/ISS ainda 100% em vigor |
| 2028 | Alíquota de referência da CBS, reduzida em 0,1 p.p. | 0,1% | Mesma situação de 2027 |
| 2029 | Alíquota de referência plena da CBS | 0,3% | ICMS/ISS começam a ceder espaço ao IBS, de forma gradual e proporcional |
| 2030 | Alíquota de referência plena | 0,6% | Redução proporcional de ICMS/ISS continua |
| 2031 | Alíquota de referência plena | 0,9% | Redução proporcional de ICMS/ISS continua |
| 2032 | Alíquota de referência plena | 1,2% | Redução proporcional de ICMS/ISS continua |
| 2033 em diante | Alíquota de referência plena | Percentual integral | ICMS/ISS **extintos** (LC 87/1996 e LC 116/2003 revogadas) — transição completa |

**Atenção**: as alíquotas de referência de CBS e IBS (federal, estadual, municipal) são fixadas por resolução do Senado Federal e pelo Comitê Gestor do IBS ano a ano, e a lei já foi alterada uma vez desde sua publicação (LC 227/2026). **Sempre confirme por busca na internet os percentuais de referência vigentes para o ano em simulação** antes de fechar uma calculadora ou relatório — não assuma que os valores desta tabela continuam atuais além do que está expressamente fixado em lei (os valores de IBS 2027-2033 e CBS 2026 estão fixados em lei; a alíquota de referência da CBS de 2027 em diante e do IBS a partir de 2033 dependem de resolução do Senado, que pode não ter sido publicada ainda no momento da consulta).

### Como simular ano a ano (para decidir "permanecer no Simples" x "modelo híbrido")

Para cada ano de 2026 a 2033 (ou até o horizonte que o usuário quiser), repita o cálculo dos 3 cenários (ver seção 1 do SKILL.md) usando a alíquota de CBS/IBS daquele ano:

1. Nos anos em que PIS/COFINS/IPI já foram extintos (2027 em diante), remova esses tributos da apuração do cenário "carga atual" simulada para aquele ano e substitua pela CBS do ano.
2. Nos anos em que ICMS/ISS ainda não foram extintos (até 2032), mantenha-os na apuração e acrescente o IBS do ano correspondente **apenas na proporção definida no cronograma** — nos anos de teste (2027-2028) o IBS de 0,1% normalmente não desloca ICMS/ISS de forma relevante; a partir de 2029 a proporção de deslocamento cresce ano a ano até a virada completa em 2033.
3. No cenário "por dentro", aplique a alíquota efetiva do Simples de cada ano já incorporando CBS/IBS na partilha (a partilha por Anexo é redefinida progressivamente pelas alterações da LC 123/2006 — se a partilha específica de determinado ano não estiver disponível, use a alíquota efetiva atual como aproximação e sinalize a limitação).
4. No cenário "por fora", aplique a CBS/IBS do ano (regime regular) sobre a operação, com direito a crédito, mantendo os demais tributos no Simples.
5. Monte uma linha do tempo (2026 a 2033) mostrando a carga tributária efetiva de cada cenário ano a ano, não apenas o ponto de chegada — isso é o que permite ao usuário decidir se compensa permanecer no Simples "por dentro" durante toda a transição, migrar para o híbrido "por fora" desde já, ou trocar de regime em algum ano intermediário conforme o cruzamento das curvas.

## Onde buscar mais

Se a dúvida não estiver coberta aqui, busque o artigo específico em `references/lc214-integra.txt` (texto integral compilado da LC 214/2025, 178 páginas) usando grep/busca por número do artigo ou palavra-chave. Para a mecânica de cálculo do Simples Nacional em si (Anexos I-V, fator r, RBT12), use a skill `simples-nacional-cgsn140`.
