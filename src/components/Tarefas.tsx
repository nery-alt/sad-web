import React, { useState, useMemo, useEffect } from 'react'
import { Plus, CheckSquare, Trash2, Search, X, Edit2, ExternalLink } from 'lucide-react'
import { Tarefa, Pessoa, Protocolo } from '../types'

interface TarefasProps {
  tarefas: Tarefa[]
  pessoas: Pessoa[]
  protocolos: Protocolo[]
  selectedTarefa: Tarefa | null
  onSelectTarefa: (tarefa: Tarefa | null) => void
  onSaveTarefa: (tarefa: Tarefa) => void
  onToggleStatus: (id: number, status: string) => void
  onDeleteTarefa: (id: number) => void
  onNavigateToPessoa: (pessoaId: number) => void
  onNavigateToProtocolo: (protocoloId: number) => void
  newTarefaInit?: Partial<Tarefa> | null
  onClearNewTarefaInit?: () => void
  formatDate: (dateStr: string) => string
  getPrazoStatus: (prazo: string) => { label: string; color: string } | null
}

const emptyTarefa: Tarefa = {
  titulo: '', descricao: '', prioridade: 'media', prazo: '', status: 'pendente', criado_em: '', atualizado_em: ''
}

export const Tarefas: React.FC<TarefasProps> = ({
  tarefas,
  pessoas,
  protocolos,
  selectedTarefa,
  onSelectTarefa,
  onSaveTarefa,
  onToggleStatus,
  onDeleteTarefa,
  onNavigateToPessoa,
  onNavigateToProtocolo,
  newTarefaInit,
  onClearNewTarefaInit,
  formatDate,
  getPrazoStatus,
}) => {
  const [searchTarefa, setSearchTarefa] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterPrioridade, setFilterPrioridade] = useState('todos')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState<Tarefa>(emptyTarefa)

  useEffect(() => {
    if (newTarefaInit) {
      setFormData({ ...emptyTarefa, ...newTarefaInit })
      setIsFormOpen(true)
      onClearNewTarefaInit?.()
    }
  }, [newTarefaInit]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredTarefas = useMemo(() => tarefas.filter(t => {
    const matchSearch = (t.titulo || '').toLowerCase().includes(searchTarefa.toLowerCase())
    const matchStatus = filterStatus === 'todos' || (t.status || '') === filterStatus
    const matchPrioridade = filterPrioridade === 'todos' || (t.prioridade || '') === filterPrioridade
    return matchSearch && matchStatus && matchPrioridade
  }), [tarefas, searchTarefa, filterStatus, filterPrioridade])

  const formProtocolos = useMemo(() => {
    if (!formData.pessoa_id) return protocolos
    return protocolos.filter(p => p.pessoa_id === formData.pessoa_id)
  }, [protocolos, formData.pessoa_id])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    onSaveTarefa(formData)
    setIsFormOpen(false)
    if (formData.id && selectedTarefa?.id === formData.id) {
      onSelectTarefa({ ...formData })
    }
  }

  const openNew = () => {
    setFormData(emptyTarefa)
    setIsFormOpen(true)
  }

  const openEdit = (t: Tarefa) => {
    setFormData({ ...t })
    setIsFormOpen(true)
  }

  const getPrioridadeColor = (prioridade: string) => {
    if (prioridade === 'alta') return 'bg-error-expired/10 text-error-expired'
    if (prioridade === 'media') return 'bg-deadline-alert/10 text-deadline-alert'
    return 'bg-success/10 text-success'
  }

  const calcPrazoStatus = (prazo: string, status: string): { label: string; color: string } | null => {
    if (!prazo || status === 'concluida') return null
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(prazo)
    if (!match) return null
    const deadline = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    deadline.setHours(0, 0, 0, 0)
    const diff = Math.ceil((deadline.getTime() - today.getTime()) / 86400000)
    if (diff < 0) return { label: 'Vencida', color: 'bg-error-expired/10 text-error-expired' }
    if (diff <= 3) return { label: 'Vencendo', color: 'bg-deadline-alert/10 text-deadline-alert' }
    return { label: 'No prazo', color: 'bg-success/10 text-success' }
  }

  return (
    <div className="p-4 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div><h1 className="text-2xl font-bold">Tarefas</h1><p className="text-text-secondary text-sm">Gerencie suas atividades e prazos.</p></div>
        <button onClick={openNew} className="flex items-center gap-2 bg-primary-btn text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 text-sm"><Plus size={18} /> Nova Tarefa</button>
      </div>
      <div className="mb-3 space-y-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
          <input type="text" placeholder="Buscar tarefa..." className="w-full pl-9 pr-4 py-2 bg-surface-card border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-btn/20 text-sm" value={searchTarefa} onChange={(e) => setSearchTarefa(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-1.5 bg-surface-card border border-gray-200 rounded-lg text-sm font-bold">
            <option value="todos">Todos os Status</option>
            <option value="pendente">Pendente</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluida">Concluída</option>
          </select>
          <select value={filterPrioridade} onChange={(e) => setFilterPrioridade(e.target.value)} className="px-3 py-1.5 bg-surface-card border border-gray-200 rounded-lg text-sm font-bold">
            <option value="todos">Todas as Prioridades</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
          <span className="ml-auto text-xs text-text-secondary self-center">{filteredTarefas.length} tarefa(s)</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredTarefas.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-lg mt-2">
            <p className="text-text-secondary italic text-sm">Nenhuma tarefa encontrada.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTarefas.map(t => {
              const prioridade = t.prioridade || 'baixa'
              const status = t.status || 'pendente'
              const prazoStatus = calcPrazoStatus(t.prazo || '', status)
              const isSelected = selectedTarefa?.id === t.id
              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTarefa(isSelected ? null : t)}
                  className={`bg-white p-3 rounded-lg border shadow-sm hover:shadow-md transition-all flex items-center gap-3 group cursor-pointer ${isSelected ? 'border-primary-btn ring-1 ring-primary-btn/20' : prazoStatus?.label === 'Vencida' ? 'border-error-expired/30' : 'border-gray-100'}`}
                >
                  <button onClick={e => { e.stopPropagation(); onToggleStatus(t.id!, status) }} className={`p-1.5 rounded shrink-0 transition-colors ${status === 'concluida' ? 'bg-success/10 text-success' : 'bg-gray-100 text-text-secondary hover:bg-primary-btn/10 hover:text-primary-btn'}`}>
                    <CheckSquare size={18} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${status === 'concluida' ? 'line-through text-text-secondary' : 'text-text-main'}`}>{t.titulo || '(sem título)'}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{t.pessoa_nome || 'Sem vínculo'}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getPrioridadeColor(prioridade)}`}>{prioridade.toUpperCase()}</span>
                    {prazoStatus && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${prazoStatus.color}`}>{prazoStatus.label.toUpperCase()}</span>
                    )}
                    {!prazoStatus && t.prazo && status !== 'concluida' && (
                      <span className="text-[10px] text-text-secondary">{formatDate(t.prazo)}</span>
                    )}
                    <button onClick={e => { e.stopPropagation(); openEdit(t) }} className="p-1.5 text-primary-btn hover:bg-primary-btn/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={15} /></button>
                    <button onClick={e => { e.stopPropagation(); onDeleteTarefa(t.id!) }} className="p-1.5 text-error-expired hover:bg-error-expired/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedTarefa && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-surface-card">
              <h2 className="text-lg font-bold truncate pr-4">{selectedTarefa.titulo || '(sem título)'}</h2>
              <button onClick={() => onSelectTarefa(null)} className="text-text-secondary hover:text-text-main shrink-0"><X size={20} /></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs font-bold px-2 py-1 rounded ${getPrioridadeColor(selectedTarefa.prioridade || 'baixa')}`}>{(selectedTarefa.prioridade || 'baixa').toUpperCase()}</span>
                <span className="text-xs font-bold px-2 py-1 rounded bg-primary-btn/10 text-primary-btn">{(selectedTarefa.status || 'pendente').replace('_', ' ').toUpperCase()}</span>
                {(() => { const ps = calcPrazoStatus(selectedTarefa.prazo || '', selectedTarefa.status || ''); return ps ? <span className={`text-xs font-bold px-2 py-1 rounded ${ps.color}`}>{ps.label.toUpperCase()}</span> : null })()}
              </div>
              {selectedTarefa.descricao ? (
                <div>
                  <p className="text-xs font-bold text-text-secondary uppercase mb-1">Descrição</p>
                  <p className="text-sm text-text-main whitespace-pre-wrap">{selectedTarefa.descricao}</p>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-bold text-text-secondary uppercase mb-1">Prazo</p>
                  <p>{selectedTarefa.prazo ? formatDate(selectedTarefa.prazo) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-text-secondary uppercase mb-1">Pessoa Vinculada</p>
                  {selectedTarefa.pessoa_nome && selectedTarefa.pessoa_id ? (
                    <button
                      onClick={() => { onSelectTarefa(null); onNavigateToPessoa(selectedTarefa.pessoa_id!) }}
                      className="text-primary-btn font-medium hover:underline flex items-center gap-1 text-left"
                    >
                      {selectedTarefa.pessoa_nome} <ExternalLink size={12} />
                    </button>
                  ) : (
                    <p>—</p>
                  )}
                </div>
                {selectedTarefa.protocolo_numero && selectedTarefa.protocolo_id && (
                  <div>
                    <p className="text-xs font-bold text-text-secondary uppercase mb-1">Protocolo</p>
                    <button
                      onClick={() => { onSelectTarefa(null); onNavigateToProtocolo(selectedTarefa.protocolo_id!) }}
                      className="text-primary-btn font-medium hover:underline flex items-center gap-1 text-left"
                    >
                      {selectedTarefa.protocolo_numero} <ExternalLink size={12} />
                    </button>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-text-secondary uppercase mb-1">Criado em</p>
                  <p>{selectedTarefa.criado_em ? formatDate(selectedTarefa.criado_em) : '—'}</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => { onDeleteTarefa(selectedTarefa.id!); onSelectTarefa(null) }} className="px-4 py-2 text-error-expired font-bold hover:bg-error-expired/10 rounded text-sm">Excluir</button>
              <button onClick={() => { openEdit(selectedTarefa); onSelectTarefa(null) }} className="px-4 py-2 bg-primary-btn text-white rounded font-bold hover:opacity-90 text-sm flex items-center gap-1.5"><Edit2 size={15} /> Editar</button>
            </div>
          </div>
        </div>
      )}

      {/* New/Edit form */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-surface-card">
              <h2 className="text-lg font-bold">{formData.id ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-text-secondary hover:text-text-main"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-4 overflow-y-auto space-y-3">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Título *</label>
                <input required className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Descrição</label>
                <textarea rows={3} className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none resize-none" value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Pessoa</label>
                <select
                  className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none"
                  value={formData.pessoa_id ?? ''}
                  onChange={e => {
                    const id = e.target.value ? parseInt(e.target.value) : undefined
                    setFormData({ ...formData, pessoa_id: id, protocolo_id: undefined })
                  }}
                >
                  <option value="">Nenhuma</option>
                  {pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Protocolo</label>
                <select
                  className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none"
                  value={formData.protocolo_id ?? ''}
                  onChange={e => {
                    const id = e.target.value ? parseInt(e.target.value) : undefined
                    if (id) {
                      const prot = protocolos.find(p => p.id === id)
                      setFormData({ ...formData, protocolo_id: id, pessoa_id: prot?.pessoa_id ?? formData.pessoa_id })
                    } else {
                      setFormData({ ...formData, protocolo_id: undefined })
                    }
                  }}
                >
                  <option value="">Nenhum</option>
                  {formProtocolos.map(p => (
                    <option key={p.id} value={p.id}>{p.numero} — {p.assunto} — {p.pessoa_nome || ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Prioridade</label>
                  <select className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.prioridade} onChange={e => setFormData({...formData, prioridade: e.target.value as Tarefa['prioridade']})}>
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Prazo</label>
                  <input type="date" className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.prazo} onChange={e => setFormData({...formData, prazo: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Status</label>
                <select className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as Tarefa['status']})}>
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluida">Concluída</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-text-secondary font-bold hover:text-text-main text-sm">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-primary-btn text-white rounded font-bold hover:opacity-90 text-sm">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
