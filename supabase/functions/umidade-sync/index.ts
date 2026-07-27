// Edge Function: umidade-sync
// Robô diário de umidade relativa do ar via Open-Meteo (grátis, sem cadastro).
// Para cada estação ativa com lat/lng, busca a umidade horária dos últimos dias,
// tira a média por dia e grava em registros_umidade (fonte = 'openmeteo').
// Dado de MODELO meteorológico (estimativa), não medição de estação física.
// Protegida por SYNC_KEY (header x-sync-key). Agendada via pg_cron (umidade-openmeteo-diario).
//
// Deploy: supabase functions deploy umidade-sync --no-verify-jwt

import { createClient } from "jsr:@supabase/supabase-js@2";

function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), { status, headers: { "Content-Type": "application/json" } });
}

async function umidadeDiaria(lat: number, lon: number): Promise<{ data: string; umidade_pct: number }[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + `&hourly=relative_humidity_2m&past_days=7&forecast_days=1&timezone=America%2FManaus`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Open-Meteo HTTP ${r.status}`);
  const j = await r.json();
  const tempos: string[] = j?.hourly?.time ?? [];
  const umid: number[] = j?.hourly?.relative_humidity_2m ?? [];
  const acc = new Map<string, { soma: number; n: number }>();
  for (let i = 0; i < tempos.length; i++) {
    const v = umid[i];
    if (v == null || !Number.isFinite(Number(v))) continue;
    const dia = String(tempos[i]).slice(0, 10);
    const cur = acc.get(dia) ?? { soma: 0, n: 0 };
    cur.soma += Number(v); cur.n += 1; acc.set(dia, cur);
  }
  return [...acc.entries()].map(([data, { soma, n }]) => ({ data, umidade_pct: Math.round((soma / n) * 10) / 10 }));
}

Deno.serve(async (req) => {
  try {
    const SYNC_KEY = Deno.env.get("SYNC_KEY");
    if (!SYNC_KEY || req.headers.get("x-sync-key") !== SYNC_KEY)
      return jsonResp({ erro: "não autorizado" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: estacoes, error } = await supabase
      .from("estacoes_monitoramento").select("id, nome, lat, lng, ativa")
      .eq("ativa", true).not("lat", "is", null).not("lng", "is", null);
    if (error) throw error;

    const resumo: any[] = [];
    for (const est of estacoes ?? []) {
      try {
        const dias = await umidadeDiaria(Number(est.lat), Number(est.lng));
        let gravados = 0;
        if (dias.length) {
          const rows = dias.map((d) => ({ estacao_id: est.id, data: d.data, umidade_pct: d.umidade_pct, fonte: "openmeteo", responsavel: "Open-Meteo (modelo)" }));
          const { error: upErr } = await supabase.from("registros_umidade").upsert(rows, { onConflict: "estacao_id,data,fonte" });
          if (upErr) throw upErr;
          gravados = rows.length;
        }
        resumo.push({ estacao: est.nome, dias_gravados: gravados, ultima: dias[dias.length - 1] ?? null });
      } catch (e) {
        resumo.push({ estacao: est.nome, erro: String(e instanceof Error ? e.message : e) });
      }
    }
    return jsonResp({ ok: true, executado_em: new Date().toISOString(), estacoes: resumo });
  } catch (e) {
    return jsonResp({ ok: false, erro: String(e instanceof Error ? e.message : e) }, 500);
  }
});
