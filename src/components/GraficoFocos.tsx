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
  const [filtroMun, setFiltroMun] = useState<string>('todos')

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

  // Lista de municípios disponíveis (para o filtro)
  const municipios = [...new Set(registros.map(r => r.municipio).filter((m): m is string => !!m))].sort()
  // Aplica o filtro de município tanto na tela quanto no boletim
  const validos = registros.filter(r => r.data_foco && (filtroMun === 'todos' || (r.municipio || '') === filtroMun))
  const total = validos.length
  const escopoMun = filtroMun === 'todos' ? 'Todos os municípios' : filtroMun

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

    // Pico do período (sobre todos os dias no escopo) e média
    const picoEntry = [...porDia.entries()].reduce((a, b) => b[1] > a[1] ? b : a, ['', 0] as [string, number])
    const dataHoje = new Date().toLocaleDateString('pt-BR')

    // Número em PRETO e NEGRITO, FORA da barra (legível na impressão).
    const linhaBarra = (label: string, valor: number, max: number, pico: boolean) =>
      `<div class="barra"><span class="dia">${label}</span><span class="trilho"><span class="fill${pico ? ' pico' : ''}" style="width:${Math.max(3, (valor / max) * 100)}%"></span></span><span class="num">${valor}${pico ? ' <span class="pico-tag">◄ maior</span>' : ''}</span></div>`

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Boletim de Focos de Calor</title>
      <style>
        @page{margin:18mm 16mm}
        *{box-sizing:border-box}
        body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#1a1a1a;margin:24px;line-height:1.45}
        .titulo{font-size:20px;font-weight:800;letter-spacing:.5px;margin:0}
        .sub{font-size:11px;color:#444;margin:2px 0 0}
        .meta{font-size:11px;color:#555;margin-top:6px;padding-bottom:10px;border-bottom:2px solid #1a1a1a}
        .meta b{color:#1a1a1a}
        .intro{margin:14px 0 18px;text-align:justify}
        .cards{display:flex;gap:10px;margin:14px 0 20px}
        .card{flex:1;border:1px solid #d0d0d0;border-radius:6px;padding:10px 12px;text-align:center}
        .card .n{font-size:24px;font-weight:800;color:#b3261e}
        .card .l{font-size:9px;color:#555;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
        h3{font-size:13px;text-transform:uppercase;letter-spacing:.6px;margin:22px 0 10px;padding-bottom:4px;border-bottom:1.5px solid #ccc;color:#222}
        .barra{display:flex;align-items:center;gap:10px;margin:4px 0}
        .barra .dia{width:82px;font-size:11px;color:#333;text-align:right}
        .barra .trilho{flex:1;background:#f0f0f0;border-radius:3px;height:15px;overflow:hidden}
        .barra .fill{height:100%;background:#c0392b;border-radius:3px}
        .barra .fill.pico{background:#7d1710}
        .barra .num{width:78px;font-size:12px;font-weight:800;color:#111}
        .barra .pico-tag{color:#7d1710;font-weight:700;font-size:10px}
        table{width:100%;border-collapse:collapse;margin-top:4px}
        th{text-align:left;font-size:10px;text-transform:uppercase;color:#555;padding:6px 8px;border-bottom:2px solid #ccc}
        td{padding:6px 8px;font-size:12px;border-bottom:1px solid #eee}
        td.r,th.r{text-align:right}
        tr:nth-child(even) td{background:#fafafa}
        .assinatura{margin-top:56px;text-align:center}
        .assinatura .linha{display:inline-block;border-top:1px solid #333;padding-top:5px;min-width:320px}
        .assinatura .nome{font-weight:700}
        .assinatura .cargo{font-size:11px;color:#555}
        .rodape{margin-top:26px;padding-top:8px;border-top:1px solid #ddd;font-size:10px;color:#888}
        @media print{body{margin:12px}}
      </style></head><body>
      <p class="titulo">BOLETIM DE FOCOS DE CALOR</p>
      <p class="sub">Secretaria Municipal de Defesa Civil e Patrimonial — SEMDECP · Tefé/AM</p>
      <div class="meta"><b>Município:</b> ${escopoMun} &nbsp;·&nbsp; <b>Período dos dados:</b> ${diaBR(primeiro)} a ${diaBR(ultimo)} &nbsp;·&nbsp; <b>Emitido em:</b> ${horaGeracao}</div>

      <p class="intro">No período de <b>${diaBR(primeiro)} a ${diaBR(ultimo)}</b> foram detectados <b>${total} focos de calor</b> em <b>${escopoMun}</b>, distribuídos em <b>${porDia.size} dia(s)</b> com registro.${picoEntry[1] > 0 ? ` O dia de maior atividade foi <b>${diaBR(picoEntry[0])}, com ${picoEntry[1]} focos</b>.` : ''} Nos <b>últimos 7 dias</b> registraram-se <b>${ult7} focos</b>. Recomenda-se atenção reforçada ao risco de incêndios e à qualidade do ar no período.</p>

      <div class="cards">
        <div class="card"><div class="n">${total}</div><div class="l">Focos no total</div></div>
        <div class="card"><div class="n">${ult7}</div><div class="l">Últimos 7 dias</div></div>
        <div class="card"><div class="n">${ult30}</div><div class="l">Últimos 30 dias</div></div>
        <div class="card"><div class="n">${porDia.size}</div><div class="l">Dias com foco</div></div>
      </div>

      <h3>Atividade diária (últimos ${diaRows.length} dias com registro)</h3>
      ${diaRows.map(([d, v]) => linhaBarra(diaBR(d), v, maxDia, v === maxDia)).join('')}

      ${filtroMun === 'todos' ? `<h3>Distribuição por município</h3>
      <table><tr><th>Município</th><th class="r">Focos</th></tr>
        ${munRows.map(([m, v]) => `<tr><td>${m}</td><td class="r">${v}</td></tr>`).join('')}
      </table>` : ''}

      <h3>Distribuição por mês</h3>
      <table><tr><th>Mês</th><th class="r">Focos</th></tr>
        ${mesRows.map(([k, v]) => `<tr><td>${rotuloMes(k)}</td><td class="r">${v}</td></tr>`).join('')}
        <tr><td><b>Total</b></td><td class="r"><b>${total}</b></td></tr>
      </table>

      <div class="assinatura">
        <div class="linha">
          <div class="nome">Rêumano Nery da Silva</div>
          <div class="cargo">Chefe do Setor de Vistoria — SEMDECP</div>
          <div class="cargo">Tefé/AM, ${dataHoje}</div>
        </div>
      </div>

      <p class="rodape">Fonte: detecção por satélite (INPE / Programa Queimadas), coletada automaticamente todos os dias pelo SAD — Sentinela Defesa Civil. Os números podem ser subestimados em dias de forte nebulosidade. Documento gerado para subsídio ao Plano de Contingência.</p>
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
        <div className="flex gap-2 items-center flex-wrap">
          <select value={filtroMun} onChange={e => setFiltroMun(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-btn/20"
            title="Filtrar por município">
            <option value="todos">Todos os municípios</option>
            {municipios.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
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
            Ainda não há focos gravados. A coleta automática do INPE roda todo dia de manhã — os dados aparecem aqui a partir da próxima execução.
          </p>
        ) : (
          <div className="space-y-1.5">
            {linhas.map(l => {
              const pico = l.valor === maxVal
              return (
              <div key={l.ordem} className="flex items-center gap-2">
                <div className={`w-20 text-xs text-right shrink-0 ${pico ? 'text-error-expired font-bold' : 'text-text-secondary'}`}>{l.label}</div>
                <div className="flex-1 bg-gray-100 rounded h-6 relative overflow-hidden">
                  <div className={`h-full rounded flex items-center justify-end pr-2 ${pico ? 'bg-error-expired' : 'bg-error-expired/70'}`}
                    style={{ width: `${Math.max(6, (l.valor / maxVal) * 100)}%` }}>
                    <span className="text-xs font-bold text-white">{l.valor}</span>
                  </div>
                </div>
                {pico && <span className="text-[10px] font-bold text-error-expired shrink-0">maior</span>}
              </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-text-secondary mt-2 shrink-0">
        Coletado automaticamente do INPE todos os dias. Dados de detecção por satélite — podem ser subestimados em dias nublados.
      </p>
    </div>
  )
}
