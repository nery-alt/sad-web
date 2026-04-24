import React, { useState, useMemo } from 'react'
import { Search, Users, FileText, Inbox, FilePlus, CheckSquare, Calendar } from 'lucide-react'
import { Pessoa, Protocolo, DocumentoRecebido, DocumentoGerado, Tarefa, AgendaItem } from '../types'

interface BuscaGlobalProps {
  pessoas: Pessoa[]
  protocolos: Protocolo[]
  documentos: DocumentoRecebido[]
  documentosGerados: DocumentoGerado[]
  tarefas: Tarefa[]
  agenda: AgendaItem[]
  onSelectPessoa: (pessoa: Pessoa) => void
  onSelectProtocolo: (protocolo: Protocolo) => void
  onNavigate: (tab: string) => void
  formatDate: (dateStr: string) => string
}

export const BuscaGlobal: React.FC<BuscaGlobalProps> = ({
  pessoas,
  protocolos,
  documentos,
  documentosGerados,
  tarefas,
  agenda,
  onSelectPessoa,
  onSelectProtocolo,
  onNavigate,
  formatDate,
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  const results = useMemo(() => {
    if (searchTerm.length < 3) return { pessoas: [], protocolos: [], documentos: [], documentosGerados: [], tarefas: [], agenda: [] }
    
    const term = searchTerm.toLowerCase()
    return {
      pessoas: pessoas.filter(p => p.nome.toLowerCase().includes(term) || p.orgao?.toLowerCase().includes(term)).slice(0, 5),
      protocolos: protocolos.filter(p => p.numero.toLowerCase().includes(term) || p.assunto.toLowerCase().includes(term)).slice(0, 5),
      documentos: documentos.filter(d => d.nome.toLowerCase().includes(term) || d.pessoa_nome?.toLowerCase().includes(term)).slice(0, 5),
      documentosGerados: documentosGerados.filter(d => d.titulo.toLowerCase().includes(term) || d.pessoa_nome?.toLowerCase().includes(term)).slice(0, 5),
      tarefas: tarefas.filter(t => t.titulo.toLowerCase().includes(term)).slice(0, 5),
      agenda: agenda.filter(a => a.titulo.toLowerCase().includes(term)).slice(0, 5),
    }
  }, [searchTerm, pessoas, protocolos, documentos, documentosGerados, tarefas, agenda])

  const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div className="p-8 flex flex-col h-full overflow-hidden">
      <div className="mb-8 shrink-0"><h1 className="text-2xl font-bold">Busca Global</h1><p className="text-text-secondary">Pesquise em todos os módulos do sistema.</p></div>
      <div className="mb-8 relative shrink-0">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={24} />
        <input type="text" placeholder="Digite no mínimo 3 caracteres..." className="w-full pl-14 pr-4 py-4 bg-surface-card border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-btn/20 focus:border-primary-btn text-lg" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus />
      </div>
      {searchTerm.length >= 3 && (
        <div className="flex-1 overflow-y-auto pr-2 space-y-8">
          {totalResults === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center"><p className="text-text-secondary text-lg">Nenhum resultado encontrado para "{searchTerm}"</p></div>
          ) : (
            <>
              {results.pessoas.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Users className="text-primary-btn" size={20} /> Pessoas ({results.pessoas.length})</h3>
                  <div className="space-y-2">
                    {results.pessoas.map(p => (
                      <div key={p.id} onClick={() => { onSelectPessoa(p); onNavigate('Pessoas / Dossiês'); }} className="p-3 bg-white border border-gray-100 rounded-lg hover:border-primary-btn/30 cursor-pointer transition-all">
                        <p className="font-bold text-sm">{p.nome}</p>
                        <p className="text-xs text-text-secondary">{p.orgao || 'Sem órgão'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {results.protocolos.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText className="text-primary-btn" size={20} /> Protocolos ({results.protocolos.length})</h3>
                  <div className="space-y-2">
                    {results.protocolos.map(p => (
                      <div key={p.id} onClick={() => { onSelectProtocolo(p); onNavigate('Protocolos'); }} className="p-3 bg-white border border-gray-100 rounded-lg hover:border-primary-btn/30 cursor-pointer transition-all">
                        <p className="font-bold text-sm">{p.numero} - {p.assunto}</p>
                        <p className="text-xs text-text-secondary">{p.pessoa_nome}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {results.documentos.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Inbox className="text-deadline-alert" size={20} /> Documentos Recebidos ({results.documentos.length})</h3>
                  <div className="space-y-2">
                    {results.documentos.map(d => (
                      <div key={d.id} className="p-3 bg-white border border-gray-100 rounded-lg hover:border-deadline-alert/30 transition-all">
                        <p className="font-bold text-sm">{d.nome}</p>
                        <p className="text-xs text-text-secondary">{d.pessoa_nome} • {formatDate(d.data_recebimento)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {results.documentosGerados.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FilePlus className="text-success" size={20} /> Documentos Gerados ({results.documentosGerados.length})</h3>
                  <div className="space-y-2">
                    {results.documentosGerados.map(d => (
                      <div key={d.id} className="p-3 bg-white border border-gray-100 rounded-lg hover:border-success/30 transition-all">
                        <p className="font-bold text-sm">{d.titulo}</p>
                        <p className="text-xs text-text-secondary">{d.pessoa_nome} • {d.tipo.toUpperCase()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {results.tarefas.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><CheckSquare className="text-primary-btn" size={20} /> Tarefas ({results.tarefas.length})</h3>
                  <div className="space-y-2">
                    {results.tarefas.map(t => (
                      <div key={t.id} className="p-3 bg-white border border-gray-100 rounded-lg hover:border-primary-btn/30 transition-all">
                        <p className="font-bold text-sm">{t.titulo}</p>
                        <p className="text-xs text-text-secondary">{t.prioridade.toUpperCase()} • {formatDate(t.prazo)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {results.agenda.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Calendar className="text-primary-btn" size={20} /> Agenda ({results.agenda.length})</h3>
                  <div className="space-y-2">
                    {results.agenda.map(a => (
                      <div key={a.id} className="p-3 bg-white border border-gray-100 rounded-lg hover:border-primary-btn/30 transition-all">
                        <p className="font-bold text-sm">{a.titulo}</p>
                        <p className="text-xs text-text-secondary">{a.horario || '--:--'} • {formatDate(a.data)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
