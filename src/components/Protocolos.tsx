import React, { useState, useMemo } from 'react'
import { Plus, ArrowLeft, History, Send, Trash2, Search, Edit2, Phone, MapPin, CreditCard, CheckSquare } from 'lucide-react'
import { Protocolo, Pessoa, Movimentacao, Tarefa } from '../types'

interface ProtocolosProps {
  protocolos: Protocolo[]
  pessoas: Pessoa[]
  tarefas: Tarefa[]
  selectedProtocolo: Protocolo | null
  onSelectProtocolo: (protocolo: Protocolo | null) => void
  onSaveProtocolo: (protocolo: Protocolo) => void
  onDeleteProtocolo: (id: number) => void
  onUpdateStatus: (id: number, status: string) => void
  onAddMovimentacao: (id: number, texto: string) => void
  onNewTarefa: (protocoloId: number, pessoaId: number) => void
  formatDate: (dateStr: string) => string
  getPrazoStatus: (prazo: string) => { label: string; color: string } | null
}

export const Protocolos: React.FC<ProtocolosProps> = ({
  protocolos,
  pessoas,
  tarefas,
  selectedProtocolo,
  onSelectProtocolo,
  onSaveProtocolo,
  onDeleteProtocolo,
  onUpdateStatus,
  onAddMovimentacao,
  onNewTarefa,
  formatDate,
  getPrazoStatus,
}) => {
  const [searchProtocolo, setSearchProtocolo] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState<Protocolo>({
    pessoa_id: 0, numero: '', assunto: '', descricao: '', data_entrada: '', prazo: '', status: 'aberto', historico: '[]', criado_em: '', atualizado_em: ''
  })
  const [novaMovimentacao, setNovaMovimentacao] = useState('')

  const filteredProtocolos = useMemo(() => protocolos.filter(p =>
    p.numero.toLowerCase().includes(searchProtocolo.toLowerCase()) ||
    p.assunto.toLowerCase().includes(searchProtocolo.toLowerCase()) ||
    p.pessoa_nome?.toLowerCase().includes(searchProtocolo.toLowerCase())
  ), [protocolos, searchProtocolo])

  const protocoloTarefas = useMemo(() => {
    if (!selectedProtocolo) return []
    return tarefas.filter(t => t.protocolo_id === selectedProtocolo.id)
  }, [tarefas, selectedProtocolo])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    onSaveProtocolo(formData)
    setIsFormOpen(false)
  }

  const getStatusBadgeColor = (status: string) => {
    if (status === 'concluido') return 'bg-success/10 text-success'
    if (status === 'em_andamento') return 'bg-primary-btn/10 text-primary-btn'
    return 'bg-gray-100 text-gray-600'
  }

  const formModal = isFormOpen && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-surface-card">
          <h2 className="text-lg font-bold">{formData.id ? 'Editar Protocolo' : 'Novo Protocolo'}</h2>
          <button onClick={() => setIsFormOpen(false)} className="text-text-secondary hover:text-text-main">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-4 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-bold text-text-secondary uppercase mb-1">Pessoa *</label>
              <select required className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.pessoa_id} onChange={e => setFormData({...formData, pessoa_id: parseInt(e.target.value)})}>
                <option value="">Selecione</option>
                {pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-bold text-text-secondary uppercase mb-1">Número *</label><input required className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.numero} onChange={e => setFormData({...formData, numero: e.target.value})} /></div>
            <div className="col-span-2"><label className="block text-xs font-bold text-text-secondary uppercase mb-1">Assunto *</label><input required className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.assunto} onChange={e => setFormData({...formData, assunto: e.target.value})} /></div>
            <div><label className="block text-xs font-bold text-text-secondary uppercase mb-1">Data de Entrada</label><input type="date" className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.data_entrada} onChange={e => setFormData({...formData, data_entrada: e.target.value})} /></div>
            <div><label className="block text-xs font-bold text-text-secondary uppercase mb-1">Prazo</label><input type="date" className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.prazo} onChange={e => setFormData({...formData, prazo: e.target.value})} /></div>
            <div><label className="block text-xs font-bold text-text-secondary uppercase mb-1">Status</label>
              <select className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as Protocolo['status']})}>
                <option value="aberto">Aberto</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluido">Concluído</option>
              </select>
            </div>
            <div className="col-span-2"><label className="block text-xs font-bold text-text-secondary uppercase mb-1">Descrição</label><textarea rows={2} className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none resize-none" value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-text-secondary font-bold hover:text-text-main text-sm">Cancelar</button>
            <button type="submit" className="px-6 py-2 bg-primary-btn text-white rounded font-bold hover:opacity-90 text-sm">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )

  if (selectedProtocolo) {
    const historico: Movimentacao[] = JSON.parse(selectedProtocolo.historico || '[]')
    const prazoStatus = selectedProtocolo.status !== 'concluido' ? getPrazoStatus(selectedProtocolo.prazo) : null

    return (
      <div className="p-4 h-full overflow-y-auto">
        <button onClick={() => onSelectProtocolo(null)} className="flex items-center gap-2 text-primary-btn mb-4 hover:opacity-80 text-sm">
          <ArrowLeft size={18} /> Voltar
        </button>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold">{selectedProtocolo.numero}</h1>
            <p className="text-text-secondary text-sm mt-1">{selectedProtocolo.assunto}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setFormData({ ...selectedProtocolo }); setIsFormOpen(true) }} className="flex items-center gap-1 px-3 py-1.5 bg-primary-btn text-white rounded-lg hover:opacity-90 text-sm"><Edit2 size={15} /> Editar</button>
            <button onClick={() => onDeleteProtocolo(selectedProtocolo.id!)} className="flex items-center gap-1 px-3 py-1.5 bg-error-expired text-white rounded-lg hover:opacity-90 text-sm"><Trash2 size={16} /> Excluir</button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <h3 className="font-bold text-sm mb-3">Informações do Protocolo</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-text-secondary text-xs uppercase font-bold mb-1">Pessoa</p><p className="font-bold">{selectedProtocolo.pessoa_nome || '—'}</p></div>
                <div><p className="text-text-secondary text-xs uppercase font-bold mb-1">Data de Entrada</p><p>{formatDate(selectedProtocolo.data_entrada)}</p></div>
                <div className="col-span-2"><p className="text-text-secondary text-xs uppercase font-bold mb-1">Descrição</p><p>{selectedProtocolo.descricao || 'Sem descrição'}</p></div>
              </div>
            </div>

            {(selectedProtocolo.pessoa_endereco || selectedProtocolo.pessoa_telefone || selectedProtocolo.pessoa_cpf) && (
              <div className="bg-primary-btn/5 border border-primary-btn/20 p-4 rounded-lg">
                <h3 className="font-bold text-sm mb-3 text-primary-btn">Dados do Interessado</h3>
                <div className="space-y-2 text-sm">
                  {selectedProtocolo.pessoa_endereco && (
                    <div className="flex items-start gap-2">
                      <MapPin size={15} className="text-primary-btn shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-text-secondary uppercase mb-0.5">Endereço</p>
                        <p className="font-medium">{selectedProtocolo.pessoa_endereco}</p>
                      </div>
                    </div>
                  )}
                  {selectedProtocolo.pessoa_telefone && (
                    <div className="flex items-center gap-2">
                      <Phone size={15} className="text-primary-btn shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-text-secondary uppercase mb-0.5">Telefone</p>
                        <p className="font-medium">{selectedProtocolo.pessoa_telefone}</p>
                      </div>
                    </div>
                  )}
                  {selectedProtocolo.pessoa_cpf && (
                    <div className="flex items-center gap-2">
                      <CreditCard size={15} className="text-primary-btn shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-text-secondary uppercase mb-0.5">CPF</p>
                        <p className="font-medium">{selectedProtocolo.pessoa_cpf}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><History size={16} /> Histórico</h3>
              <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
                {historico.length > 0 ? historico.map((mov, idx) => (
                  <div key={idx} className="p-2 border border-gray-100 rounded text-xs">
                    <p className="text-text-secondary font-bold mb-0.5">{formatDate(mov.data)}</p>
                    <p className="text-sm">{mov.texto}</p>
                  </div>
                )) : <p className="text-text-secondary italic text-sm">Nenhuma movimentação.</p>}
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Adicionar movimentação..." className="flex-1 p-2 border border-gray-200 rounded text-sm" value={novaMovimentacao} onChange={(e) => setNovaMovimentacao(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAddMovimentacao(selectedProtocolo.id!, novaMovimentacao); setNovaMovimentacao('') }}} />
                <button onClick={() => { onAddMovimentacao(selectedProtocolo.id!, novaMovimentacao); setNovaMovimentacao('') }} className="px-3 py-2 bg-primary-btn text-white rounded text-sm font-bold hover:opacity-90"><Send size={14} /></button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-sm flex items-center gap-2"><CheckSquare size={16} /> Tarefas ({protocoloTarefas.length})</h3>
                <button onClick={() => onNewTarefa(selectedProtocolo.id!, selectedProtocolo.pessoa_id)} className="flex items-center gap-1 px-2 py-1 bg-primary-btn text-white rounded text-xs hover:opacity-90"><Plus size={14} /> Nova Tarefa</button>
              </div>
              {protocoloTarefas.length === 0 ? (
                <p className="text-text-secondary italic text-sm">Nenhuma tarefa vinculada.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {protocoloTarefas.map(t => (
                    <div key={t.id} className="p-2 border border-gray-100 rounded text-xs">
                      <div className="flex justify-between items-center">
                        <span className={`font-bold text-sm ${t.status === 'concluida' ? 'line-through text-text-secondary' : ''}`}>{t.titulo}</span>
                        <div className="flex gap-1 shrink-0 ml-2">
                          <span className={`font-bold px-1.5 py-0.5 rounded ${t.prioridade === 'alta' ? 'bg-error-expired/10 text-error-expired' : t.prioridade === 'media' ? 'bg-deadline-alert/10 text-deadline-alert' : 'bg-success/10 text-success'}`}>{(t.prioridade || 'baixa').toUpperCase()}</span>
                          <span className={`font-bold px-1.5 py-0.5 rounded ${t.status === 'concluida' ? 'bg-success/10 text-success' : t.status === 'em_andamento' ? 'bg-primary-btn/10 text-primary-btn' : 'bg-gray-100 text-gray-600'}`}>{(t.status || 'pendente').replace('_', ' ')}</span>
                        </div>
                      </div>
                      {t.prazo && <p className="text-text-secondary mt-0.5">Prazo: {formatDate(t.prazo)}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="col-span-1 space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <h3 className="font-bold text-sm mb-3">Status</h3>
              <select value={selectedProtocolo.status} onChange={(e) => onUpdateStatus(selectedProtocolo.id!, e.target.value)} className="w-full p-2 border border-gray-200 rounded text-sm mb-4">
                <option value="aberto">Aberto</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluido">Concluído</option>
              </select>
              <p className="text-xs font-bold uppercase text-text-secondary mb-2">Prazo</p>
              <div className={`p-3 rounded text-center font-bold text-sm ${prazoStatus?.color || 'bg-gray-100 text-gray-400'}`}>
                {formatDate(selectedProtocolo.prazo) || '—'}
              </div>
            </div>
          </div>
        </div>
        {formModal}
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div><h1 className="text-2xl font-bold">Protocolos</h1><p className="text-text-secondary text-sm">Gerencie todos os processos administrativos.</p></div>
        <button onClick={() => { setFormData({ pessoa_id: 0, numero: '', assunto: '', descricao: '', data_entrada: '', prazo: '', status: 'aberto', historico: '[]', criado_em: '', atualizado_em: '' }); setIsFormOpen(true) }} className="flex items-center gap-2 bg-primary-btn text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 text-sm"><Plus size={18} /> Novo</button>
      </div>
      <div className="mb-4 relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
        <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-3 py-2 bg-surface-card border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-btn/20 text-sm" value={searchProtocolo} onChange={(e) => setSearchProtocolo(e.target.value)} />
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-100 grid grid-cols-12 gap-0 text-xs uppercase font-bold text-text-secondary border-b border-gray-200 sticky top-0">
            <div className="col-span-2 p-2 px-3 border-r border-gray-200">Número</div>
            <div className="col-span-2 p-2 px-3 border-r border-gray-200">Pessoa</div>
            <div className="col-span-3 p-2 px-3 border-r border-gray-200">Assunto</div>
            <div className="col-span-2 p-2 px-3 border-r border-gray-200">Entrada</div>
            <div className="col-span-1 p-2 px-3 border-r border-gray-200">Prazo</div>
            <div className="col-span-2 p-2 px-3">Status</div>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredProtocolos.map(pr => {
              const prazoStatus = pr.status !== 'concluido' ? getPrazoStatus(pr.prazo) : null
              return (
                <div key={pr.id} onClick={() => onSelectProtocolo(pr)} className="grid grid-cols-12 gap-0 hover:bg-primary-btn/5 cursor-pointer transition-colors text-sm">
                  <div className="col-span-2 p-2 px-3 border-r border-gray-100 font-bold text-primary-btn truncate">{pr.numero}</div>
                  <div className="col-span-2 p-2 px-3 border-r border-gray-100 text-text-main truncate">{pr.pessoa_nome || '—'}</div>
                  <div className="col-span-3 p-2 px-3 border-r border-gray-100 text-text-main truncate">{pr.assunto}</div>
                  <div className="col-span-2 p-2 px-3 border-r border-gray-100 text-text-secondary text-xs">{formatDate(pr.data_entrada)}</div>
                  <div className="col-span-1 p-2 px-3 border-r border-gray-100">
                    {prazoStatus
                      ? <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${prazoStatus.color}`}>{prazoStatus.label}</span>
                      : <span className="text-[10px] text-text-secondary">{formatDate(pr.prazo) || '—'}</span>
                    }
                  </div>
                  <div className="col-span-2 p-2 px-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap ${getStatusBadgeColor(pr.status)}`}>{pr.status.replace('_', ' ').toUpperCase()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {formModal}
    </div>
  )
}
