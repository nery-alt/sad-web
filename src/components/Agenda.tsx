import React, { useState, useMemo } from 'react'
import { Plus, CheckCircle, Trash2, Search, Edit2, X, Calendar, Clock, User, FileText } from 'lucide-react'
import type { AgendaItem } from '../types'

interface AgendaProps {
  agenda: AgendaItem[]
  onSaveAgenda: (item: AgendaItem) => void
  onToggleRealizado: (id: number, realizado: number) => void
  onDeleteAgenda: (id: number) => void
  formatDate: (dateStr: string) => string
}

export const Agenda: React.FC<AgendaProps> = ({
  agenda,
  onSaveAgenda,
  onToggleRealizado,
  onDeleteAgenda,
  formatDate,
}) => {
  const [searchAgenda, setSearchAgenda] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null)
  const [formData, setFormData] = useState<AgendaItem>({
    titulo: '', descricao: '', data: '', horario: '', realizado: 0, criado_em: ''
  })

  const filteredAgenda = useMemo(() => agenda.filter(a =>
    a.titulo.toLowerCase().includes(searchAgenda.toLowerCase()) ||
    a.pessoa_nome?.toLowerCase().includes(searchAgenda.toLowerCase())
  ), [agenda, searchAgenda])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    onSaveAgenda(formData)
    setIsFormOpen(false)
  }

  const handleEdit = (item: AgendaItem) => {
    setSelectedItem(null)
    setFormData({ ...item })
    setIsFormOpen(true)
  }

  const handleCardClick = (item: AgendaItem) => {
    setSelectedItem(item)
  }

  return (
    <div className="p-4 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-text-secondary">Gerencie seus compromissos e reuniões.</p>
        </div>
        <button
          onClick={() => {
            setFormData({ titulo: '', descricao: '', data: '', horario: '', realizado: 0, criado_em: '' })
            setIsFormOpen(true)
          }}
          className="flex items-center gap-2 bg-primary-btn text-white px-6 py-3 rounded-lg font-bold hover:opacity-90 shadow-md"
        >
          <Plus size={20} /> Novo Compromisso
        </button>
      </div>

      <div className="mb-6 relative shrink-0">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
        <input
          type="text"
          placeholder="Buscar compromisso..."
          className="w-full pl-12 pr-4 py-3 bg-surface-card border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-btn/20"
          value={searchAgenda}
          onChange={(e) => setSearchAgenda(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        <div className="space-y-3">
          {filteredAgenda.map(a => (
            <div
              key={a.id}
              onClick={() => handleCardClick(a)}
              className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-all flex items-center gap-4 group cursor-pointer ${a.realizado ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-100 hover:border-primary-btn/20'}`}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onToggleRealizado(a.id!, a.realizado) }}
                className={`p-2 rounded-lg shrink-0 transition-colors ${a.realizado ? 'bg-success/10 text-success' : 'bg-gray-100 text-text-secondary hover:bg-primary-btn/10 hover:text-primary-btn'}`}
              >
                <CheckCircle size={20} />
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm ${a.realizado ? 'line-through text-text-secondary' : 'text-text-main'}`}>{a.titulo}</p>
                {a.descricao ? <p className="text-xs text-text-secondary truncate mt-1">{a.descricao}</p> : null}
                <p className="text-xs text-text-secondary mt-2">{a.horario || '--:--'} • {formatDate(a.data)} • {a.pessoa_nome || 'Sem vínculo'}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(a) }}
                  className="p-2 text-primary-btn hover:bg-primary-btn/10 rounded"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteAgenda(a.id!) }}
                  className="p-2 text-error-expired hover:bg-error-expired/10 rounded"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Visualização */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-surface-card">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Calendar size={18} className="text-primary-btn" />
                Detalhes do Compromisso
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(selectedItem)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary-btn text-white rounded-lg text-xs font-bold hover:opacity-90"
                >
                  <Edit2 size={14} /> Editar
                </button>
                <button onClick={() => setSelectedItem(null)} className="text-text-secondary hover:text-text-main p-1">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className={`text-xl font-bold ${selectedItem.realizado ? 'line-through text-text-secondary' : 'text-text-main'}`}>
                  {selectedItem.titulo}
                </p>
                {selectedItem.realizado ? (
                  <span className="inline-block mt-1 text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded">Realizado</span>
                ) : (
                  <span className="inline-block mt-1 text-xs font-bold text-primary-btn bg-primary-btn/10 px-2 py-0.5 rounded">Pendente</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <Calendar size={16} className="text-primary-btn mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-text-secondary uppercase">Data</p>
                    <p className="text-sm font-medium">{formatDate(selectedItem.data)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock size={16} className="text-primary-btn mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-text-secondary uppercase">Horário</p>
                    <p className="text-sm font-medium">{selectedItem.horario || '--:--'}</p>
                  </div>
                </div>
              </div>

              {selectedItem.pessoa_nome && (
                <div className="flex items-start gap-2">
                  <User size={16} className="text-primary-btn mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-text-secondary uppercase">Pessoa</p>
                    <p className="text-sm font-medium">{selectedItem.pessoa_nome}</p>
                  </div>
                </div>
              )}

              {selectedItem.descricao && (
                <div className="flex items-start gap-2">
                  <FileText size={16} className="text-primary-btn mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-text-secondary uppercase">Descrição</p>
                    <p className="text-sm text-text-secondary leading-relaxed">{selectedItem.descricao}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <button
                  onClick={() => { onToggleRealizado(selectedItem.id!, selectedItem.realizado); setSelectedItem(null) }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${selectedItem.realizado ? 'bg-gray-100 text-text-secondary hover:bg-gray-200' : 'bg-success/10 text-success hover:bg-success/20'}`}
                >
                  <CheckCircle size={16} />
                  {selectedItem.realizado ? 'Marcar como pendente' : 'Marcar como realizado'}
                </button>
                <button
                  onClick={() => { onDeleteAgenda(selectedItem.id!); setSelectedItem(null) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-error-expired hover:bg-error-expired/10 transition-colors"
                >
                  <Trash2 size={16} /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação/Edição */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-surface-card">
              <h2 className="text-xl font-bold">{formData.id ? 'Editar Compromisso' : 'Novo Compromisso'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-text-secondary hover:text-text-main"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-4 overflow-y-auto space-y-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Título *</label>
                  <input required className="w-full p-3 bg-surface-card border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Descrição</label>
                  <textarea rows={3} className="w-full p-3 bg-surface-card border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-btn/20 outline-none resize-none" value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Data *</label>
                    <input required type="date" className="w-full p-3 bg-surface-card border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Horário</label>
                    <input type="time" className="w-full p-3 bg-surface-card border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-btn/20 outline-none" value={formData.horario} onChange={e => setFormData({ ...formData, horario: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-3 text-text-secondary font-bold hover:text-text-main">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-primary-btn text-white rounded-lg font-bold hover:opacity-90 shadow-lg">Salvar Compromisso</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
