import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { Login } from './components/Login'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { Dashboard } from './components/Dashboard'
import { Pessoas } from './components/Pessoas'
import { Protocolos } from './components/Protocolos'
import { DocumentosRecebidos } from './components/DocumentosRecebidos'
import { DocumentosGerados } from './components/DocumentosGerados'
import { Tarefas } from './components/Tarefas'
import { Agenda } from './components/Agenda'
import { BuscaGlobal } from './components/BuscaGlobal'
import { Configuracoes } from './components/Configuracoes'
import type {
  Pessoa,
  Protocolo,
  DocumentoRecebido,
  DocumentoGerado,
  Tarefa,
  AgendaItem,
  Config,
  Movimentacao,
} from './types'
import type { Session } from '@supabase/supabase-js'

const BUCKET = 'documentos'

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)

  const [activeTab, setActiveTab] = useState('Dashboard')
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [selectedPessoa, setSelectedPessoa] = useState<Pessoa | null>(null)

  const [protocolos, setProtocolos] = useState<Protocolo[]>([])
  const [selectedProtocolo, setSelectedProtocolo] = useState<Protocolo | null>(null)

  const [documentos, setDocumentos] = useState<DocumentoRecebido[]>([])
  const [documentosGerados, setDocumentosGerados] = useState<DocumentoGerado[]>([])

  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null)
  const [newTarefaInit, setNewTarefaInit] = useState<Partial<Tarefa> | null>(null)

  const [agenda, setAgenda] = useState<AgendaItem[]>([])

  const [docGeradoFormOpen, setDocGeradoFormOpen] = useState(false)
  const [docGeradoFormData, setDocGeradoFormData] = useState<DocumentoGerado>({
    pessoa_id: 0, tipo: 'Ofício', titulo: '', conteudo: '', data_geracao: '', criado_em: ''
  })

  const [config, setConfig] = useState<Config>({
    nomeUsuario: '', nomeSetor: '', cargo: '', logomarca: '', assinaturaPadrao: '', cidade: '', uf: ''
  })

  const channelRef = useRef<any>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoadingAuth(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchData = useCallback(async () => {
    const { data: p } = await supabase.from('pessoas').select('*').order('nome')
    if (p) setPessoas(p)

    const { data: pr } = await supabase
      .from('protocolos')
      .select('*, pessoa:pessoas(nome, endereco, telefone, cpf)')
      .order('criado_em', { ascending: false })
    if (pr) setProtocolos(pr.map((r: any) => ({
      ...r,
      historico: typeof r.historico === 'string' ? r.historico : JSON.stringify(r.historico ?? []),
      pessoa_nome: r.pessoa?.nome,
      pessoa_endereco: r.pessoa?.endereco,
      pessoa_telefone: r.pessoa?.telefone,
      pessoa_cpf: r.pessoa?.cpf,
    })))

    const { data: dr } = await supabase
      .from('documentos_recebidos')
      .select('*, pessoa:pessoas(nome), protocolo:protocolos(numero)')
      .order('criado_em', { ascending: false })
    if (dr) setDocumentos(dr.map((r: any) => ({
      ...r, pessoa_nome: r.pessoa?.nome, protocolo_numero: r.protocolo?.numero
    })))

    const { data: dg } = await supabase
      .from('documentos_gerados')
      .select('*, pessoa:pessoas(nome), protocolo:protocolos(numero)')
      .order('criado_em', { ascending: false })
    if (dg) setDocumentosGerados(dg.map((r: any) => ({
      ...r, pessoa_nome: r.pessoa?.nome, protocolo_numero: r.protocolo?.numero
    })))

    const { data: t } = await supabase
      .from('tarefas')
      .select('*, pessoa:pessoas(nome), protocolo:protocolos(numero)')
      .order('prazo')
    if (t) setTarefas(t.map((r: any) => ({
      ...r, pessoa_nome: r.pessoa?.nome, protocolo_numero: r.protocolo?.numero
    })))

    const { data: ag } = await supabase
      .from('agenda')
      .select('*, pessoa:pessoas(nome), protocolo:protocolos(numero)')
      .order('data').order('horario')
    if (ag) setAgenda(ag.map((r: any) => ({
      ...r, pessoa_nome: r.pessoa?.nome, protocolo_numero: r.protocolo?.numero
    })))
  }, [])

  const fetchConfig = useCallback(async () => {
    const { data } = await supabase.from('configuracoes').select('*')
    if (data) {
      const newConfig: Config = {
        nomeUsuario: '', nomeSetor: '', cargo: '', logomarca: '', assinaturaPadrao: '', cidade: '', uf: ''
      }
      data.forEach((item: any) => {
        if (item.chave in newConfig) (newConfig as any)[item.chave] = item.valor
      })
      setConfig(newConfig)
    }
  }, [])

  const setupRealtime = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    const channel = supabase
      .channel(`sad-realtime-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pessoas' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'protocolos' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documentos_recebidos' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documentos_gerados' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda' }, () => fetchData())
      .subscribe((status) => {
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
          reconnectTimerRef.current = setTimeout(() => {
            setupRealtime()
            fetchData()
          }, 5000)
        }
      })
    channelRef.current = channel
  }, [fetchData])

  useEffect(() => {
    if (!session) return
    const onOnline = () => { setIsOnline(true); fetchData(); setupRealtime() }
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    fetchData()
    fetchConfig()
    setupRealtime()
    const healthCheck = setInterval(() => { if (navigator.onLine) fetchData() }, 30000)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      clearInterval(healthCheck)
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [session, fetchData, fetchConfig, setupRealtime])

  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date(NaN)
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? new Date(dateStr + 'T00:00:00')
      : new Date(dateStr)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    try {
      const d = parseLocalDate(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('pt-BR')
    } catch { return dateStr }
  }

  const getPrazoStatus = (prazo: string) => {
    if (!prazo) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const deadline = parseLocalDate(prazo); deadline.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86400000)
    if (diffDays < 0) return { label: 'Vencido', color: 'text-error-expired bg-error-expired/10' }
    if (diffDays <= 3) return { label: 'Vencendo', color: 'text-deadline-alert bg-deadline-alert/10' }
    return { label: 'No prazo', color: 'text-success bg-success/10' }
  }

  const handleNavigate = (tab: string) => {
    setActiveTab(tab); setSelectedPessoa(null); setSelectedProtocolo(null); setSelectedTarefa(null)
  }
  const handleNavigateToTarefa = (tarefa: Tarefa) => { setActiveTab('Tarefas'); setSelectedTarefa(tarefa) }
  const handleNavigateToPessoa = (pessoaId: number) => {
    const pessoa = pessoas.find(p => p.id === pessoaId)
    if (pessoa) { setActiveTab('Pessoas / Dossiês'); setSelectedPessoa(pessoa); setSelectedProtocolo(null); setSelectedTarefa(null) }
  }
  const handleNavigateToProtocolo = (protocoloId: number) => {
    const protocolo = protocolos.find(p => p.id === protocoloId)
    if (protocolo) { setActiveTab('Protocolos'); setSelectedProtocolo(protocolo); setSelectedPessoa(null); setSelectedTarefa(null) }
  }
  const handleNewTarefaFromPessoa = (pessoaId: number) => { setNewTarefaInit({ pessoa_id: pessoaId }); setActiveTab('Tarefas') }
  const handleNewTarefaFromProtocolo = (protocoloId: number, pessoaId: number) => { setNewTarefaInit({ protocolo_id: protocoloId, pessoa_id: pessoaId }); setActiveTab('Tarefas') }

  const handleSavePessoa = async (pessoa: Pessoa) => {
    const now = new Date().toISOString()
    if (pessoa.id) {
      await supabase.from('pessoas').update({ ...pessoa, atualizado_em: now }).eq('id', pessoa.id)
    } else {
      await supabase.from('pessoas').insert({ ...pessoa, criado_em: now, atualizado_em: now })
    }
  }

  const handleDeletePessoa = async (id: number) => {
    if (!window.confirm('Excluir esta pessoa e todo o seu dossiê?')) return
    await supabase.from('pessoas').delete().eq('id', id)
    setSelectedPessoa(null)
  }

  // Upload real para Supabase Storage
const handleImportDoc = async (pessoaId: number, file: File) => {
  const now = new Date()
  const dataRec = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  
  // Pega só a extensão e gera nome limpo com timestamp
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const filePath = `pessoas/${pessoaId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { upsert: false })

  if (uploadError) {
    alert('Erro ao enviar arquivo: ' + uploadError.message)
    return
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath)

  await supabase.from('documentos_recebidos').insert({
    pessoa_id: pessoaId,
    protocolo_id: null,
    nome: file.name,      // nome original exibido na tela
    tipo: file.type,
    caminho: urlData.publicUrl,
    descricao: '',
    data_recebimento: dataRec,
    criado_em: new Date().toISOString(),
  })
}

const handleImportDocGlobal = async (file: File) => {
  const now = new Date()
  const dataRec = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const filePath = `global/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { upsert: false })

  if (uploadError) {
    alert('Erro ao enviar arquivo: ' + uploadError.message)
    return
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath)

  await supabase.from('documentos_recebidos').insert({
    pessoa_id: null,
    protocolo_id: null,
    nome: file.name,
    tipo: file.type,
    caminho: urlData.publicUrl,
    descricao: '',
    data_recebimento: dataRec,
    criado_em: new Date().toISOString(),
  })
}
  
  const handleOpenFile = async (filePath: string) => {
    if (!filePath || filePath === '') return
    if (filePath.startsWith('http')) window.open(filePath, '_blank')
  }

  // Delete arquivo do Storage + registro do banco
  const handleDeleteDocumento = async (id: number, caminho?: string) => {
    if (!window.confirm('Remover o registro deste documento?')) return
    // Se for arquivo na nuvem, extrai o path e deleta do Storage
    if (caminho?.startsWith('http')) {
      try {
        const url = new URL(caminho)
        const pathParts = url.pathname.split(`/${BUCKET}/`)
        if (pathParts.length > 1) {
          const storagePath = decodeURIComponent(pathParts[1].split('?')[0])
          await supabase.storage.from(BUCKET).remove([storagePath])
        }
      } catch { /* ignora erros de parse de URL */ }
    }
    await supabase.from('documentos_recebidos').delete().eq('id', id)
  }

  const handleNewDocGerado = (pessoa: Pessoa) => {
    setDocGeradoFormData({ pessoa_id: pessoa.id!, tipo: 'Ofício', titulo: '', conteudo: '', data_geracao: '', criado_em: '' })
    setDocGeradoFormOpen(true)
  }

  const handleEditDocGerado = (doc: DocumentoGerado) => {
    setDocGeradoFormData({ ...doc })
    setDocGeradoFormOpen(true)
  }

 const handleSaveProtocolo = async (protocolo: Protocolo) => {
  const now = new Date().toISOString()
  const { pessoa_nome, pessoa_endereco, pessoa_telefone, pessoa_cpf,
          criado_em, atualizado_em, id, ...data } = protocolo
  const historico = typeof data.historico === 'string'
    ? JSON.parse(data.historico || '[]')
    : data.historico

  // Converte strings vazias em null para campos date
  const payload = {
    ...data,
    historico,
    data_entrada: data.data_entrada || null,
    prazo: data.prazo || null,
  }

  if (protocolo.id) {
    await supabase.from('protocolos')
      .update({ ...payload, atualizado_em: now })
      .eq('id', protocolo.id)
  } else {
    await supabase.from('protocolos')
      .insert({ ...payload, criado_em: now, atualizado_em: now })
  }
}

  const handleDeleteProtocolo = async (id: number) => {
    if (!window.confirm('Excluir este protocolo e seus vinculados?')) return
    await supabase.from('protocolos').delete().eq('id', id)
    setSelectedProtocolo(null)
  }

  const handleUpdateProtocoloStatus = async (id: number, newStatus: string) => {
    await supabase.from('protocolos').update({ status: newStatus, atualizado_em: new Date().toISOString() }).eq('id', id)
    if (selectedProtocolo?.id === id) setSelectedProtocolo(prev => prev ? { ...prev, status: newStatus as Protocolo['status'] } : null)
  }

  const handleAddMovimentacao = async (id: number, novaMovimentacao: string) => {
    const protocolo = protocolos.find(p => p.id === id)
    if (!protocolo || !novaMovimentacao.trim()) return
    const historico: Movimentacao[] = JSON.parse(protocolo.historico || '[]')
    historico.unshift({ data: new Date().toISOString(), texto: novaMovimentacao })
    await supabase.from('protocolos').update({ historico, atualizado_em: new Date().toISOString() }).eq('id', id)
    if (selectedProtocolo?.id === id)
      setSelectedProtocolo(prev => prev ? { ...prev, historico: JSON.stringify(historico) } : null)
  }

  const handleSaveDocumentoGerado = async (documento: DocumentoGerado) => {
    const now = new Date().toISOString()
    const { pessoa_nome, protocolo_numero, ...data } = documento
    if (documento.id) {
      await supabase.from('documentos_gerados').update({ ...data, criado_em: now }).eq('id', documento.id)
    } else {
      await supabase.from('documentos_gerados').insert({ ...data, criado_em: now })
    }
  }

  const handleDeleteDocumentoGerado = async (id: number) => {
    if (!window.confirm('Excluir este documento gerado?')) return
    await supabase.from('documentos_gerados').delete().eq('id', id)
  }

  const handleSaveTarefa = async (tarefa: Tarefa) => {
    const now = new Date().toISOString()
    const { pessoa_nome, protocolo_numero, ...data } = tarefa
    if (tarefa.id) {
      await supabase.from('tarefas').update({ ...data, atualizado_em: now }).eq('id', tarefa.id)
    } else {
      await supabase.from('tarefas').insert({ ...data, criado_em: now, atualizado_em: now })
    }
  }

  const handleToggleTarefaStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'concluida' ? 'pendente' : 'concluida'
    await supabase.from('tarefas').update({ status: newStatus, atualizado_em: new Date().toISOString() }).eq('id', id)
  }

  const handleDeleteTarefa = async (id: number) => {
    if (!window.confirm('Excluir esta tarefa?')) return
    await supabase.from('tarefas').delete().eq('id', id)
  }

  const handleSaveAgenda = async (item: AgendaItem) => {
    const now = new Date().toISOString()
    const payload = {
      titulo: item.titulo,
      descricao: item.descricao || '',
      data: item.data,
      horario: item.horario || '',
      realizado: item.realizado ?? 0,
      pessoa_id: item.pessoa_id ?? null,
      protocolo_id: item.protocolo_id ?? null,
    }
    if (item.id) {
      await supabase.from('agenda').update(payload).eq('id', item.id)
    } else {
      await supabase.from('agenda').insert({ ...payload, criado_em: now })
    }
  }

  const handleToggleAgendaRealizado = async (id: number, currentRealizado: number) => {
    await supabase.from('agenda').update({ realizado: currentRealizado === 1 ? 0 : 1 }).eq('id', id)
  }

  const handleDeleteAgenda = async (id: number) => {
    if (!window.confirm('Excluir este compromisso?')) return
    await supabase.from('agenda').delete().eq('id', id)
  }

  const handleSaveConfig = async (newConfig: Config) => {
    for (const [chave, valor] of Object.entries(newConfig)) {
      await supabase.from('configuracoes').upsert({ chave, valor }, { onConflict: 'chave' })
    }
    alert('Configurações salvas com sucesso!')
    setConfig(newConfig)
  }

  const handleLogout = async () => {
    if (!window.confirm('Deseja sair do sistema?')) return
    await supabase.auth.signOut()
  }

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} onTabChange={handleNavigate} onLogout={handleLogout} />
      <main className="flex-1 flex flex-col bg-main-bg overflow-hidden">
        <Topbar
          activeTab={activeTab}
          selectedPessoaNome={selectedPessoa?.nome}
          selectedProtocoloNumero={selectedProtocolo?.numero}
          isOnline={isOnline}
          userEmail={session.user.email}
        />
        <div className="flex-1 overflow-hidden">
          {activeTab === 'Dashboard' && (
            <Dashboard protocolos={protocolos} tarefas={tarefas} agenda={agenda} onSelectProtocolo={setSelectedProtocolo} onNavigate={handleNavigate} onNavigateToTarefa={handleNavigateToTarefa} formatDate={formatDate} getPrazoStatus={getPrazoStatus} />
          )}
          {activeTab === 'Pessoas / Dossiês' && (
            <Pessoas
              pessoas={pessoas} protocolos={protocolos} documentos={documentos} documentosGerados={documentosGerados} tarefas={tarefas}
              selectedPessoa={selectedPessoa} onSelectPessoa={setSelectedPessoa} onSavePessoa={handleSavePessoa} onDeletePessoa={handleDeletePessoa}
              onImportDoc={handleImportDoc} onOpenFile={handleOpenFile} onDeleteDoc={handleDeleteDocumento}
              onDeleteDocGerado={handleDeleteDocumentoGerado} onNewDocGerado={handleNewDocGerado} onEditDocGerado={handleEditDocGerado}
              onNewTarefa={handleNewTarefaFromPessoa} formatDate={formatDate}
            />
          )}
          {activeTab === 'Protocolos' && (
            <Protocolos protocolos={protocolos} pessoas={pessoas} tarefas={tarefas} selectedProtocolo={selectedProtocolo} onSelectProtocolo={setSelectedProtocolo} onSaveProtocolo={handleSaveProtocolo} onDeleteProtocolo={handleDeleteProtocolo} onUpdateStatus={handleUpdateProtocoloStatus} onAddMovimentacao={handleAddMovimentacao} onNewTarefa={handleNewTarefaFromProtocolo} formatDate={formatDate} getPrazoStatus={getPrazoStatus} />
          )}
          {activeTab === 'Documentos Recebidos' && (
            <DocumentosRecebidos documentos={documentos} pessoas={pessoas} onOpenFile={handleOpenFile} onDeleteDoc={(id) => handleDeleteDocumento(id)} onSelectPessoa={setSelectedPessoa} onNavigate={handleNavigate} formatDate={formatDate} />
          )}
          {activeTab === 'Documentos Gerados' && (
            <DocumentosGerados documentosGerados={documentosGerados} pessoas={pessoas} onOpenFile={handleOpenFile} onDeleteDocGerado={handleDeleteDocumentoGerado} onSelectPessoa={setSelectedPessoa} onNavigate={handleNavigate} formatDate={formatDate} />
          )}
          {activeTab === 'Tarefas' && (
            <Tarefas tarefas={tarefas} pessoas={pessoas} protocolos={protocolos} selectedTarefa={selectedTarefa} onSelectTarefa={setSelectedTarefa} onSaveTarefa={handleSaveTarefa} onToggleStatus={handleToggleTarefaStatus} onDeleteTarefa={handleDeleteTarefa} onNavigateToPessoa={handleNavigateToPessoa} onNavigateToProtocolo={handleNavigateToProtocolo} newTarefaInit={newTarefaInit} onClearNewTarefaInit={() => setNewTarefaInit(null)} formatDate={formatDate} getPrazoStatus={getPrazoStatus} />
          )}
          {activeTab === 'Agenda' && (
            <Agenda agenda={agenda} pessoas={pessoas} protocolos={protocolos} onSaveAgenda={handleSaveAgenda} onToggleRealizado={handleToggleAgendaRealizado} onDeleteAgenda={handleDeleteAgenda} formatDate={formatDate} />
          )}
          {activeTab === 'Busca Global' && (
            <BuscaGlobal pessoas={pessoas} protocolos={protocolos} documentos={documentos} documentosGerados={documentosGerados} tarefas={tarefas} agenda={agenda} onSelectPessoa={setSelectedPessoa} onSelectProtocolo={setSelectedProtocolo} onNavigate={handleNavigate} formatDate={formatDate} />
          )}
          {activeTab === 'Configurações' && (
            <Configuracoes config={config} onSaveConfig={handleSaveConfig} />
          )}
        </div>
      </main>

      {docGeradoFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-surface-card">
              <h2 className="text-lg font-bold">{docGeradoFormData.id ? 'Editar Documento' : 'Novo Documento'}</h2>
              <button onClick={() => setDocGeradoFormOpen(false)} className="text-text-secondary hover:text-text-main">✕</button>
            </div>
            <form onSubmit={async (e) => { e.preventDefault(); await handleSaveDocumentoGerado(docGeradoFormData); setDocGeradoFormOpen(false) }} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Tipo</label>
                  <select className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-primary-btn/20" value={docGeradoFormData.tipo} onChange={e => setDocGeradoFormData({ ...docGeradoFormData, tipo: e.target.value })}>
                    <option>Ofício</option><option>Memorando</option><option>Despacho</option><option>Parecer</option><option>Relatório</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Título *</label>
                  <input required className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-primary-btn/20" value={docGeradoFormData.titulo} onChange={e => setDocGeradoFormData({ ...docGeradoFormData, titulo: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Conteúdo</label>
                <textarea rows={8} className="w-full p-2 bg-surface-card border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-primary-btn/20 resize-none" value={docGeradoFormData.conteudo} onChange={e => setDocGeradoFormData({ ...docGeradoFormData, conteudo: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setDocGeradoFormOpen(false)} className="px-4 py-2 text-text-secondary font-bold hover:text-text-main text-sm">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-success text-white rounded font-bold hover:opacity-90 text-sm">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
