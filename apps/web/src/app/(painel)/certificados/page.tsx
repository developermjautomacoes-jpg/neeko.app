"use client";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, ConfirmDialog, DataTable, Input, Loading, Notice, PageHeader, useToast } from "@neeko/ui";
import { arquivoParaBase64, dataBr, dataHora, formatarCnpj } from "@/lib/format";
import { enviarCertificado, listarCertificados, removerCertificado } from "@/services/fiscal";
import type { Certificado } from "@/types/nfse";
import styles from "../pagina.module.css";

export default function Certificados() {
  const avisar = useToast();
  const [lista, setLista] = useState<Certificado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState("");
  const [apelido, setApelido] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [removendo, setRemovendo] = useState<Certificado | null>(null);
  const [chave, setChave] = useState(0);
  const carregar = useCallback(() => listarCertificados().then(setLista).catch((e: Error) => setErro(e.message)).finally(() => setCarregando(false)), []);
  useEffect(() => { void carregar(); }, [carregar]);
  async function importar() {
    if (!arquivo) { avisar("Escolha o arquivo .pfx ou .p12.", "erro"); return; }
    setEnviando(true);
    try {
      await enviarCertificado({ pfx: await arquivoParaBase64(arquivo), senha, apelido: apelido.trim() });
      setArquivo(null); setSenha(""); setApelido(""); setChave((k) => k + 1); await carregar();
      avisar("Certificado importado.", "sucesso");
    } catch (e) { avisar(e instanceof Error ? e.message : "Não foi possível importar.", "erro"); }
    finally { setEnviando(false); }
  }
  async function remover() {
    if (!removendo) return;
    try { await removerCertificado(removendo.id); await carregar(); avisar("Certificado removido.", "sucesso"); }
    catch (e) { avisar(e instanceof Error ? e.message : "Erro.", "erro"); }
    finally { setRemovendo(null); }
  }
  const vencido = (c: Certificado) => c.validUntil < new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHeader titulo="Certificados digitais" descricao="Certificados A1 da organização. Arquivo e senha ficam cifrados e nunca voltam para a tela." />
      {erro && <Notice tom="erro">{erro}</Notice>}
      <Card titulo="Importar certificado" descricao="O certificado é ligado à empresa pela raiz do CNPJ. A empresa é cadastrada no memorando.">
        <div className={styles.form4}>
          <Input key={chave} rotulo="Arquivo (.pfx ou .p12)" type="file" accept=".pfx,.p12" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
          <Input rotulo="Senha do certificado" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          <Input rotulo="Apelido (opcional)" value={apelido} onChange={(e) => setApelido(e.target.value)} />
          <Button variante="primary" carregando={enviando} onClick={importar}>Importar</Button>
        </div>
      </Card>
      <div className={styles.bloco}>
        <Card titulo="Certificados importados" semPadding>
          {carregando ? <Loading /> : <DataTable linhas={lista} chaveLinha={(c) => c.id} vazio="Nenhum certificado importado."
            colunas={[
              { chave: "t", titulo: "Titular", render: (c) => <><b>{c.nickname || c.holder}</b><br /><small>{formatarCnpj(c.document)}</small></> },
              { chave: "k", titulo: "Tipo", render: (c) => c.kind },
              { chave: "v", titulo: "Validade", render: (c) => vencido(c) ? <Badge tom="perigo">vencido em {dataBr(c.validUntil)}</Badge> : dataBr(c.validUntil) },
              { chave: "i", titulo: "Importado em", render: (c) => dataHora(c.createdAt) },
              { chave: "a", titulo: "", alinhar: "direita", render: (c) => <Button tamanho="sm" variante="danger" onClick={() => setRemovendo(c)}>Remover</Button> },
            ]} />}
        </Card>
      </div>
      <ConfirmDialog aberto={!!removendo} titulo="Remover certificado" confirmar="Remover" perigo onConfirmar={remover} onCancelar={() => setRemovendo(null)}>
        <p>As capturas que usam <b>{removendo?.nickname || removendo?.holder}</b> param até um novo certificado ser importado. As notas guardadas continuam.</p>
      </ConfirmDialog>
    </>
  );
}
