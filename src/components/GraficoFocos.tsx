import React, { useState, useEffect, useCallback } from 'react'
import { Flame, RefreshCw, Printer } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Registro = { data_foco: string | null; municipio: string | null }
type Periodo = 'dia' | 'semana' | 'mes'

// Semana ISO (segunda a domingo) -> rótulo "AAAA-Sxx"
function chaveSemana(d: Date): string {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dia = (dt.getUTCDay() + 6) % 7 // 0 = segunda
  dt.setUTCDate(dt.getUTCDate() - dia + 3) // quinta da semana
  const primeiraQuinta = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4))
  const semana = 1 + Math.round(
    ((dt.getTime() - primeiraQuinta.getTime()) / 86400000 - 3 + ((primeiraQuinta.getUTCDay() + 6) % 7)) / 7
  )
  return `${dt.getUTCFullYear()}-S${String(semana).padStart(2, '0')}`
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export const GraficoFocos: React.FC = () => {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<Periodo>('dia')

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('focos_historico')
      .select('data_foco, municipio')
      .order('data_foco', { ascending: true })
    setRegistros((data as Registro[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const validos = registros.filter(r => r.data_foco)
  const total = validos.length

  // Agrupa conforme o período escolhido
  const grupos = new Map<string, number>()
  for (const r of validos) {
    const d = new Date(r.data_foco + 'T12:00:00')
    let chave = ''
    let ordem = ''
    if (periodo === 'dia') {
      chave = `${String(d.getDate()).padStart(2, '0')}/${MESES[d.getMonth()]}`
      ordem = r.data_foco!
    } else if (periodo === 'semana') {
      chave = chaveSemana(d)
      ordem = chave
    } else {
      chave = `${MESES[d.getMonth()]}/${d.getFullYear()}`
      ordem = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    grupos.set(ordem + '|' + chave, (grupos.get(ordem + '|' + chave) || 0) + 1)
  }

  // Ordena por data e pega os últimos (mais recentes) conforme o período
  const limite = periodo === 'dia' ? 30 : periodo === 'semana' ? 16 : 12
  const linhas = Array.from(grupos.entries())
    .map(([k, v]) => ({ ordem: k.split('|')[0], label: k.split('|')[1], valor: v }))
    .sort((a, b) => a.ordem.localeCompare(b.ordem))
    .slice(-limite)

  const maxVal = Math.max(1, ...linhas.map(l => l.valor))

  const periodoLabel = { dia: 'por dia (últimos 30)', semana: 'por semana (últimas 16)', mes: 'por mês (últimos 12)' }[periodo]

  // ---------- Boletim (impressão / PDF) ----------
  const diaBR = (iso: string) => {
    const [a, m, d] = iso.split('-')
    return `${d}/${m}/${a}`
  }
  const gerarBoletim = () => {
    if (validos.length === 0) return
    const horaGeracao = new Date().toLocaleString('pt-BR')
    const datas = validos.map(r => r.data_foco!).sort()
    const primeiro = datas[0], ultimo = datas[datas.length - 1]

    // Atividade recente (últimos 7 e 30 dias corridos)
    const hojeD = new Date()
    const dStr = (dias: number) => { const x = new Date(hojeD); x.setDate(x.getDate() - dias); return x.toISOString().split('T')[0] }
    const ult7 = validos.filter(r => r.data_foco! >= dStr(7)).length
    const ult30 = validos.filter(r => r.data_foco! >= dStr(30)).length

    // Por município
    const porMun = new Map<string, number>()
    for (const r of validos) { const m = (r.municipio || 'Não informado'); porMun.set(m, (porMun.get(m) || 0) + 1) }
    const munRows = [...porMun.entries()].sort((a, b) => b[1] - a[1])

    // Por dia (últimos 15 dias com foco)
    const porDia = new Map<string, number>()
    for (const r of validos) porDia.set(r.data_foco!, (porDia.get(r.data_foco!) || 0) + 1)
    const diaRows = [...porDia.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-15)
    const maxDia = Math.max(1, ...diaRows.map(d => d[1]))

    // Por mês
    const porMes = new Map<string, number>()
    for (const r of validos) { const d = new Date(r.data_foco! + 'T12:00:00'); porMes.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, (porMes.get(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`) || 0) + 1) }
    const mesRows = [...porMes.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    const rotuloMes = (k: string) => { const [a, m] = k.split('-'); return `${MESES[Number(m) - 1]}/${a}` }

    const linhaBarra = (label: string, valor: number, max: number, cor: string) =>
      `<div class="barra-linha"><span class="barra-lbl">${label}</span><span class="barra-track"><span class="barra-fill" style="width:${Math.max(6, (valor / max) * 100)}%;background:${cor}">${valor}</span></span></div>`

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Boletim de Focos de Calor</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:12px;margin:24px;color:#111}
        h1{font-size:18px;margin:0 0 2px}
        h2{font-size:12px;font-weight:normal;color:#555;margin:0 0 4px}
        .data{font-size:11px;color:#777;margin-bottom:16px}
        .cards{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap}
        .card{border:1px solid #ddd;border-radius:8px;padding:8px 14px;min-width:110px}
        .card b{display:block;font-size:22px;color:#DC2626}
        .card span{font-size:10px;color:#666;text-transform:uppercase}
        h3{font-size:13px;margin:18px 0 6px;border-bottom:2px solid #eee;padding-bottom:3px}
        table{width:100%;border-collapse:collapse;margin-bottom:4px}
        td,th{padding:4px 6px;border-bottom:1px solid #eee;text-align:left;font-size:11px}
        th{color:#555;text-transform:uppercase;font-size:10px}
        td:last-child,th:last-child{text-align:right}
        .barra-linha{display:flex;align-items:center;gap:8px;margin:3px 0}
        .barra-lbl{width:70px;font-size:10px;color:#555;text-align:right}
        .barra-track{flex:1;background:#f1f1f1;border-radius:4px;height:16px;overflow:hidden}
        .barra-fill{display:flex;align-items:center;justify-content:flex-end;height:100%;padding-right:5px;color:#fff;font-size:10px;font-weight:bold;border-radius:4px}
        .rodape{margin-top:20px;font-size:10px;color:#999}
        @media print{body{margin:12px}}
      </style></head><body>
      <h1>Boletim de Focos de Calor</h1>
      <h2>Secretaria Municipal de Defesa Civil e Patrimonial — SEMDECP — Tefé/AM</h2>
      <div class="data">Gerado em ${horaGeracao} · Período dos dados: ${diaBR(primeiro)} a ${diaBR(ultimo)}</div>

      <div class="cards">
        <div class="card"><b>${total}</b><span>Focos no total</span></div>
        <div class="card"><b>${ult7}</b><span>Últimos 7 dias</span></div>
        <div class="card"><b>${ult30}</b><span>Últimos 30 dias</span></div>
        <div class="card"><b>${porDia.size}</b><span>Dias com foco</span></div>
      </div>

      <h3>Atividade diária (últimos ${diaRows.length} dias com registro)</h3>
      ${diaRows.map(([d, v]) => linhaBarra(diaBR(d), v, maxDia, '#DC2626')).join('')}

      <h3>Por município</h3>
      <table><tr><th>Município</th><th>Focos</th></tr>
        ${munRows.map(([m, v]) => `<tr><td>${m}</td><td>${v}</td></tr>`).join('')}
      </table>

      <h3>Por mês</h3>
      <table><tr><th>Mês</th><th>Focos</th></tr>
        ${mesRows.map(([k, v]) => `<tr><td>${rotuloMes(k)}</td><td>${v}</td></tr>`).join('')}
      </table>

      <p class="rodape">Fonte: detecção por satélite (INPE / Programa Queimadas). Os números podem ser subestimados em dias de forte nebulosidade. O histórico começa a ser gravado a partir do momento em que o mapa de focos é ativado no SAD. Documento gerado automaticamente pelo SAD — Sentinela Defesa Civil.</p>
      </body></html>`

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => w.print(), 500)
  }

  return (
    <div className="p-4 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-1 shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Flame size={24} className="text-error-expired" /> Focos de Calor — Histórico</h1>
          <p className="text-text-secondary text-sm">Contagem de focos detectados pelo INPE na região, ao longo do tempo.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={gerarBoletim} disabled={validos.length === 0}
            className="flex items-center gap-2 bg-primary-btn text-white px-3 py-2 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-40">
            <Printer size={15} /> Gerar Boletim
          </button>
          <button onClick={carregar} className="flex items-center gap-2 border border-gray-300 text-text-secondary px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
            <RefreshCw size={15} /> Atualizar
          </button>
        </div>
      </div>

      {/* Resumo + seletor de período */}
      <div className="flex items-center justify-between flex-wrap gap-3 my-3 shrink-0">
        <div className="flex gap-4">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
            <div className="text-2xl font-bold text-error-expired">{total}</div>
            <div className="text-xs text-text-secondary uppercase">focos registrados</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
            <div className="text-2xl font-bold">{linhas.length}</div>
            <div className="text-xs text-text-secondary uppercase">{periodo === 'dia' ? 'dias' : periodo === 'semana' ? 'semanas' : 'meses'} com foco</div>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['dia', 'semana', 'mes'] as Periodo[]).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={`px-3 py-1.5 rounded text-sm font-bold ${periodo === p ? 'bg-white shadow text-text-main' : 'text-text-secondary'}`}>
              {p === 'dia' ? 'Dia' : p === 'semana' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico de barras */}
      <div className="flex-1 overflow-y-auto bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-xs text-text-secondary uppercase font-bold mb-3">Focos {periodoLabel}</p>
        {loading ? (
          <p className="text-text-secondary text-sm italic">Carregando…</p>
        ) : linhas.length === 0 ? (
          <p className="text-text-secondary text-sm italic">
            Ainda não há focos gravados. Abra o Mapa de Ocorrências e ligue "🔥 Focos INPE" — a partir daí o histórico começa a ser registrado.
          </p>
        ) : (
          <div className="space-y-1.5">
            {linhas.map(l => (
              <div key={l.ordem} className="flex items-center gap-2">
                <div className="w-20 text-xs text-text-secondary text-right shrink-0">{l.label}</div>
                <div className="flex-1 bg-gray-100 rounded h-6 relative overflow-hidden">
                  <div className="h-full rounded bg-error-expired/80 flex items-center justify-end pr-2"
                    style={{ width: `${Math.max(6, (l.valor / maxVal) * 100)}%` }}>
                    <span className="text-xs font-bold text-white">{l.valor}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-text-secondary mt-2 shrink-0">
        O histórico é gravado quando você abre o mapa e liga os focos. Dados de detecção por satélite (INPE) — podem ser subestimados em dias nublados.
      </p>
    </div>
  )
}
