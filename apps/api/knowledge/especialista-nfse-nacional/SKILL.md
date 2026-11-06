---
name: "especialista-nfse-nacional"
description: "Especialista em NFS-e Padrão Nacional (Sefin/ADN/Painel Municipal): DPS, eventos, parametrização municipal, retenções, regimes especiais, Simples/MEI e tributos aproximados, com base legal."
---

# Especialista em NFS-e Padrão Nacional

Use esta skill sempre que o assunto for a Nota Fiscal de Serviço Eletrônica do Sistema Nacional (gov.br/nfse): emissão via Emissor Nacional (web, app, API), DPS, XML da NFS-e, DANFS-e, cancelamento/substituição, parametrização municipal (Painel Municipal), CNC, retenções de ISS, regimes especiais, benefícios municipais, Simples Nacional/MEI na NFS-e, campos de tributos aproximados (Lei 12.741/2012), captura/leitura de NFS-e em lote e projetos de software que leiam ou validem NFS-e Nacional.

## Regras de trabalho

1. **Sempre cite a base legal** ao lado de cada conclusão (LC 116/2003, LC 123/2006, Resoluções CGSN, Lei 12.741/2012, Decreto 8.264/2014, LC 214/2025 quando houver IBS/CBS, e o manual/leiaute nacional usado).
2. **Manual não é lei.** Quando um manual ou leiaute da NFS-e resumir uma norma, confronte com o texto legal. Se o manual simplificar ou contrariar a norma, aponte a divergência e indique como cumprir a norma dentro do campo disponível.
3. **Leiaute e Notas Técnicas mudam.** Não afirme nomes de tags, tamanhos, regras de rejeição ou cronogramas de memória. Para estes, busque na web (gov.br/nfse, documentação técnica do Emissor Nacional, Notas Técnicas do CGNFS-e) e cite a versão consultada. Isso vale principalmente para o grupo IBS/CBS da Reforma Tributária na NFS-e.
4. **Diferencie quem configura e quem emite.** O Painel Municipal é da prefeitura (ATM); o contribuinte só vê o efeito das parametrizações (alíquota, deduções, regimes, retenções, prazos de cancelamento). Ao explicar uma rejeição ou bloqueio, diga se a causa é parametrização do município ou erro do emitente.
5. Entregas para clientes da Facilitar seguem o modelo de relatório da Facilitar.

## Arquitetura do sistema

- **Fluxo:** o emitente preenche e envia a **DPS** (Declaração de Prestação de Serviço). A **Sefin Nacional** valida contra a Base de Dados Nacional, complementa os dados, gera, assina e autoriza a **NFS-e**. O documento final tem dois blocos: o informado pelo contribuinte (DPS) e o complementado pela Sefin.
- **Premissa:** o fisco não pede ao contribuinte dado que já possui (cadastro, alíquota, regime).
- **ADN (Ambiente de Dados Nacional):** repositório e distribuição das NFS-e entre municípios e contribuintes. A adesão ao ADN é obrigatória no convênio, mesmo para municípios com emissor próprio.
- **Emissores Públicos Nacionais (web, mobile, API):** se o município optar por eles, não usa emissor próprio para o mesmo contribuinte. Um contribuinte não emite simultaneamente no emissor próprio e no nacional.
- **MEI:** uso obrigatório do emissor nacional desde jan/2023, independentemente da escolha do município (Resolução CGSN 169/2022).
- **Origem do cadastro do município:**
  - **RFB:** emite apenas PJ (CNPJ) com endereço no município; PF só via CAEPF quando implementado.
  - **CNC (Cadastro Nacional de Contribuintes):** o município carrega sua base; permite PJ e PF, mesmo sem endereço na RFB. Sem cadastro e habilitação no CNC, o contribuinte não emite. O upload de cadastro aceita até 3 atualizações diárias por contribuinte.
- **MAN (Módulo de Apuração Nacional)** e **DNA (guia única)**, além do **Painel de Créditos:** previstos no manual de 2022; verificar o status atual antes de afirmar disponibilidade.

## Código de serviço

- Formato **99.99.99.999**: item LC 116 . subitem . desdobramento nacional . código municipal.
- Os primeiros 6 dígitos formam o **Código de Tributação Nacional**. Os 3 últimos são o **Código de Tributação Municipal**: "000" quando não há desdobramento municipal; nunca "000" para um desdobramento criado pelo município.
- Desdobramento municipal criado após a ativação não pode ser excluído; apenas tem a vigência encerrada e continua válido para competências dentro da vigência.

## Alíquota, base de cálculo e benefícios (parametrização municipal)

- **Alíquota de ISS** entre 2% e 5%. Exceção: subitens 7.02, 7.05 e 16.01 aceitam valores acima de 0% (LC 116/2003, arts. 8º, II, e 8º-A).
- **Alíquota mínima efetiva de 2%:** o sistema confronta deduções e reduções com esse piso, exceto construção civil e transporte coletivo municipal (LC 116, art. 8º-A, § 1º).
- **Dedução x redução:**
  - "Dedução" é para 7.02 e 7.05, onde a dedução é prevista na LC 116.
  - "Redução" é para os demais serviços e configura renúncia municipal.
  - Modalidades: valor monetário, percentual ou documentos (NF-e/NFS-e de materiais e subempreitadas).
- **Benefícios municipais:**
  - Isenção apenas para 7.02, 7.05 e 16.01.
  - Redução de base de cálculo por percentual limitada a 60% no sistema.
  - Alíquota diferenciada entre 2% e 5%.
  - Pode ser restrito a contribuintes ou serviços específicos.
- Parametrização feita no nível de grupo **sobrescreve** a feita no subitem. Em um diagnóstico, verifique a ordem das alterações.

## Regimes especiais de tributação

- Opções: Ato Cooperado, Estimativa, Microempresa Municipal, Notário ou Registrador, Profissional Autônomo e Sociedade de Profissionais.
- Efeito: a NFS-e sai **sem cálculo de ISS no documento**, porque a base não é o preço do serviço ou o cálculo é feito por outra via.
- O município configura cada regime de uma de três formas: não admitido; informado na DPS sem verificação; ou atribuído a contribuintes/serviços específicos. Na terceira forma, o CNPJ só usa o regime para o serviço vinculado; nos demais serviços o ISS é calculado normalmente.
- **Simples Nacional prevalece** sobre os demais regimes especiais na NFS-e. Exceção: escritório de serviços contábeis, que pode recolher o ISS fora do DAS conforme a lei municipal (LC 123/2006, art. 18, §§ 22-A a 22-C).

## Retenções de ISS

- O município pode habilitar a retenção do **art. 6º, § 2º, II, da LC 116/2003**: tomador PJ, ainda que imune ou isento, nos subitens 3.05, 7.02, 7.04, 7.05, 7.09, 7.10, 7.12, 7.14, 7.15, 7.16, 7.17, 7.19, 11.02, 17.05 e 17.10 (7.14 e 7.15 foram vetados na lista).
- O município também pode cadastrar retenções da lei municipal (pelo tomador ou intermediário, por serviço e/ou responsável específico).
- No emissor público, a regra de retenção funciona como **alerta informativo e não rejeita a nota**. Diga isso ao analisar notas emitidas sem retenção.
- Para Simples Nacional prestador, observe a regra da alíquota de retenção pelo percentual de ISS da faixa (LC 123/2006, art. 21, § 4º).

## Eventos: cancelamento e substituição

- **Prazo máximo** de cancelamento e de substituição: o município define, até o teto do sistema de 730 dias (2 anos). Sem definição, vale o teto.
- **Parâmetros do município:**
  - restrição de valor;
  - nota sem tomador identificado;
  - nota com tributo recolhido (este depende do MAN);
  - alteração de dados dos não emitentes na substituição.
- **Regras gerais do Sistema Nacional:**
  - não cancela nota com bloqueio de cancelamento;
  - não substitui nota cancelada ou bloqueada pela prefeitura;
  - **substituição permitida sem limite de prazo nos casos de enquadramento ou desenquadramento do Simples Nacional**.
- **Fora dos parâmetros:** o emitente pede **análise fiscal**, e a prefeitura defere ou indefere no Painel. Os indeferimentos possíveis são "cancelamento extemporâneo indeferido" ou "indeferido sem análise de mérito". Cancelamento de ofício pela prefeitura não segue esses parâmetros.
- A substituição gera duas ações: cancela a nota antiga e emite a substituta vinculada a ela.

## Simples Nacional na NFS-e e tributos aproximados (Lei 12.741/2012)

- **Alíquota do Simples na DPS:** quando o emissor oferece "Informar alíquota do Simples Nacional", a base é o **Decreto 8.264/2014, art. 9º**. Ele *faculta* ("poderão") à ME/EPP informar a alíquota a que está sujeita no regime, **desde que acrescida** do percentual ou valor estimado de IPI, substituição tributária e incidência monofásica anterior.
- **Ressalva a sempre fazer:** materiais que dizem "alíquota nominal" estão desatualizados desde a LC 155/2016. A alíquota a que a empresa está sujeita é a **efetiva** (LC 123/2006, art. 18, § 1º-A). A nominal superestima a carga, salvo na 1ª faixa. Oriente informar a efetiva do período (RBT12) e, quando houver ST, IPI ou monofásico, somar a estimativa dessas incidências.
- **Outras formas de cumprir a Lei 12.741:** valor ou percentual aproximado, por exemplo pela tabela IBPT, ou a opção de não informar quando o leiaute permitir. Confira no leiaute vigente quais opções existem.

## Reforma Tributária (IBS/CBS) na NFS-e

- A partir de 2026, a NFS-e Nacional passa a levar informações de IBS/CBS (LC 214/2025, com alterações da LC 227/2026).
- Antes de responder sobre campos, cClassTrib, CST de IBS/CBS, obrigatoriedade ou validações, **busque a Nota Técnica e o leiaute vigentes** no portal da NFS-e e cite-os.
- Regras materiais de IBS/CBS ficam com as skills `especialista-reforma-tributaria` e, para Simples, `reforma-tributaria-simples`.

## Diagnóstico de problemas: roteiro

1. **Identifique o cenário:**
   - emissor nacional ou próprio do município;
   - município conveniado e com convênio ativo na competência;
   - origem do cadastro (RFB ou CNC);
   - se o contribuinte está habilitado a emitir.
2. **Separe a causa:** parametrização municipal (alíquota, regime não admitido, prazo ou valor de cancelamento, benefício restrito) ou erro da DPS (código de serviço, competência, tomador, deduções acima do piso de 2%).
3. **Verifique a competência contra a vigência** do parâmetro: o histórico de vigências vale pela data de competência.
4. **Para Simples:** confira se a opção no Simples na data da competência bate com a DPS. O desenquadramento retroativo é corrigido por substituição, sem limite de prazo.
5. **Responda** com causa provável, correção prática e base legal. Quando depender de ato da prefeitura, indique o pedido de análise fiscal ou o contato com a ATM.

## Projetos de software (leitura, captura, validação)

- Trate o XML pelos dois blocos (dados da DPS + complementos da Sefin) e pela chave de acesso.
- Situações a mapear: normal, cancelada, substituída. Guarde o vínculo da chave substituída.
- Código de serviço com 9 dígitos: separe o nacional (6) e o municipal (3).
- Não codifique alíquotas ou regras municipais fixas: elas vêm da parametrização de cada município e têm vigência.
- Para captura em lote via certificado/ADN, consulte a documentação técnica vigente da API antes de definir endpoints e limites.