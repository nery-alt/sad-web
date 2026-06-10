import React, { useMemo } from 'react'
import { Clock, CheckSquare, Calendar, AlertCircle, Bell, FileText, MapPin, Users, TrendingUp, Inbox } from 'lucide-react'
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

export const Dashboard: React.FC<DashboardProps> = ({
  protocolos, tarefas, agenda, pessoas, documentos,
  onSelectProtocolo, onNavigate, onNavigateToTarefa, formatDate, getPrazoStatus,
}) => {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

  // Laudos vindos do Sentinela DC (caminho contém /sentinela/)
  const laudosSentinela = useMemo(() =>
    documentos.filter(d => d.caminho?.includes('/sentinela/'))
  , [documentos])

  // Laudos da semana atual
  const inicioSemana = useMemo(() => {
    const d = new Date(now)
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0,0,0,0)
    return d
  }, [])

  const laudosSemana = useMemo(() =>
    laudosSentinela.filter(d => {
      if (!d.criado_em) return false
      return new Date(d.criado_em) >= inicioSemana
    })
  , [laudosSentinela, inicioSemana])

  // Pessoas em área de risco
  const pessoasRisco = useMemo(() => pessoas.filter(p => p.area_risco), [pessoas])

  // Pessoas com prioridade Alta ou Emergencial
  const pessoasUrgentes = useMemo(() =>
    pessoas.filter(p => p.prioridade === 'Alta' || p.prioridade === 'Emergencial')
  , [pessoas])

  const stats = useMemo(() => ({
    abertos: protocolos.filter(p => p.status === 'aberto' || p.status === 'em_andamento').length,
    vencendo: protocolos.filter(p => {
      const s = getPrazoStatus(p.prazo)
      return s?.label === 'Vencendo' && p.status !== 'concluido'
    }).length,
    vencidos: protocolos.filter(p => {
      const s = getPrazoStatus(p.prazo)
      return s?.label === 'Vencido' && p.status !== 'concluido'
    }).length,
    concluidosMes: protocolos.filter(p => {
      const d = new Date(p.atualizado_em)
      return p.status === 'concluido' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length,
    tarefasUrgentes: tarefas.filter(t => t.status !== 'concluida' && t.prioridade === 'alta').length,
  }), [protocolos, tarefas, getPrazoStatus, now])

  // Protocolos sem movimentação há mais de 7 dias e ainda abertos
  const protocolosParados = useMemo(() =>
    protocolos.filter(p => {
      if (p.status === 'concluido') return false
      const atualizado = new Date(p.atualizado_em)
      const diffDias = Math.floor((now.getTime() - atualizado.getTime()) / 86400000)
      return diffDias >= 7
    })
  , [protocolos, now])

  const recentes = useMemo(() => protocolos.slice(0, 6), [protocolos])

  const tarefasPendentes = useMemo(() =>
    tarefas
      .filter(t => t.status !== 'concluida' && t.status !== 'arquivada')
      .slice(0, 5)
  , [tarefas])

  const proximosCompromissos = useMemo(() =>
    agenda
      .filter(a => (a.data || '').slice(0, 10) >= todayStr && !a.realizado)
      .sort((a, b) => {
        const da = (a.data || '').slice(0, 10)
        const db = (b.data || '').slice(0, 10)
        if (da !== db) return da.localeCompare(db)
        return (a.horario || '').localeCompare(b.horario || '')
      })
      .slice(0, 5)
  , [agenda, todayStr])

  const laudosRecentes = useMemo(() =>
    laudosSentinela.slice(0, 5)
  , [laudosSentinela])

  const isToday = (dateStr: string) => (dateStr || '').slice(0, 10) === todayStr

  const cardStats = [
    { label: 'Protocolos em aberto', value: stats.abertos, color: 'border-primary-btn', textColor: 'text-primary-btn', onClick: () => onNavigate('Protocolos') },
    { label: 'Laudos esta semana', value: laudosSemana.length, color: 'border-success', textColor: 'text-success', onClick: () => onNavigate('Documentos Recebidos') },
    { label: 'Pessoas em área de risco', value: pessoasRisco.length, color: 'border-deadline-alert', textColor: 'text-deadline-alert', onClick: () => onNavigate('Pessoas / Dossiês') },
    { label: 'Prioridade Alta/Emergencial', value: pessoasUrgentes.length, color: 'border-error-expired', textColor: 'text-error-expired', onClick: () => onNavigate('Pessoas / Dossiês') },
  ]

  return (
    <div className="p-4 h-full overflow-y-auto">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-bold">Painel Operacional</h1>
          <p className="text-text-secondary text-sm">Setor de Vistoria — SEMDECP</p>
        </div>
        <div className="text-sm text-text-secondary font-medium">
          {now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Alertas */}
      {(stats.vencidos > 0 || stats.vencendo > 0 || pessoasUrgentes.length > 0 || protocolosParados.length > 0) && (
        <div className="mb-5 space-y-2">
          {stats.vencidos > 0 && (
            <div className="bg-error-expired/10 border border-error-expired/20 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3 text-error-expired">
                <AlertCircle size={16} />
                <div>
                  <p className="font-bold text-sm">{stats.vencidos} protocolo(s) com prazo vencido</p>
                  <p className="text-xs opacity-80">Requer atenção imediata.</p>
                </div>
              </div>
              <button onClick={() => onNavigate('Protocolos')} className="text-xs font-bold bg-error-expired text-white px-3 py-1.5 rounded-lg hover:opacity-90">Ver</button>
            </div>
          )}
          {stats.vencendo > 0 && (
            <div className="bg-deadline-alert/10 border border-deadline-alert/20 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3 text-deadline-alert">
                <Bell size={16} />
                <div>
                  <p className="font-bold text-sm">{stats.vencendo} protocolo(s) vencendo nos próximos 3 dias</p>
                </div>
              </div>
              <button onClick={() => onNavigate('Protocolos')} className="text-xs font-bold bg-deadline-alert text-white px-3 py-1.5 rounded-lg hover:opacity-90">Ver</button>
            </div>
          )}
          {pessoasUrgentes.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3 text-orange-700">
                <Users size={16} />
                <p className="font-bold text-sm">{pessoasUrgentes.length} pessoa(s) com prioridade Alta ou Emergencial</p>
              </div>
              <button onClick={() => onNavigate('Pessoas / Dossiês')} className="text-xs font-bold bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:opacity-90">Ver</button>
            </div>
          )}
          {protocolosParados.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3 text-gray-600">
                <Clock size={16} />
                <p className="font-bold text-sm">{protocolosParados.length} protocolo(s) sem movimentação há mais de 7 dias</p>
              </div>
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
        {/* Coluna esquerda e centro */}
        <div className="lg:col-span-2 space-y-4">

          {/* Laudos recebidos do Sentinela */}
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
                      <span className="text-base">📄</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{d.nome}</p>
                        {d.descricao && <p className="text-xs text-text-secondary truncate">{d.descricao}</p>}
                        {d.pessoa_nome && <p className="text-xs text-primary-btn truncate">👤 {d.pessoa_nome}</p>}
                      </div>
                    </div>
                    <div className="shrink-0 ml-2">
                      {d.caminho && (
                        <a href={d.caminho} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-btn hover:underline">Abrir</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary italic py-4 text-center">Nenhum laudo recebido ainda.</p>
            )}
            <button onClick={() => onNavigate('Documentos Recebidos')} className="mt-3 w-full text-xs font-bold text-primary-btn hover:underline text-center">Ver todos os documentos →</button>
          </div>

          {/* Protocolos recentes */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold flex items-center gap-2"><FileText size={16} className="text-primary-btn" /> Protocolos Recentes</h3>
              <span className="text-xs text-text-secondary">{stats.concluidosMes} concluído(s) no mês</span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-secondary uppercase font-bold border-b border-gray-100">
                <tr>
                  <th className="pb-2">Nº</th>
                  <th className="pb-2">Pessoa</th>
                  <th className="pb-2">Prazo</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentes.map(pr => {
                  const pStatus = getPrazoStatus(pr.prazo)
                  return (
                    <tr key={pr.id} onClick={() => { onSelectProtocolo(pr); onNavigate('Protocolos') }} className="hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="py-2 font-bold text-primary-btn">{pr.numero}</td>
                      <td className="py-2 truncate max-w-[120px]">{pr.pessoa_nome || '—'}</td>
                      <td className="py-2">
                        {pr.prazo
                          ? <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pStatus?.color || 'bg-gray-100 text-gray-400'}`}>{formatDate(pr.prazo)}</span>
                          : <span className="text-xs text-gray-400">—</span>
                        }
                      </td>
                      <td className="py-2 text-right">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pr.status === 'concluido' ? 'bg-success/10 text-success' : pr.status === 'em_andamento' ? 'bg-primary-btn/10 text-primary-btn' : 'bg-gray-100 text-gray-500'}`}>
                          {pr.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <button onClick={() => onNavigate('Protocolos')} className="mt-3 w-full text-xs font-bold text-primary-btn hover:underline text-center">Ver todos os protocolos →</button>
          </div>

          {/* Pessoas em área de risco */}
          {pessoasRisco.length > 0 && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold flex items-center gap-2 mb-3"><MapPin size={16} className="text-deadline-alert" /> Pessoas em Área de Risco ({pessoasRisco.length})</h3>
              <div className="space-y-1">
                {pessoasRisco.slice(0, 5).map(p => (
                  <div key={p.id} onClick={() => onNavigate('Pessoas / Dossiês')} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 rounded px-1">
                    <div>
                      <p className="text-sm font-bold">{p.nome}</p>
                      <p className="text-xs text-text-secondary">{[p.endereco, p.bairro].filter(Boolean).join(' · ')}</p>
                    </div>
                    {p.prioridade && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ml-2 ${p.prioridade === 'Emergencial' || p.prioridade === 'Alta' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        ⚑ {p.prioridade}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {pessoasRisco.length > 5 && (
                <button onClick={() => onNavigate('Pessoas / Dossiês')} className="mt-2 w-full text-xs font-bold text-deadline-alert hover:underline text-center">Ver todas ({pessoasRisco.length}) →</button>
              )}
            </div>
          )}
        </div>

        {/* Coluna direita */}
        <div className="space-y-4">
          {/* Compromissos */}
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
                      <p className="text-xs mt-0.5">
                        {isToday(a.data)
                          ? <span className="text-active-highlight font-bold">Hoje</span>
                          : <span className="text-white/40">{formatDate(a.data)}</span>
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center opacity-40"><p className="text-sm italic">Nenhum compromisso próximo.</p></div>
            )}
            <button onClick={() => onNavigate('Agenda')} className="w-full mt-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors">Ver Agenda Completa</button>
          </div>

          {/* Tarefas pendentes */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold mb-3 flex items-center gap-2"><CheckSquare size={16} className="text-primary-btn" /> Tarefas Pendentes</h3>
            {tarefasPendentes.length > 0 ? (
              <div className="space-y-2">
                {tarefasPendentes.map(t => (
                  <div key={t.id} onClick={() => onNavigateToTarefa(t)} className="p-2 border border-gray-100 rounded-lg hover:border-primary-btn/20 hover:bg-primary-btn/5 cursor-pointer transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-xs truncate">{t.titulo}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${t.prioridade === 'alta' ? 'bg-error-expired/10 text-error-expired' : t.prioridade === 'media' ? 'bg-deadline-alert/10 text-deadline-alert' : 'bg-success/10 text-success'}`}>
                        {(t.prioridade || 'baixa').toUpperCase()}
                      </span>
                    </div>
                    {t.prazo && <p className="text-[11px] text-text-secondary mt-1">Prazo: {formatDate(t.prazo)}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary italic text-center py-4">Nenhuma tarefa pendente.</p>
            )}
            <button onClick={() => onNavigate('Tarefas')} className="mt-3 w-full text-xs font-bold text-primary-btn hover:underline text-center">Ver todas as tarefas →</button>
          </div>

          {/* Indicadores rápidos */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-success" /> Indicadores do Mês</h3>
            <div className="space-y-2">
              {[
                { label: 'Protocolos concluídos', value: stats.concluidosMes, color: 'text-success' },
                { label: 'Laudos do Sentinela', value: laudosSemana.length, color: 'text-primary-btn', sublabel: 'esta semana' },
                { label: 'Total de cadastros', value: pessoas.length, color: 'text-text-main' },
                { label: 'Protocolos parados +7d', value: protocolosParados.length, color: protocolosParados.length > 0 ? 'text-deadline-alert' : 'text-success' },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs text-text-secondary">{item.label}</p>
                    {item.sublabel && <p className="text-[10px] text-text-secondary opacity-60">{item.sublabel}</p>}
                  </div>
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
