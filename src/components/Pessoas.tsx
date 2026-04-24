import React, { useState, useMemo } from 'react'
import { Plus, ArrowLeft, Edit, Trash2, User, Building2, MapPin, FileText, Inbox, FilePlus, ExternalLink, Search, CheckSquare } from 'lucide-react'
import type { Pessoa, Protocolo, DocumentoRecebido, DocumentoGerado, Tarefa } from '../types'

interface PessoasProps {
  pessoas: Pessoa[]
  protocolos: Protocolo[]
  documentos: DocumentoRecebido[]
  documentosGerados: DocumentoGerado[]
  tarefas: Tarefa[]
  selectedPessoa: Pessoa | null
  onSelectPessoa: (pessoa: Pessoa | null) => void
  onSavePessoa: (pessoa: Pessoa) => void
  onDeletePessoa: (id: number) => void
  onImportDoc: (pessoaId: number) => void
  onOpenFile: (path: string) => void
  onDeleteDoc: (id: number) => void
  onDeleteDocGerado: (id: number) => void
  onNewDocGerado: (pessoa: Pessoa) => void
  onEditDocGerado: (doc: DocumentoGerado) => void
  onNewTarefa: (pessoaId: number) => void
  formatDate: (dateStr: string) => string
}

export const Pessoas: React.FC<PessoasProps> = ({
  pessoas,
  protocolos,
  documentos,
  documentosGerados,
  tarefas,
  selectedPessoa,
  onSelectPessoa,
  onSavePessoa,
  onDeletePessoa,
  onImportDoc,
  onOpenFile,
  onDeleteDoc,
  onDeleteDocGerado,
  onNewDocGerado,
  onEditDocGerado,
  onNewTarefa,
  formatDate,
}) => {
  const [searchPessoa, setSearchPessoa] = useState('')
  const [isPessoaFormOpen, setIsPessoaFormOpen] = useState(false)
  const [pessoaFormData, setPessoaFormData] = useState<Pessoa>({
    nome: '', cpf: '', telefone: '', endereco: '', email: '', orgao: '', observacoes: '', status_ocorrencia: 'em_aberto', criado_em: '', atualizado_em: ''
  })

  const filteredPessoas = useMemo(() => pessoas.filter(p =>
    p.nome.toLowerCase().includes(searchPessoa.toLowerCase()) ||
    p.orgao?.toLowerCase().includes(searchPessoa.toLowerCase())
  ), [pessoas, searchPessoa])

  const pessoaProtocolos = useMemo(() => {
    if (!selectedPessoa) return []
    return protocolos.filter(pr => pr.pessoa_id === selectedPessoa.id)
  }, [protocolos, selectedPessoa])

  const pessoaDocumentos = useMemo(() => {
    if (!selectedPessoa) return []
    return documentos.filter(d => d.pessoa_id === selectedPessoa.id)
  }, [documentos, selectedPessoa])

  const pessoaDocsGerados = useMemo(() => {
    if (!selectedPessoa) return []
    return documentosGerados.filter(dg => dg.pessoa_id === selectedPessoa.id)
  }, [documentosGerados, selectedPessoa])

  const pessoaTarefas = useMemo(() => {
    if (!selectedPessoa) return []
    return tarefas.filter(t => t.pessoa_id === selectedPessoa.id)
  }, [tarefas, selectedPessoa])

  const handleSavePessoa = async (e: React.FormEvent) => {
    e.preventDefault()
    onSavePessoa(pessoaFormData)
    setIsPessoaFormOpen(false)
  }

  const getStatusOcorrenciaBadge = (status?: string) => {
    switch (status) {
      case 'concluido': return { label: 'Concluído', color: 'bg-success/10 text-success' }
      case 'em_andamento': return { label: 'Em andamento', color: 'bg-primary-btn/10 text-primary-btn' }
      case 'arquivado': return { label: 'Arquivado', color: 'bg-gray-900/10 text-gray-900' }
      default: return { label: 'Em aberto', color: 'bg-gray-100 text-gray-600' }
    }
  }

  const getFileIcon = (type: string) => {
    const t = type.toLowerCase()
    if (['jpg', 'jpeg', 'png'].includes(t)) return '🖼️'
    if (t === 'pdf') return '📄'
    if (t === 'docx' || t === 'doc') return '📝'
    return '📋'
  }

  if (selectedPessoa) {
    return (
      <div className="p-6 animate-in fade-in duration-300 h-full overflow-y-auto">
        <button onClick={() => onSelectPessoa(null)} className="flex items-center gap-2 text-text-secondary hover:text-primary-btn mb-4 transition-colors text-sm">
          <ArrowLeft size={18} /> Voltar
        </button>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-main">{selectedPessoa.nome}</h1>
            {(() => { const b = getStatusOcorrenciaBadge(selectedPessoa.status_ocorrencia); return <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded mt-1 ${b.color}`}>{b.label}</span> })()}
            <p className="text-text-secondary text-sm flex items-center gap-2 mt-1"><Building2 size={14} /> {selectedPessoa.orgao || 'Sem órgão'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setPessoaFormData(selectedPessoa); setIsPessoaFormOpen(true); }} className="flex items-center gap-1 px-3 py-1.5 bg-primary-btn text-white rounded-lg hover:opacity-90 text-sm"><Edit size={16} /> Editar</button>
            <button onClick={() => onDeletePessoa(selectedPessoa.id!)} className="flex items-center gap-1 px-3 py-1.5 bg-error-expired text-white rounded-lg hover:opacity-90 text-sm"><Trash2 size={16} /> Excluir</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {selectedPessoa.endereco && (
            <div className="col-span-2 bg-primary-btn/5 border border-primary-btn/20 p-3 rounded-lg">
              <p className="text-xs text-primary-btn uppercase font-bold mb-1 flex items-center gap-1"><MapPin size={12} /> Endereço</p>
              <p className="text-sm font-medium">{selectedPessoa.endereco}</p>
            </div>
          )}
          {selectedPessoa.telefone && (
            <div className="bg-surface-card p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-text-secondary uppercase font-bold mb-1">Telefone</p>
              <p className="text-sm">{selectedPessoa.telefone}</p>
            </div>
          )}
          {selectedPessoa.cpf && (
            <div className="bg-surface-card p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-text-secondary uppercase font-bold mb-1">CPF</p>
              <p className="text-sm">{selectedPessoa.cpf}</p>
            </div>
          )}
          {selectedPessoa.email && (
            <div className="bg-surface-card p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-text-secondary uppercase font-bold mb-1">E-mail</p>
              <p className="text-sm break-all">{selectedPessoa.email}</p>
            </div>
          )}
          {selectedPessoa.orgao && (
            <div className="bg-surface-card p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-text-secondary uppercase font-bold mb-1">Órgão / Empresa / Tipo de Ocorrência</p>
              <p className="text-sm">{selectedPessoa.orgao}</p>
            </div>
          )}
          {selectedPessoa.observacoes && (
            <div className="col-span-2 bg-surface-card p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-text-secondary uppercase font-bold mb-1">Observações</p>
              <p className="text-sm whitespace-pre-wrap">{selectedPessoa.observacoes}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-sm mb-2 flex items-center gap-2"><FileText size={16} /> Protocolos ({pessoaProtocolos.length})</h3>
            {pessoaProtocolos.length === 0 ? (
              <p className="text-xs text-text-secondary bg-surface-card p-3 rounded-lg">Nenhum protocolo vinculado</p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {pessoaProtocolos.map(p => (
                  <div key={p.id} className="text-xs bg-white p-2 px-3 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{p.numero} — {p.assunto}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ml-2 ${p.status === 'concluido' ? 'bg-success/10 text-success' : p.status === 'em_andamento' ? 'bg-primary-btn/10 text-primary-btn' : 'bg-gray-100 text-gray-600'}`}>{p.status.replace('_', ' ')}</span>
                    </div>
                    {selectedPessoa.endereco && (
                      <p className="text-text-secondary mt-0.5 flex items-center gap-1"><MapPin size={10} />{selectedPessoa.endereco}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-sm flex items-center gap-2"><Inbox size={16} /> Documentos Recebidos ({pessoaDocumentos.length})</h3>
              <button onClick={() => onImportDoc(selectedPessoa.id!)} className="flex items-center gap-1 px-2 py-1 bg-primary-btn text-white rounded text-xs hover:opacity-90"><Plus size={14} /> Importar</button>
            </div>
            {pessoaDocumentos.length === 0 ? (
              <p className="text-xs text-text-secondary bg-surface-card p-3 rounded-lg">Nenhum documento</p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {pessoaDocumentos.map(d => (
                  <div key={d.id} className="text-xs bg-white p-2 px-3 rounded-lg border border-gray-100 flex justify-between items-center group">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span>{getFileIcon(d.tipo)}</span>
                      <span className="truncate font-bold">{d.nome}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onOpenFile(d.caminho!)} className="p-1 text-primary-btn hover:bg-primary-btn/10 rounded"><ExternalLink size={14} /></button>
                      <button onClick={() => onDeleteDoc(d.id!)} className="p-1 text-error-expired hover:bg-error-expired/10 rounded"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-sm flex items-center gap-2"><FilePlus size={16} /> Documentos Gerados ({pessoaDocsGerados.length})</h3>
              <button onClick={() => onNewDocGerado(selectedPessoa)} className="flex items-center gap-1 px-2 py-1 bg-primary-btn text-white rounded text-xs hover:opacity-90"><Plus size={14} /> Novo</button>
            </div>
            {pessoaDocsGerados.length === 0 ? (
              <p className="text-xs text-text-secondary bg-surface-card p-3 rounded-lg">Nenhum documento</p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {pessoaDocsGerados.map(d => (
                  <div key={d.id} onClick={() => onEditDocGerado(d)} className="text-xs bg-white p-2 px-3 rounded-lg border border-gray-100 hover:border-primary-btn/40 hover:bg-primary-btn/5 flex justify-between items-center group cursor-pointer transition-colors">
                    <div className="flex-1 min-w-0">
                      <span className="font-bold">{d.titulo}</span>
                      <span className="text-text-secondary ml-2">{d.tipo}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.caminho && <button onClick={e => { e.stopPropagation(); onOpenFile(d.caminho!) }} className="p-1 text-primary-btn hover:bg-primary-btn/10 rounded"><ExternalLink size={14} /></button>}
                      <button onClick={e => { e.stopPropagation(); onDeleteDocGerado(d.id!) }} className="p-1 text-error-expired hover:bg-error-expired/10 rounded"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-sm flex items-center gap-2"><CheckSquare size={16} /> Tarefas ({pessoaTarefas.length})</h3>
              <button onClick={() => onNewTarefa(selectedPessoa.id!)} className="flex items-center gap-1 px-2 py-1 bg-primary-btn text-white rounded text-xs hover:opacity-90"><Plus size={14} /> Nova Tarefa</button>
            </div>
            {pessoaTarefas.length === 0 ? (
              <p className="text-xs text-text-secondary bg-surface-card p-3 rounded-lg">Nenhuma tarefa vinculada</p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {pessoaTarefas.map(t => (
                  <div key={t.id} className="text-xs bg-white p-2 px-3 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className={`font-bold ${t.status === 'concluida' ? 'line-through text-text-secondary' : ''}`}>{t.titulo}</span>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
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

        {isPessoaFormOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-surface-card"><h2 className="text-lg font-bold">Editar Pessoa</h2><button onClick={() => setIsPessoaFormOpen(false)} className="text-text-secondary hover:text-text-main">✕</button></div>
              <form onSubmit={handleSavePessoa} className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-text-secondary uppercase mb-1">Nome *</label><input required className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={pessoaFormData.nome} onChange={e => setPessoaFormData({...pessoaFormData, nome: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-text-secondary uppercase mb-1">CPF</label><input className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={pessoaFormData.cpf} onChange={e => setPessoaFormData({...pessoaFormData, cpf: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-text-secondary uppercase mb-1">E-mail</label><input type="email" className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={pessoaFormData.email} onChange={e => setPessoaFormData({...pessoaFormData, email: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-text-secondary uppercase mb-1">Telefone</label><input className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={pessoaFormData.telefone} onChange={e => setPessoaFormData({...pessoaFormData, telefone: e.target.value})} /></div>
                  <div className="col-span-2"><label className="block text-xs font-bold text-text-secondary uppercase mb-1">Órgão / Empresa / Tipo de Ocorrência</label><input className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={pessoaFormData.orgao} onChange={e => setPessoaFormData({...pessoaFormData, orgao: e.target.value})} /></div>
                  <div className="col-span-2"><label className="block text-xs font-bold text-text-secondary uppercase mb-1">Endereço</label><input className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={pessoaFormData.endereco} onChange={e => setPessoaFormData({...pessoaFormData, endereco: e.target.value})} /></div>
                  <div className="col-span-2"><label className="block text-xs font-bold text-text-secondary uppercase mb-1">Status da Ocorrência</label><select className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={pessoaFormData.status_ocorrencia || 'em_aberto'} onChange={e => setPessoaFormData({...pessoaFormData, status_ocorrencia: e.target.value as Pessoa['status_ocorrencia']})}><option value="em_aberto">Em aberto</option><option value="em_andamento">Em andamento</option><option value="concluido">Concluído</option><option value="arquivado">Arquivado</option></select></div>
                  <div className="col-span-2"><label className="block text-xs font-bold text-text-secondary uppercase mb-1">Observações</label><textarea rows={2} className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none resize-none" value={pessoaFormData.observacoes} onChange={e => setPessoaFormData({...pessoaFormData, observacoes: e.target.value})} /></div>
                </div>
                <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setIsPessoaFormOpen(false)} className="px-4 py-2 text-text-secondary font-bold hover:text-text-main text-sm">Cancelar</button><button type="submit" className="px-6 py-2 bg-primary-btn text-white rounded font-bold hover:opacity-90 text-sm">Salvar</button></div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div><h1 className="text-2xl font-bold">Pessoas / Dossiês</h1><p className="text-text-secondary text-sm">Gerencie seus contatos e dossiês.</p></div>
        <button onClick={() => { setPessoaFormData({ nome: '', cpf: '', telefone: '', endereco: '', email: '', orgao: '', observacoes: '', status_ocorrencia: 'em_aberto', criado_em: '', atualizado_em: '' }); setIsPessoaFormOpen(true); }} className="flex items-center gap-2 bg-primary-btn text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 text-sm"><Plus size={18} /> Nova Pessoa</button>
      </div>
      <div className="mb-4 relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
        <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 bg-surface-card border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-btn/20 text-sm" value={searchPessoa} onChange={(e) => setSearchPessoa(e.target.value)} />
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-1">
          {filteredPessoas.map(p => (
            <div key={p.id} onClick={() => onSelectPessoa(p)} className="bg-white py-1 px-3 rounded-lg border border-gray-100 hover:border-primary-btn/50 cursor-pointer transition-all flex items-center gap-3 group">
              <User size={14} className="text-text-secondary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-text-main">{p.nome}</p>
                  {(() => { const b = getStatusOcorrenciaBadge(p.status_ocorrencia); return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${b.color}`}>{b.label}</span> })()}
                </div>
                <p className="text-xs text-text-secondary truncate">{p.orgao || '—'} • {p.email || '—'}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); }} className="px-3 py-1 bg-primary-btn text-white rounded text-xs hover:opacity-90 opacity-0 group-hover:opacity-100 transition-opacity">Ver Dossiê</button>
            </div>
          ))}
        </div>
      </div>

      {isPessoaFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-surface-card"><h2 className="text-lg font-bold">Nova Pessoa</h2><button onClick={() => setIsPessoaFormOpen(false)} className="text-text-secondary hover:text-text-main">✕</button></div>
            <form onSubmit={handleSavePessoa} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-text-secondary uppercase mb-1">Nome *</label><input required className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={pessoaFormData.nome} onChange={e => setPessoaFormData({...pessoaFormData, nome: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-text-secondary uppercase mb-1">CPF</label><input className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={pessoaFormData.cpf} onChange={e => setPessoaFormData({...pessoaFormData, cpf: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-text-secondary uppercase mb-1">E-mail</label><input type="email" className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={pessoaFormData.email} onChange={e => setPessoaFormData({...pessoaFormData, email: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-text-secondary uppercase mb-1">Telefone</label><input className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={pessoaFormData.telefone} onChange={e => setPessoaFormData({...pessoaFormData, telefone: e.target.value})} /></div>
                <div className="col-span-2"><label className="block text-xs font-bold text-text-secondary uppercase mb-1">Órgão / Empresa / Tipo de Ocorrência</label><input className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={pessoaFormData.orgao} onChange={e => setPessoaFormData({...pessoaFormData, orgao: e.target.value})} /></div>
                <div className="col-span-2"><label className="block text-xs font-bold text-text-secondary uppercase mb-1">Endereço</label><input className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={pessoaFormData.endereco} onChange={e => setPessoaFormData({...pessoaFormData, endereco: e.target.value})} /></div>
                <div className="col-span-2"><label className="block text-xs font-bold text-text-secondary uppercase mb-1">Status da Ocorrência</label><select className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none" value={pessoaFormData.status_ocorrencia || 'em_aberto'} onChange={e => setPessoaFormData({...pessoaFormData, status_ocorrencia: e.target.value as Pessoa['status_ocorrencia']})}><option value="em_aberto">Em aberto</option><option value="em_andamento">Em andamento</option><option value="concluido">Concluído</option><option value="arquivado">Arquivado</option></select></div>
                <div className="col-span-2"><label className="block text-xs font-bold text-text-secondary uppercase mb-1">Observações</label><textarea rows={2} className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none resize-none" value={pessoaFormData.observacoes} onChange={e => setPessoaFormData({...pessoaFormData, observacoes: e.target.value})} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setIsPessoaFormOpen(false)} className="px-4 py-2 text-text-secondary font-bold hover:text-text-main text-sm">Cancelar</button><button type="submit" className="px-6 py-2 bg-primary-btn text-white rounded font-bold hover:opacity-90 text-sm">Salvar</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
