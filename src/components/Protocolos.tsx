import React, { useState, useMemo } from 'react'
import { Plus, ArrowLeft, History, Send, Trash2, Search, Edit2, Phone, MapPin, CreditCard, CheckSquare, ExternalLink, X } from 'lucide-react'
import type { Protocolo, Pessoa, Movimentacao, Tarefa, Encaminhamento } from '../types'
import { supabase } from '../lib/supabase'

interface ProtocolosProps {
  protocolos: Protocolo[]
  pessoas: Pessoa[]
  tarefas: Tarefa[]
  encaminhamentos: Encaminhamento[]
  selectedProtocolo: Protocolo | null
  onSelectProtocolo: (protocolo: Protocolo | null) => void
  onSaveProtocolo: (protocolo: Protocolo) => void
  onDeleteProtocolo: (id: number) => void
  onUpdateStatus: (id: number, status: string) => void
  onAddMovimentacao: (id: number, texto: string) => void
  onNewTarefa: (protocoloId: number, pessoaId: number) => void
  onSaveEncaminhamento: (enc: Encaminhamento) => void
  onDeleteEncaminhamento: (id: number) => void
  onUpdateEncaminhamentoStatus: (id: number, status: Encaminhamento['status']) => void
  formatDate: (dateStr: string) => string
  getPrazoStatus: (prazo: string) => { label: string; color: string } | null
}

const ORGAOS_SUGERIDOS = ['SEMIO', 'CBMAM', 'SEMMA', 'SEMASC', 'Setor de Tributos', 'SEMDCEP', 'Prefeitura Municipal', 'Ministério Público', 'Outro']

const ETAPAS = [
  { label: 'Registrado', status: 'aberto', cor: 'bg-gray-400' },
  { label: 'Em Andamento', status: 'em_andamento', cor: 'bg-primary-btn' },
  { label: 'Concluído', status: 'concluido', cor: 'bg-success' },
]

function StepperStatus({ status }: { status: string }) {
  const idx = ETAPAS.findIndex(e => e.status === status)
  return (
    <div className="flex items-center gap-0 w-full">
      {ETAPAS.map((etapa, i) => {
        const ativo = i <= idx
        const atual = i === idx
        return (
          <React.Fragment key={etapa.status}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 transition-all ${ativo ? etapa.cor + ' border-transparent' : 'bg-white border-gray-300 text-gray-400'} ${atual ? 'ring-2 ring-offset-1 ring-primary-btn/40' : ''}`}>
                {ativo ? '✓' : i + 1}
              </div>
              <p className={`text-[10px] mt-1 font-bold text-center whitespace-nowrap ${ativo ? 'text-text-main' : 'text-gray-400'}`}>{etapa.label}</p>
            </div>
            {i < ETAPAS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < idx ? 'bg-success' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export const Protocolos: React.FC<ProtocolosProps> = ({
  protocolos, pessoas, tarefas, encaminhamentos,
  selectedProtocolo, onSelectProtocolo,
  onSaveProtocolo, onDeleteProtocolo, onUpdateStatus,
  onAddMovimentacao, onNewTarefa,
  onSaveEncaminhamento, onDeleteEncaminhamento, onUpdateEncaminhamentoStatus,
  formatDate, getPrazoStatus,
}) => {
  const [searchProtocolo, setSearchProtocolo] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState<Protocolo>({
    pessoa_id: 0, numero: '', assunto: '', descricao: '',
    data_entrada: '', prazo: '', status: 'aberto', historico: '[]',
    criado_em: '', atualizado_em: ''
  })
  const [novaMovimentacao, setNovaMovimentacao] = useState('')
  const [encFormOpen, setEncFormOpen] = useState(false)
  const [encForm, setEncForm] = useState<Partial<Encaminhamento>>({
    orgao: '', data_envio: '', descricao: '', status: 'pendente', retorno: '', data_retorno: ''
  })
  const [encRetornoId, setEncRetornoId] = useState<number | null>(null)
  const [encRetornoTexto, setEncRetornoTexto] = useState('')
  const [encRetornoData, setEncRetornoData] = useState('')

  const filteredProtocolos = useMemo(() => protocolos.filter(p =>
    p.numero.toLowerCase().includes(searchProtocolo.toLowerCase()) ||
    p.assunto.toLowerCase().includes(searchProtocolo.toLowerCase()) ||
    (p.pessoa_nome || '').toLowerCase().includes(searchProtocolo.toLowerCase())
  ), [protocolos, searchProtocolo])

  const protocoloTarefas = useMemo(() =>
    !selectedProtocolo ? [] : tarefas.filter(t => t.protocolo_id === selectedProtocolo.id)
  , [tarefas, selectedProtocolo])

  const protocoloEncaminhamentos = useMemo(() =>
    !selectedProtocolo ? [] : encaminhamentos
      .filter(e => e.protocolo_id === selectedProtocolo.id)
      .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
  , [encaminhamentos, selectedProtocolo])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    let dados = formData
    // Protocolo NOVO e sem número digitado -> pega o proximo da fila central
    // SOMENTE agora, na hora de salvar (cancelar nao consome numero).
    if (!formData.id && !formData.numero.trim()) {
      try {
        const { data, error } = await supabase.rpc('proximo_protocolo')
        if (!error && data) dados = { ...formData, numero: String(data) }
      } catch (err) {
        console.error('Erro ao gerar numero de protocolo:', err)
      }
    }
    onSaveProtocolo(dados)
    setIsFormOpen(false)
  }

  const handleSaveEncaminhamento = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProtocolo?.id) return
    onSaveEncaminhamento({
      protocolo_id: selectedProtocolo.id,
      orgao: encForm.orgao || '',
      data_envio: encForm.data_envio || '',
      descricao: encForm.descricao || '',
      status: 'pendente',
      criado_em: new Date().toISOString(),
    })
    setEncFormOpen(false)
    setEncForm({ orgao: '', data_envio: '', descricao: '', status: 'pendente' })
  }

  const handleSalvarRetorno = (id: number) => {
    onUpdateEncaminhamentoStatus(id, 'respondido')
    // Salva retorno como movimentação no protocolo também
    if (selectedProtocolo?.id && encRetornoTexto) {
      onAddMovimentacao(selectedProtocolo.id, `Retorno de encaminhamento: ${encRetornoTexto}`)
    }
    setEncRetornoId(null)
    setEncRetornoTexto('')
    setEncRetornoData('')
  }

  const getStatusBadgeColor = (status: string) => {
    if (status === 'concluido') return 'bg-success/10 text-success'
    if (status === 'em_andamento') return 'bg-primary-btn/10 text-primary-btn'
    return 'bg-gray-100 text-gray-600'
  }

  const getEncStatusBadge = (status: string) => {
    if (status === 'respondido') return { label: 'Respondido', cls: 'bg-success/10 text-success' }
    if (status === 'arquivado') return { label: 'Arquivado', cls: 'bg-gray-100 text-gray-500' }
    return { label: 'Pendente', cls: 'bg-deadline-alert/10 text-deadline-alert' }
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
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Pessoa *</label>
              <select required className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.pessoa_id} onChange={e => setFormData({...formData, pessoa_id: parseInt(e.target.value)})}>
                <option value="">Selecione</option>
                {pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Número</label>
              <input placeholder="Gerado automaticamente ao salvar" className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.numero} onChange={e => setFormData({...formData, numero: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Assunto *</label>
              <input required className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.assunto} onChange={e => setFormData({...formData, assunto: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Data de Entrada</label>
              <input type="date" className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.data_entrada} onChange={e => setFormData({...formData, data_entrada: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Prazo</label>
              <input type="date" className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.prazo} onChange={e => setFormData({...formData, prazo: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Status</label>
              <select className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as Protocolo['status']})}>
                <option value="aberto">Registrado</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluido">Concluído</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Descrição</label>
              <textarea rows={2} className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none resize-none" value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} />
            </div>
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
    // Protocolo encerrado (concluído ou arquivado) não cobra prazo — não mostra "vencido".
    const encerrado = selectedProtocolo.status === 'concluido' || selectedProtocolo.status === 'arquivado'
    const prazoStatus = !encerrado ? getPrazoStatus(selectedProtocolo.prazo) : null
    const encPendentes = protocoloEncaminhamentos.filter(e => e.status === 'pendente').length

    return (
      <div className="p-4 h-full overflow-y-auto">
        <button onClick={() => onSelectProtocolo(null)} className="flex items-center gap-2 text-primary-btn mb-4 hover:opacity-80 text-sm">
          <ArrowLeft size={18} /> Voltar
        </button>

        {/* Cabeçalho */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold">{selectedProtocolo.numero}</h1>
            <p className="text-text-secondary text-sm mt-1">{selectedProtocolo.assunto}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setFormData({ ...selectedProtocolo }); setIsFormOpen(true) }} className="flex items-center gap-1 px-3 py-1.5 bg-primary-btn text-white rounded-lg hover:opacity-90 text-sm"><Edit2 size={15} /> Editar</button>
            <button onClick={() => onDeleteProtocolo(selectedProtocolo.id!)} className="flex items-center gap-1 px-3 py-1.5 bg-error-expired text-white rounded-lg hover:opacity-90 text-sm"><Trash2 size={16} /> Excluir</button>
          </div>
        </div>

        {/* Stepper de status */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-sm">Fluxo do Protocolo</h3>
            {prazoStatus ? (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${prazoStatus.color}`}>
                Prazo: {formatDate(selectedProtocolo.prazo)} — {prazoStatus.label}
              </span>
            ) : selectedProtocolo.status === 'arquivado' ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-600">ARQUIVADO</span>
            ) : selectedProtocolo.status === 'concluido' ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-success/10 text-success">CONCLUÍDO</span>
            ) : null}
          </div>
          <StepperStatus status={selectedProtocolo.status} />
          <div className="flex gap-2 mt-3">
            {ETAPAS.map(etapa => (
              <button
                key={etapa.status}
                onClick={() => onUpdateStatus(selectedProtocolo.id!, etapa.status)}
                disabled={selectedProtocolo.status === etapa.status}
                className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${selectedProtocolo.status === etapa.status ? etapa.cor + ' text-white opacity-90 cursor-default' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'}`}
              >
                {etapa.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">

            {/* Dados do interessado */}
            {(selectedProtocolo.pessoa_nome || selectedProtocolo.pessoa_endereco || selectedProtocolo.pessoa_telefone) && (
              <div className="bg-primary-btn/5 border border-primary-btn/20 p-4 rounded-lg">
                <h3 className="font-bold text-sm mb-3 text-primary-btn">Dados do Interessado</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedProtocolo.pessoa_nome && <div><p className="text-xs font-bold text-text-secondary uppercase mb-0.5">Nome</p><p className="font-bold">{selectedProtocolo.pessoa_nome}</p></div>}
                  {selectedProtocolo.data_entrada && <div><p className="text-xs font-bold text-text-secondary uppercase mb-0.5">Data de Entrada</p><p>{formatDate(selectedProtocolo.data_entrada)}</p></div>}
                  {selectedProtocolo.pessoa_cpf && (
                    <div className="flex items-center gap-2"><CreditCard size={13} className="text-primary-btn shrink-0" /><div><p className="text-xs font-bold text-text-secondary uppercase mb-0.5">CPF</p><p>{selectedProtocolo.pessoa_cpf}</p></div></div>
                  )}
                  {selectedProtocolo.pessoa_telefone && (
                    <div className="flex items-center gap-2"><Phone size={13} className="text-primary-btn shrink-0" /><div><p className="text-xs font-bold text-text-secondary uppercase mb-0.5">Telefone</p><p>{selectedProtocolo.pessoa_telefone}</p></div></div>
                  )}
                  {selectedProtocolo.pessoa_endereco && (
                    <div className="col-span-2 flex items-start gap-2"><MapPin size={13} className="text-primary-btn shrink-0 mt-0.5" /><div><p className="text-xs font-bold text-text-secondary uppercase mb-0.5">Endereço</p><p>{selectedProtocolo.pessoa_endereco}</p></div></div>
                  )}
                  {selectedProtocolo.descricao && (
                    <div className="col-span-2"><p className="text-xs font-bold text-text-secondary uppercase mb-0.5">Descrição</p><p>{selectedProtocolo.descricao}</p></div>
                  )}
                </div>
              </div>
            )}

            {/* Encaminhamentos */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <ExternalLink size={16} /> Encaminhamentos ({protocoloEncaminhamentos.length})
                  {encPendentes > 0 && <span className="text-[10px] font-bold bg-deadline-alert/10 text-deadline-alert px-1.5 py-0.5 rounded">{encPendentes} pendente(s)</span>}
                </h3>
                <button onClick={() => setEncFormOpen(true)} className="flex items-center gap-1 px-2 py-1 bg-primary-btn text-white rounded text-xs hover:opacity-90">
                  <Plus size={14} /> Novo
                </button>
              </div>

              {/* Formulário de novo encaminhamento */}
              {encFormOpen && (
                <form onSubmit={handleSaveEncaminhamento} className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-text-secondary uppercase">Novo Encaminhamento</p>
                    <button type="button" onClick={() => setEncFormOpen(false)} className="text-text-secondary hover:text-text-main"><X size={14} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1">Órgão Destino *</label>
                      <select required className="w-full p-1.5 bg-white border border-gray-200 rounded text-sm outline-none" value={encForm.orgao} onChange={e => setEncForm({...encForm, orgao: e.target.value})}>
                        <option value="">Selecione</option>
                        {ORGAOS_SUGERIDOS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1">Data de Envio *</label>
                      <input required type="date" className="w-full p-1.5 bg-white border border-gray-200 rounded text-sm outline-none" value={encForm.data_envio} onChange={e => setEncForm({...encForm, data_envio: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-text-secondary mb-1">Descrição / Objeto</label>
                      <input className="w-full p-1.5 bg-white border border-gray-200 rounded text-sm outline-none" placeholder="O que foi encaminhado..." value={encForm.descricao} onChange={e => setEncForm({...encForm, descricao: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEncFormOpen(false)} className="px-3 py-1.5 text-text-secondary text-xs font-bold">Cancelar</button>
                    <button type="submit" className="px-4 py-1.5 bg-primary-btn text-white rounded text-xs font-bold hover:opacity-90">Salvar</button>
                  </div>
                </form>
              )}

              {/* Lista de encaminhamentos */}
              {protocoloEncaminhamentos.length === 0 ? (
                <p className="text-text-secondary italic text-sm">Nenhum encaminhamento registrado.</p>
              ) : (
                <div className="space-y-3">
                  {protocoloEncaminhamentos.map(enc => {
                    const badge = getEncStatusBadge(enc.status)
                    const isRetorno = encRetornoId === enc.id
                    return (
                      <div key={enc.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-sm">{enc.orgao}</p>
                            <p className="text-xs text-text-secondary mt-0.5">Enviado em {formatDate(enc.data_envio)}</p>
                            {enc.descricao && <p className="text-xs text-text-secondary mt-0.5">{enc.descricao}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
                            <button onClick={() => onDeleteEncaminhamento(enc.id!)} className="text-gray-300 hover:text-error-expired transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </div>
                        {enc.retorno && (
                          <div className="mt-2 p-2 bg-success/5 border border-success/20 rounded text-xs">
                            <p className="font-bold text-success mb-0.5">Retorno recebido {enc.data_retorno ? `em ${formatDate(enc.data_retorno)}` : ''}:</p>
                            <p>{enc.retorno}</p>
                          </div>
                        )}
                        {enc.status === 'pendente' && !isRetorno && (
                          <button onClick={() => { setEncRetornoId(enc.id!); setEncRetornoTexto(''); setEncRetornoData('') }} className="mt-2 text-xs text-primary-btn font-bold hover:underline">+ Registrar retorno</button>
                        )}
                        {isRetorno && (
                          <div className="mt-2 space-y-2">
                            <input type="date" className="w-full p-1.5 border border-gray-200 rounded text-xs outline-none" value={encRetornoData} onChange={e => setEncRetornoData(e.target.value)} placeholder="Data do retorno" />
                            <textarea rows={2} className="w-full p-1.5 border border-gray-200 rounded text-xs outline-none resize-none" placeholder="Descreva o retorno recebido..." value={encRetornoTexto} onChange={e => setEncRetornoTexto(e.target.value)} />
                            <div className="flex gap-2">
                              <button onClick={() => handleSalvarRetorno(enc.id!)} className="px-3 py-1 bg-success text-white rounded text-xs font-bold hover:opacity-90">Salvar Retorno</button>
                              <button onClick={() => setEncRetornoId(null)} className="px-3 py-1 text-text-secondary text-xs font-bold">Cancelar</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Histórico de movimentações */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><History size={16} /> Histórico de Movimentações</h3>
              <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                {historico.length > 0 ? historico.map((mov, idx) => (
                  <div key={idx} className="p-2 border border-gray-100 rounded text-xs">
                    <p className="text-text-secondary font-bold mb-0.5">{formatDate(mov.data)}</p>
                    <p className="text-sm">{mov.texto}</p>
                  </div>
                )) : <p className="text-text-secondary italic text-sm">Nenhuma movimentação.</p>}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Adicionar movimentação..."
                  className="flex-1 p-2 border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-primary-btn/20"
                  value={novaMovimentacao}
                  onChange={e => setNovaMovimentacao(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (novaMovimentacao.trim()) { onAddMovimentacao(selectedProtocolo.id!, novaMovimentacao); setNovaMovimentacao('') } }}}
                />
                <button onClick={() => { if (novaMovimentacao.trim()) { onAddMovimentacao(selectedProtocolo.id!, novaMovimentacao); setNovaMovimentacao('') } }} className="px-3 py-2 bg-primary-btn text-white rounded text-sm font-bold hover:opacity-90"><Send size={14} /></button>
              </div>
            </div>

            {/* Tarefas */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-sm flex items-center gap-2"><CheckSquare size={16} /> Tarefas ({protocoloTarefas.length})</h3>
                <button onClick={() => onNewTarefa(selectedProtocolo.id!, selectedProtocolo.pessoa_id)} className="flex items-center gap-1 px-2 py-1 bg-primary-btn text-white rounded text-xs hover:opacity-90"><Plus size={14} /> Nova</button>
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

          {/* Coluna direita */}
          <div className="col-span-1 space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <h3 className="font-bold text-sm mb-3">Alterar Status</h3>
              <select value={selectedProtocolo.status} onChange={e => onUpdateStatus(selectedProtocolo.id!, e.target.value)} className="w-full p-2 border border-gray-200 rounded text-sm mb-3 outline-none focus:ring-2 focus:ring-primary-btn/20">
                <option value="aberto">Registrado</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluido">Concluído</option>
                <option value="arquivado">Arquivado</option>
              </select>
              {prazoStatus && (
                <div className={`p-3 rounded text-center font-bold text-sm ${prazoStatus.color}`}>
                  Prazo: {formatDate(selectedProtocolo.prazo)}<br />
                  <span className="text-xs">{prazoStatus.label}</span>
                </div>
              )}
            </div>

            {/* Resumo encaminhamentos */}
            {protocoloEncaminhamentos.length > 0 && (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="font-bold text-sm mb-3">Encaminhamentos</h3>
                <div className="space-y-1">
                  {[
                    { label: 'Pendentes', count: protocoloEncaminhamentos.filter(e => e.status === 'pendente').length, cls: 'text-deadline-alert' },
                    { label: 'Respondidos', count: protocoloEncaminhamentos.filter(e => e.status === 'respondido').length, cls: 'text-success' },
                    { label: 'Total', count: protocoloEncaminhamentos.length, cls: 'text-text-main' },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                      <span className="text-xs text-text-secondary">{row.label}</span>
                      <span className={`font-bold text-sm ${row.cls}`}>{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
        <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-3 py-2 bg-surface-card border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-btn/20 text-sm" value={searchProtocolo} onChange={e => setSearchProtocolo(e.target.value)} />
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
              const prazoStatus = (pr.status !== 'concluido' && pr.status !== 'arquivado') ? getPrazoStatus(pr.prazo) : null
              const encPend = encaminhamentos.filter(e => e.protocolo_id === pr.id && e.status === 'pendente').length
              return (
                <div key={pr.id} onClick={() => onSelectProtocolo(pr)} className="grid grid-cols-12 gap-0 hover:bg-primary-btn/5 cursor-pointer transition-colors text-sm">
                  <div className="col-span-2 p-2 px-3 border-r border-gray-100 font-bold text-primary-btn truncate">
                    {pr.numero}
                    {encPend > 0 && <span className="ml-1 text-[9px] bg-deadline-alert/10 text-deadline-alert font-bold px-1 rounded">{encPend} enc.</span>}
                  </div>
                  <div className="col-span-2 p-2 px-3 border-r border-gray-100 truncate">{pr.pessoa_nome || '—'}</div>
                  <div className="col-span-3 p-2 px-3 border-r border-gray-100 truncate">{pr.assunto}</div>
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
