import React, { useState, useMemo } from 'react'
import { Search, Users, FileText, Inbox, FilePlus, CheckSquare, Calendar, MapPin } from 'lucide-react'
import type { Pessoa, Protocolo, DocumentoRecebido, DocumentoGerado, Tarefa, AgendaItem } from '../types'

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

type Modo = 'geral' | 'endereco'

export const BuscaGlobal: React.FC<BuscaGlobalProps> = ({
  pessoas, protocolos, documentos, documentosGerados, tarefas, agenda,
  onSelectPessoa, onSelectProtocolo, onNavigate, formatDate,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [modo, setModo] = useState<Modo>('geral')

  // ── MODO GERAL ──────────────────────────────────────────────────
  const resultsGeral = useMemo(() => {
    if (modo !== 'geral' || searchTerm.length < 3) {
      return { pessoas: [], protocolos: [], documentos: [], documentosGerados: [], tarefas: [], agenda: [] }
    }
    const term = searchTerm.toLowerCase()
    return {
      pessoas: pessoas.filter(p =>
        p.nome.toLowerCase().includes(term) ||
        (p.orgao || '').toLowerCase().includes(term) ||
        (p.cpf || '').toLowerCase().includes(term)
      ).slice(0, 5),
      protocolos: protocolos.filter(p =>
        p.numero.toLowerCase().includes(term) ||
        p.assunto.toLowerCase().includes(term) ||
        (p.pessoa_nome || '').toLowerCase().includes(term)
      ).slice(0, 5),
      documentos: documentos.filter(d =>
        d.nome.toLowerCase().includes(term) ||
        (d.pessoa_nome || '').toLowerCase().includes(term)
      ).slice(0, 5),
      documentosGerados: documentosGerados.filter(d =>
        d.titulo.toLowerCase().includes(term) ||
        (d.pessoa_nome || '').toLowerCase().includes(term)
      ).slice(0, 5),
      tarefas: tarefas.filter(t => t.titulo.toLowerCase().includes(term)).slice(0, 5),
      agenda: agenda.filter(a => a.titulo.toLowerCase().includes(term)).slice(0, 5),
    }
  }, [searchTerm, modo, pessoas, protocolos, documentos, documentosGerados, tarefas, agenda])

  const totalGeral = Object.values(resultsGeral).reduce((sum, arr) => sum + arr.length, 0)

  // ── MODO ENDEREÇO ────────────────────────────────────────────────
  const pessoasEndereco = useMemo(() => {
    if (modo !== 'endereco' || searchTerm.length < 3) return []
    const term = searchTerm.toLowerCase()
    return pessoas.filter(p =>
      (p.endereco || '').toLowerCase().includes(term) ||
      (p.bairro || '').toLowerCase().includes(term) ||
      (p.ponto_referencia || '').toLowerCase().includes(term) ||
      (p.municipio || '').toLowerCase().includes(term)
    )
  }, [searchTerm, modo, pessoas])

  const historicoPorPessoa = useMemo(() =>
    pessoasEndereco.map(p => {
      const prots = protocolos
        .filter(pr => pr.pessoa_id === p.id)
        .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
      const docs = documentos
        .filter(d => d.pessoa_id === p.id)
        .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
      const laudos = docs.filter(d => (d.caminho || '').includes('/sentinela/'))
      const docsG = documentosGerados.filter(d => d.pessoa_id === p.id)
      const tfs = tarefas.filter(t => t.pessoa_id === p.id && t.status !== 'concluida' && t.status !== 'arquivada')
      return { pessoa: p, prots, laudos, docsG, tfs }
    })
  , [pessoasEndereco, protocolos, documentos, documentosGerados, tarefas])

  const mudarModo = (m: Modo) => { setModo(m); setSearchTerm('') }

  return (
    <div className="p-8 flex flex-col h-full overflow-hidden">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-bold">Busca Global</h1>
        <p className="text-text-secondary text-sm">Pesquise em todos os módulos do sistema.</p>
      </div>

      {/* Toggle de modo */}
      <div className="flex gap-2 mb-4 shrink-0">
        <button
          onClick={() => mudarModo('geral')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${modo === 'geral' ? 'bg-primary-btn text-white' : 'bg-surface-card text-text-secondary hover:bg-gray-200'}`}
        >
          <Search size={15} /> Busca Geral
        </button>
        <button
          onClick={() => mudarModo('endereco')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${modo === 'endereco' ? 'bg-primary-btn text-white' : 'bg-surface-card text-text-secondary hover:bg-gray-200'}`}
        >
          <MapPin size={15} /> Histórico por Endereço
        </button>
      </div>

      {/* Campo de busca */}
      <div className="mb-6 relative shrink-0">
        {modo === 'geral'
          ? <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={22} />
          : <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-btn" size={22} />
        }
        <input
          type="text"
          placeholder={modo === 'geral' ? 'Digite no mínimo 3 caracteres...' : 'Digite rua, bairro ou ponto de referência...'}
          className="w-full pl-14 pr-4 py-4 bg-surface-card border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-btn/20 focus:border-primary-btn text-lg"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          autoFocus
        />
      </div>

      {/* ── RESULTADOS BUSCA GERAL ── */}
      {modo === 'geral' && searchTerm.length >= 3 && (
        <div className="flex-1 overflow-y-auto pr-2 space-y-8">
          {totalGeral === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-text-secondary text-lg">Nenhum resultado para "{searchTerm}"</p>
            </div>
          ) : (
            <>
              {resultsGeral.pessoas.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Users className="text-primary-btn" size={20} /> Pessoas ({resultsGeral.pessoas.length})</h3>
                  <div className="space-y-2">
                    {resultsGeral.pessoas.map(p => (
                      <div key={p.id} onClick={() => { onSelectPessoa(p); onNavigate('Pessoas / Dossiês') }} className="p-3 bg-white border border-gray-100 rounded-lg hover:border-primary-btn/30 cursor-pointer transition-all">
                        <p className="font-bold text-sm">{p.nome}</p>
                        <p className="text-xs text-text-secondary">{p.orgao || 'Sem órgão'}{p.bairro ? ` · ${p.bairro}` : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {resultsGeral.protocolos.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText className="text-primary-btn" size={20} /> Protocolos ({resultsGeral.protocolos.length})</h3>
                  <div className="space-y-2">
                    {resultsGeral.protocolos.map(p => (
                      <div key={p.id} onClick={() => { onSelectProtocolo(p); onNavigate('Protocolos') }} className="p-3 bg-white border border-gray-100 rounded-lg hover:border-primary-btn/30 cursor-pointer transition-all">
                        <p className="font-bold text-sm">{p.numero} — {p.assunto}</p>
                        <p className="text-xs text-text-secondary">{p.pessoa_nome}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {resultsGeral.documentos.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Inbox className="text-deadline-alert" size={20} /> Documentos Recebidos ({resultsGeral.documentos.length})</h3>
                  <div className="space-y-2">
                    {resultsGeral.documentos.map(d => (
                      <div key={d.id} className="p-3 bg-white border border-gray-100 rounded-lg">
                        <p className="font-bold text-sm">{d.nome}</p>
                        <p className="text-xs text-text-secondary">{d.pessoa_nome} · {formatDate(d.data_recebimento)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {resultsGeral.documentosGerados.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FilePlus className="text-success" size={20} /> Documentos Gerados ({resultsGeral.documentosGerados.length})</h3>
                  <div className="space-y-2">
                    {resultsGeral.documentosGerados.map(d => (
                      <div key={d.id} className="p-3 bg-white border border-gray-100 rounded-lg">
                        <p className="font-bold text-sm">{d.titulo}</p>
                        <p className="text-xs text-text-secondary">{d.pessoa_nome} · {d.tipo.toUpperCase()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {resultsGeral.tarefas.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><CheckSquare className="text-primary-btn" size={20} /> Tarefas ({resultsGeral.tarefas.length})</h3>
                  <div className="space-y-2">
                    {resultsGeral.tarefas.map(t => (
                      <div key={t.id} className="p-3 bg-white border border-gray-100 rounded-lg">
                        <p className="font-bold text-sm">{t.titulo}</p>
                        <p className="text-xs text-text-secondary">{t.prioridade.toUpperCase()} · {formatDate(t.prazo)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {resultsGeral.agenda.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Calendar className="text-primary-btn" size={20} /> Agenda ({resultsGeral.agenda.length})</h3>
                  <div className="space-y-2">
                    {resultsGeral.agenda.map(a => (
                      <div key={a.id} className="p-3 bg-white border border-gray-100 rounded-lg">
                        <p className="font-bold text-sm">{a.titulo}</p>
                        <p className="text-xs text-text-secondary">{a.horario || '--:--'} · {formatDate(a.data)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── RESULTADOS HISTÓRICO POR ENDEREÇO ── */}
      {modo === 'endereco' && searchTerm.length >= 3 && (
        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {pessoasEndereco.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <MapPin size={32} className="text-gray-300 mb-3" />
              <p className="text-text-secondary">Nenhum registro para "{searchTerm}"</p>
              <p className="text-xs text-text-secondary mt-1">Tente buscar por rua, bairro ou referência.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-secondary shrink-0">
                <strong>{pessoasEndereco.length}</strong> pessoa(s) em endereços com "<strong>{searchTerm}</strong>"
              </p>
              {historicoPorPessoa.map(({ pessoa, prots, laudos, docsG, tfs }) => (
                <div key={pessoa.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  {/* Cabeçalho */}
                  <div
                    className="p-4 bg-primary-btn/5 border-b border-primary-btn/10 cursor-pointer hover:bg-primary-btn/10 transition-colors"
                    onClick={() => { onSelectPessoa(pessoa); onNavigate('Pessoas / Dossiês') }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-base text-primary-btn">{pessoa.nome}</p>
                        <p className="text-sm text-text-secondary flex items-center gap-1 mt-0.5">
                          <MapPin size={12} />
                          {[pessoa.endereco, pessoa.bairro, pessoa.municipio].filter(Boolean).join(' · ')}
                        </p>
                        {pessoa.ponto_referencia && <p className="text-xs text-text-secondary mt-0.5">Ref: {pessoa.ponto_referencia}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                        {pessoa.area_risco && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">⚠️ Área de risco</span>}
                        {pessoa.prioridade && <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${pessoa.prioridade === 'Alta' || pessoa.prioridade === 'Emergencial' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>⚑ {pessoa.prioridade}</span>}
                        {pessoa.telefone && <span className="text-[10px] text-text-secondary">{pessoa.telefone}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded font-bold">{prots.length} protocolo(s)</span>
                      <span className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded font-bold">{laudos.length} laudo(s)</span>
                      {tfs.length > 0 && <span className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded font-bold">{tfs.length} tarefa(s) pendente(s)</span>}
                    </div>
                  </div>

                  {/* Linha do tempo */}
                  <div className="p-4">
                    {prots.length === 0 && laudos.length === 0 && docsG.length === 0 ? (
                      <p className="text-xs text-text-secondary italic">Nenhum registro de atendimento ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {prots.map(pr => (
                          <div
                            key={pr.id}
                            onClick={() => { onSelectProtocolo(pr); onNavigate('Protocolos') }}
                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-colors"
                          >
                            <div className="shrink-0 w-6 h-6 rounded-full bg-primary-btn/10 flex items-center justify-center mt-0.5">
                              <FileText size={12} className="text-primary-btn" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <p className="text-sm font-bold text-primary-btn">{pr.numero} — {pr.assunto}</p>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${pr.status === 'concluido' ? 'bg-success/10 text-success' : pr.status === 'em_andamento' ? 'bg-primary-btn/10 text-primary-btn' : 'bg-gray-100 text-gray-500'}`}>
                                  {pr.status.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-xs text-text-secondary mt-0.5">{formatDate(pr.criado_em)}</p>
                            </div>
                          </div>
                        ))}

                        {laudos.map(d => (
                          <div key={d.id} className="flex items-start gap-3 p-2 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50">
                            <div className="shrink-0 w-6 h-6 rounded-full bg-success/10 flex items-center justify-center mt-0.5">
                              <Inbox size={12} className="text-success" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <p className="text-sm font-bold">{d.nome}</p>
                                {d.caminho && (
                                  <a href={d.caminho} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] font-bold text-primary-btn hover:underline shrink-0">Abrir</a>
                                )}
                              </div>
                              {d.descricao && <p className="text-xs text-text-secondary">{d.descricao}</p>}
                              <p className="text-xs text-text-secondary mt-0.5">{formatDate(d.criado_em)}</p>
                            </div>
                          </div>
                        ))}

                        {docsG.map(d => (
                          <div key={d.id} className="flex items-start gap-3 p-2 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50">
                            <div className="shrink-0 w-6 h-6 rounded-full bg-deadline-alert/10 flex items-center justify-center mt-0.5">
                              <FilePlus size={12} className="text-deadline-alert" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold">{d.titulo}</p>
                              <p className="text-xs text-text-secondary mt-0.5">{formatDate(d.criado_em)} · {d.tipo}</p>
                            </div>
                          </div>
                        ))}

                        {tfs.map(t => (
                          <div key={t.id} className="flex items-start gap-3 p-2 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50">
                            <div className="shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
                              <CheckSquare size={12} className="text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold">{t.titulo}</p>
                              <p className="text-xs text-text-secondary mt-0.5">Prazo: {formatDate(t.prazo)} · {(t.prioridade || 'baixa').toUpperCase()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Estado inicial */}
      {searchTerm.length < 3 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
          {modo === 'geral' ? (
            <><Search size={48} className="mb-4" /><p className="text-lg">Digite para buscar em todo o sistema</p></>
          ) : (
            <><MapPin size={48} className="mb-4" /><p className="text-lg">Digite um endereço, bairro ou referência</p><p className="text-sm mt-2">Ver todo o histórico de atendimentos do local</p></>
          )}
        </div>
      )}
    </div>
  )
}
