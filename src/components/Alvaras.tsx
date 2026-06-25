import React, { useState, useEffect, useCallback, useRef } from 'react'
import { FileCheck, Plus, Search, Printer, Pencil, Trash2, Paperclip, FileText, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Alvara {
  id: number
  numero: string | null
  nome_estabelecimento: string
  cnpj: string | null
  nome_responsavel: string | null
  cpf_responsavel: string | null
  telefone: string | null
  endereco: string | null
  bairro: string | null
  municipio: string | null
  tipo_estabelecimento: string | null
  area_total: number | null
  capacidade_pessoas: number | null
  situacao_imovel: string | null
  apto_alvara: boolean | null
  descricao_tecnica: string | null
  observacoes: string | null
  nome_vistoriador: string | null
  matricula_vistoriador: string | null
  data_vistoria: string | null
  documento_url: string | null
  relatorio_url: string | null
  criado_em: string
}

const VAZIO: Partial<Alvara> = {
  municipio: 'Tefé/AM',
  situacao_imovel: 'Em análise',
  nome_vistoriador: 'Reumano Nery da Silva',
  matricula_vistoriador: '0000',
}

const fmt = (v: any) => (v === null || v === undefined || v === '') ? '—' : String(v)
const dataBR = (d: string | null) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

export const Alvaras: React.FC = () => {
  const [alvaras, setAlvaras] = useState<Alvara[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState('todos')
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<Partial<Alvara>>({ ...VAZIO })
  const [salvando, setSalvando] = useState(false)
  const [verAlvara, setVerAlvara] = useState<Alvara | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [anexarId, setAnexarId] = useState<number | null>(null)
  const [uploadingId, setUploadingId] = useState<number | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('alvaras').select('*').order('criado_em', { ascending: false })
    if (data) setAlvaras(data as Alvara[])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const filtrados = alvaras.filter(a => {
    const b = filtro.toLowerCase()
    const okBusca = !b ||
      (a.nome_estabelecimento || '').toLowerCase().includes(b) ||
      (a.nome_responsavel || '').toLowerCase().includes(b) ||
      (a.bairro || '').toLowerCase().includes(b) ||
      (a.numero || '').toLowerCase().includes(b) ||
      (a.cnpj || '').includes(b)
    const okSit = filtroSituacao === 'todos' || (a.situacao_imovel || '') === filtroSituacao
    return okBusca && okSit
  })

  // ---------- Formulário ----------
  const abrirNovo = () => { setEditId(null); setForm({ ...VAZIO }); setShowForm(true) }
  const abrirEdicao = (a: Alvara) => { setEditId(a.id); setForm({ ...a }); setShowForm(true) }
  const fecharForm = () => { setShowForm(false); setEditId(null); setForm({ ...VAZIO }) }

  const salvar = async () => {
    if (!form.nome_estabelecimento?.trim()) return
    setSalvando(true)
    const apto = form.situacao_imovel === 'Liberado'
    const validade = form.data_vistoria
      ? (() => { const d = new Date(form.data_vistoria + 'T12:00:00'); d.setFullYear(d.getFullYear() + 1); return d.toISOString().split('T')[0] })()
      : null
    try {
      if (editId) {
        await supabase.from('alvaras').update({ ...form, apto_alvara: apto, validade_vistoria: validade }).eq('id', editId)
      } else {
        const { data: num } = await supabase.rpc('proximo_alvara')
        await supabase.from('alvaras').insert({ ...form, numero: num || null, apto_alvara: apto, validade_vistoria: validade })
      }
      fecharForm()
      carregar()
    } catch (e: any) {
      alert('Erro ao salvar: ' + (e?.message || e))
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (a: Alvara) => {
    if (!window.confirm(`Excluir o alvará de "${a.nome_estabelecimento}"?`)) return
    await supabase.from('alvaras').delete().eq('id', a.id)
    setSelecionados(prev => { const n = new Set(prev); n.delete(a.id); return n })
    carregar()
  }

  // ---------- Anexo do relatório ----------
  const pedirAnexo = (id: number) => { setAnexarId(id); fileInputRef.current?.click() }
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || anexarId == null) return
    setUploadingId(anexarId)
    try {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
      const path = `alvaras/${anexarId}_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('documentos').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('documentos').getPublicUrl(path)
      await supabase.from('alvaras').update({ relatorio_url: pub.publicUrl }).eq('id', anexarId)
      carregar()
    } catch (err: any) {
      alert('Não foi possível anexar: ' + (err?.message || err))
    } finally {
      setUploadingId(null)
      setAnexarId(null)
    }
  }

  // ---------- Seleção / impressão ----------
  const toggleSel = (id: number) => setSelecionados(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const todosMarcados = filtrados.length > 0 && filtrados.every(a => selecionados.has(a.id))
  const toggleTodos = () => {
    if (todosMarcados) setSelecionados(new Set())
    else setSelecionados(new Set(filtrados.map(a => a.id)))
  }

  const imprimirSelecionados = () => {
    const lista = alvaras.filter(a => selecionados.has(a.id))
    if (lista.length === 0) return
    const hoje = new Date().toLocaleDateString('pt-BR')
    const cor = (s: string | null) => s === 'Liberado' ? '#166534' : s === 'Não liberado' ? '#991b1b' : '#92400e'
    const cards = lista.map((a, i) => {
      const end = [a.endereco, a.bairro, a.municipio].filter(Boolean).join(', ')
      return `<div class="card"><div class="numero">${i + 1}</div><div class="info">
        <div class="nome">${a.nome_estabelecimento}</div>
        <div class="detalhe"><b>Protocolo:</b> ${a.numero || '—'} &nbsp;|&nbsp; <b>Situação:</b> <span class="sit" style="color:${cor(a.situacao_imovel)}">${a.situacao_imovel || '—'}</span></div>
        ${a.nome_responsavel ? `<div class="detalhe"><b>Responsável:</b> ${a.nome_responsavel}</div>` : ''}
        ${a.telefone ? `<div class="detalhe"><b>Telefone:</b> ${a.telefone}</div>` : ''}
        ${end ? `<div class="detalhe endereco"><b>Endereço:</b> ${end}</div>` : ''}
        ${a.data_vistoria ? `<div class="detalhe"><b>Data da vistoria:</b> ${dataBR(a.data_vistoria)}</div>` : ''}
      </div></div>`
    }).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relação de Alvarás</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#111}h2{font-size:16px;margin-bottom:4px}.data{font-size:11px;color:#555;margin-bottom:16px}.card{display:flex;gap:12px;border:1px solid #ccc;border-radius:6px;padding:10px 14px;margin-bottom:10px;page-break-inside:avoid}.numero{font-size:20px;font-weight:bold;color:#aaa;min-width:24px;padding-top:2px}.info{flex:1}.nome{font-size:14px;font-weight:bold;margin-bottom:4px}.detalhe{margin-top:2px;line-height:1.5}.endereco{font-size:13px;color:#1a56db}.sit{font-weight:bold}@media print{body{margin:10px}}</style>
      </head><body><h2>Relação de Estabelecimentos Vistoriados — SEMDECP</h2><div class="data">Gerado em: ${hoje} | Total: ${lista.length} estabelecimento(s)</div>${cards}</body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => w.print(), 500)
  }

  const imprimirUm = (a: Alvara) => {
    const hoje = new Date().toLocaleDateString('pt-BR')
    const cor = a.situacao_imovel === 'Liberado' ? '#166534' : a.situacao_imovel === 'Não liberado' ? '#991b1b' : '#92400e'
    const linha = (lbl: string, val: any) => (val === null || val === undefined || val === '') ? '' : `<div class="row"><span class="lbl">${lbl}</span><span class="val">${val}</span></div>`
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Alvará ${a.numero || ''}</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;margin:24px;color:#111}h2{font-size:16px;margin:0}h3{font-size:12px;font-weight:normal;color:#555;margin:2px 0 14px}.nome{font-size:15px;font-weight:bold;margin:10px 0 4px}.sit{font-weight:bold}.row{display:flex;justify-content:space-between;gap:16px;padding:5px 0;border-bottom:1px solid #eee}.lbl{color:#555}.val{text-align:right;font-weight:500}.bloco{margin-top:14px;line-height:1.5}.bloco b{display:block;color:#555;font-size:11px;text-transform:uppercase;margin-bottom:3px}.ass{margin-top:50px;text-align:center}.ass div{display:inline-block;border-top:1px solid #000;padding-top:4px;min-width:60%}@media print{body{margin:12px}}</style>
      </head><body>
      <h2>PREFEITURA MUNICIPAL DE TEFÉ — SEMDECP</h2>
      <h3>Secretaria Municipal de Defesa Civil e Patrimonial</h3>
      <div class="nome">${a.nome_estabelecimento}</div>
      <div class="row"><span class="lbl">Protocolo</span><span class="val">${a.numero || '—'}</span></div>
      <div class="row"><span class="lbl">Situação</span><span class="val sit" style="color:${cor}">${a.situacao_imovel || '—'}</span></div>
      ${linha('CNPJ', a.cnpj)}
      ${linha('Tipo de Estabelecimento', a.tipo_estabelecimento)}
      ${linha('Responsável', a.nome_responsavel)}
      ${linha('CPF do Responsável', a.cpf_responsavel)}
      ${linha('Telefone', a.telefone)}
      ${linha('Endereço', [a.endereco, a.bairro, a.municipio].filter(Boolean).join(', '))}
      ${linha('Área Total (m²)', a.area_total)}
      ${linha('Capacidade (pessoas)', a.capacidade_pessoas)}
      ${linha('Data da Vistoria', dataBR(a.data_vistoria))}
      ${linha('Vistoriador', a.nome_vistoriador)}
      ${a.descricao_tecnica ? `<div class="bloco"><b>Descrição Técnica</b>${a.descricao_tecnica}</div>` : ''}
      ${a.observacoes ? `<div class="bloco"><b>Observações</b>${a.observacoes}</div>` : ''}
      <div class="ass"><div>${a.nome_vistoriador || 'Rêumano Nery da Silva'}<br>Chefe do Setor de Vistoria</div></div>
      <p style="font-size:10px;color:#888;margin-top:30px">Emitido em ${hoje}</p>
      </body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => w.print(), 500)
  }

  const badge = (s: string | null) => {
    if (s === 'Liberado') return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-success/10 text-success">LIBERADO</span>
    if (s === 'Não liberado') return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-error-expired/10 text-error-expired">NÃO LIBERADO</span>
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">EM ANÁLISE</span>
  }

  const inp = "w-full p-2 border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-primary-btn/20"
  const lbl = "block text-xs font-bold text-text-secondary uppercase mb-1"

  return (
    <div className="p-4 flex flex-col h-full overflow-hidden">
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={onFileChange} />

      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-4 shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileCheck size={24} /> Alvarás</h1>
          <p className="text-text-secondary text-sm">Arquivo das vistorias de alvará. Guarde os dados e o relatório para segunda via.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={imprimirSelecionados} disabled={selecionados.size === 0}
            className="flex items-center gap-2 border border-gray-300 text-text-secondary px-3 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40">
            <Printer size={16} /> Imprimir selecionados{selecionados.size > 0 ? ` (${selecionados.size})` : ''}
          </button>
          <button onClick={abrirNovo} className="flex items-center gap-2 bg-primary-btn text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 text-sm">
            <Plus size={18} /> Novo Alvará
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-3 shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-btn/20"
            placeholder="Buscar por estabelecimento, responsável, CNPJ, protocolo..."
            value={filtro} onChange={e => setFiltro(e.target.value)} />
        </div>
        <select className="p-2 border border-gray-200 rounded-lg text-sm outline-none" value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)}>
          <option value="todos">Todas situações</option>
          <option value="Liberado">Liberado</option>
          <option value="Não liberado">Não liberado</option>
          <option value="Em análise">Em análise</option>
        </select>
      </div>

      {/* Selecionar todos */}
      {filtrados.length > 0 && (
        <label className="flex items-center gap-2 mb-2 text-xs text-text-secondary cursor-pointer shrink-0">
          <input type="checkbox" checked={todosMarcados} onChange={toggleTodos} />
          Selecionar todos ({filtrados.length})
        </label>
      )}

      {/* Lista */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <p className="text-text-secondary text-sm italic">Carregando...</p>
        ) : filtrados.length === 0 ? (
          <p className="text-text-secondary text-sm italic">Nenhum alvará cadastrado. Toque em "Novo Alvará".</p>
        ) : filtrados.map(a => (
          <div key={a.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-3">
            <input type="checkbox" className="mt-1" checked={selecionados.has(a.id)} onChange={() => toggleSel(a.id)} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-text-secondary font-mono">{a.numero || 'S/N'}</span>
                {badge(a.situacao_imovel)}
              </div>
              <p onClick={() => setVerAlvara(a)} className="font-bold text-sm mt-0.5 truncate cursor-pointer hover:text-primary-btn hover:underline">{a.nome_estabelecimento}</p>
              <p className="text-xs text-text-secondary truncate">
                {[a.nome_responsavel, a.telefone, a.bairro, dataBR(a.data_vistoria)].filter(x => x && x !== '—').join(' · ')}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {a.relatorio_url ? (
                <a href={a.relatorio_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-success/40 text-success hover:bg-success/5" title="Abrir relatório">
                  <FileText size={13} /> Relatório
                </a>
              ) : (
                <button onClick={() => pedirAnexo(a.id)} disabled={uploadingId === a.id}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-gray-200 text-text-secondary hover:bg-gray-50">
                  <Paperclip size={13} /> {uploadingId === a.id ? 'Enviando…' : 'Anexar'}
                </button>
              )}
              {a.documento_url && (
                <a href={a.documento_url} target="_blank" rel="noopener noreferrer"
                  className="px-2 py-1 rounded text-xs border border-gray-200 text-text-secondary hover:bg-gray-50">PDF v2</a>
              )}
              <button onClick={() => abrirEdicao(a)} className="p-1.5 rounded hover:bg-gray-100 text-text-secondary" title="Editar"><Pencil size={15} /></button>
              <button onClick={() => excluir(a)} className="p-1.5 rounded hover:bg-error-expired/10 text-error-expired" title="Excluir"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal visualizar (só leitura) */}
      {verAlvara && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary font-mono">{verAlvara.numero || 'S/N'}</span>
                  {badge(verAlvara.situacao_imovel)}
                </div>
                <h2 className="text-lg font-bold truncate">{verAlvara.nome_estabelecimento}</h2>
              </div>
              <button onClick={() => setVerAlvara(null)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto p-4 text-sm">
              {([
                ['CNPJ', verAlvara.cnpj],
                ['Tipo de Estabelecimento', verAlvara.tipo_estabelecimento],
                ['Responsável', verAlvara.nome_responsavel],
                ['CPF do Responsável', verAlvara.cpf_responsavel],
                ['Telefone', verAlvara.telefone],
                ['Endereço', verAlvara.endereco],
                ['Bairro', verAlvara.bairro],
                ['Município/UF', verAlvara.municipio],
                ['Área Total (m²)', verAlvara.area_total],
                ['Capacidade (pessoas)', verAlvara.capacidade_pessoas],
                ['Situação', verAlvara.situacao_imovel],
                ['Data da Vistoria', dataBR(verAlvara.data_vistoria)],
                ['Vistoriador', verAlvara.nome_vistoriador],
                ['Matrícula', verAlvara.matricula_vistoriador],
              ] as [string, any][]).map(([label, val]) => (
                <div key={label} className="flex justify-between gap-4 py-1.5 border-b border-gray-100">
                  <span className="text-text-secondary">{label}</span>
                  <span className="text-right font-medium">{fmt(val)}</span>
                </div>
              ))}
              {verAlvara.descricao_tecnica && (
                <div className="mt-3"><p className="text-text-secondary text-xs font-bold uppercase mb-1">Descrição Técnica</p><p className="whitespace-pre-wrap">{verAlvara.descricao_tecnica}</p></div>
              )}
              {verAlvara.observacoes && (
                <div className="mt-3"><p className="text-text-secondary text-xs font-bold uppercase mb-1">Observações</p><p className="whitespace-pre-wrap">{verAlvara.observacoes}</p></div>
              )}
            </div>
            <div className="p-4 border-t flex flex-wrap justify-end gap-2">
              {verAlvara.relatorio_url ? (
                <a href={verAlvara.relatorio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm border border-success/40 text-success hover:bg-success/5"><FileText size={15} /> Relatório</a>
              ) : (
                <button onClick={() => pedirAnexo(verAlvara.id)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm border border-gray-200 text-text-secondary hover:bg-gray-50"><Paperclip size={15} /> Anexar relatório</button>
              )}
              <button onClick={() => imprimirUm(verAlvara)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm border border-gray-300 text-text-secondary hover:bg-gray-50"><Printer size={15} /> Imprimir este</button>
              <button onClick={() => { const a = verAlvara; setVerAlvara(null); abrirEdicao(a) }} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm bg-primary-btn text-white font-bold hover:opacity-90"><Pencil size={15} /> Editar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal novo/editar */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div key={editId ?? 'novo'} className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold">{editId ? `Editar Alvará ${form.numero || ''}` : 'Novo Alvará'}</h2>
              <button onClick={fecharForm} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto p-4 grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2"><label className={lbl}>Nome do Estabelecimento *</label>
                <input className={inp} value={form.nome_estabelecimento || ''} onChange={e => setForm(f => ({ ...f, nome_estabelecimento: e.target.value }))} /></div>
              <div><label className={lbl}>CNPJ</label>
                <input className={inp} value={form.cnpj || ''} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} /></div>
              <div><label className={lbl}>Tipo de Estabelecimento</label>
                <input className={inp} value={form.tipo_estabelecimento || ''} onChange={e => setForm(f => ({ ...f, tipo_estabelecimento: e.target.value }))} /></div>
              <div><label className={lbl}>Responsável</label>
                <input className={inp} value={form.nome_responsavel || ''} onChange={e => setForm(f => ({ ...f, nome_responsavel: e.target.value }))} /></div>
              <div><label className={lbl}>CPF do Responsável</label>
                <input className={inp} value={form.cpf_responsavel || ''} onChange={e => setForm(f => ({ ...f, cpf_responsavel: e.target.value }))} /></div>
              <div><label className={lbl}>Telefone</label>
                <input className={inp} value={form.telefone || ''} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} /></div>
              <div><label className={lbl}>Data da Vistoria</label>
                <input type="date" className={inp} value={form.data_vistoria || ''} onChange={e => setForm(f => ({ ...f, data_vistoria: e.target.value }))} /></div>
              <div className="col-span-2"><label className={lbl}>Endereço</label>
                <input className={inp} value={form.endereco || ''} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} /></div>
              <div><label className={lbl}>Bairro</label>
                <input className={inp} value={form.bairro || ''} onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))} /></div>
              <div><label className={lbl}>Município/UF</label>
                <input className={inp} value={form.municipio || ''} onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))} /></div>
              <div><label className={lbl}>Área Total (m²)</label>
                <input type="number" className={inp} value={form.area_total ?? ''} onChange={e => setForm(f => ({ ...f, area_total: e.target.value === '' ? null : Number(e.target.value) }))} /></div>
              <div><label className={lbl}>Capacidade (pessoas)</label>
                <input type="number" className={inp} value={form.capacidade_pessoas ?? ''} onChange={e => setForm(f => ({ ...f, capacidade_pessoas: e.target.value === '' ? null : Number(e.target.value) }))} /></div>
              <div className="col-span-2"><label className={lbl}>Situação</label>
                <select className={inp} value={form.situacao_imovel || 'Em análise'} onChange={e => setForm(f => ({ ...f, situacao_imovel: e.target.value }))}>
                  <option>Em análise</option><option>Liberado</option><option>Não liberado</option>
                </select></div>
              <div className="col-span-2"><label className={lbl}>Descrição Técnica</label>
                <textarea rows={3} className={inp} value={form.descricao_tecnica || ''} onChange={e => setForm(f => ({ ...f, descricao_tecnica: e.target.value }))} /></div>
              <div className="col-span-2"><label className={lbl}>Observações</label>
                <textarea rows={2} className={inp} value={form.observacoes || ''} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
              <div><label className={lbl}>Vistoriador</label>
                <input className={inp} value={form.nome_vistoriador || ''} onChange={e => setForm(f => ({ ...f, nome_vistoriador: e.target.value }))} /></div>
              <div><label className={lbl}>Matrícula</label>
                <input className={inp} value={form.matricula_vistoriador || ''} onChange={e => setForm(f => ({ ...f, matricula_vistoriador: e.target.value }))} /></div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={fecharForm} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={salvar} disabled={salvando || !form.nome_estabelecimento?.trim()}
                className="px-4 py-2 bg-primary-btn text-white rounded-lg font-bold text-sm disabled:opacity-50">
                {salvando ? 'Salvando...' : editId ? 'Salvar alterações' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}