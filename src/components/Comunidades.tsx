import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Home, Plus, Search, Pencil, Trash2, Paperclip, FileText, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Comunidade {
  id: number
  nome: string
  gps_lat: number | null
  gps_lng: number | null
  distancia: string | null
  gasto_combustivel: string | null
  tipo_motor: string | null
  duracao_viagem: string | null
  qtd_pessoas: number | null
  qtd_familias: number | null
  presidente_nome: string | null
  presidente_telefone: string | null
  presidente_cpf: string | null
  observacoes: string | null
  criado_em: string
}

interface Anexo {
  id: number
  comunidade_id: number
  nome: string
  url: string
  criado_em: string
}

const VAZIO: Partial<Comunidade> = {}
const fmt = (v: any) => (v === null || v === undefined || v === '') ? '—' : String(v)

export const Comunidades: React.FC = () => {
  const [lista, setLista] = useState<Comunidade[]>([])
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<Partial<Comunidade>>({ ...VAZIO })
  const [coordCola, setCoordCola] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [verCom, setVerCom] = useState<Comunidade | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [anexarId, setAnexarId] = useState<number | null>(null)
  const [uploadingId, setUploadingId] = useState<number | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('comunidades').select('*').order('nome', { ascending: true })
    if (data) setLista(data as Comunidade[])
    const { data: anx } = await supabase.from('comunidade_anexos').select('*').order('criado_em', { ascending: true })
    if (anx) setAnexos(anx as Anexo[])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const anexosDe = (id: number) => anexos.filter(x => x.comunidade_id === id)

  const filtrados = lista.filter(c => {
    const b = filtro.toLowerCase()
    return !b ||
      (c.nome || '').toLowerCase().includes(b) ||
      (c.presidente_nome || '').toLowerCase().includes(b)
  })

  // ---------- Formulário ----------
  const abrirNovo = () => { setEditId(null); setForm({ ...VAZIO }); setCoordCola(''); setShowForm(true) }
  const abrirEdicao = (c: Comunidade) => {
    setEditId(c.id); setForm({ ...c })
    setCoordCola(c.gps_lat != null && c.gps_lng != null ? `${c.gps_lat}, ${c.gps_lng}` : '')
    setShowForm(true)
  }
  const fecharForm = () => { setShowForm(false); setEditId(null); setForm({ ...VAZIO }); setCoordCola('') }

  // Cola "lat, lng" e preenche os dois campos
  const aplicarCoord = (txt: string) => {
    setCoordCola(txt)
    const m = txt.split(/[,;\s]+/).map(x => x.trim()).filter(Boolean)
    if (m.length >= 2) {
      const lat = Number(m[0]), lng = Number(m[1])
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setForm(f => ({ ...f, gps_lat: lat, gps_lng: lng }))
      }
    }
  }

  const salvar = async () => {
    if (!form.nome?.trim()) return
    setSalvando(true)
    try {
      const payload = { ...form }
      delete (payload as any).id
      delete (payload as any).criado_em
      if (editId) {
        await supabase.from('comunidades').update(payload).eq('id', editId)
      } else {
        await supabase.from('comunidades').insert(payload)
      }
      fecharForm()
      carregar()
    } catch (e: any) {
      alert('Erro ao salvar: ' + (e?.message || e))
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (c: Comunidade) => {
    if (!window.confirm(`Excluir a comunidade "${c.nome}"?`)) return
    await supabase.from('comunidades').delete().eq('id', c.id)
    carregar()
  }

  // ---------- Anexos ----------
  const pedirAnexo = (id: number) => { setAnexarId(id); fileInputRef.current?.click() }
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || anexarId == null) return
    setUploadingId(anexarId)
    try {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
      const path = `comunidades/${anexarId}_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('documentos').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('documentos').getPublicUrl(path)
      await supabase.from('comunidade_anexos').insert({ comunidade_id: anexarId, nome: file.name, url: pub.publicUrl })
      carregar()
    } catch (err: any) {
      alert('Não foi possível anexar: ' + (err?.message || err))
    } finally {
      setUploadingId(null)
      setAnexarId(null)
    }
  }
  const removerAnexo = async (anexo: Anexo) => {
    if (!window.confirm(`Remover "${anexo.nome}"?`)) return
    await supabase.from('comunidade_anexos').delete().eq('id', anexo.id)
    carregar()
  }

  const inp = "w-full p-2 border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-primary-btn/20"
  const lbl = "block text-xs font-bold text-text-secondary uppercase mb-1"

  return (
    <div className="p-4 flex flex-col h-full overflow-hidden">
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={onFileChange} />

      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-4 shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Home size={24} /> Comunidades</h1>
          <p className="text-text-secondary text-sm">Cadastro das comunidades do município: localização, deslocamento e presidência.</p>
        </div>
        <button onClick={abrirNovo} className="flex items-center gap-2 bg-primary-btn text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 text-sm">
          <Plus size={18} /> Nova Comunidade
        </button>
      </div>

      {/* Busca */}
      <div className="relative mb-3 shrink-0">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-btn/20"
          placeholder="Buscar por comunidade ou presidente..."
          value={filtro} onChange={e => setFiltro(e.target.value)} />
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <p className="text-text-secondary text-sm italic">Carregando...</p>
        ) : filtrados.length === 0 ? (
          <p className="text-text-secondary text-sm italic">Nenhuma comunidade cadastrada. Toque em "Nova Comunidade".</p>
        ) : filtrados.map(c => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p onClick={() => setVerCom(c)} className="font-bold text-sm cursor-pointer hover:text-primary-btn hover:underline flex items-center gap-1">
                <Home size={14} className="shrink-0" /> {c.nome}
              </p>
              <p className="text-xs text-text-secondary truncate mt-0.5">
                {[
                  c.presidente_nome ? `Pres.: ${c.presidente_nome}` : '',
                  c.qtd_pessoas ? `${c.qtd_pessoas} pessoas` : '',
                  c.qtd_familias ? `${c.qtd_familias} famílias` : '',
                  c.distancia || '',
                  (c.gps_lat != null && c.gps_lng != null) ? '📍 c/ coordenada' : '⚠ sem coordenada',
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {anexosDe(c.id).length > 0 && (
                <button onClick={() => setVerCom(c)} title="Ver anexos"
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-success/40 text-success hover:bg-success/5">
                  <FileText size={13} /> {anexosDe(c.id).length}
                </button>
              )}
              <button onClick={() => pedirAnexo(c.id)} disabled={uploadingId === c.id}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-gray-200 text-text-secondary hover:bg-gray-50">
                <Paperclip size={13} /> {uploadingId === c.id ? 'Enviando…' : 'Anexar'}
              </button>
              <button onClick={() => abrirEdicao(c)} className="p-1.5 rounded hover:bg-gray-100 text-text-secondary" title="Editar"><Pencil size={15} /></button>
              <button onClick={() => excluir(c)} className="p-1.5 rounded hover:bg-error-expired/10 text-error-expired" title="Excluir"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal visualizar */}
      {verCom && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold flex items-center gap-2 truncate"><Home size={20} /> {verCom.nome}</h2>
              <button onClick={() => setVerCom(null)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto p-4 text-sm">
              {([
                ['Presidente', verCom.presidente_nome],
                ['Telefone', verCom.presidente_telefone],
                ['CPF do Presidente', verCom.presidente_cpf],
                ['Quantidade de Pessoas', verCom.qtd_pessoas],
                ['Quantidade de Famílias', verCom.qtd_familias],
                ['Distância', verCom.distancia],
                ['Gasto de Combustível', verCom.gasto_combustivel],
                ['Tipo de Motor', verCom.tipo_motor],
                ['Duração da Viagem', verCom.duracao_viagem],
                ['Coordenada', (verCom.gps_lat != null && verCom.gps_lng != null) ? `${verCom.gps_lat}, ${verCom.gps_lng}` : null],
              ] as [string, any][]).map(([label, val]) => (
                <div key={label} className="flex justify-between gap-4 py-1.5 border-b border-gray-100">
                  <span className="text-text-secondary">{label}</span>
                  <span className="text-right font-medium">{fmt(val)}</span>
                </div>
              ))}
              {verCom.observacoes && (
                <div className="mt-3"><p className="text-text-secondary text-xs font-bold uppercase mb-1">Observações</p><p className="whitespace-pre-wrap">{verCom.observacoes}</p></div>
              )}
              <div className="mt-4">
                <p className="text-text-secondary text-xs font-bold uppercase mb-2">Documentos anexados ({anexosDe(verCom.id).length})</p>
                {anexosDe(verCom.id).length === 0 && <p className="text-text-secondary text-xs italic mb-2">Nenhum documento anexado ainda.</p>}
                {anexosDe(verCom.id).map(anx => (
                  <div key={anx.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100">
                    <a href={anx.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary-btn hover:underline truncate">
                      <FileText size={14} className="shrink-0" /> <span className="truncate">{anx.nome}</span>
                    </a>
                    <button onClick={() => removerAnexo(anx)} className="p-1 rounded hover:bg-error-expired/10 text-error-expired shrink-0" title="Remover"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t flex flex-wrap justify-end gap-2">
              <button onClick={() => pedirAnexo(verCom.id)} disabled={uploadingId === verCom.id} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm border border-gray-200 text-text-secondary hover:bg-gray-50"><Paperclip size={15} /> {uploadingId === verCom.id ? 'Enviando…' : 'Adicionar anexo'}</button>
              <button onClick={() => { const c = verCom; setVerCom(null); abrirEdicao(c) }} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm bg-primary-btn text-white font-bold hover:opacity-90"><Pencil size={15} /> Editar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal novo/editar */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div key={editId ?? 'novo'} className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold">{editId ? 'Editar Comunidade' : 'Nova Comunidade'}</h2>
              <button onClick={fecharForm} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto p-4 grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2"><label className={lbl}>Nome da Comunidade *</label>
                <input className={inp} value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>

              <div className="col-span-2"><label className={lbl}>Coordenada (cole "lat, lng" do celular)</label>
                <input className={inp} placeholder="-3.6402, -64.5525" value={coordCola} onChange={e => aplicarCoord(e.target.value)} /></div>
              <div><label className={lbl}>Latitude</label>
                <input type="number" step="any" className={inp} value={form.gps_lat ?? ''} onChange={e => setForm(f => ({ ...f, gps_lat: e.target.value === '' ? null : Number(e.target.value) }))} /></div>
              <div><label className={lbl}>Longitude</label>
                <input type="number" step="any" className={inp} value={form.gps_lng ?? ''} onChange={e => setForm(f => ({ ...f, gps_lng: e.target.value === '' ? null : Number(e.target.value) }))} /></div>

              <div><label className={lbl}>Distância</label>
                <input className={inp} placeholder="ex: 45 km de barco" value={form.distancia || ''} onChange={e => setForm(f => ({ ...f, distancia: e.target.value }))} /></div>
              <div><label className={lbl}>Duração da Viagem</label>
                <input className={inp} placeholder="ex: 2 horas" value={form.duracao_viagem || ''} onChange={e => setForm(f => ({ ...f, duracao_viagem: e.target.value }))} /></div>
              <div><label className={lbl}>Gasto de Combustível</label>
                <input className={inp} placeholder="ex: 30 litros / R$ 180" value={form.gasto_combustivel || ''} onChange={e => setForm(f => ({ ...f, gasto_combustivel: e.target.value }))} /></div>
              <div><label className={lbl}>Tipo de Motor</label>
                <input className={inp} placeholder="ex: Rabeta 13HP / 40HP" value={form.tipo_motor || ''} onChange={e => setForm(f => ({ ...f, tipo_motor: e.target.value }))} /></div>

              <div><label className={lbl}>Quantidade de Pessoas</label>
                <input type="number" className={inp} value={form.qtd_pessoas ?? ''} onChange={e => setForm(f => ({ ...f, qtd_pessoas: e.target.value === '' ? null : Number(e.target.value) }))} /></div>
              <div><label className={lbl}>Quantidade de Famílias</label>
                <input type="number" className={inp} value={form.qtd_familias ?? ''} onChange={e => setForm(f => ({ ...f, qtd_familias: e.target.value === '' ? null : Number(e.target.value) }))} /></div>
              <div><label className={lbl}>Presidente da Comunidade</label>
                <input className={inp} value={form.presidente_nome || ''} onChange={e => setForm(f => ({ ...f, presidente_nome: e.target.value }))} /></div>
              <div><label className={lbl}>Telefone do Presidente</label>
                <input className={inp} value={form.presidente_telefone || ''} onChange={e => setForm(f => ({ ...f, presidente_telefone: e.target.value }))} /></div>
              <div><label className={lbl}>CPF do Presidente</label>
                <input className={inp} value={form.presidente_cpf || ''} onChange={e => setForm(f => ({ ...f, presidente_cpf: e.target.value }))} /></div>

              <div className="col-span-2"><label className={lbl}>Observações</label>
                <textarea rows={2} className={inp} value={form.observacoes || ''} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={fecharForm} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={salvar} disabled={salvando || !form.nome?.trim()}
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
