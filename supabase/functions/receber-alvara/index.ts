import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// receber-alvara — "porta de entrada" do aplicativo Sentinela DC no SAD.
// Só ATUALIZA um alvará que JÁ EXISTE (pelo número AL) e só os campos da vistoria.
// Nunca cria nem apaga alvarás e não mexe em outras tabelas (além das fotos do próprio alvará).
// Valores vazios enviados pelo app não apagam o que já está no SAD.

const URL_SAD = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PREFIXO_FOTO = `${URL_SAD}/storage/v1/object/public/documentos/sentinela/`;

const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

const BOOL = [
  "possui_extintor", "extintor_validade", "extintor_localizacao_ok", "sinalizacao_emergencia",
  "saida_desobstruida", "rotas_fuga_ok", "instalacao_irregular", "possui_glp", "glp_armazenamento_ok",
  "sistema_fixo_incendio", "iluminacao_emergencia", "hidrante_reserva", "planta_baixa",
  "estrutura_infiltracao", "estrutura_cobertura_ok", "apto_alvara", "necessita_adequacoes", "reavaliacao",
];
const INT = ["qtd_extintores", "qtd_saidas", "capacidade_pessoas"];
const NUM = ["area_total", "gps_lat", "gps_lng"];
const TEXTO = [
  "tipo_extintor", "qual_sistema_fixo", "obs_iluminacao", "obs_hidrante", "obs_planta_baixa",
  "observacoes", "descricao_tecnica", "tipo_estabelecimento", "estrutura_obs",
  "nome_vistoriador", "matricula_vistoriador",
  "cnpj", "nome_responsavel", "cpf_responsavel", "telefone", "endereco", "bairro",
];
const ENUM: Record<string, string[]> = {
  classificacao_risco: ["Baixo", "Médio", "Alto"],
  classificacao_porte: ["Pequeno", "Médio", "Grande"],
  estrutura_conservacao: ["Bom", "Regular", "Ruim"],
  estrutura_trincas: ["Não", "Leves", "Graves"],
};

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

function normalizarNumero(n: string) {
  // "AL 094/2026", "al-94/2026" -> "AL-094/2026"
  const m = n.trim().toUpperCase().match(/^AL[\s-]*0*(\d{1,4})\s*\/\s*(\d{4})$/);
  return m ? `AL-${m[1].padStart(3, "0")}/${m[2]}` : n.trim();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  try {
    const corpo = await req.json();
    const numero = normalizarNumero(String(corpo.numero || ""));
    if (!/^AL-\d{3,4}\/\d{4}$/.test(numero)) return json({ error: "Número AL inválido." }, 400);

    // 1. o alvará precisa existir
    const busca = await fetch(`${URL_SAD}/rest/v1/alvaras?numero=eq.${encodeURIComponent(numero)}&select=id`, { headers: H });
    const achados = await busca.json();
    if (!busca.ok || !Array.isArray(achados) || achados.length !== 1) {
      return json({ error: `Alvará ${numero} não encontrado no SAD.` }, 404);
    }
    const id = achados[0].id;

    // 2. só campos permitidos, com o tipo certo; vazio não apaga
    const c = corpo.campos || {};
    const upd: Record<string, unknown> = {};
    for (const k of BOOL) if (typeof c[k] === "boolean") upd[k] = c[k];
    for (const k of INT) { const v = Number(c[k]); if (c[k] !== null && c[k] !== "" && Number.isInteger(v) && v > 0 && v < 100000) upd[k] = v; }
    for (const k of NUM) { const v = Number(c[k]); if (c[k] !== null && c[k] !== "" && Number.isFinite(v) && v !== 0) upd[k] = v; }
    for (const k of TEXTO) { if (typeof c[k] === "string" && c[k].trim()) upd[k] = c[k].trim().slice(0, 3000); }
    for (const [k, ok] of Object.entries(ENUM)) if (ok.includes(c[k])) upd[k] = c[k];
    if (typeof c.data_vistoria === "string" && /^\d{4}-\d{2}-\d{2}$/.test(c.data_vistoria)) upd.data_vistoria = c.data_vistoria;

    if (Object.keys(upd).length) {
      const r = await fetch(`${URL_SAD}/rest/v1/alvaras?id=eq.${id}`, {
        method: "PATCH", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify(upd),
      });
      if (!r.ok) { console.error("receber-alvara: update", r.status, await r.text()); return json({ error: "Não consegui gravar os dados no SAD." }, 500); }
    }

    // 3. fotos (até 4), só arquivos que o próprio app enviou para documentos/sentinela/
    let nFotos = 0;
    const fotos = Array.isArray(corpo.fotos) ? corpo.fotos.slice(0, 4) : [];
    for (const f of fotos) {
      const ordem = Number(f?.ordem);
      const url = String(f?.url || "");
      if (!Number.isInteger(ordem) || ordem < 1 || ordem > 4 || !url.startsWith(PREFIXO_FOTO)) continue;
      const legenda = String(f?.legenda || "").trim().slice(0, 200);
      const r = await fetch(`${URL_SAD}/rest/v1/alvara_fotos?on_conflict=alvara_id,ordem`, {
        method: "POST", headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ alvara_id: id, ordem, url, legenda }),
      });
      if (r.ok) nFotos++; else console.error("receber-alvara: foto", r.status, await r.text());
    }

    console.log("receber-alvara:", numero, "campos", Object.keys(upd).length, "fotos", nFotos);
    return json({ ok: true, numero, campos: Object.keys(upd).length, fotos: nFotos });
  } catch (err) {
    console.error("receber-alvara: erro", String(err));
    return json({ error: "Falha ao receber os dados." }, 500);
  }
});
