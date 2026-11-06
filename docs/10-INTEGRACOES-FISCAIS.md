# 10 — Integrações fiscais

## Escopo

Documentos pretendidos: NF-e, NFS-e, CT-e e NFC-e; emissão inicial prevista para NFS-e.

## Estratégia

Criar interfaces por capacidade e adaptadores por provedor/jurisdição. Exemplo conceitual:
- `NfseIssuer`
- `NfseStatusReader`
- `NfeDocumentFetcher`
- `CteDocumentFetcher`
- `NfceDocumentFetcher`

Não pressupor que um único serviço atende todos os municípios, documentos ou operações.

## Levantamento obrigatório antes de contratar/implementar

Para cada documento e município/UF:
1. Cobertura geográfica e modelo de integração.
2. Captura: distribuição oficial, certificado, procuração, manifestação ou autorização exigida.
3. Emissão: padrões, provedores, municípios, regimes e serviços cobertos.
4. Certificado digital: tipo, armazenamento, renovação e responsabilidade.
5. Homologação, produção, limites, custos e SLA.
6. Retentativas, indisponibilidade, idempotência e suporte.
7. LGPD, contrato de operador/controlador e suboperadores.
8. Regras de cancelamento, substituição e consulta.

## NFS-e

A emissão deve ser multiempresa e parametrizada por contribuinte. Guardar:
- empresa emissora;
- usuário operador;
- município e provedor;
- ambiente;
- referência/idempotency key;
- payload normalizado e versão;
- protocolo, número, código de verificação e status retornados;
- eventos e histórico.

Segredos e certificados devem ficar em cofre de segredos/armazenamento criptografado apropriado, com acesso mínimo. Nunca registrar conteúdo secreto em logs.

## Observação

A documentação técnica e normativa deve ser conferida na data de implementação. Não implementar emissão real usando exemplos fictícios ou endpoints presumidos.
