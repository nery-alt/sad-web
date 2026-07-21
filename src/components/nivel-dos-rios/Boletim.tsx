import React, { useState } from 'react'
import { Printer, Radio } from 'lucide-react'
import type { Estacao, RegistroNivel, RegistroChuva, RegistroUmidade, Situacao, Tendencia } from './types'
import { SITUACAO_LABEL, TENDENCIA_LABEL, dataBR } from './types'

interface Props {
  estacoes: Estacao[]
  registrosNivel: RegistroNivel[]
  registrosChuva: RegistroChuva[]
  registrosUmidade: RegistroUmidade[]
}

const corSituacao = (s: Situacao | null | undefined) =>
  s === 'emergencia' ? '#DC2626' : s === 'alerta' ? '#D97706' : s === 'atencao' ? '#CA8A04' : s === 'normal' ? '#16A34A' : '#6B7280'

function narrativa(nome: string, situacao: Situacao | null | undefined, tendencia: Tendencia | null | undefined, variacaoCm: number | null): string {
  const sit = situacao ? SITUACAO_LABEL[situacao].toLowerCase() : 'sem situação calculada (limiares não configurados)'
  const tend = tendencia ? TENDENCIA_LABEL[tendencia].toLowerCase() : null
  let frase = `A estação ${nome} registra situação ${sit}`
  if (tend) frase += `, com quadro de ${tend}`
  if (variacaoCm !== null) {
    if (variacaoCm > 0) frase += `. O nível subiu ${Math.abs(variacaoCm)} cm em relação à leitura anterior`
    else if (variacaoCm < 0) frase += `. O nível baixou ${Math.abs(variacaoCm)} cm em relação à leitura anterior`
    else frase += '. O nível manteve-se estável em relação à leitura anterior'
  }
  return frase + '.'
}

export const Boletim: React.FC<Props> = ({ estacoes, registrosNivel, registrosChuva, registrosUmidade }) => {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set(estacoes.filter(e => e.ativa).map(e => e.id)))

  const toggle = (id: string) => setSelecionadas(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const todasMarcadas = estacoes.length > 0 && estacoes.every(e => selecionadas.has(e.id))
  const toggleTodas = () => setSelecionadas(todasMarcadas ? new Set() : new Set(estacoes.map(e => e.id)))

  const nivelDe = (id: string) => registrosNivel.filter(r => r.estacao_id === id).sort((a, b) => a.data.localeCompare(b.data))
  const chuvaDe = (id: string) => registrosChuva.filter(r => r.estacao_id === id).sort((a, b) => a.data.localeCompare(b.data))
  const umidadeDe = (id: string) => registrosUmidade.filter(r => r.estacao_id === id).sort((a, b) => a.data.localeCompare(b.data))

  // Máx/mín histórico no mesmo dia-calendário (mês/dia), considerando toda a série ANA importada.
  const comparativoHistorico = (id: string, dataRef: string) => {
    const [, mes, dia] = dataRef.split('-')
    const doDia = registrosNivel.filter(r => r.estacao_id === id && r.data.slice(5) === `${mes}-${dia}`)
    if (doDia.length === 0) return null
    let max = doDia[0], min = doDia[0]
    for (const r of doDia) { if (r.cota_cm > max.cota_cm) max = r; if (r.cota_cm < min.cota_cm) min = r }
    return { max, min, anos: doDia.length }
  }

  const gerar = () => {
    const lista = estacoes.filter(e => selecionadas.has(e.id))
    if (lista.length === 0) return
    const horaGeracao = new Date().toLocaleString('pt-BR')

    const blocos = lista.map(e => {
      const nivel = nivelDe(e.id)
      const ultimo = nivel[nivel.length - 1]
      const anterior = nivel[nivel.length - 2]
      const variacao = ultimo && anterior ? ultimo.cota_cm - anterior.cota_cm : null
      const situacao = ultimo?.situacao as Situacao | undefined
      const cor = corSituacao(situacao)
      const comp = ultimo ? comparativoHistorico(e.id, ultimo.data) : null
      const chuva = chuvaDe(e.id).slice(-5).reverse()
      const umid = umidadeDe(e.id).slice(-5).reverse()

      return `
        <div class="estacao">
          <div class="cabecalho-estacao">
            <div>
              <div class="nome-estacao">${e.nome}</div>
              <div class="sub">${e.rio} — ${e.localidade}</div>
            </div>
            ${situacao ? `<div class="badge" style="background:${cor}1a;color:${cor}">${SITUACAO_LABEL[situacao].toUpperCase()}</div>` : '<div class="badge" style="background:#f3f4f6;color:#6b7280">SEM LIMIARES</div>'}
          </div>

          ${!ultimo ? '<p class="vazio">Sem leituras registradas para esta estação.</p>' : `
          <table class="resumo">
            <tr><td>Última leitura</td><td>${(ultimo.cota_cm / 100).toFixed(2)} m — ${dataBR(ultimo.data)} (fonte: ${ultimo.fonte})</td></tr>
            <tr><td>Variação (leitura anterior)</td><td>${variacao === null ? '—' : (variacao > 0 ? '+' : '') + variacao + ' cm'}</td></tr>
            ${ultimo.situacao_tendencia ? `<tr><td>Tendência observada</td><td>${TENDENCIA_LABEL[ultimo.situacao_tendencia]}</td></tr>` : ''}
            ${e.cota_atencao_cm != null ? `<tr><td>Cota de Atenção</td><td>${(e.cota_atencao_cm / 100).toFixed(2)} m</td></tr>` : ''}
            ${e.cota_alerta_cm != null ? `<tr><td>Cota de Alerta</td><td>${(e.cota_alerta_cm / 100).toFixed(2)} m</td></tr>` : ''}
            ${e.cota_emergencia_cm != null ? `<tr><td>Cota de Emergência</td><td>${(e.cota_emergencia_cm / 100).toFixed(2)} m</td></tr>` : ''}
          </table>

          <p class="narrativa">${narrativa(e.nome, situacao, ultimo.situacao_tendencia, variacao)}</p>

          ${comp ? `
          <p class="legenda-comparativo">Comparação histórica para o dia ${dataBR(ultimo.data).slice(0, 5)} (${comp.anos} ano(s) com registro na série importada):</p>
          <table class="resumo">
            <tr><td>Máxima já registrada nesse dia</td><td>${(comp.max.cota_cm / 100).toFixed(2)} m — ${dataBR(comp.max.data)}</td></tr>
            <tr><td>Mínima já registrada nesse dia</td><td>${(comp.min.cota_cm / 100).toFixed(2)} m — ${dataBR(comp.min.data)}</td></tr>
          </table>` : ''}
          `}

          ${(chuva.length > 0 || umid.length > 0) ? `
          <div class="clima">
            ${chuva.length > 0 ? `<div><b>Chuva (últimos registros)</b><br>${chuva.map(c => `${dataBR(c.data)}: ${c.chuva_mm} mm`).join(' · ')}</div>` : ''}
            ${umid.length > 0 ? `<div><b>Umidade relativa (últimos registros)</b><br>${umid.map(u => `${dataBR(u.data)}: ${u.umidade_pct}%`).join(' · ')}</div>` : ''}
          </div>` : ''}
        </div>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Boletim de Monitoramento — Nível dos Rios</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:12px;margin:24px;color:#111}
        h1{font-size:18px;margin:0 0 2px}
        h2{font-size:12px;font-weight:normal;color:#555;margin:0 0 4px}
        .data{font-size:11px;color:#777;margin-bottom:18px}
        .estacao{border:1px solid #ccc;border-radius:8px;padding:14px 16px;margin-bottom:14px;page-break-inside:avoid}
        .cabecalho-estacao{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
        .nome-estacao{font-size:15px;font-weight:bold}
        .sub{font-size:11px;color:#666}
        .badge{font-size:10px;font-weight:bold;padding:3px 8px;border-radius:4px}
        .resumo{width:100%;border-collapse:collapse;margin:6px 0}
        .resumo td{padding:3px 0;border-bottom:1px solid #eee}
        .resumo td:first-child{color:#555;width:60%}
        .resumo td:last-child{text-align:right;font-weight:600}
        .narrativa{margin:8px 0;line-height:1.5;font-style:italic;color:#333}
        .legenda-comparativo{font-size:11px;color:#666;margin-top:8px}
        .clima{display:flex;gap:24px;font-size:11px;color:#444;margin-top:8px;border-top:1px solid #eee;padding-top:8px}
        .vazio{font-size:11px;color:#888;font-style:italic}
        .rodape{margin-top:20px;font-size:10px;color:#999}
        @media print{body{margin:12px}}
      </style>
      </head><body>
      <h1>Boletim de Monitoramento — Nível dos Rios</h1>
      <h2>Secretaria Municipal de Defesa Civil e Patrimonial — SEMDECP — Tefé/AM</h2>
      <div class="data">Gerado em ${horaGeracao} · ${lista.length} estação(ões)</div>
      ${blocos}
      <p class="rodape">Cotas de atenção/alerta/emergência são valores editáveis, definidos por temporada. Comparações históricas usam apenas os anos com dado importado para a estação (nem toda estação tem série ANA completa). Documento gerado automaticamente pelo SAD — Sentinela Defesa Civil.</p>
      </body></html>`

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => w.print(), 500)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-3 shrink-0">
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input type="checkbox" checked={todasMarcadas} onChange={toggleTodas} /> Selecionar todas ({estacoes.length})
        </label>
        <button onClick={gerar} disabled={selecionadas.size === 0}
          className="flex items-center gap-2 bg-primary-btn text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 text-sm disabled:opacity-50">
          <Printer size={18} /> Gerar Boletim ({selecionadas.size})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {estacoes.length === 0 ? (
          <p className="text-text-secondary text-sm italic">Cadastre uma estação para poder gerar o boletim.</p>
        ) : estacoes.map(e => {
          const nivel = nivelDe(e.id)
          const ultimo = nivel[nivel.length - 1]
          return (
            <label key={e.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={selecionadas.has(e.id)} onChange={() => toggle(e.id)} />
              <Radio size={14} className="shrink-0 text-text-secondary" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm">{e.nome}</p>
                <p className="text-xs text-text-secondary">
                  {ultimo ? `Última leitura: ${(ultimo.cota_cm / 100).toFixed(2)} m em ${dataBR(ultimo.data)}` : 'Sem leituras registradas'}
                </p>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
