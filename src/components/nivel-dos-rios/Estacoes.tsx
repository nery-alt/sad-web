import React, { useState } from 'react'
import { Radio, Plus, Pencil, Trash2, X, Power } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Estacao } from './types'

interface Props {
  estacoes: Estacao[]
  recarregar: () => void
}

const VAZIO: Partial<Estacao> = { ativa: true }

export const Estacoes: React.FC<Props> = ({ estacoes, recarregar }) => {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Estacao>>({ ...VAZIO })
  const [salvando, setSalvando] = useState(false)

  const abrirNovo = () => { setEditId(null); setForm({ ...VAZIO }); setShowForm(true) }
  const abrirEdicao = (e: Estacao) => { setEditId(e.id); setForm({ ...e }); setShowForm(true) }
  const fecharForm = () => { setShowForm(false); setEditId(null); setForm({ ...VAZIO }) }

  const salvar = async () => {
    if (!form.nome?.trim() || !form.rio?.trim() || !form.localidade?.trim()) return
    setSalvando(true)
    try {
      const payload = { ...form }
      delete (payload as any).id
      delete (payload as any).created_at
      if (editId) {
        await supabase.from('estacoes_monitoramento').update(payload).eq('id', editId)
      } else {
        await supabase.from('estacoes_monitoramento').insert(payload)
      }
      fecharForm()
      recarregar()
    } catch (e: any) {
      alert('Erro ao salvar: ' + (e?.message || e))
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (e: Estacao) => {
    if (!window.confirm(`Excluir a estação "${e.nome}"? Os registros de nível/chuva/umidade vinculados a ela também deixarão de aparecer.`)) return
    const { error } = await supabase.from('estacoes_monitoramento').delete().eq('id', e.id)
    if (error) { alert('Não foi possível excluir: ' + error.message + '\n\nProvavelmente há registros vinculados — remova-os primeiro em "Registros".'); return }
    recarregar()
  }

  const alternarAtiva = async (e: Estacao) => {
    await supabase.from('estacoes_monitoramento').update({ ativa: !e.ativa }).eq('id', e.id)
    recarregar()
  }

  const inp = "w-full p-2 border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-primary-btn/20"
  const lbl = "block text-xs font-bold text-text-secondary uppercase mb-1"

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex justify-end mb-2 shrink-0">
        <button onClick={abrirNovo} className="flex items-center gap-2 bg-primary-btn text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 text-sm">
          <Plus size={18} /> Nova Estação
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {estacoes.length === 0 ? (
          <p className="text-text-secondary text-sm italic">Nenhuma estação cadastrada. Toque em "Nova Estação".</p>
        ) : estacoes.map(e => (
          <div key={e.id} className={`bg-white border rounded-lg p-3 flex items-start gap-3 ${e.ativa ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm flex items-center gap-1.5">
                <Radio size={14} className="shrink-0" /> {e.nome}
                {!e.ativa && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-text-secondary">INATIVA</span>}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {[e.rio, e.localidade, e.codigo_ana ? `código ANA ${e.codigo_ana}` : null].filter(Boolean).join(' · ')}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Limiares: {e.cota_atencao_cm != null ? `atenção ${(e.cota_atencao_cm / 100).toFixed(2)}m` : 'atenção —'}
                {' · '}{e.cota_alerta_cm != null ? `alerta ${(e.cota_alerta_cm / 100).toFixed(2)}m` : 'alerta —'}
                {' · '}{e.cota_emergencia_cm != null ? `emergência ${(e.cota_emergencia_cm / 100).toFixed(2)}m` : 'emergência —'}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => alternarAtiva(e)} className="p-1.5 rounded hover:bg-gray-100 text-text-secondary" title={e.ativa ? 'Desativar' : 'Ativar'}><Power size={15} /></button>
              <button onClick={() => abrirEdicao(e)} className="p-1.5 rounded hover:bg-gray-100 text-text-secondary" title="Editar"><Pencil size={15} /></button>
              <button onClick={() => excluir(e)} className="p-1.5 rounded hover:bg-error-expired/10 text-error-expired" title="Excluir"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div key={editId ?? 'novo'} className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold">{editId ? 'Editar Estação' : 'Nova Estação'}</h2>
              <button onClick={fecharForm} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto p-4 grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2"><label className={lbl}>Nome da Estação *</label>
                <input className={inp} value={form.nome || ''} onChange={ev => setForm(f => ({ ...f, nome: ev.target.value }))} /></div>
              <div><label className={lbl}>Rio *</label>
                <input className={inp} value={form.rio || ''} onChange={ev => setForm(f => ({ ...f, rio: ev.target.value }))} /></div>
              <div><label className={lbl}>Localidade *</label>
                <input className={inp} value={form.localidade || ''} onChange={ev => setForm(f => ({ ...f, localidade: ev.target.value }))} /></div>
              <div><label className={lbl}>Código ANA (se houver)</label>
                <input className={inp} value={form.codigo_ana || ''} onChange={ev => setForm(f => ({ ...f, codigo_ana: ev.target.value }))} /></div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.ativa ?? true} onChange={ev => setForm(f => ({ ...f, ativa: ev.target.checked }))} /> Estação ativa
                </label>
              </div>
              <div><label className={lbl}>Latitude</label>
                <input type="number" step="any" className={inp} value={form.lat ?? ''} onChange={ev => setForm(f => ({ ...f, lat: ev.target.value === '' ? null : Number(ev.target.value) }))} /></div>
              <div><label className={lbl}>Longitude</label>
                <input type="number" step="any" className={inp} value={form.lng ?? ''} onChange={ev => setForm(f => ({ ...f, lng: ev.target.value === '' ? null : Number(ev.target.value) }))} /></div>

              <div className="col-span-2 border-t border-gray-100 pt-2 mt-1">
                <p className="text-xs font-bold text-text-secondary uppercase mb-1">Limiares de cota (em metros — editáveis, mudam a cada temporada)</p>
                <p className="text-[11px] text-text-secondary mb-2">Deixe em branco se ainda não houver valor oficial da temporada. Enquanto vazio, a estação aparece sem situação calculada.</p>
              </div>
              <div><label className={lbl}>Cota de Atenção (m)</label>
                <input type="number" step="0.01" className={inp} value={form.cota_atencao_cm != null ? (form.cota_atencao_cm / 100) : ''}
                  onChange={ev => setForm(f => ({ ...f, cota_atencao_cm: ev.target.value === '' ? null : Math.round(Number(ev.target.value) * 100) }))} /></div>
              <div><label className={lbl}>Cota de Alerta (m)</label>
                <input type="number" step="0.01" className={inp} value={form.cota_alerta_cm != null ? (form.cota_alerta_cm / 100) : ''}
                  onChange={ev => setForm(f => ({ ...f, cota_alerta_cm: ev.target.value === '' ? null : Math.round(Number(ev.target.value) * 100) }))} /></div>
              <div><label className={lbl}>Cota de Emergência (m)</label>
                <input type="number" step="0.01" className={inp} value={form.cota_emergencia_cm != null ? (form.cota_emergencia_cm / 100) : ''}
                  onChange={ev => setForm(f => ({ ...f, cota_emergencia_cm: ev.target.value === '' ? null : Math.round(Number(ev.target.value) * 100) }))} /></div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={fecharForm} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={salvar} disabled={salvando || !form.nome?.trim() || !form.rio?.trim() || !form.localidade?.trim()}
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
