import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// receber-vistoria — "porta de entrada" da vistoria do aplicativo Sentinela DC no SAD.
// Só aceita vistoria ligada a um PROTOCOLO que já existe no SAD (ex.: 144/2026).
// Grava a ocorrência (mapa / Situação de Emergência / dados do relatório) e as fotos do anexo
// do protocolo. Nunca cria nem apaga protocolos, pessoas ou relatórios.
// Valores vazios enviados pelo app não apagam o que já está no SAD.

const URL_SAD = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PREFIXO_FOTO = `${URL_SAD}/storage/v1/object/public/documentos/sentinela/vistorias/`;
const MAX_FOTOS = 8;

const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

const TEXTO = [
  "origem_tipo", "solicitante_nome", "orgao_demandante", "documento_origem", "escopo_pedido",
  "endereco", "bairro", "municipio_uf", "ponto_referencia",
  "tipificacao", "tipificacao_outro", "nivel_risco", "localizacao",
  "tipo_imovel", "material_construcao", "propriedade", "situacao_imovel",
  "descricao_situacao", "relatado", "recomendacoes", "orgao_destino",
  "vistoriador_nome", "vistoriador_matricula",
];
const INT = ["pessoas_afetadas", "familias_afetadas", "desabrigados", "desalojados"];
const NUM = ["latitude", "longitude"];
const BOOL = ["risco_iminente", "reavaliacao"];

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

// "144", "144/2026", "0144 / 2026" -> "144/2026" (o SAD guarda sem zeros à esquerda)
function normalizarProtocolo(n: string) {
  const m = n.trim().match(/^0*(\d{1,5})\s*\/\s*(\d{4})$/);
  return m ? `${m[1]}/${m[2]}` : "";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  try {
    const corpo = await req.json();
    const protocolo = normalizarProtocolo(String(corpo.protocolo || ""));
    const sentinelaId = String(corpo.sentinela_id || "").trim();
    if (!protocolo) return json({ error: "Protocolo inválido. Use o formato 144/2026." }, 400);
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(sentinelaId)) return json({ error: "Identificação da vistoria inválida." }, 400);

    // 1. o protocolo precisa existir (aceita também com zeros à esquerda, como "044/2026")
    const [num, ano] = protocolo.split("/");
    const alternativas = [protocolo, `${num.padStart(3, "0")}/${ano}`].map(encodeURIComponent).join(",");
    const busca = await fetch(`${URL_SAD}/rest/v1/protocolos?numero=in.(${alternativas})&select=id,numero,pessoa_id`, { headers: H });
    const achados = await busca.json();
    if (!busca.ok || !Array.isArray(achados) || achados.length !== 1) {
      return json({ error: `Protocolo ${protocolo} não encontrado no SAD. Confira o número.` }, 404);
    }
    const prot = achados[0];

    // 2. ocorrência: só campos permitidos, com o tipo certo; vazio não apaga
    const c = corpo.campos || {};
    const oc: Record<string, unknown> = {};
    for (const k of TEXTO) if (typeof c[k] === "string" && c[k].trim()) oc[k] = c[k].trim().slice(0, 4000);
    for (const k of INT) { const v = Number(c[k]); if (c[k] !== null && c[k] !== "" && Number.isInteger(v) && v >= 0 && v < 100000) oc[k] = v; }
    for (const k of NUM) { const v = Number(c[k]); if (c[k] !== null && c[k] !== "" && Number.isFinite(v) && v !== 0) oc[k] = v; }
    for (const k of BOOL) if (typeof c[k] === "boolean") oc[k] = c[k];
    if (Array.isArray(c.medidas)) oc.medidas = c.medidas.filter((m: unknown) => typeof m === "string" && m.trim()).map((m: string) => m.trim().slice(0, 200)).slice(0, 30);
    if (typeof c.data_vistoria === "string" && /^\d{4}-\d{2}-\d{2}$/.test(c.data_vistoria)) oc.data_vistoria = c.data_vistoria;

    const reg = { ...oc, sentinela_id: sentinelaId, origem: "sentinela_v2", protocolo: prot.numero, pessoa_id: prot.pessoa_id ?? null };
    const r1 = await fetch(`${URL_SAD}/rest/v1/ocorrencias?on_conflict=sentinela_id`, {
      method: "POST", headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(reg),
    });
    if (!r1.ok) { console.error("receber-vistoria: ocorrencia", r1.status, await r1.text()); return json({ error: "Não consegui gravar a vistoria no SAD." }, 500); }

    // 3. fotos do anexo (até 8), só arquivos que o próprio app enviou para documentos/sentinela/vistorias/.
    //    Fotos colocadas pelo computador no SAD NUNCA são apagadas nem trocadas: as do app entram
    //    nos quadros livres. Num reenvio, as fotos que vieram do app antes são substituídas.
    let nFotos = 0, semEspaco = 0;
    const fotos = (Array.isArray(corpo.fotos) ? corpo.fotos : [])
      .filter((f: any) => Number.isInteger(Number(f?.ordem)) && String(f?.url || "").startsWith(PREFIXO_FOTO))
      .sort((a: any, b: any) => Number(a.ordem) - Number(b.ordem))
      .slice(0, MAX_FOTOS);
    if (fotos.length) {
      const rEx = await fetch(`${URL_SAD}/rest/v1/vistoria_fotos?protocolo_id=eq.${prot.id}&select=ordem,url`, { headers: H });
      const existentes: { ordem: number; url: string }[] = rEx.ok ? await rEx.json() : [];
      if (!rEx.ok) return json({ error: "Não consegui conferir as fotos do relatório no SAD." }, 500);
      const doComputador = new Set(existentes.filter(f => !String(f.url).startsWith(PREFIXO_FOTO)).map(f => f.ordem));
      const livres = Array.from({ length: MAX_FOTOS }, (_, k) => k + 1).filter(o => !doComputador.has(o));
      // tira as fotos que o app mandou antes (só as do app)
      const del = await fetch(`${URL_SAD}/rest/v1/vistoria_fotos?protocolo_id=eq.${prot.id}&url=like.${encodeURIComponent(PREFIXO_FOTO + "*")}`, {
        method: "DELETE", headers: { ...H, Prefer: "return=minimal" },
      });
      if (!del.ok) console.error("receber-vistoria: limpar fotos do app", del.status, await del.text());
      for (let k = 0; k < fotos.length; k++) {
        const ordem = livres[k];
        if (!ordem) { semEspaco++; continue; }
        const legenda = String(fotos[k]?.legenda || "").trim().slice(0, 300);
        const r = await fetch(`${URL_SAD}/rest/v1/vistoria_fotos?on_conflict=protocolo_id,ordem`, {
          method: "POST", headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ protocolo_id: prot.id, ordem, url: String(fotos[k].url), legenda }),
        });
        if (r.ok) nFotos++; else console.error("receber-vistoria: foto", r.status, await r.text());
      }
    }

    console.log("receber-vistoria:", prot.numero, "campos", Object.keys(oc).length, "fotos", nFotos, "sem espaço", semEspaco);
    return json({ ok: true, protocolo: prot.numero, campos: Object.keys(oc).length, fotos: nFotos, sem_espaco: semEspaco });
  } catch (err) {
    console.error("receber-vistoria: erro", String(err));
    return json({ error: "Falha ao receber os dados." }, 500);
  }
});
