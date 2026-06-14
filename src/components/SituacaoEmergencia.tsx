import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type Ocorrencia = {
  id: string
  protocolo: string | null
  documento_url: string | null
  endereco: string | null
  bairro: string | null
  data_vistoria: string | null
  tipificacao: string | null
  tipificacao_outro: string | null
  nivel_risco: string | null
  pessoas_afetadas: number | null
  familias_afetadas: number | null
  situacao_imovel: string | null
  descricao_situacao: string | null
}

const fmtData = (s: string | null) => {
  if (!s) return '-'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s
}
const labelTipo = (o: Ocorrencia) =>
  o.tipificacao === 'Outros' && o.tipificacao_outro ? o.tipificacao_outro : (o.tipificacao || '—')
const esc = (s: any) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const SituacaoEmergencia: React.FC = () => {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todas')
  const [filtroRisco, setFiltroRisco] = useState('Todos')

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('ocorrencias')
        .select('id, protocolo, documento_url, endereco, bairro, data_vistoria, tipificacao, tipificacao_outro, nivel_risco, pessoas_afetadas, familias_afetadas, situacao_imovel, descricao_situacao')
        .order('data_vistoria', { ascending: false })
      if (error) { setErro(error.message); setLoading(false); return }
      setOcorrencias((data as Ocorrencia[]) || [])
      setLoading(false)
    })()
  }, [])

  const filtradas = useMemo(() => ocorrencias.filter(o => {
    if (dataInicio && (!o.data_vistoria || o.data_vistoria < dataInicio)) return false
    if (dataFim && (!o.data_vistoria || o.data_vistoria > dataFim)) return false
    if (filtroTipo !== 'Todas' && o.tipificacao !== filtroTipo) return false
    if (filtroRisco !== 'Todos' && o.nivel_risco !== filtroRisco) return false
    return true
  }), [ocorrencias, dataInicio, dataFim, filtroTipo, filtroRisco])

  const totais = useMemo(() => {
    let pessoas = 0, familias = 0
    const bairros = new Set<string>()
    for (const o of filtradas) {
      pessoas += o.pessoas_afetadas || 0
      familias += o.familias_afetadas || 0
      if (o.bairro) bairros.add(o.bairro)
    }
    return { ocorrencias: filtradas.length, pessoas, familias, bairros: bairros.size }
  }, [filtradas])

  const porBairro = useMemo(() => {
    const m = new Map<string, { bairro: string; oc: number; pessoas: number; familias: number }>()
    for (const o of filtradas) {
      const b = o.bairro || '(sem bairro)'
      const e = m.get(b) || { bairro: b, oc: 0, pessoas: 0, familias: 0 }
      e.oc++; e.pessoas += o.pessoas_afetadas || 0; e.familias += o.familias_afetadas || 0
      m.set(b, e)
    }
    return Array.from(m.values()).sort((a, b) => b.pessoas - a.pessoas)
  }, [filtradas])

  const porTipo = useMemo(() => {
    const m = new Map<string, { tipo: string; oc: number; pessoas: number; familias: number }>()
    for (const o of filtradas) {
      const t = labelTipo(o)
      const e = m.get(t) || { tipo: t, oc: 0, pessoas: 0, familias: 0 }
      e.oc++; e.pessoas += o.pessoas_afetadas || 0; e.familias += o.familias_afetadas || 0
      m.set(t, e)
    }
    return Array.from(m.values()).sort((a, b) => b.oc - a.oc)
  }, [filtradas])

  const tipos = Array.from(new Set(ocorrencias.map(o => o.tipificacao).filter(Boolean))) as string[]
  const riscos = ['Muito Alto', 'Alto', 'Médio', 'Baixo']

  const imprimir = () => {
    const periodo = (dataInicio || dataFim)
      ? `Período: ${dataInicio ? fmtData(dataInicio) : 'início'} a ${dataFim ? fmtData(dataFim) : 'hoje'}`
      : 'Período: todas as datas'
    const tr = (cells: string[]) => `<tr>${cells.map((c, i) =>
      `<td style="${i === 0 ? '' : 'text-align:center'}">${c}</td>`).join('')}</tr>`
    const linhasBairro = porBairro.map(b => tr([esc(b.bairro), String(b.oc), String(b.pessoas), String(b.familias)])).join('')
    const linhasTipo = porTipo.map(t => tr([esc(t.tipo), String(t.oc), String(t.pessoas), String(t.familias)])).join('')
    const linhasDet = filtradas.map(o => tr([
      esc(fmtData(o.data_vistoria)), esc(o.protocolo || '-'), esc(o.bairro || '-'),
      esc(o.endereco || '-'), esc(labelTipo(o)), esc(o.nivel_risco || '-'),
      String(o.pessoas_afetadas || 0), String(o.familias_afetadas || 0),
    ])).join('')

    const html = `<!doctype html><html lang="pt-br"><head><meta charset="utf-8">
      <title>Relatório de Situação de Emergência</title>
      <style>
        body{font-family:'Times New Roman',serif;color:#000;margin:25mm;font-size:12pt;line-height:1.4;}
        h1{font-size:13pt;text-align:center;margin:0;}
        .sub{text-align:center;font-size:11pt;margin:0;}
        .titulo{text-align:center;font-weight:bold;margin:14px 0 2px;}
        h2{font-size:12pt;margin:22px 0 4px;border-bottom:1px solid #000;padding-bottom:2px;}
        ul{margin:6px 0;} li{margin:2px 0;}
        table{width:100%;border-collapse:collapse;margin-top:6px;font-size:10pt;}
        th,td{border:1px solid #000;padding:4px 6px;text-align:left;}
        th{font-weight:bold;}
        @media print{body{margin:20mm;}}
      </style></head><body>
      <h1>SECRETARIA MUNICIPAL DE DEFESA CIVIL E PATRIMONIAL — SEMDECP</h1>
      <p class="sub">Tefé — AM</p>
      <p class="titulo">RELATÓRIO DE CONSOLIDAÇÃO — SITUAÇÃO DE EMERGÊNCIA</p>
      <p class="sub">${esc(periodo)} &middot; Emitido em ${fmtData(new Date().toISOString())}</p>

      <h2>Resumo Geral</h2>
      <ul>
        <li>Total de ocorrências: <strong>${totais.ocorrencias}</strong></li>
        <li>Bairros / comunidades atingidos: <strong>${totais.bairros}</strong></li>
        <li>Pessoas afetadas: <strong>${totais.pessoas}</strong></li>
        <li>Famílias afetadas: <strong>${totais.familias}</strong></li>
      </ul>

      <h2>Por Bairro / Comunidade</h2>
      <table><thead><tr><th>Bairro / Comunidade</th><th>Ocorrências</th><th>Pessoas</th><th>Famílias</th></tr></thead>
      <tbody>${linhasBairro || '<tr><td colspan="4">Sem registros no período.</td></tr>'}</tbody></table>

      <h2>Por Tipo de Ocorrência</h2>
      <table><thead><tr><th>Tipo</th><th>Ocorrências</th><th>Pessoas</th><th>Famílias</th></tr></thead>
      <tbody>${linhasTipo || '<tr><td colspan="4">Sem registros no período.</td></tr>'}</tbody></table>

      <h2>Ocorrências Detalhadas</h2>
      <table><thead><tr><th>Data</th><th>Protocolo</th><th>Bairro</th><th>Endereço</th><th>Tipo</th><th>Risco</th><th>Pess.</th><th>Fam.</th></tr></thead>
      <tbody>${linhasDet || '<tr><td colspan="8">Sem registros no período.</td></tr>'}</tbody></table>
    </body></html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 400) }
    else alert('Permita pop-ups para gerar o relatório.')
  }

  const Card: React.FC<{ valor: number | string; rotulo: string }> = ({ valor, rotulo }) => (
    <div className="bg-surface-card rounded-xl p-4 border border-gray-100">
      <div className="text-2xl font-bold text-text-main">{valor}</div>
      <div className="text-xs text-text-secondary uppercase font-bold mt-1">{rotulo}</div>
    </div>
  )

  if (loading) return <div className="h-full flex items-center justify-center text-text-secondary">Carregando…</div>
  if (erro) return <div className="h-full flex items-center justify-center text-error-expired p-4">Erro: {erro}</div>

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 bg-surface-card rounded-xl p-4 border border-gray-100">
        <div>
          <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Data início</label>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
            className="p-2 bg-white border border-gray-200 rounded text-sm outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Data fim</label>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
            className="p-2 bg-white border border-gray-200 rounded text-sm outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Tipo</label>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="p-2 bg-white border border-gray-200 rounded text-sm outline-none">
            <option value="Todas">Todas</option>
            {tipos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Nível de risco</label>
          <select value={filtroRisco} onChange={e => setFiltroRisco(e.target.value)}
            className="p-2 bg-white border border-gray-200 rounded text-sm outline-none">
            <option value="Todos">Todos</option>
            {riscos.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <button onClick={imprimir}
          className="ml-auto px-4 py-2 bg-primary-btn text-white rounded font-bold text-sm hover:opacity-90">
          Imprimir relatório
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card valor={totais.ocorrencias} rotulo="Ocorrências" />
        <Card valor={totais.bairros} rotulo="Bairros atingidos" />
        <Card valor={totais.pessoas} rotulo="Pessoas afetadas" />
        <Card valor={totais.familias} rotulo="Famílias afetadas" />
      </div>

      {/* Por bairro */}
      <Secao titulo="Por Bairro / Comunidade">
        <Tabela
          cabecalho={['Bairro / Comunidade', 'Ocorrências', 'Pessoas', 'Famílias']}
          linhas={porBairro.map(b => [b.bairro, b.oc, b.pessoas, b.familias])}
        />
      </Secao>

      {/* Por tipo */}
      <Secao titulo="Por Tipo de Ocorrência">
        <Tabela
          cabecalho={['Tipo', 'Ocorrências', 'Pessoas', 'Famílias']}
          linhas={porTipo.map(t => [t.tipo, t.oc, t.pessoas, t.familias])}
        />
      </Secao>

      {/* Detalhe */}
      <Secao titulo={`Ocorrências Detalhadas (${filtradas.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-secondary border-b border-gray-200">
                <th className="py-2 pr-3 font-bold">Data</th>
                <th className="py-2 pr-3 font-bold">Protocolo</th>
                <th className="py-2 pr-3 font-bold">Bairro</th>
                <th className="py-2 pr-3 font-bold">Endereço</th>
                <th className="py-2 pr-3 font-bold">Tipo</th>
                <th className="py-2 pr-3 font-bold">Risco</th>
                <th className="py-2 pr-3 font-bold text-center">Pess.</th>
                <th className="py-2 pr-3 font-bold text-center">Fam.</th>
                <th className="py-2 font-bold">PDF</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(o => (
                <tr key={o.id} className="border-b border-gray-50 text-text-main">
                  <td className="py-2 pr-3 whitespace-nowrap">{fmtData(o.data_vistoria)}</td>
                  <td className="py-2 pr-3">{o.protocolo || '-'}</td>
                  <td className="py-2 pr-3">{o.bairro || '-'}</td>
                  <td className="py-2 pr-3">{o.endereco || '-'}</td>
                  <td className="py-2 pr-3">{labelTipo(o)}</td>
                  <td className="py-2 pr-3">{o.nivel_risco || '-'}</td>
                  <td className="py-2 pr-3 text-center">{o.pessoas_afetadas || 0}</td>
                  <td className="py-2 pr-3 text-center">{o.familias_afetadas || 0}</td>
                  <td className="py-2">
                    {o.documento_url
                      ? <a href={o.documento_url} target="_blank" rel="noopener" className="text-primary-btn underline">abrir</a>
                      : '-'}
                  </td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr><td colSpan={9} className="py-4 text-center text-text-secondary">Nenhuma ocorrência no período/filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Secao>
    </div>
  )
}

const Secao: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <div className="bg-surface-card rounded-xl p-4 border border-gray-100">
    <h3 className="font-bold text-text-main mb-2">{titulo}</h3>
    {children}
  </div>
)

const Tabela: React.FC<{ cabecalho: string[]; linhas: (string | number)[][] }> = ({ cabecalho, linhas }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-text-secondary border-b border-gray-200">
          {cabecalho.map((c, i) => (
            <th key={i} className={`py-2 pr-3 font-bold ${i === 0 ? '' : 'text-center'}`}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((l, ri) => (
          <tr key={ri} className="border-b border-gray-50 text-text-main">
            {l.map((cel, ci) => (
              <td key={ci} className={`py-2 pr-3 ${ci === 0 ? '' : 'text-center'}`}>{cel}</td>
            ))}
          </tr>
        ))}
        {linhas.length === 0 && (
          <tr><td colSpan={cabecalho.length} className="py-3 text-center text-text-secondary">Sem registros.</td></tr>
        )}
      </tbody>
    </table>
  </div>
)
