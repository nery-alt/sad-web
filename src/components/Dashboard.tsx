import React, { useMemo } from 'react'
import { Clock, CheckSquare, Calendar, AlertCircle, Bell } from 'lucide-react'
import type { Protocolo, Tarefa, AgendaItem } from '../types'

interface DashboardProps {
  protocolos: Protocolo[]
  tarefas: Tarefa[]
  agenda: AgendaItem[]
  onSelectProtocolo: (protocolo: Protocolo) => void
  onNavigate: (tab: string) => void
  onNavigateToTarefa: (tarefa: Tarefa) => void
  formatDate: (dateStr: string) => string
  getPrazoStatus: (prazo: string) => { label: string; color: string } | null
}

export const Dashboard: React.FC<DashboardProps> = ({
  protocolos,
  tarefas,
  agenda,
  onSelectProtocolo,
  onNavigate,
  onNavigateToTarefa,
  formatDate,
  getPrazoStatus,
}) => {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

  const stats = useMemo(() => ({
    aberto: protocolos.filter(p => p.status === 'aberto' || p.status === 'em_andamento').length,
    vencendo: protocolos.filter(p => {
      const s = getPrazoStatus(p.prazo)
      return s?.label === 'Vencendo' && p.status !== 'concluido'
    }).length,
    vencidos: protocolos.filter(p => {
      const s = getPrazoStatus(p.prazo)
      return s?.label === 'Vencido' && p.status !== 'concluido'
    }).length,
    concluidos: protocolos.filter(p => {
      const d = new Date(p.atualizado_em)
      return p.status === 'concluido' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length,
  }), [protocolos, getPrazoStatus, now])

  const recentes = useMemo(() => protocolos.slice(0, 5), [protocolos])
  const urgentes = useMemo(() => tarefas.filter(t => t.status !== 'concluida').slice(0, 5), [tarefas])
  const agendaHoje = useMemo(() =>
    agenda.filter(a => (a.data || '').slice(0, 10) === todayStr)
  , [agenda, todayStr])

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="text-sm text-text-secondary font-medium">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Alertas */}
      {(stats.vencidos > 0 || stats.vencendo > 0) && (
        <div className="mb-8 space-y-3">
          {stats.vencidos > 0 && (
            <div className="bg-error-expired/10 border border-error-expired/20 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3 text-error-expired">
                <AlertCircle size={18} />
                <div>
                  <p className="font-bold">Atenção: {stats.vencidos} protocolo(s) vencido(s)!</p>
                  <p className="text-sm opacity-80">Existem processos que ultrapassaram o prazo final.</p>
                </div>
              </div>
              <button onClick={() => onNavigate('Protocolos')} className="text-xs font-bold bg-error-expired text-white px-3 py-2 rounded-lg hover:opacity-90">Ver Protocolos</button>
            </div>
          )}
          {stats.vencendo > 0 && (
            <div className="bg-deadline-alert/10 border border-deadline-alert/20 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3 text-deadline-alert">
                <Bell size={18} />
                <div>
                  <p className="font-bold">Alerta: {stats.vencendo} protocolo(s) vencendo em breve.</p>
                  <p className="text-sm opacity-80">Prazos expirando nos próximos 3 dias.</p>
                </div>
              </div>
              <button onClick={() => onNavigate('Protocolos')} className="text-xs font-bold bg-deadline-alert text-white px-3 py-2 rounded-lg hover:opacity-90">Ver Protocolos</button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Protocolos em aberto', value: stats.aberto, color: 'border-primary-btn' },
          { label: 'Prazos vencendo', value: stats.vencendo, color: 'border-deadline-alert' },
          { label: 'Prazos vencidos', value: stats.vencidos, color: 'border-error-expired' },
          { label: 'Concluídos no mês', value: stats.concluidos, color: 'border-success' },
        ].map((card, idx) => (
          <div key={idx} className={`bg-surface-card p-4 rounded-xl shadow-sm border-l-4 ${card.color}`}>
            <p className="text-text-secondary text-sm font-medium">{card.label}</p>
            <p className="text-3xl font-bold mt-2">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Clock size={18} className="text-primary-btn" /> Protocolos Recentes</h3>
            <div className="overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-text-secondary uppercase font-bold border-b border-gray-50">
                  <tr>
                    <th className="pb-3">Número</th>
                    <th className="pb-3">Pessoa</th>
                    <th className="pb-3">Prazo</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentes.map(pr => {
                    const pStatus = getPrazoStatus(pr.prazo)
                    return (
                      <tr key={pr.id} onClick={() => { onSelectProtocolo(pr); onNavigate('Protocolos'); }} className="hover:bg-gray-50 cursor-pointer transition-colors">
                        <td className="py-3 font-bold text-primary-btn">{pr.numero}</td>
                        <td className="py-3 truncate max-w-[150px]">{pr.pessoa_nome}</td>
                        <td className="py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${pStatus?.color || 'bg-gray-100 text-gray-400'}`}>{formatDate(pr.prazo)}</span></td>
                        <td className="py-3 text-right"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${pr.status === 'concluido' ? 'bg-success/10 text-success' : 'bg-primary-btn/10 text-primary-btn'}`}>{pr.status.replace('_', ' ')}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold mb-4 flex items-center gap-2"><CheckSquare size={18} className="text-primary-btn" /> Tarefas Urgentes</h3>
            {urgentes.length > 0 ? (
              <div className="space-y-3">
                {urgentes.map(t => (
                  <div key={t.id} onClick={() => onNavigateToTarefa(t)} className="flex items-center justify-between p-3 border border-gray-50 rounded-lg hover:border-primary-btn/20 hover:bg-primary-btn/5 transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="text-text-secondary"><input type="checkbox" checked={t.status === 'concluida'} readOnly onClick={e => e.stopPropagation()} /></div>
                      <div>
                        <p className="font-bold text-sm">{t.titulo}</p>
                        <p className="text-xs text-text-secondary">{formatDate(t.prazo)} • {(t.prioridade || 'baixa').toUpperCase()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-lg"><p className="text-text-secondary italic">Nenhuma tarefa pendente.</p></div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-sidebar-bg text-white p-4 rounded-xl shadow-lg">
            <h3 className="font-bold mb-1 flex items-center gap-2"><Calendar size={18} className="text-active-highlight" /> Agenda de Hoje</h3>
            <p className="text-xs text-white/40 mb-4">{agendaHoje.length} compromisso(s)</p>
            {agendaHoje.length > 0 ? (
              <div className="space-y-4">
                {agendaHoje.map((a, idx) => (
                  <div key={a.id ?? idx} className="flex gap-3 items-start border-l-2 border-active-highlight pl-3">
                    <div className="shrink-0 font-bold text-active-highlight text-sm">{a.horario || '--:--'}</div>
                    <div>
                      <p className="font-bold text-sm">{a.titulo || '(sem título)'}</p>
                      <p className="text-xs text-white/60 truncate">{a.pessoa_nome || 'Sem vínculo'}</p>
                      <p className="text-xs text-white/40">{formatDate(a.data)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center opacity-40"><p className="text-sm italic">Nenhum compromisso para hoje.</p></div>
            )}
            <button onClick={() => onNavigate('Agenda')} className="w-full mt-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors">Ver Agenda Completa</button>
          </div>
        </div>
      </div>
    </div>
  )
}
