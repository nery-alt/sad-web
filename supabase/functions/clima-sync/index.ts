// Edge Function: clima-sync
// Robô diário do quadro ambiental via Open-Meteo (clima + qualidade do ar), grátis.
// Para cada estação ativa com lat/lng, calcula os valores diários relevantes e grava em
// registros_clima (formato longo). Dado de MODELO (Open-Meteo/CAMS), não estação física.
// Variáveis: temperatura (máx), sensacao_termica (máx), umidade_min, vento (máx), pm25, pm10.
// Protegida por SYNC_KEY. Agendada via pg_cron (clima-openmeteo-diario).
//
// Deploy: supabase functions deploy clima-sync --no-verify-jwt

import { createClient } from "jsr:@supabase/supabase-js@2";

const TZ = "America%2FManaus";

function jsonResp(b: unknown, s = 200) { return new Response(JSON.stringify(b, null, 2), { status: s, headers: { "Content-Type": "application/json" } }); }

async function getJson(url: string): Promise<any> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url.split('?')[0]}`);
  return await r.json();
}

// Agrega série horária em valor diário conforme o modo (max/min/mean).
function agregar(times: string[], vals: number[], modo: "max" | "min" | "mean"): Map<string, number> {
  const acc = new Map<string, number[]>();
  for (let i = 0; i < times.length; i++) {
    const v = vals[i];
    if (v == null || !Number.isFinite(Number(v))) continue;
    const dia = String(times[i]).slice(0, 10);
    (acc.get(dia) ?? acc.set(dia, []).get(dia)!).push(Number(v));
  }
  const out = new Map<string, number>();
  for (const [dia, arr] of acc) {
    if (!arr.length) continue;
    let val: number;
    if (modo === "max") val = Math.max(...arr);
    else if (modo === "min") val = Math.min(...arr);
    else val = arr.reduce((a, b) => a + b, 0) / arr.length;
    out.set(dia, Math.round(val * 10) / 10);
  }
  return out;
}

Deno.serve(async (req) => {
  try {
    if (req.headers.get("x-sync-key") !== Deno.env.get("SYNC_KEY")) return jsonResp({ erro: "não autorizado" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: estacoes, error } = await supabase
      .from("estacoes_monitoramento").select("id, nome, lat, lng, ativa")
      .eq("ativa", true).not("lat", "is", null).not("lng", "is", null);
    if (error) throw error;

    const resumo: any[] = [];
    for (const est of estacoes ?? []) {
      try {
        const lat = Number(est.lat), lon = Number(est.lng);
        const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
          + `&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m`
          + `&past_days=3&forecast_days=1&timezone=${TZ}`;
        const arUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}`
          + `&hourly=pm2_5,pm10&past_days=3&forecast_days=1&timezone=${TZ}`;
        const [meteo, ar] = await Promise.all([getJson(meteoUrl), getJson(arUrl)]);
        const h = meteo?.hourly ?? {}, ha = ar?.hourly ?? {};

        const series: [string, string, Map<string, number>][] = [
          ["temperatura", "°C", agregar(h.time ?? [], h.temperature_2m ?? [], "max")],
          ["sensacao_termica", "°C", agregar(h.time ?? [], h.apparent_temperature ?? [], "max")],
          ["umidade_min", "%", agregar(h.time ?? [], h.relative_humidity_2m ?? [], "min")],
          ["vento", "km/h", agregar(h.time ?? [], h.wind_speed_10m ?? [], "max")],
          ["pm25", "µg/m³", agregar(ha.time ?? [], ha.pm2_5 ?? [], "mean")],
          ["pm10", "µg/m³", agregar(ha.time ?? [], ha.pm10 ?? [], "mean")],
        ];
        const rows: any[] = [];
        for (const [variavel, unidade, mapa] of series)
          for (const [data, valor] of mapa)
            rows.push({ estacao_id: est.id, data, variavel, valor, unidade, fonte: "openmeteo" });

        let gravados = 0;
        if (rows.length) {
          const { error: upErr } = await supabase.from("registros_clima").upsert(rows, { onConflict: "estacao_id,data,variavel,fonte" });
          if (upErr) throw upErr;
          gravados = rows.length;
        }
        resumo.push({ estacao: est.nome, linhas: gravados });
      } catch (e) {
        resumo.push({ estacao: est.nome, erro: String(e instanceof Error ? e.message : e) });
      }
    }
    return jsonResp({ ok: true, executado_em: new Date().toISOString(), estacoes: resumo });
  } catch (e) {
    return jsonResp({ ok: false, erro: String(e instanceof Error ? e.message : e) }, 500);
  }
});
