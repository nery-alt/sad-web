import React, { useMemo, useState } from 'react'
import { Clock, CheckSquare, Calendar, AlertCircle, Bell, FileText, MapPin, Users, TrendingUp, Inbox, BarChart2, Printer, X } from 'lucide-react'
import type { Protocolo, Tarefa, AgendaItem, Pessoa, DocumentoRecebido } from '../types'

interface DashboardProps {
  protocolos: Protocolo[]
  tarefas: Tarefa[]
  agenda: AgendaItem[]
  pessoas: Pessoa[]
  documentos: DocumentoRecebido[]
  onSelectProtocolo: (protocolo: Protocolo) => void
  onNavigate: (tab: string) => void
  onNavigateToTarefa: (tarefa: Tarefa) => void
  formatDate: (dateStr: string) => string
  getPrazoStatus: (prazo: string) => { label: string; color: string } | null
}

type Periodo = 'mes_atual' | 'mes_anterior' | '3_meses' | '6_meses' | 'ano'

function getPeriodoDatas(periodo: Periodo): { inicio: Date; fim: Date; label: string } {
  const now = new Date()
  const ano = now.getFullYear()
  const mes = now.getMonth()
  switch (periodo) {
    case 'mes_atual':
      return { inicio: new Date(ano, mes, 1), fim: new Date(ano, mes + 1, 0), label: now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) }
    case 'mes_anterior': {
      const m = mes === 0 ? 11 : mes - 1
      const a = mes === 0 ? ano - 1 : ano
      return { inicio: new Date(a, m, 1), fim: new Date(a, m + 1, 0), label: new Date(a, m, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) }
    }
    case '3_meses':
      return { inicio: new Date(ano, mes - 2, 1), fim: new Date(ano, mes + 1, 0), label: 'Últimos 3 meses' }
    case '6_meses':
      return { inicio: new Date(ano, mes - 5, 1), fim: new Date(ano, mes + 1, 0), label: 'Últimos 6 meses' }
    case 'ano':
      return { inicio: new Date(ano, 0, 1), fim: new Date(ano, 11, 31), label: `Ano ${ano}` }
  }
}

type PessoaAtendida = {
  pessoa: Pessoa
  ocorrencias: Protocolo[]
}

function gerarRelatorioHTML(dados: {
  label: string
  totalProtocolos: number
  abertos: number
  emAndamento: number
  concluidos: number
  laudosSentinela: number
  pessoasRisco: number
  pessoasUrgentes: number
  porBairro: { bairro: string; total: number }[]
  porAssunto: { assunto: string; total: number }[]
  pessoasRiscoLista: Pessoa[]
  pessoasAtendidas: PessoaAtendida[]
  protocolosParados: number
}) {
  const hoje = new Date().toLocaleDateString('pt-BR')

  const bairroRows = dados.porBairro.map((b, i) =>
    `<tr><td>${i + 1}</td><td>${b.bairro}</td><td><strong>${b.total}</strong></td></tr>`
  ).join('')

  const assuntoRows = dados.porAssunto.map((a, i) =>
    `<tr><td>${i + 1}</td><td>${a.assunto}</td><td><strong>${a.total}</strong></td></tr>`
  ).join('')

  const riscoRows = dados.pessoasRiscoLista.map(p =>
    `<tr><td>${p.nome}</td><td>${[p.endereco, p.bairro].filter(Boolean).join(', ')}</td><td>${p.prioridade || '—'}</td><td>${p.telefone || '—'}</td></tr>`
  ).join('')

  const cadastroRows = dados.pessoasAtendidas.map((pa, i) => {
    const endCompleto = [pa.pessoa.endereco, pa.pessoa.bairro, pa.pessoa.municipio].filter(Boolean).join(', ')
    const ocorrencias = pa.ocorrencias.map(p => `${p.numero} — ${p.assunto}`).join('<br>')
    return `<tr>
      <td>${i + 1}</td>
      <td><strong>${pa.pessoa.nome}</strong></td>
      <td>${pa.pessoa.cpf || '—'}</td>
      <td>${pa.pessoa.num_pessoas_familia || '—'}</td>
      <td>${endCompleto || '—'}</td>
      <td>${ocorrencias || '—'}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Relatório Gerencial — ${dados.label}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 20px; }
    .header { border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { font-size: 15px; font-weight: bold; }
    .header h2 { font-size: 12px; color: #555; margin-top: 4px; }
    .header .meta { font-size: 10px; color: #777; margin-top: 6px; }
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
    .card { border: 1px solid #ccc; border-radius: 6px; padding: 10px 12px; }
    .card .label { font-size: 9px; color: #555; text-transform: uppercase; font-weight: bold; }
    .card .value { font-size: 22px; font-weight: bold; margin-top: 4px; }
    .card.azul .value { color: #1a56db; }
    .card.verde .value { color: #057a55; }
    .card.laranja .value { color: #c27803; }
    .card.vermelho .value { color: #c81e1e; }
    section { margin-bottom: 18px; page-break-inside: avoid; }
    section h3 { font-size: 12px; font-weight: bold; border-left: 3px solid #1a56db; padding-left: 8px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #f3f4f6; text-align: left; padding: 5px 7px; font-weight: bold; border-bottom: 1px solid #ddd; }
    td { padding: 4px 7px; border-bottom: 1px solid #eee; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .cadastro-table td:nth-child(6) { font-size: 9px; color: #444; }
    .assinatura { margin-top: 40px; text-align: center; page-break-inside: avoid; }
    .assinatura .linha { border-top: 1px solid #333; width: 280px; margin: 0 auto 6px; }
    .assinatura p { font-size: 11px; }
    @media print { body { padding: 10px; } section { page-break-inside: avoid; } }
  </style>
  </head><body>
  <div class="header">
    <h1>Secretaria Municipal de Defesa Civil e Patrimonial — SEMDECP</h1>
    <h2>Relatório Gerencial de Vistorias — ${dados.label}</h2>
    <p class="meta">Gerado em: ${hoje} &nbsp;|&nbsp; Setor de Vistoria</p>
  </div>

  <div class="cards">
    <div class="card azul"><div class="label">Total de Protocolos</div><div class="value">${dados.totalProtocolos}</div></div>
    <div class="card verde"><div class="label">Concluídos</div><div class="value">${dados.concluidos}</div></div>
    <div class="card laranja"><div class="label">Em Aberto / Andamento</div><div class="value">${dados.abertos + dados.emAndamento}</div></div>
    <div class="card vermelho"><div class="label">Pessoas em Área de Risco</div><div class="value">${dados.pessoasRisco}</div></div>
  </div>

  <section>
    <h3>Resumo Operacional</h3>
    <table>
      <tr><th>Indicador</th><th>Valor</th></tr>
      <tr><td>Protocolos abertos</td><td>${dados.abertos}</td></tr>
      <tr><td>Protocolos em andamento</td><td>${dados.emAndamento}</td></tr>
      <tr><td>Protocolos concluídos</td><td>${dados.concluidos}</td></tr>
      <tr><td>Laudos recebidos do Sentinela DC</td><td>${dados.laudosSentinela}</td></tr>
      <tr><td>Protocolos parados (+7 dias sem movimentação)</td><td>${dados.protocolosParados}</td></tr>
      <tr><td>Pessoas com prioridade Alta/Emergencial</td><td>${dados.pessoasUrgentes}</td></tr>
    </table>
  </section>

  ${dados.porAssunto.length > 0 ? `
  <section>
    <h3>Protocolos por Tipo de Ocorrência</h3>
    <table>
      <tr><th>#</th><th>Tipo / Assunto</th><th>Qtd</th></tr>
      ${assuntoRows}
    </table>
  </section>` : ''}

  ${dados.porBairro.length > 0 ? `
  <section>
    <h3>Protocolos por Bairro / Comunidade</h3>
    <table>
      <tr><th>#</th><th>Bairro</th><th>Qtd</th></tr>
      ${bairroRows}
    </table>
  </section>` : ''}

  ${dados.pessoasAtendidas.length > 0 ? `
  <section>
    <h3>Cadastro de Pessoas Atendidas (${dados.pessoasAtendidas.length})</h3>
    <table class="cadastro-table">
      <tr><th>#</th><th>Nome</th><th>CPF</th><th>Nº Família</th><th>Endereço</th><th>Ocorrências</th></tr>
      ${cadastroRows}
    </table>
  </section>` : ''}

  ${dados.pessoasRiscoLista.length > 0 ? `
  <section>
    <h3>Pessoas em Área de Risco</h3>
    <table>
      <tr><th>Nome</th><th>Endereço</th><th>Prioridade</th><th>Telefone</th></tr>
      ${riscoRows}
    </table>
  </section>` : ''}

  <div class="assinatura">
    <div class="linha"></div>
    <p><strong>Reumano Nery da Silva</strong></p>
    <p>Coordenador de Defesa Civil — Chefe do Setor de Vistoria</p>
    <p>SEMDECP — Prefeitura Municipal de Tefé/AM</p>
  </div>
  </body></html>`
}

export const Dashboard: React.FC<DashboardProps> = ({
  protocolos, tarefas, agenda, pessoas, documentos,
  onSelectProtocolo, onNavigate, onNavigateToTarefa, formatDate, getPrazoStatus,
}) => {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const [relatorioOpen, setRelatorioOpen] = useState(false)
  const [periodo, setPeriodo] = useState<Periodo>('mes_atual')

  const periodoDatas = useMemo(() => getPeriodoDatas(periodo), [periodo])

  const laudosSentinela = useMemo(() =>
    documentos.filter(d => (d.caminho || '').includes('/sentinela/'))
  , [documentos])

  const inicioSemana = useMemo(() => {
    const d = new Date(now); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d
  }, [])

  const laudosSemana = useMemo(() =>
    laudosSentinela.filter(d => d.criado_em && new Date(d.criado_em) >= inicioSemana)
  , [laudosSentinela, inicioSemana])

  const pessoasRisco = useMemo(() => pessoas.filter(p => p.area_risco), [pessoas])
  const pessoasUrgentes = useMemo(() => pessoas.filter(p => p.prioridade === 'Alta' || p.prioridade === 'Emergencial'), [pessoas])

  const stats = useMemo(() => ({
    abertos: protocolos.filter(p => p.status === 'aberto' || p.status === 'em_andamento').length,
    vencendo: protocolos.filter(p => { const s = getPrazoStatus(p.prazo); return s?.label === 'Vencendo' && p.status !== 'concluido' }).length,
    vencidos: protocolos.filter(p => { const s = getPrazoStatus(p.prazo); return s?.label === 'Vencido' && p.status !== 'concluido' }).length,
    concluidosMes: protocolos.filter(p => { const d = new Date(p.atualizado_em); return p.status === 'concluido' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() }).length,
  }), [protocolos, getPrazoStatus, now])

  const protocolosParados = useMemo(() =>
    protocolos.filter(p => { if (p.status === 'concluido') return false; const diffDias = Math.floor((now.getTime() - new Date(p.atualizado_em).getTime()) / 86400000); return diffDias >= 7 })
  , [protocolos, now])

  const dadosRelatorio = useMemo(() => {
    const { inicio, fim, label } = periodoDatas
    const filtrados = protocolos.filter(p => {
      const d = new Date(p.criado_em)
      return d >= inicio && d <= fim
    })
    const laudosPeriodo = laudosSentinela.filter(d => {
      if (!d.criado_em) return false
      const d2 = new Date(d.criado_em)
      return d2 >= inicio && d2 <= fim
    })

    // Por bairro
    const bairroMap: Record<string, number> = {}
    filtrados.forEach(p => {
      const pessoa = pessoas.find(pe => pe.nome === p.pessoa_nome)
      const bairro = pessoa?.bairro || 'Não informado'
      bairroMap[bairro] = (bairroMap[bairro] || 0) + 1
    })
    const porBairro = Object.entries(bairroMap)
      .map(([bairro, total]) => ({ bairro, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    // Por assunto
    const assuntoMap: Record<string, number> = {}
    filtrados.forEach(p => {
      const assunto = p.assunto || 'Não informado'
      assuntoMap[assunto] = (assuntoMap[assunto] || 0) + 1
    })
    const porAssunto = Object.entries(assuntoMap)
      .map(([assunto, total]) => ({ assunto, total }))
      .sort((a, b) => b.total - a.total)

    // Pessoas atendidas no período — agrupadas por pessoa com suas ocorrências
    const pessoaMap: Record<number, PessoaAtendida> = {}
    filtrados.forEach(pr => {
      const pessoa = pessoas.find(pe => pe.nome === pr.pessoa_nome)
      if (!pessoa || !pessoa.id) return
      if (!pessoaMap[pessoa.id]) {
        pessoaMap[pessoa.id] = { pessoa, ocorrencias: [] }
      }
      pessoaMap[pessoa.id].ocorrencias.push(pr)
    })
    const pessoasAtendidas = Object.values(pessoaMap)
      .sort((a, b) => a.pessoa.nome.localeCompare(b.pessoa.nome))

    return {
      label,
      totalProtocolos: filtrados.length,
      abertos: filtrados.filter(p => p.status === 'aberto').length,
      emAndamento: filtrados.filter(p => p.status === 'em_andamento').length,
      concluidos: filtrados.filter(p => p.status === 'concluido').length,
      laudosSentinela: laudosPeriodo.length,
      pessoasRisco: pessoasRisco.length,
      pessoasUrgentes: pessoasUrgentes.length,
      porBairro,
      porAssunto,
      pessoasRiscoLista: pessoasRisco,
      pessoasAtendidas,
      protocolosParados: protocolosParados.length,
    }
  }, [periodoDatas, protocolos, laudosSentinela, pessoas, pessoasRisco, pessoasUrgentes, protocolosParados])

  const handleImprimir = () => {
    const html = gerarRelatorioHTML(dadosRelatorio)
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => w.print(), 500)
  }

  const recentes = useMemo(() => protocolos.slice(0, 6), [protocolos])
  const tarefasPendentes = useMemo(() => tarefas.filter(t => t.status !== 'concluida' && t.status !== 'arquivada').slice(0, 5), [tarefas])
  const proximosCompromissos = useMemo(() =>
    agenda.filter(a => (a.data || '').slice(0, 10) >= todayStr && !a.realizado)
      .sort((a, b) => { const da = (a.data||'').slice(0,10); const db = (b.data||'').slice(0,10); if (da !== db) return da.localeCompare(db); return (a.horario||'').localeCompare(b.horario||'') })
      .slice(0, 5)
  , [agenda, todayStr])
  const laudosRecentes = useMemo(() => laudosSentinela.slice(0, 5), [laudosSentinela])
  const isToday = (dateStr: string) => (dateStr || '').slice(0, 10) === todayStr

  const cardStats = [
    { label: 'Protocolos em aberto', value: stats.abertos, color: 'border-primary-btn', textColor: 'text-primary-btn', onClick: () => onNavigate('Protocolos') },
    { label: 'Laudos esta semana', value: laudosSemana.length, color: 'border-success', textColor: 'text-success', onClick: () => onNavigate('Documentos Recebidos') },
    { label: 'Pessoas em área de risco', value: pessoasRisco.length, color: 'border-deadline-alert', textColor: 'text-deadline-alert', onClick: () => onNavigate('Pessoas / Dossiês') },
    { label: 'Prioridade Alta/Emergencial', value: pessoasUrgentes.length, color: 'border-error-expired', textColor: 'text-error-expired', onClick: () => onNavigate('Pessoas / Dossiês') },
  ]

  return (
    <div className="p-4 h-full overflow-y-auto">
      {/* Modal Relatório */}
      {relatorioOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2"><BarChart2 size={18} className="text-primary-btn" /> Relatório Gerencial</h2>
                <p className="text-xs text-text-secondary mt-0.5">Setor de Vistoria — SEMDECP</p>
              </div>
              <button onClick={() => setRelatorioOpen(false)} className="text-text-secondary hover:text-text-main p-1"><X size={20} /></button>
            </div>

            <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-bold text-text-secondary">Período:</span>
              {([
                { value: 'mes_atual', label: 'Mês atual' },
                { value: 'mes_anterior', label: 'Mês anterior' },
                { value: '3_meses', label: 'Últimos 3 meses' },
                { value: '6_meses', label: 'Últimos 6 meses' },
                { value: 'ano', label: 'Ano atual' },
              ] as { value: Periodo; label: string }[]).map(op => (
                <button key={op.value} onClick={() => setPeriodo(op.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${periodo === op.value ? 'bg-primary-btn text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'}`}>
                  {op.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Cards resumo */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Total de Protocolos', value: dadosRelatorio.totalProtocolos, color: 'text-primary-btn' },
                  { label: 'Concluídos', value: dadosRelatorio.concluidos, color: 'text-success' },
                  { label: 'Em aberto/andamento', value: dadosRelatorio.abertos + dadosRelatorio.emAndamento, color: 'text-deadline-alert' },
                  { label: 'Laudos do Sentinela', value: dadosRelatorio.laudosSentinela, color: 'text-primary-btn' },
                ].map((c, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                    <p className="text-[10px] text-text-secondary uppercase font-bold">{c.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
                  </div>
                ))}
              </div>

              {/* Resumo operacional */}
              <div>
                <h3 className="text-sm font-bold mb-2 text-text-secondary uppercase">Resumo Operacional</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {[
                    { label: 'Protocolos abertos', value: dadosRelatorio.abertos },
                    { label: 'Protocolos em andamento', value: dadosRelatorio.emAndamento },
                    { label: 'Protocolos concluídos', value: dadosRelatorio.concluidos },
                    { label: 'Protocolos parados +7 dias', value: dadosRelatorio.protocolosParados },
                    { label: 'Pessoas em área de risco', value: dadosRelatorio.pessoasRisco },
                    { label: 'Pessoas com prioridade Alta/Emergencial', value: dadosRelatorio.pessoasUrgentes },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center px-4 py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm">{row.label}</span>
                      <span className="font-bold text-sm">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Por assunto */}
              {dadosRelatorio.porAssunto.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold mb-2 text-text-secondary uppercase">Por Tipo de Ocorrência</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {dadosRelatorio.porAssunto.map((a, i) => (
                      <div key={i} className="flex justify-between items-center px-4 py-2 border-b border-gray-100 last:border-0">
                        <span className="text-sm">{a.assunto}</span>
                        <span className="font-bold text-sm text-primary-btn">{a.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Por bairro */}
              {dadosRelatorio.porBairro.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold mb-2 text-text-secondary uppercase">Por Bairro / Comunidade</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {dadosRelatorio.porBairro.map((b, i) => (
                      <div key={i} className="flex justify-between items-center px-4 py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-secondary w-5 text-right">{i+1}.</span>
                          <span className="text-sm">{b.bairro}</span>
                        </div>
                        <span className="font-bold text-sm text-primary-btn">{b.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pessoas atendidas */}
              {dadosRelatorio.pessoasAtendidas.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold mb-2 text-text-secondary uppercase">Cadastro de Pessoas Atendidas ({dadosRelatorio.pessoasAtendidas.length})</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {dadosRelatorio.pessoasAtendidas.map((pa, i) => (
                      <div key={i} className="px-4 py-3 border-b border-gray-100 last:border-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-bold">{pa.pessoa.nome}</p>
                            <p className="text-xs text-text-secondary mt-0.5">
                              CPF: {pa.pessoa.cpf || '—'} &nbsp;·&nbsp;
                              Família: {pa.pessoa.num_pessoas_familia || '—'} pessoa(s)
                            </p>
                            <p className="text-xs text-text-secondary">{[pa.pessoa.endereco, pa.pessoa.bairro, pa.pessoa.municipio].filter(Boolean).join(', ') || '—'}</p>
                          </div>
                          <span className="text-xs bg-primary-btn/10 text-primary-btn font-bold px-2 py-0.5 rounded shrink-0 ml-2">{pa.ocorrencias.length} ocorrência(s)</span>
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {pa.ocorrencias.map(oc => (
                            <p key={oc.id} className="text-xs text-text-secondary">• {oc.numero} — {oc.assunto}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pessoas em risco */}
              {dadosRelatorio.pessoasRiscoLista.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold mb-2 text-text-secondary uppercase">Pessoas em Área de Risco</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {dadosRelatorio.pessoasRiscoLista.map((p, i) => (
                      <div key={i} className="flex justify-between items-center px-4 py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="text-sm font-bold">{p.nome}</p>
                          <p className="text-xs text-text-secondary">{[p.endereco, p.bairro].filter(Boolean).join(' · ')}</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          {p.prioridade && <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.prioridade === 'Alta' || p.prioridade === 'Emergencial' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>⚑ {p.prioridade}</span>}
                          {p.telefone && <p className="text-xs text-text-secondary mt-0.5">{p.telefone}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-between items-center">
              <p className="text-xs text-text-secondary">Período: <strong>{dadosRelatorio.label}</strong> · {dadosRelatorio.totalProtocolos} protocolo(s) · {dadosRelatorio.pessoasAtendidas.length} pessoa(s)</p>
              <button onClick={handleImprimir} className="flex items-center gap-2 bg-primary-btn text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 text-sm">
                <Printer size={16} /> Imprimir / Exportar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-bold">Painel Operacional</h1>
          <p className="text-text-secondary text-sm">Setor de Vistoria — SEMDECP</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-text-secondary font-medium hidden lg:block">
            {now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <button onClick={() => setRelatorioOpen(true)} className="flex items-center gap-2 bg-primary-btn text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 text-sm">
            <BarChart2 size={16} /> Gerar Relatório
          </button>
        </div>
      </div>

      {/* Alertas */}
      {(stats.vencidos > 0 || stats.vencendo > 0 || pessoasUrgentes.length > 0 || protocolosParados.length > 0) && (
        <div className="mb-5 space-y-2">
          {stats.vencidos > 0 && (
            <div className="bg-error-expired/10 border border-error-expired/20 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3 text-error-expired"><AlertCircle size={16} /><div><p className="font-bold text-sm">{stats.vencidos} protocolo(s) com prazo vencido</p><p className="text-xs opacity-80">Requer atenção imediata.</p></div></div>
              <button onClick={() => onNavigate('Protocolos')} className="text-xs font-bold bg-error-expired text-white px-3 py-1.5 rounded-lg hover:opacity-90">Ver</button>
            </div>
          )}
          {stats.vencendo > 0 && (
            <div className="bg-deadline-alert/10 border border-deadline-alert/20 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3 text-deadline-alert"><Bell size={16} /><p className="font-bold text-sm">{stats.vencendo} protocolo(s) vencendo nos próximos 3 dias</p></div>
              <button onClick={() => onNavigate('Protocolos')} className="text-xs font-bold bg-deadline-alert text-white px-3 py-1.5 rounded-lg hover:opacity-90">Ver</button>
            </div>
          )}
          {pessoasUrgentes.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3 text-orange-700"><Users size={16} /><p className="font-bold text-sm">{pessoasUrgentes.length} pessoa(s) com prioridade Alta ou Emergencial</p></div>
              <button onClick={() => onNavigate('Pessoas / Dossiês')} className="text-xs font-bold bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:opacity-90">Ver</button>
            </div>
          )}
          {protocolosParados.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3 text-gray-600"><Clock size={16} /><p className="font-bold text-sm">{protocolosParados.length} protocolo(s) sem movimentação há mais de 7 dias</p></div>
              <button onClick={() => onNavigate('Protocolos')} className="text-xs font-bold bg-gray-600 text-white px-3 py-1.5 rounded-lg hover:opacity-90">Ver</button>
            </div>
          )}
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {cardStats.map((card, idx) => (
          <div key={idx} onClick={card.onClick} className={`bg-surface-card p-4 rounded-xl border-l-4 ${card.color} cursor-pointer hover:shadow-md transition-shadow`}>
            <p className="text-text-secondary text-xs font-medium">{card.label}</p>
            <p className={`text-3xl font-bold mt-1 ${card.textColor}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Corpo principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold flex items-center gap-2"><Inbox size={16} className="text-success" /> Últimos Laudos do Sentinela DC</h3>
              <span className="text-xs text-text-secondary">{laudosSentinela.length} total</span>
            </div>
            {laudosRecentes.length > 0 ? (
              <div className="space-y-1">
                {laudosRecentes.map(d => (
                  <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span>📄</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{d.nome}</p>
                        {d.descricao && <p className="text-xs text-text-secondary truncate">{d.descricao}</p>}
                        {d.pessoa_nome && <p className="text-xs text-primary-btn truncate">👤 {d.pessoa_nome}</p>}
                      </div>
                    </div>
                    {d.caminho && <a href={d.caminho} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-btn hover:underline shrink-0 ml-2">Abrir</a>}
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-text-secondary italic py-4 text-center">Nenhum laudo recebido ainda.</p>}
            <button onClick={() => onNavigate('Documentos Recebidos')} className="mt-3 w-full text-xs font-bold text-primary-btn hover:underline text-center">Ver todos os documentos →</button>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold flex items-center gap-2"><FileText size={16} className="text-primary-btn" /> Protocolos Recentes</h3>
              <span className="text-xs text-text-secondary">{stats.concluidosMes} concluído(s) no mês</span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-secondary uppercase font-bold border-b border-gray-100">
                <tr><th className="pb-2">Nº</th><th className="pb-2">Pessoa</th><th className="pb-2">Prazo</th><th className="pb-2 text-right">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentes.map(pr => {
                  const pStatus = getPrazoStatus(pr.prazo)
                  return (
                    <tr key={pr.id} onClick={() => { onSelectProtocolo(pr); onNavigate('Protocolos') }} className="hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="py-2 font-bold text-primary-btn">{pr.numero}</td>
                      <td className="py-2 truncate max-w-[120px]">{pr.pessoa_nome || '—'}</td>
                      <td className="py-2">{pr.prazo ? <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pStatus?.color || 'bg-gray-100 text-gray-400'}`}>{formatDate(pr.prazo)}</span> : <span className="text-xs text-gray-400">—</span>}</td>
                      <td className="py-2 text-right"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pr.status === 'concluido' ? 'bg-success/10 text-success' : pr.status === 'em_andamento' ? 'bg-primary-btn/10 text-primary-btn' : 'bg-gray-100 text-gray-500'}`}>{pr.status.replace('_', ' ')}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <button onClick={() => onNavigate('Protocolos')} className="mt-3 w-full text-xs font-bold text-primary-btn hover:underline text-center">Ver todos os protocolos →</button>
          </div>

          {pessoasRisco.length > 0 && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold flex items-center gap-2 mb-3"><MapPin size={16} className="text-deadline-alert" /> Pessoas em Área de Risco ({pessoasRisco.length})</h3>
              <div className="space-y-1">
                {pessoasRisco.slice(0, 5).map(p => (
                  <div key={p.id} onClick={() => onNavigate('Pessoas / Dossiês')} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 rounded px-1">
                    <div><p className="text-sm font-bold">{p.nome}</p><p className="text-xs text-text-secondary">{[p.endereco, p.bairro].filter(Boolean).join(' · ')}</p></div>
                    {p.prioridade && <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ml-2 ${p.prioridade === 'Emergencial' || p.prioridade === 'Alta' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>⚑ {p.prioridade}</span>}
                  </div>
                ))}
              </div>
              {pessoasRisco.length > 5 && <button onClick={() => onNavigate('Pessoas / Dossiês')} className="mt-2 w-full text-xs font-bold text-deadline-alert hover:underline text-center">Ver todas ({pessoasRisco.length}) →</button>}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-sidebar-bg text-white p-4 rounded-xl shadow-lg">
            <h3 className="font-bold mb-1 flex items-center gap-2"><Calendar size={16} className="text-active-highlight" /> Próximos Compromissos</h3>
            <p className="text-xs text-white/40 mb-3">{proximosCompromissos.length} pendente(s)</p>
            {proximosCompromissos.length > 0 ? (
              <div className="space-y-3">
                {proximosCompromissos.map((a, idx) => (
                  <div key={a.id ?? idx} className="flex gap-3 items-start border-l-2 border-active-highlight pl-3">
                    <div className="shrink-0 font-bold text-active-highlight text-sm">{a.horario || '--:--'}</div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm leading-tight">{a.titulo}</p>
                      <p className="text-xs text-white/60 truncate">{a.pessoa_nome || 'Sem vínculo'}</p>
                      <p className="text-xs mt-0.5">{isToday(a.data) ? <span className="text-active-highlight font-bold">Hoje</span> : <span className="text-white/40">{formatDate(a.data)}</span>}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="py-6 text-center opacity-40"><p className="text-sm italic">Nenhum compromisso próximo.</p></div>}
            <button onClick={() => onNavigate('Agenda')} className="w-full mt-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors">Ver Agenda Completa</button>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold mb-3 flex items-center gap-2"><CheckSquare size={16} className="text-primary-btn" /> Tarefas Pendentes</h3>
            {tarefasPendentes.length > 0 ? (
              <div className="space-y-2">
                {tarefasPendentes.map(t => (
                  <div key={t.id} onClick={() => onNavigateToTarefa(t)} className="p-2 border border-gray-100 rounded-lg hover:border-primary-btn/20 hover:bg-primary-btn/5 cursor-pointer transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-xs truncate">{t.titulo}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${t.prioridade === 'alta' ? 'bg-error-expired/10 text-error-expired' : t.prioridade === 'media' ? 'bg-deadline-alert/10 text-deadline-alert' : 'bg-success/10 text-success'}`}>{(t.prioridade || 'baixa').toUpperCase()}</span>
                    </div>
                    {t.prazo && <p className="text-[11px] text-text-secondary mt-1">Prazo: {formatDate(t.prazo)}</p>}
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-text-secondary italic text-center py-4">Nenhuma tarefa pendente.</p>}
            <button onClick={() => onNavigate('Tarefas')} className="mt-3 w-full text-xs font-bold text-primary-btn hover:underline text-center">Ver todas as tarefas →</button>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-success" /> Indicadores do Mês</h3>
            <div className="space-y-2">
              {[
                { label: 'Protocolos concluídos', value: stats.concluidosMes, color: 'text-success' },
                { label: 'Laudos do Sentinela', value: laudosSemana.length, sublabel: 'esta semana', color: 'text-primary-btn' },
                { label: 'Total de cadastros', value: pessoas.length, color: 'text-text-main' },
                { label: 'Protocolos parados +7d', value: protocolosParados.length, color: protocolosParados.length > 0 ? 'text-deadline-alert' : 'text-success' },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                  <div><p className="text-xs text-text-secondary">{item.label}</p>{item.sublabel && <p className="text-[10px] text-text-secondary opacity-60">{item.sublabel}</p>}</div>
                  <span className={`font-bold text-lg ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
