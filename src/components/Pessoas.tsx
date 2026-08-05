import React, { useState, useMemo, useLayoutEffect, useRef, useCallback } from 'react'
import { Plus, ArrowLeft, Edit, Trash2, Building2, MapPin, FileText, Inbox, FilePlus, ExternalLink, Search, CheckSquare, Upload, Loader, Printer } from 'lucide-react'
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
  onUpdateStatus: (id: number, status: string) => void
  onImportDoc: (pessoaId: number, file: File) => Promise<void>
  onOpenFile: (path: string) => void
  onDeleteDoc: (id: number, caminho?: string) => void
  onDeleteDocGerado: (id: number) => void
  onNewDocGerado: (pessoa: Pessoa) => void
  onEditDocGerado: (doc: DocumentoGerado) => void
  onNewTarefa: (pessoaId: number) => void
  formatDate: (dateStr: string) => string
}

const PESSOA_VAZIA: Pessoa = {
  nome: '', cpf: '', rg: '', data_nascimento: '', genero: '', estado_civil: '',
  telefone: '', email: '', endereco: '', bairro: '', municipio: '', cep: '',
  ponto_referencia: '', gps_lat: undefined, gps_lng: undefined,
  orgao: '', num_pessoas_familia: undefined, renda_familiar: '', programa_social: '',
  tipo_moradia: '', material_construcao: '', area_risco: undefined,
  deficiencia: '', doenca_cronica: '', prioridade: '',
  observacoes: '', status_ocorrencia: 'em_aberto', criado_em: '', atualizado_em: ''
}

const inputCls = "w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none"
const selectCls = "w-full p-2 bg-surface-card border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-btn/20 outline-none"

function SecaoForm({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <p className="text-xs font-bold text-text-secondary uppercase">{titulo}</p>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function Campo({ label, span2, children }: { label: string; span2?: boolean; children: React.ReactNode }) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <label className="block text-xs font-bold text-text-secondary uppercase mb-1">{label}</label>
      {children}
    </div>
  )
}

export const Pessoas: React.FC<PessoasProps> = ({
  pessoas, protocolos, documentos, documentosGerados, tarefas,
  selectedPessoa, onSelectPessoa, onSavePessoa, onDeletePessoa, onUpdateStatus,
  onImportDoc, onOpenFile, onDeleteDoc, onDeleteDocGerado,
  onNewDocGerado, onEditDocGerado, onNewTarefa, formatDate,
}) => {
  const [searchPessoa, setSearchPessoa] = useState('')
  const [isPessoaFormOpen, setIsPessoaFormOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set())
  const [pessoaFormData, setPessoaFormData] = useState<Pessoa>({ ...PESSOA_VAZIA })

  const listRef = useRef<HTMLDivElement>(null)
  const savedScrollRef = useRef(0)

  // Restaura posição do scroll antes do browser pintar (evita piscar)
  useLayoutEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = savedScrollRef.current
    }
  }, [pessoas])

  const handleListScroll = useCallback(() => {
    if (listRef.current) savedScrollRef.current = listRef.current.scrollTop
  }, [])

  const setF = useCallback((partial: Partial<Pessoa>) => {
    setPessoaFormData(prev => ({ ...prev, ...partial }))
  }, [])

  const filteredPessoas = useMemo(() => pessoas.filter(p =>
    p.nome.toLowerCase().includes(searchPessoa.toLowerCase()) ||
    p.orgao?.toLowerCase().includes(searchPessoa.toLowerCase()) ||
    p.bairro?.toLowerCase().includes(searchPessoa.toLowerCase())
  ), [pessoas, searchPessoa])

  const pessoaProtocolos = useMemo(() => !selectedPessoa ? [] : protocolos.filter(pr => pr.pessoa_id === selectedPessoa.id), [protocolos, selectedPessoa])
  const pessoaDocumentos = useMemo(() => !selectedPessoa ? [] : documentos.filter(d => d.pessoa_id === selectedPessoa.id), [documentos, selectedPessoa])
  const pessoaDocsGerados = useMemo(() => !selectedPessoa ? [] : documentosGerados.filter(dg => dg.pessoa_id === selectedPessoa.id), [documentosGerados, selectedPessoa])
  const pessoaTarefas = useMemo(() => !selectedPessoa ? [] : tarefas.filter(t => t.pessoa_id === selectedPessoa.id), [tarefas, selectedPessoa])

  const handleSavePessoa = async (e: React.FormEvent) => {
    e.preventDefault()
    onSavePessoa(pessoaFormData)
    setIsPessoaFormOpen(false)
  }

  const handleImportClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.txt'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file || !selectedPessoa) return
      if (file.size > 20 * 1024 * 1024) { alert('Arquivo muito grande. O limite é 20MB.'); return }
      setUploading(true)
      try { await onImportDoc(selectedPessoa.id!, file) } finally { setUploading(false) }
    }
    input.click()
  }

  const toggleSelecionada = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelecionadas(prev => {
      const novo = new Set(prev)
      novo.has(id) ? novo.delete(id) : novo.add(id)
      return novo
    })
  }

  const handleImprimirRoteiro = () => {
    const lista = selecionadas.size > 0 ? filteredPessoas.filter(p => selecionadas.has(p.id!)) : filteredPessoas
    const hoje = new Date().toLocaleDateString('pt-BR')
    const linhas = lista.map((p, i) => {
      const prots = protocolos.filter(pr => pr.pessoa_id === p.id)
      const endCompleto = [p.endereco, p.bairro, p.municipio].filter(Boolean).join(', ')
      return `<div class="card"><div class="numero">${i + 1}</div><div class="info">
        <div class="nome">${p.nome}</div>
        ${p.orgao ? `<div class="detalhe"><b>Órgão/Tipo:</b> ${p.orgao}</div>` : ''}
        ${p.cpf ? `<div class="detalhe"><b>CPF:</b> ${p.cpf}</div>` : ''}
        ${p.telefone ? `<div class="detalhe"><b>Tel:</b> ${p.telefone}</div>` : ''}
        ${endCompleto ? `<div class="detalhe endereco"><b>Endereço:</b> ${endCompleto}</div>` : ''}
        ${p.ponto_referencia ? `<div class="detalhe"><b>Ref:</b> ${p.ponto_referencia}</div>` : ''}
        ${p.area_risco ? `<div class="detalhe risco">⚠️ Área de risco</div>` : ''}
        ${prots.length > 0 ? `<div class="detalhe"><b>Protocolos:</b> ${prots.map(pr => `${pr.numero} — ${pr.assunto}`).join(' | ')}</div>` : ''}
        ${p.observacoes ? `<div class="detalhe obs"><b>Obs:</b> ${p.observacoes}</div>` : ''}
      </div></div>`
    }).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Roteiro de Vistorias</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#111}h2{font-size:16px;margin-bottom:4px}.data{font-size:11px;color:#555;margin-bottom:16px}.card{display:flex;gap:12px;border:1px solid #ccc;border-radius:6px;padding:10px 14px;margin-bottom:10px;page-break-inside:avoid}.numero{font-size:20px;font-weight:bold;color:#aaa;min-width:24px;padding-top:2px}.info{flex:1}.nome{font-size:14px;font-weight:bold;margin-bottom:4px}.detalhe{margin-top:2px;line-height:1.5}.endereco{font-size:13px;color:#1a56db}.risco{color:#b91c1c;font-weight:bold}.obs{color:#555;font-style:italic}@media print{body{margin:10px}}</style>
      </head><body><h2>Roteiro de Vistorias — SEMDECP</h2><div class="data">Gerado em: ${hoje} | Total: ${lista.length} pessoa(s)</div>${linhas}</body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => w.print(), 500)
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'concluido': return { label: 'Concluído', color: 'bg-success/10 text-success' }
      case 'em_andamento': return { label: 'Em andamento', color: 'bg-primary-btn/10 text-primary-btn' }
      case 'arquivado': return { label: 'Arquivado', color: 'bg-gray-900/10 text-gray-900' }
      default: return { label: 'Em aberto', color: 'bg-gray-100 text-gray-600' }
    }
  }

  const getFileIcon = (type: string) => {
    const t = (type || '').toLowerCase()
    if (['jpg','jpeg','png','image/jpeg','image/png'].includes(t)) return '🖼️'
    if (t === 'pdf' || t === 'application/pdf') return '📄'
    if (['docx','doc','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(t)) return '📝'
    return '📋'
  }

  const isCloudFile = (caminho?: string) => caminho?.startsWith('http')

  // JSX do formulário inline — NÃO extraído como sub-componente para evitar remount a cada render
  const formularioJSX = (
    <form onSubmit={handleSavePessoa} className="p-4 overflow-y-auto space-y-4">
      <SecaoForm titulo="Identificação">
        <Campo label="Nome *" span2>
          <input required className={inputCls} value={pessoaFormData.nome} onChange={e => setF({ nome: e.target.value })} />
        </Campo>
        <Campo label="CPF">
          <input className={inputCls} value={pessoaFormData.cpf} onChange={e => setF({ cpf: e.target.value })} placeholder="000.000.000-00" />
        </Campo>
        <Campo label="RG">
          <input className={inputCls} value={pessoaFormData.rg || ''} onChange={e => setF({ rg: e.target.value })} />
        </Campo>
        <Campo label="Data de Nascimento">
          <input className={inputCls} value={pessoaFormData.data_nascimento || ''} onChange={e => setF({ data_nascimento: e.target.value })} placeholder="DD/MM/AAAA" />
        </Campo>
        <Campo label="Gênero">
          <select className={selectCls} value={pessoaFormData.genero || ''} onChange={e => setF({ genero: e.target.value })}>
            <option value="">—</option>
            <option>Masculino</option><option>Feminino</option><option>Outro</option><option>Prefiro não informar</option>
          </select>
        </Campo>
        <Campo label="Estado Civil">
          <select className={selectCls} value={pessoaFormData.estado_civil || ''} onChange={e => setF({ estado_civil: e.target.value })}>
            <option value="">—</option>
            <option>Solteiro(a)</option><option>Casado(a)</option><option>Divorciado(a)</option><option>Viúvo(a)</option><option>União estável</option>
          </select>
        </Campo>
        <Campo label="Telefone">
          <input className={inputCls} value={pessoaFormData.telefone} onChange={e => setF({ telefone: e.target.value })} placeholder="(00) 00000-0000" />
        </Campo>
        <Campo label="E-mail">
          <input type="email" className={inputCls} value={pessoaFormData.email} onChange={e => setF({ email: e.target.value })} />
        </Campo>
        <Campo label="Órgão / Empresa / Tipo de Ocorrência" span2>
          <input className={inputCls} value={pessoaFormData.orgao} onChange={e => setF({ orgao: e.target.value })} />
        </Campo>
      </SecaoForm>

      <SecaoForm titulo="Endereço">
        <Campo label="Endereço" span2>
          <input className={inputCls} value={pessoaFormData.endereco} onChange={e => setF({ endereco: e.target.value })} placeholder="Rua, número, complemento" />
        </Campo>
        <Campo label="Bairro / Comunidade">
          <input className={inputCls} value={pessoaFormData.bairro || ''} onChange={e => setF({ bairro: e.target.value })} />
        </Campo>
        <Campo label="Município / UF">
          <input className={inputCls} value={pessoaFormData.municipio || ''} onChange={e => setF({ municipio: e.target.value })} placeholder="Tefé/AM" />
        </Campo>
        <Campo label="CEP">
          <input className={inputCls} value={pessoaFormData.cep || ''} onChange={e => setF({ cep: e.target.value })} placeholder="00000-000" />
        </Campo>
        <Campo label="Ponto de Referência">
          <input className={inputCls} value={pessoaFormData.ponto_referencia || ''} onChange={e => setF({ ponto_referencia: e.target.value })} placeholder="Próximo a..." />
        </Campo>
        <Campo label="GPS Latitude">
          <input type="number" step="any" className={inputCls} value={pessoaFormData.gps_lat ?? ''} onChange={e => setF({ gps_lat: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="-3.348470" />
        </Campo>
        <Campo label="GPS Longitude">
          <input type="number" step="any" className={inputCls} value={pessoaFormData.gps_lng ?? ''} onChange={e => setF({ gps_lng: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="-64.709700" />
        </Campo>
      </SecaoForm>

      <SecaoForm titulo="Dados Socioeconômicos">
        <Campo label="Nº Pessoas na Família">
          <input type="number" min="1" className={inputCls} value={pessoaFormData.num_pessoas_familia ?? ''} onChange={e => setF({ num_pessoas_familia: e.target.value ? parseInt(e.target.value) : undefined })} />
        </Campo>
        <Campo label="Renda Familiar">
          <select className={selectCls} value={pessoaFormData.renda_familiar || ''} onChange={e => setF({ renda_familiar: e.target.value })}>
            <option value="">—</option>
            <option>Sem renda</option><option>Até 1 salário</option><option>1 a 2 salários</option><option>2 a 3 salários</option><option>Acima de 3 salários</option>
          </select>
        </Campo>
        <Campo label="Programa Social" span2>
          <input className={inputCls} value={pessoaFormData.programa_social || ''} onChange={e => setF({ programa_social: e.target.value })} placeholder="Bolsa Família, BPC..." />
        </Campo>
      </SecaoForm>

      <SecaoForm titulo="Moradia e Vulnerabilidade">
        <Campo label="Tipo de Moradia">
          <select className={selectCls} value={pessoaFormData.tipo_moradia || ''} onChange={e => setF({ tipo_moradia: e.target.value })}>
            <option value="">—</option>
            <option>Própria</option><option>Alugada</option><option>Cedida</option><option>Irregular</option><option>Abrigo</option>
          </select>
        </Campo>
        <Campo label="Material de Construção">
          <select className={selectCls} value={pessoaFormData.material_construcao || ''} onChange={e => setF({ material_construcao: e.target.value })}>
            <option value="">—</option>
            <option>Alvenaria</option><option>Madeira</option><option>Mista</option><option>Palha</option><option>Outro</option>
          </select>
        </Campo>
        <Campo label="Área de Risco?">
          <select className={selectCls} value={pessoaFormData.area_risco === true ? 'sim' : pessoaFormData.area_risco === false ? 'nao' : ''} onChange={e => setF({ area_risco: e.target.value === 'sim' ? true : e.target.value === 'nao' ? false : undefined })}>
            <option value="">—</option><option value="sim">Sim</option><option value="nao">Não</option>
          </select>
        </Campo>
        <Campo label="Prioridade">
          <select className={selectCls} value={pessoaFormData.prioridade || ''} onChange={e => setF({ prioridade: e.target.value })}>
            <option value="">—</option>
            <option>Baixa</option><option>Média</option><option>Alta</option><option>Emergencial</option>
          </select>
        </Campo>
        <Campo label="Deficiência">
          <input className={inputCls} value={pessoaFormData.deficiencia || ''} onChange={e => setF({ deficiencia: e.target.value })} placeholder="Descreva se houver" />
        </Campo>
        <Campo label="Doença Crônica">
          <input className={inputCls} value={pessoaFormData.doenca_cronica || ''} onChange={e => setF({ doenca_cronica: e.target.value })} placeholder="Ex: Diabetes, Hipertensão" />
        </Campo>
      </SecaoForm>

      <SecaoForm titulo="Situação e Observações">
        <Campo label="Status da Ocorrência" span2>
          <select className={selectCls} value={pessoaFormData.status_ocorrencia || 'em_aberto'} onChange={e => setF({ status_ocorrencia: e.target.value as Pessoa['status_ocorrencia'] })}>
            <option value="em_aberto">Em aberto</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
            <option value="arquivado">Arquivado</option>
          </select>
        </Campo>
        <Campo label="Observações" span2>
          <textarea rows={3} className={`${inputCls} resize-none`} value={pessoaFormData.observacoes} onChange={e => setF({ observacoes: e.target.value })} />
        </Campo>
      </SecaoForm>

      <div className="flex justify-end gap-3 pt-2 sticky bottom-0 bg-white pb-2">
        <button type="button" onClick={() => setIsPessoaFormOpen(false)} className="px-4 py-2 text-text-secondary font-bold hover:text-text-main text-sm">Cancelar</button>
        <button type="submit" className="px-6 py-2 bg-primary-btn text-white rounded font-bold hover:opacity-90 text-sm">Salvar</button>
      </div>
    </form>
  )

  if (selectedPessoa) {
    const endCompleto = [selectedPessoa.endereco, selectedPessoa.bairro, selectedPessoa.municipio].filter(Boolean).join(', ')
    return (
      <div className="p-6 animate-in fade-in duration-300 h-full overflow-y-auto">
        <button onClick={() => onSelectPessoa(null)} className="flex items-center gap-2 text-text-secondary hover:text-primary-btn mb-4 transition-colors text-sm">
          <ArrowLeft size={18} /> Voltar
        </button>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-main">{selectedPessoa.nome}</h1>
            {(() => { const b = getStatusBadge(selectedPessoa.status_ocorrencia); return <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded mt-1 ${b.color}`}>{b.label}</span> })()}
            {selectedPessoa.prioridade && <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded mt-1 ml-1 ${selectedPessoa.prioridade === 'Emergencial' || selectedPessoa.prioridade === 'Alta' ? 'bg-red-100 text-red-700' : selectedPessoa.prioridade === 'Média' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>⚑ {selectedPessoa.prioridade}</span>}
            <p className="text-text-secondary text-sm flex items-center gap-2 mt-1"><Building2 size={14} /> {selectedPessoa.orgao || 'Sem órgão'}</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-xs text-text-secondary">Status:</span>
              <select value={selectedPessoa.status_ocorrencia || 'em_aberto'}
                onChange={e => onUpdateStatus(selectedPessoa.id!, e.target.value)}
                className="p-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-btn/20 cursor-pointer">
                <option value="em_aberto">Em aberto</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluido">Concluído</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </div>
            <button onClick={() => { setPessoaFormData({ ...PESSOA_VAZIA, ...selectedPessoa }); setIsPessoaFormOpen(true) }} className="flex items-center gap-1 px-3 py-1.5 bg-primary-btn text-white rounded-lg hover:opacity-90 text-sm"><Edit size={16} /> Editar</button>
            <button onClick={() => onDeletePessoa(selectedPessoa.id!)} className="flex items-center gap-1 px-3 py-1.5 bg-error-expired text-white rounded-lg hover:opacity-90 text-sm"><Trash2 size={16} /> Excluir</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {endCompleto && (
            <div className="col-span-2 bg-primary-btn/5 border border-primary-btn/20 p-3 rounded-lg">
              <p className="text-xs text-primary-btn uppercase font-bold mb-1 flex items-center gap-1"><MapPin size={12} /> Endereço</p>
              <p className="text-sm font-medium">{endCompleto}</p>
              {selectedPessoa.ponto_referencia && <p className="text-xs text-text-secondary mt-1">Ref: {selectedPessoa.ponto_referencia}</p>}
              {selectedPessoa.gps_lat && <p className="text-xs text-text-secondary mt-0.5">GPS: {selectedPessoa.gps_lat.toFixed(6)}, {selectedPessoa.gps_lng?.toFixed(6)}</p>}
            </div>
          )}
          {selectedPessoa.telefone && <div className="bg-surface-card p-3 rounded-lg border border-gray-100"><p className="text-xs text-text-secondary uppercase font-bold mb-1">Telefone</p><p className="text-sm">{selectedPessoa.telefone}</p></div>}
          {selectedPessoa.cpf && <div className="bg-surface-card p-3 rounded-lg border border-gray-100"><p className="text-xs text-text-secondary uppercase font-bold mb-1">CPF</p><p className="text-sm">{selectedPessoa.cpf}</p></div>}
          {selectedPessoa.rg && <div className="bg-surface-card p-3 rounded-lg border border-gray-100"><p className="text-xs text-text-secondary uppercase font-bold mb-1">RG</p><p className="text-sm">{selectedPessoa.rg}</p></div>}
          {selectedPessoa.data_nascimento && <div className="bg-surface-card p-3 rounded-lg border border-gray-100"><p className="text-xs text-text-secondary uppercase font-bold mb-1">Nascimento</p><p className="text-sm">{selectedPessoa.data_nascimento}</p></div>}
          {selectedPessoa.genero && <div className="bg-surface-card p-3 rounded-lg border border-gray-100"><p className="text-xs text-text-secondary uppercase font-bold mb-1">Gênero</p><p className="text-sm">{selectedPessoa.genero}</p></div>}
          {selectedPessoa.estado_civil && <div className="bg-surface-card p-3 rounded-lg border border-gray-100"><p className="text-xs text-text-secondary uppercase font-bold mb-1">Estado Civil</p><p className="text-sm">{selectedPessoa.estado_civil}</p></div>}
          {selectedPessoa.cep && <div className="bg-surface-card p-3 rounded-lg border border-gray-100"><p className="text-xs text-text-secondary uppercase font-bold mb-1">CEP</p><p className="text-sm">{selectedPessoa.cep}</p></div>}
          {selectedPessoa.email && <div className="col-span-2 bg-surface-card p-3 rounded-lg border border-gray-100"><p className="text-xs text-text-secondary uppercase font-bold mb-1">E-mail</p><p className="text-sm break-all">{selectedPessoa.email}</p></div>}
          {selectedPessoa.renda_familiar && <div className="bg-surface-card p-3 rounded-lg border border-gray-100"><p className="text-xs text-text-secondary uppercase font-bold mb-1">Renda Familiar</p><p className="text-sm">{selectedPessoa.renda_familiar}</p></div>}
          {selectedPessoa.num_pessoas_familia != null && <div className="bg-surface-card p-3 rounded-lg border border-gray-100"><p className="text-xs text-text-secondary uppercase font-bold mb-1">Pessoas na Família</p><p className="text-sm">{selectedPessoa.num_pessoas_familia}</p></div>}
          {selectedPessoa.programa_social && <div className="bg-surface-card p-3 rounded-lg border border-gray-100"><p className="text-xs text-text-secondary uppercase font-bold mb-1">Programa Social</p><p className="text-sm">{selectedPessoa.programa_social}</p></div>}
          {selectedPessoa.tipo_moradia && <div className="bg-surface-card p-3 rounded-lg border border-gray-100"><p className="text-xs text-text-secondary uppercase font-bold mb-1">Moradia</p><p className="text-sm">{selectedPessoa.tipo_moradia}{selectedPessoa.material_construcao ? ` · ${selectedPessoa.material_construcao}` : ''}</p></div>}
          {selectedPessoa.area_risco && <div className="col-span-2 bg-red-50 border border-red-200 p-3 rounded-lg"><p className="text-xs text-red-700 uppercase font-bold mb-1">⚠️ Área de Risco</p><p className="text-sm text-red-700">Residência em área de risco identificada</p></div>}
          {(selectedPessoa.deficiencia || selectedPessoa.doenca_cronica) && (
            <div className="col-span-2 bg-surface-card p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-text-secondary uppercase font-bold mb-1">Saúde</p>
              {selectedPessoa.deficiencia && <p className="text-sm">Deficiência: {selectedPessoa.deficiencia}</p>}
              {selectedPessoa.doenca_cronica && <p className="text-sm mt-0.5">Doença crônica: {selectedPessoa.doenca_cronica}</p>}
            </div>
          )}
          {selectedPessoa.observacoes && <div className="col-span-2 bg-surface-card p-3 rounded-lg border border-gray-100"><p className="text-xs text-text-secondary uppercase font-bold mb-1">Observações</p><p className="text-sm whitespace-pre-wrap">{selectedPessoa.observacoes}</p></div>}
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-sm mb-2 flex items-center gap-2"><FileText size={16} /> Protocolos ({pessoaProtocolos.length})</h3>
            {pessoaProtocolos.length === 0 ? <p className="text-xs text-text-secondary bg-surface-card p-3 rounded-lg">Nenhum protocolo vinculado</p> : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {pessoaProtocolos.map(p => (
                  <div key={p.id} className="text-xs bg-white p-2 px-3 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{p.numero} — {p.assunto}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ml-2 ${p.status === 'concluido' ? 'bg-success/10 text-success' : p.status === 'em_andamento' ? 'bg-primary-btn/10 text-primary-btn' : 'bg-gray-100 text-gray-600'}`}>{p.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-sm flex items-center gap-2"><Inbox size={16} /> Documentos Recebidos ({pessoaDocumentos.length})</h3>
              <button onClick={handleImportClick} disabled={uploading} className="flex items-center gap-1 px-2 py-1 bg-primary-btn text-white rounded text-xs hover:opacity-90 disabled:opacity-60">
                {uploading ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? 'Enviando...' : 'Importar'}
              </button>
            </div>
            {pessoaDocumentos.length === 0 ? <p className="text-xs text-text-secondary bg-surface-card p-3 rounded-lg">Nenhum documento</p> : (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {pessoaDocumentos.map(d => (
                  <div key={d.id} className="text-xs bg-white p-2 px-3 rounded-lg border border-gray-100 flex justify-between items-center group">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span>{getFileIcon(d.tipo)}</span>
                      <span className="truncate font-bold">{d.nome}</span>
                      {isCloudFile(d.caminho) && <span className="shrink-0 text-[9px] font-bold bg-success/10 text-success px-1 rounded">NUVEM</span>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isCloudFile(d.caminho) && <button onClick={() => onOpenFile(d.caminho!)} className="p-1 text-primary-btn hover:bg-primary-btn/10 rounded"><ExternalLink size={14} /></button>}
                      <button onClick={() => onDeleteDoc(d.id!, d.caminho)} className="p-1 text-error-expired hover:bg-error-expired/10 rounded"><Trash2 size={14} /></button>
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
            {pessoaDocsGerados.length === 0 ? <p className="text-xs text-text-secondary bg-surface-card p-3 rounded-lg">Nenhum documento</p> : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {pessoaDocsGerados.map(d => (
                  <div key={d.id} onClick={() => onEditDocGerado(d)} className="text-xs bg-white p-2 px-3 rounded-lg border border-gray-100 hover:border-primary-btn/40 hover:bg-primary-btn/5 flex justify-between items-center group cursor-pointer transition-colors">
                    <div className="flex-1 min-w-0"><span className="font-bold">{d.titulo}</span><span className="text-text-secondary ml-2">{d.tipo}</span></div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.caminho && isCloudFile(d.caminho) && <button onClick={e => { e.stopPropagation(); onOpenFile(d.caminho!) }} className="p-1 text-primary-btn hover:bg-primary-btn/10 rounded"><ExternalLink size={14} /></button>}
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
            {pessoaTarefas.length === 0 ? <p className="text-xs text-text-secondary bg-surface-card p-3 rounded-lg">Nenhuma tarefa vinculada</p> : (
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
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-surface-card">
                <h2 className="text-lg font-bold">Editar Pessoa</h2>
                <button onClick={() => setIsPessoaFormOpen(false)} className="text-text-secondary hover:text-text-main">✕</button>
              </div>
              {formularioJSX}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Pessoas / Dossiês</h1>
          <p className="text-text-secondary text-sm">Gerencie seus contatos e dossiês.</p>
        </div>
        <div className="flex items-center gap-2">
          {selecionadas.size > 0 && (
            <span className="text-xs font-bold text-primary-btn bg-primary-btn/10 px-2 py-1 rounded">{selecionadas.size} selecionada(s)</span>
          )}
          <button onClick={handleImprimirRoteiro} className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 text-sm">
            <Printer size={16} /> {selecionadas.size > 0 ? `Imprimir (${selecionadas.size})` : 'Imprimir Roteiro'}
          </button>
          <button onClick={() => { setPessoaFormData({ ...PESSOA_VAZIA }); setIsPessoaFormOpen(true) }} className="flex items-center gap-2 bg-primary-btn text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 text-sm">
            <Plus size={18} /> Nova Pessoa
          </button>
        </div>
      </div>
      <div className="mb-4 relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
        <input type="text" placeholder="Buscar por nome, órgão ou bairro..." className="w-full pl-10 pr-4 py-2 bg-surface-card border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-btn/20 text-sm" value={searchPessoa} onChange={e => setSearchPessoa(e.target.value)} />
      </div>
      <div ref={listRef} onScroll={handleListScroll} className="flex-1 overflow-y-auto">
        <div className="space-y-1">
          {filteredPessoas.map(p => {
            const marcada = selecionadas.has(p.id!)
            return (
              <div key={p.id} className={`bg-white py-1 px-3 rounded-lg border transition-all flex items-center gap-3 group ${marcada ? 'border-primary-btn/50 bg-primary-btn/5' : 'border-gray-100 hover:border-primary-btn/30'}`}>
                <input type="checkbox" checked={marcada} onChange={() => {}} onClick={e => toggleSelecionada(p.id!, e)} className="w-4 h-4 accent-primary-btn shrink-0 cursor-pointer" />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelectPessoa(p)}>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-text-main">{p.nome}</p>
                    {(() => { const b = getStatusBadge(p.status_ocorrencia); return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${b.color}`}>{b.label}</span> })()}
                    {p.area_risco && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 shrink-0">⚠️ Risco</span>}
                    {p.prioridade && p.prioridade !== 'Baixa' && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${p.prioridade === 'Emergencial' || p.prioridade === 'Alta' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>⚑ {p.prioridade}</span>}
                  </div>
                  <p className="text-xs text-text-secondary truncate">{p.orgao || '—'} • {[p.bairro, p.municipio].filter(Boolean).join(', ') || p.endereco || '—'}</p>
                </div>
                <button onClick={() => onSelectPessoa(p)} className="px-3 py-1 bg-primary-btn text-white rounded text-xs hover:opacity-90 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">Ver Dossiê</button>
              </div>
            )
          })}
        </div>
      </div>
      {isPessoaFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-surface-card">
              <h2 className="text-lg font-bold">Nova Pessoa</h2>
              <button onClick={() => setIsPessoaFormOpen(false)} className="text-text-secondary hover:text-text-main">✕</button>
            </div>
            {formularioJSX}
          </div>
        </div>
      )}
    </div>
  )
}
