// Edge Function: focos-sync
// Robô diário dos focos de calor do INPE. Reusa a mesma fonte pública da focos-inpe
// (dataserver-coids.inpe.br), recorta na região de Tefé e grava em focos_historico.
// Assim o histórico deixa de depender de alguém abrir o mapa.
// Protegida por SYNC_KEY (header x-sync-key). Agendada via pg_cron (focos-inpe-diario).
//
// Deploy: supabase functions deploy focos-sync --no-verify-jwt

import { createClient } from "jsr:@supabase/supabase-js@2";

const BBOX = { latMin: -5.2, latMax: -2.0, lonMin: -67.5, lonMax: -63.0 };
const BASE = "https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/diario/Brasil";

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}
function parseCsv(text: string): Record<string, string>[] {
  const linhas = text.split("\n").filter((l) => l.trim().length > 0);
  if (linhas.length < 2) return [];
  const header = linhas[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const out: Record<string, string>[] = [];
  for (let i = 1; i < linhas.length; i++) {
    const cols = linhas[i].split(",");
    const row: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) row[header[j]] = (cols[j] ?? "").trim().replace(/^"|"$/g, "");
    out.push(row);
  }
  return out;
}
function num(v: string | undefined): number | null {
  if (v === undefined || v === "" || v === "null" || v === "NaN") return null;
  const n = Number(v); return Number.isFinite(n) ? n : null;
}
function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) if (row[k] !== undefined && row[k] !== "") return row[k];
  return "";
}
async function baixarDia(dataStr: string): Promise<Record<string, string>[]> {
  try {
    const res = await fetch(`${BASE}/focos_diario_br_${dataStr}.csv`);
    if (!res.ok) return [];
    return parseCsv(await res.text());
  } catch { return []; }
}

Deno.serve(async (req) => {
  try {
    const SYNC_KEY = Deno.env.get("SYNC_KEY");
    if (!SYNC_KEY || req.headers.get("x-sync-key") !== SYNC_KEY)
      return new Response(JSON.stringify({ erro: "não autorizado" }), { status: 401, headers: { "Content-Type": "application/json" } });

    const hoje = new Date();
    const ontem = new Date(hoje.getTime() - 24 * 3600 * 1000);
    const [a, b] = await Promise.all([baixarDia(ymd(hoje)), baixarDia(ymd(ontem))]);
    const linhas = [...a, ...b];

    const vistos = new Set<string>();
    const rows: any[] = [];
    for (const r of linhas) {
      const lat = num(pick(r, "lat", "latitude"));
      const lon = num(pick(r, "lon", "longitude", "lng"));
      if (lat === null || lon === null) continue;
      if (lat < BBOX.latMin || lat > BBOX.latMax || lon < BBOX.lonMin || lon > BBOX.lonMax) continue;
      const dataHora = pick(r, "data_hora_gmt", "datahora", "data");
      const chave = `${lat.toFixed(4)},${lon.toFixed(4)},${dataHora}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      rows.push({
        chave, lat, lon, data_hora: dataHora,
        data_foco: (dataHora || "").slice(0, 10) || null,
        satelite: pick(r, "satelite"), municipio: pick(r, "municipio"), estado: pick(r, "estado"),
        risco_fogo: num(pick(r, "risco_fogo", "riscofogo")), frp: num(pick(r, "frp")), bioma: pick(r, "bioma"),
      });
    }

    let gravados = 0;
    if (rows.length) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { error, count } = await supabase.from("focos_historico")
        .upsert(rows, { onConflict: "chave", ignoreDuplicates: true, count: "exact" });
      if (error) throw error;
      gravados = count ?? rows.length;
    }
    return new Response(JSON.stringify({ ok: true, executado_em: new Date().toISOString(), focos_na_regiao: rows.length, gravados_novos: gravados }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, erro: String(e instanceof Error ? e.message : e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
