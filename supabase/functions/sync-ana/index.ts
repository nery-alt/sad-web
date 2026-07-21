// Edge Function: sync-ana
// Autentica na API HidroWebService da ANA, busca a série telemétrica adotada
// (cota e chuva) das estações cadastradas com codigo_ana, agrega em valor diário
// e faz upsert em registros_nivel / registros_chuva (fonte = 'ana').
//
// Segurança:
//  - Credenciais da ANA vêm de secrets do projeto (ANA_IDENTIFICADOR, ANA_SENHA).
//  - Protegida por um segredo compartilhado (SYNC_KEY) no header x-sync-key.
//  - SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente.
//
// Deploy: supabase functions deploy sync-ana --no-verify-jwt
// Secrets: ANA_IDENTIFICADOR, ANA_SENHA, SYNC_KEY (definidos no painel do Supabase).

import { createClient } from "jsr:@supabase/supabase-js@2";

const ANA_BASE = "https://www.ana.gov.br/hidrowebservice/EstacoesTelemetricas";

type Item = {
  Cota_Adotada?: string | null;
  Cota_Adotada_Status?: string | null;
  Chuva_Adotada?: string | null;
  Chuva_Adotada_Status?: string | null;
  Data_Hora_Medicao?: string | null;
  codigoestacao?: string | null;
};

function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function autenticar(identificador: string, senha: string): Promise<string> {
  const r = await fetch(`${ANA_BASE}/OAUth/v1`, {
    method: "GET",
    headers: { Identificador: identificador, Senha: senha },
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`Falha na autenticação ANA (HTTP ${r.status}): ${txt.slice(0, 300)}`);
  let j: any;
  try { j = JSON.parse(txt); } catch { throw new Error(`Resposta de auth não-JSON: ${txt.slice(0, 300)}`); }
  const token = j?.items?.tokenautenticacao;
  if (!token) throw new Error(`Auth sem token. Retorno: ${txt.slice(0, 300)}`);
  return token;
}

// IMPORTANTE: os nomes dos parâmetros têm espaços/acentos (confirmado no OpenAPI real
// da ANA — o exemplo do manual em Java estava desatualizado e gerava HTTP 400).
async function buscarSerie(token: string, codigo: string): Promise<Item[]> {
  const qs = new URLSearchParams();
  qs.set("Código da Estação", codigo);
  qs.set("Tipo Filtro Data", "DATA_LEITURA");
  qs.set("Range Intervalo de busca", "DIAS_30");
  const url = `${ANA_BASE}/HidroinfoanaSerieTelemetricaAdotada/v1?${qs.toString()}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const txt = await r.text();
  if (!r.ok) throw new Error(`Falha na série (estação ${codigo}, HTTP ${r.status}): ${txt.slice(0, 300)}`);
  let j: any;
  try { j = JSON.parse(txt); } catch { throw new Error(`Série não-JSON (estação ${codigo}): ${txt.slice(0, 300)}`); }
  return Array.isArray(j?.items) ? j.items as Item[] : [];
}

function agregarDiario(items: Item[]) {
  const nivel = new Map<string, { soma: number; n: number }>();
  const chuva = new Map<string, number>();
  for (const it of items) {
    const dh = it.Data_Hora_Medicao;
    if (!dh) continue;
    const dia = dh.slice(0, 10);
    // Aceita status 0 (ok) e 1 (suspeito); descarta só 2 (ruim). Assim não perdemos
    // dias recentes que a ANA ainda marca como suspeitos antes da consistência final.
    if (it.Cota_Adotada != null && it.Cota_Adotada !== "" && (it.Cota_Adotada_Status ?? "0") !== "2") {
      const v = Number(it.Cota_Adotada);
      if (Number.isFinite(v)) {
        const cur = nivel.get(dia) ?? { soma: 0, n: 0 };
        cur.soma += v; cur.n += 1; nivel.set(dia, cur);
      }
    }
    if (it.Chuva_Adotada != null && it.Chuva_Adotada !== "" && (it.Chuva_Adotada_Status ?? "0") !== "2") {
      const v = Number(it.Chuva_Adotada);
      if (Number.isFinite(v)) chuva.set(dia, (chuva.get(dia) ?? 0) + v);
    }
  }
  const niveisDiarios = [...nivel.entries()].map(([data, { soma, n }]) => ({ data, cota_cm: Math.round(soma / n) }));
  const chuvasDiarias = [...chuva.entries()].map(([data, mm]) => ({ data, chuva_mm: Math.round(mm * 10) / 10 }));
  return { niveisDiarios, chuvasDiarias };
}

Deno.serve(async (req: Request) => {
  try {
    const SYNC_KEY = Deno.env.get("SYNC_KEY");
    const enviado = req.headers.get("x-sync-key");
    if (!SYNC_KEY || enviado !== SYNC_KEY) {
      return jsonResp({ erro: "Não autorizado (x-sync-key ausente ou incorreto)." }, 401);
    }

    const identificador = Deno.env.get("ANA_IDENTIFICADOR");
    const senha = Deno.env.get("ANA_SENHA");
    if (!identificador || !senha) {
      return jsonResp({ erro: "Secrets ANA_IDENTIFICADOR / ANA_SENHA não configurados no projeto." }, 500);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: estacoes, error: errEst } = await supabase
      .from("estacoes_monitoramento")
      .select("id, nome, codigo_ana, ativa")
      .not("codigo_ana", "is", null)
      .eq("ativa", true);
    if (errEst) throw errEst;

    const token = await autenticar(identificador, senha);

    const resumo: any[] = [];
    for (const est of estacoes ?? []) {
      const codigo = (est.codigo_ana ?? "").trim();
      if (!codigo) continue;
      try {
        const items = await buscarSerie(token, codigo);
        const { niveisDiarios, chuvasDiarias } = agregarDiario(items);

        let gravNivel = 0, gravChuva = 0;
        if (niveisDiarios.length) {
          const rows = niveisDiarios.map((d) => ({
            estacao_id: est.id, data: d.data, cota_cm: d.cota_cm, fonte: "ana", responsavel: "ANA (telemetria)",
          }));
          const { error } = await supabase.from("registros_nivel").upsert(rows, { onConflict: "estacao_id,data,fonte" });
          if (error) throw error;
          gravNivel = rows.length;
        }
        if (chuvasDiarias.length) {
          const rows = chuvasDiarias.map((d) => ({
            estacao_id: est.id, data: d.data, chuva_mm: d.chuva_mm, fonte: "ana", responsavel: "ANA (telemetria)",
          }));
          const { error } = await supabase.from("registros_chuva").upsert(rows, { onConflict: "estacao_id,data,fonte" });
          if (error) throw error;
          gravChuva = rows.length;
        }

        resumo.push({
          estacao: est.nome, codigo,
          itens_recebidos: items.length,
          dias_nivel_gravados: gravNivel,
          dias_chuva_gravados: gravChuva,
          amostra: items.slice(0, 2),
        });
      } catch (e) {
        resumo.push({ estacao: est.nome, codigo, erro: String(e instanceof Error ? e.message : e) });
      }
    }

    return jsonResp({ ok: true, executado_em: new Date().toISOString(), estacoes: resumo });
  } catch (e) {
    return jsonResp({ ok: false, erro: String(e instanceof Error ? e.message : e) }, 500);
  }
});
