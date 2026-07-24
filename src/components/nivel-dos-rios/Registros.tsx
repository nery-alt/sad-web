import React, { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, Waves, CloudRain, Droplets } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Estacao, RegistroNivel, RegistroChuva, RegistroUmidade, Tendencia } from './types'
import { SITUACAO_LABEL, SITUACAO_COR, TENDENCIA_LABEL, dataBR } from './types'

interface Props {
  estacoes: Estacao[]
  registrosNivel: RegistroNivel[]
  registrosChuva: RegistroChuva[]
  registrosUmidade: RegistroUmidade[]
  recarregar: () => void
}

type Tipo = 'nivel' | 'chuva' | 'umidade'

const hoje = () => new Date().toISOString().split('T')[0]

export const Registros: React.FC<Props> = ({ estacoes, registrosNivel, registrosChuva, registrosUmidade, recarregar }) => {
  const [tipo, setTipo] = useState<Tipo>('nivel')
  const [filtroEstacao, setFiltroEstacao] = useState<string>('todas')
  const [mostrarHistoricoAna, setMostrarHistoricoAna] = useState(false)
  const [limite, setLimite] = useState(60)

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<any>({})
  const [salvando, setSalvando] = useState(false)

  const estacaoDe = (id: string) => estacoes.find(e => e.id === id)
  // Só estações ativas aparecem aqui. Estações desativadas ficam arquivadas
  // (dados preservados no banco e visíveis no Histórico), fora do dia a dia.
  const estacoesAtivas = estacoes.filter(e => e.ativa)
  const idsAtivas = new Set(estacoesAtivas.map(e => e.id))

  const tabela = tipo === 'nivel' ? 'registros_nivel' : tipo === 'chuva' ? 'registros_chuva' : 'registros_umidade'
  const fonteBase = tipo === 'nivel' ? registrosNivel : tipo === 'chuva' ? registrosChuva : registrosUmidade

  const filtrados = useMemo(() => {
    let lista = [...fonteBase] as (RegistroNivel | RegistroChuva | RegistroUmidade)[]
    if (filtroEstacao !== 'todas') lista = lista.filter(r => r.estacao_id === filtroEstacao)
    else lista = lista.filter(r => idsAtivas.has(r.estacao_id))
    if (tipo === 'nivel' && !mostrarHistoricoAna) lista = (lista as RegistroNivel[]).filter(r => r.fonte !== 'ana')
    return lista.sort((a, b) => b.data.localeCompare(a.data))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fonteBase, filtroEstacao, tipo, mostrarHistoricoAna, estacoes])

  const visiveis = filtrados.slice(0, limite)

  const valorDefault = (): any => {
    const base = { estacao_id: filtroEstacao !== 'todas' ? filtroEstacao : (estacoesAtivas[0]?.id || ''), data: hoje(), observacoes: '' }
    if (tipo === 'nivel') return { ...base, cota_cm: '', fonte: 'manual', responsavel: '', situacao_tendencia: '' }
    if (tipo === 'chuva') return { ...base, chuva_mm: '', fonte: 'manual', responsavel: '' }
    return { ...base, umidade_pct: '', fonte: 'manual', responsavel: '' }
  }

  const abrirNovo = () => { setEditId(null); setForm(valorDefault()); setShowForm(true) }
  const abrirEdicao = (r: any) => {
    setEditId(r.id)
    const f: any = { ...r }
    if (tipo === 'nivel') f.cota_cm = r.cota_cm / 100
    if (tipo === 'chuva') f.chuva_mm = r.chuva_mm
    if (tipo === 'umidade') f.umidade_pct = r.umidade_pct
    setForm(f)
    setShowForm(true)
  }
  const fecharForm = () => { setShowForm(false); setEditId(null); setForm({}) }

  const salvar = async () => {
    if (!form.estacao_id || !form.data) return
    setSalvando(true)
    try {
      const payload: any = {
        estacao_id: form.estacao_id,
        data: form.data,
        fonte: form.fonte,
        responsavel: form.responsavel || null,
        observacoes: form.observacoes || null,
      }
      if (tipo === 'nivel') {
        payload.cota_cm = Math.round(Number(form.cota_cm) * 100)
        payload.situacao_tendencia = (form.situacao_tendencia || null) as Tendencia | null
      } else if (tipo === 'chuva') {
        payload.chuva_mm = Number(form.chuva_mm)
      } else {
        payload.umidade_pct = Number(form.umidade_pct)
      }
      if (editId) {
        const { error } = await supabase.from(tabela).update(payload).eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await supabase.from(tabela).insert(payload)
        if (error) throw error
      }
      fecharForm()
      recarregar()
    } catch (e: any) {
      alert('Erro ao salvar: ' + (e?.message || e) + (e?.message?.includes('duplicate') ? '\n\nJá existe um registro dessa fonte para essa estação e data.' : ''))
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (r: any) => {
    if (!window.confirm(`Excluir o registro de ${dataBR(r.data)}?`)) return
    await supabase.from(tabela).delete().eq('id', r.id)
    recarregar()
  }

  const inp = "w-full p-2 border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-primary-btn/20"
  const lbl = "block text-xs font-bold text-text-secondary uppercase mb-1"

  const tipos: { id: Tipo; label: string; icon: React.ReactNode }[] = [
    { id: 'nivel', label: 'Nível (cota)', icon: <Waves size={14} /> },
    { id: 'chuva', label: 'Chuva', icon: <CloudRain size={14} /> },
    { id: 'umidade', label: 'Umidade', icon: <Droplets size={14} /> },
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Seletor de tipo */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-3 shrink-0 w-fit">
        {tipos.map(t => (
          <button key={t.id} onClick={() => { setTipo(t.id); setLimite(60) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold ${tipo === t.id ? 'bg-white shadow text-text-main' : 'text-text-secondary'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-3 shrink-0 flex-wrap items-center">
        <select className="p-2 border border-gray-200 rounded-lg text-sm outline-none" value={filtroEstacao} onChange={e => setFiltroEstacao(e.target.value)}>
          <option value="todas">Todas as estações</option>
          {estacoesAtivas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        {tipo === 'nivel' && (
          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
            <input type="checkbox" checked={mostrarHistoricoAna} onChange={e => setMostrarHistoricoAna(e.target.checked)} />
            Incluir histórico ANA importado (milhares de linhas)
          </label>
        )}
        <div className="flex-1" />
        <button onClick={abrirNovo} disabled={estacoesAtivas.length === 0} className="flex items-center gap-2 bg-primary-btn text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 text-sm disabled:opacity-50">
          <Plus size={18} /> Novo Registro
        </button>
      </div>
      {estacoesAtivas.length === 0 && <p className="text-deadline-alert text-xs mb-2 shrink-0">Cadastre uma estação antes de lançar registros.</p>}

      {/* Lista */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {visiveis.length === 0 ? (
          <p className="text-text-secondary text-sm italic">Nenhum registro encontrado com esse filtro.</p>
        ) : visiveis.map(r => {
          const e = estacaoDe(r.estacao_id)
          const situacao = tipo === 'nivel' ? (r as RegistroNivel).situacao : null
          const cor = situacao ? SITUACAO_COR[situacao] : null
          return (
            <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-2.5 flex items-center gap-3">
              <div className="min-w-0 flex-1 flex items-center gap-3 flex-wrap">
                <span className="text-xs font-mono text-text-secondary w-24 shrink-0">{dataBR(r.data)}</span>
                <span className="text-sm font-bold truncate">{e?.nome || '—'}</span>
                {tipo === 'nivel' && <span className="text-sm">{((r as RegistroNivel).cota_cm / 100).toFixed(2)} m</span>}
                {tipo === 'chuva' && <span className="text-sm">{(r as RegistroChuva).chuva_mm} mm</span>}
                {tipo === 'umidade' && <span className="text-sm">{(r as RegistroUmidade).umidade_pct}%</span>}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-text-secondary">{r.fonte}</span>
                {situacao && cor && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cor.bg} ${cor.text}`}>{SITUACAO_LABEL[situacao]}</span>}
                {tipo === 'nivel' && (r as RegistroNivel).situacao_tendencia && (
                  <span className="text-[10px] text-text-secondary">{TENDENCIA_LABEL[(r as RegistroNivel).situacao_tendencia as Tendencia]}</span>
                )}
                {r.responsavel && <span className="text-[11px] text-text-secondary truncate">resp.: {r.responsavel}</span>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => abrirEdicao(r)} className="p-1.5 rounded hover:bg-gray-100 text-text-secondary" title="Editar"><Pencil size={14} /></button>
                <button onClick={() => excluir(r)} className="p-1.5 rounded hover:bg-error-expired/10 text-error-expired" title="Excluir"><Trash2 size={14} /></button>
              </div>
            </div>
          )
        })}
        {filtrados.length > limite && (
          <button onClick={() => setLimite(l => l + 100)} className="w-full text-center text-sm text-primary-btn hover:underline py-2">
            Carregar mais ({filtrados.length - limite} restantes)
          </button>
        )}
      </div>

      {/* Modal novo/editar */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div key={editId ?? 'novo'} className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold">{editId ? 'Editar Registro' : 'Novo Registro'} — {tipos.find(t => t.id === tipo)?.label}</h2>
              <button onClick={fecharForm} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto p-4 grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2"><label className={lbl}>Estação *</label>
                <select className={inp} value={form.estacao_id || ''} onChange={e => setForm((f: any) => ({ ...f, estacao_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {estacoesAtivas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select></div>
              <div><label className={lbl}>Data *</label>
                <input type="date" className={inp} value={form.data || ''} onChange={e => setForm((f: any) => ({ ...f, data: e.target.value }))} /></div>
              <div><label className={lbl}>Fonte</label>
                <select className={inp} value={form.fonte || 'manual'} onChange={e => setForm((f: any) => ({ ...f, fonte: e.target.value }))}>
                  <option value="manual">Manual</option>
                  <option value="ana">ANA</option>
                  {tipo === 'nivel' && <option value="mamiraua">Mamirauá</option>}
                  {tipo === 'chuva' && <option value="inmet">INMET</option>}
                  {tipo === 'umidade' && <option value="inmet">INMET</option>}
                </select></div>

              {tipo === 'nivel' && (
                <>
                  <div><label className={lbl}>Cota (m) *</label>
                    <input type="number" step="0.01" className={inp} value={form.cota_cm ?? ''} onChange={e => setForm((f: any) => ({ ...f, cota_cm: e.target.value }))} /></div>
                  <div><label className={lbl}>Tendência</label>
                    <select className={inp} value={form.situacao_tendencia || ''} onChange={e => setForm((f: any) => ({ ...f, situacao_tendencia: e.target.value }))}>
                      <option value="">— não informada —</option>
                      {(['estiagem', 'vazante', 'estavel', 'enchendo', 'cheia'] as Tendencia[]).map(t => <option key={t} value={t}>{TENDENCIA_LABEL[t]}</option>)}
                    </select></div>
                </>
              )}
              {tipo === 'chuva' && (
                <div><label className={lbl}>Chuva (mm) *</label>
                  <input type="number" step="0.1" className={inp} value={form.chuva_mm ?? ''} onChange={e => setForm((f: any) => ({ ...f, chuva_mm: e.target.value }))} /></div>
              )}
              {tipo === 'umidade' && (
                <div><label className={lbl}>Umidade relativa (%) *</label>
                  <input type="number" step="0.1" min="0" max="100" className={inp} value={form.umidade_pct ?? ''} onChange={e => setForm((f: any) => ({ ...f, umidade_pct: e.target.value }))} /></div>
              )}

              <div><label className={lbl}>Responsável</label>
                <input className={inp} value={form.responsavel || ''} onChange={e => setForm((f: any) => ({ ...f, responsavel: e.target.value }))} /></div>
              <div className="col-span-2"><label className={lbl}>Observações</label>
                <textarea rows={2} className={inp} value={form.observacoes || ''} onChange={e => setForm((f: any) => ({ ...f, observacoes: e.target.value }))} /></div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={fecharForm} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={salvar} disabled={salvando || !form.estacao_id || !form.data}
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
