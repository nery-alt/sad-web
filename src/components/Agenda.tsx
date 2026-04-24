import React, { useState, useMemo } from 'react'
import { Plus, CheckCircle, Trash2, Search, Edit2, X, Calendar, Clock, User, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import type { AgendaItem } from '../types'

interface AgendaProps {
  agenda: AgendaItem[]
  onSaveAgenda: (item: AgendaItem) => void
  onToggleRealizado: (id: number, realizado: number) => void
  onDeleteAgenda: (id: number) => void
  formatDate: (dateStr: string) => string
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export const Agenda: React.FC<AgendaProps> = ({
  agenda,
  onSaveAgenda,
  onToggleRealizado,
  onDeleteAgenda,
  formatDate,
}) => {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  const [searchAgenda, setSearchAgenda] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [formData, setFormData] = useState<AgendaItem>({
    titulo: '', descricao: '', data: '', horario: '', realizado: 0, criado_em: ''
  })

  const calDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay()
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const daysInPrev = new Date(calYear, calMonth, 0).getDate()
    const days: { dateStr: string; day: number; currentMonth: boolean }[] = []
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrev - i
      const m = calMonth === 0 ? 12 : calMonth
      const y = calMonth === 0 ? calYear - 1 : calYear
      days.push({ dateStr: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`, day: d, currentMonth: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ dateStr: `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, day: d, currentMonth: true })
    }
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      const m = calMonth === 11 ? 1 : calMonth + 2
      const y = calMonth === 11 ? calYear + 1 : calYear
      days.push({ dateStr: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`, day: d, currentMonth: false })
    }
    return days
  }, [calMonth, calYear])

  const agendaByDate = useMemo(() => {
    const map: Record<string, AgendaItem[]> = {}
    agenda.forEach(a => {
      const key = (a.data || '').slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(a)
    })
    return map
  }, [agenda])

  const selectedDayItems = useMemo(() =>
    (agendaByDate[selectedDate] || []).sort((a, b) => (a.horario || '').localeCompare(b.horario || ''))
  , [agendaByDate, selectedDate])

  const filteredAgenda = useMemo(() => agenda.filter(a =>
    a.titulo.toLowerCase().includes(searchAgenda.toLowerCase()) ||
    a.pessoa_nome?.toLowerCase().includes(searchAgenda.toLowerCase())
  ).sort((a, b) => (a.data || '').localeCompare(b.data || '') || (a.horario || '').localeCompare(b.horario || '')),
  [agenda, searchAgenda])

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }

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

  const openNewForDate = (dateStr: string) => {
    setFormData({ titulo: '', descricao: '', data: dateStr, horario: '', realizado: 0, criado_em: '' })
    setIsFormOpen(true)
  }

  return (
    <div className="p-4 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-text-secondary">Gerencie seus compromissos e reuniões.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-card border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={() => setView('calendar')} className={`px-4 py-2 text-sm font-bold transition-colors ${view === 'calendar' ? 'bg-primary-btn text-white' : 'text-text-secondary hover:text-text-main'}`}>Calendário</button>
            <button onClick={() => setView('list')} className={`px-4 py-2 text-sm font-bold transition-colors ${view === 'list' ? 'bg-primary-btn text-white' : 'text-text-secondary hover:text-text-main'}`}>Lista</button>
          </div>
          <button
            onClick={() => { setFormData({ titulo: '', descricao: '', data: selectedDate, horario: '', realizado: 0, criado_em: '' }); setIsFormOpen(true) }}
            className="flex items-center gap-2 bg-primary-btn text-white px-5 py-2.5 rounded-lg font-bold hover:opacity-90 shadow-md text-sm"
          >
            <Plus size={18} /> Novo Compromisso
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="flex-1 overflow-hidden flex gap-4">
          <div className="flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden" style={{ width: '520px', minWidth: '520px' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft size={18} /></button>
              <span className="font-bold text-base">{MESES[calMonth]} {calYear}</span>
              <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="text-center text-xs font-bold text-text-secondary py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 flex-1">
              {calDays.map(({ dateStr, day, currentMonth }, idx) => {
                const items = agendaByDate[dateStr] || []
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedDate
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`relative p-1.5 border-b border-r border-gray-50 cursor-pointer transition-all min-h-[56px]
                      ${!currentMonth ? 'bg-gray-50/50' : 'hover:bg-primary-btn/5'}
                      ${isSelected ? 'bg-primary-btn/10' : ''}
                    `}
                  >
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                      ${isToday ? 'bg-primary-btn text-white' : isSelected ? 'text-primary-btn' : currentMonth ? 'text-text-main' : 'text-gray-300'}
                    `}>{day}</span>
                    {items.length > 0 && (
                      <div className="mt-0.5 space-y-0.5">
                        {items.slice(0, 2).map((a, i) => (
                          <div key={i} className={`text-[9px] font-bold px-1 rounded truncate leading-4 ${a.realizado ? 'bg-success/20 text-success' : 'bg-primary-btn/15 text-primary-btn'}`}>
                            {a.horario ? `${a.horario} ` : ''}{a.titulo}
                          </div>
                        ))}
                        {items.length > 2 && <div className="text-[9px] text-text-secondary font-bold">+{items.length - 2} mais</div>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div>
                <p className="font-bold text-base">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <p className="text-xs text-text-secondary">{selectedDayItems.length} compromisso(s)</p>
              </div>
              <button onClick={() => openNewForDate(selectedDate)} className="flex items-center gap-1.5 text-xs font-bold text-primary-btn hover:bg-primary-btn/10 px-3 py-1.5 rounded-lg transition-colors">
                <Plus size={14} /> Adicionar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {selectedDayItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-12">
                  <Calendar size={32} className="mb-2 text-text-secondary" />
                  <p className="text-sm text-text-secondary italic">Nenhum compromisso neste dia.</p>
                  <button onClick={() => openNewForDate(selectedDate)} className="mt-3 text-xs font-bold text-primary-btn hover:underline">+ Adicionar compromisso</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayItems.map(a => (
                    <div key={a.id} onClick={() => setSelectedItem(a)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all group flex items-center gap-3
                        ${a.realizado ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-100 hover:border-primary-btn/30 hover:bg-primary-btn/5'}`}>
                      <button onClick={e => { e.stopPropagation(); onToggleRealizado(a.id!, a.realizado) }}
                        className={`p-1.5 rounded-lg shrink-0 ${a.realizado ? 'text-success' : 'text-gray-300 hover:text-primary-btn'}`}>
                        <CheckCircle size={18} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm ${a.realizado ? 'line-through text-text-secondary' : ''}`}>{a.titulo}</p>
                        {a.descricao && <p className="text-xs text-text-secondary truncate">{a.descricao}</p>}
                        <p className="text-xs text-text-secondary mt-0.5">{a.horario || '--:--'} • {a.pessoa_nome || 'Sem vínculo'}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => { e.stopPropagation(); handleEdit(a) }} className="p-1.5 text-primary-btn hover:bg-primary-btn/10 rounded"><Edit2 size={14} /></button>
                        <button onClick={e => { e.stopPropagation(); onDeleteAgenda(a.id!) }} className="p-2 text-error-expired hover:bg-error-expired/10 rounded"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="mb-4 relative shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
            <input type="text" placeholder="Buscar compromisso..." className="w-full pl-11 pr-4 py-2.5 bg-surface-card border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-btn/20 text-sm" value={searchAgenda} onChange={e => setSearchAgenda(e.target.value)} />
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              {filteredAgenda.map(a => (
                <div key={a.id} onClick={() => setSelectedItem(a)}
                  className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-all flex items-center gap-4 group cursor-pointer
                    ${a.realizado ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-100 hover:border-primary-btn/20'}`}>
                  <button onClick={e => { e.stopPropagation(); onToggleRealizado(a.id!, a.realizado) }}
                    className={`p-2 rounded-lg shrink-0 transition-colors ${a.realizado ? 'bg-success/10 text-success' : 'bg-gray-100 text-text-secondary hover:bg-primary-btn/10 hover:text-primary-btn'}`}>
                    <CheckCircle size={20} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${a.realizado ? 'line-through text-text-secondary' : 'text-text-main'}`}>{a.titulo}</p>
                    {a.descricao && <p className="text-xs text-text-secondary truncate mt-0.5">{a.descricao}</p>}
                    <p className="text-xs text-text-secondary mt-1">{a.horario || '--:--'} • {formatDate(a.data)} • {a.pessoa_nome || 'Sem vínculo'}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); handleEdit(a) }} className="p-2 text-primary-btn hover:bg-primary-btn/10 rounded"><Edit2 size={16} /></button>
                    <button onClick={e => { e.stopPropagation(); onDeleteAgenda(a.id!) }} className="p-2 text-error-expired hover:bg-error-expired/10 rounded"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-surface-card">
              <h2 className="text-lg font-bold flex items-center gap-2"><Calendar size={18} className="text-primary-btn" /> Detalhes do Compromisso</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEdit(selectedItem)} className="flex items-center gap-1 px-3 py-1.5 bg-primary-btn text-white rounded-lg text-xs font-bold hover:opacity-90"><Edit2 size={14} /> Editar</button>
                <button onClick={() => setSelectedItem(null)} className="text-text-secondary hover:text-text-main p-1"><X size={20} /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className={`text-xl font-bold ${selectedItem.realizado ? 'line-through text-text-secondary' : ''}`}>{selectedItem.titulo}</p>
                <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded ${selectedItem.realizado ? 'text-success bg-success/10' : 'text-primary-btn bg-primary-btn/10'}`}>
                  {selectedItem.realizado ? 'Realizado' : 'Pendente'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <Calendar size={16} className="text-primary-btn mt-0.5 shrink-0" />
                  <div><p className="text-xs font-bold text-text-secondary uppercase">Data</p><p className="text-sm font-medium">{formatDate(selectedItem.data)}</p></div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock size={16} className="text-primary-btn mt-0.5 shrink-0" />
                  <div><p className="text-xs font-bold text-text-secondary uppercase">Horário</p><p className="text-sm font-medium">{selectedItem.horario || '--:--'}</p></div>
                </div>
              </div>
              {selectedItem.pessoa_nome && (
                <div className="flex items-start gap-2">
                  <User size={16} className="text-primary-btn mt-0.5 shrink-0" />
                  <div><p className="text-xs font-bold text-text-secondary uppercase">Pessoa</p><p className="text-sm font-medium">{selectedItem.pessoa_nome}</p></div>
                </div>
              )}
              {selectedItem.descricao && (
                <div className="flex items-start gap-2">
                  <FileText size={16} className="text-primary-btn mt-0.5 shrink-0" />
                  <div><p className="text-xs font-bold text-text-secondary uppercase">Descrição</p><p className="text-sm text-text-secondary leading-relaxed">{selectedItem.descricao}</p></div>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <button onClick={() => { onToggleRealizado(selectedItem.id!, selectedItem.realizado); setSelectedItem(null) }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${selectedItem.realizado ? 'bg-gray-100 text-text-secondary hover:bg-gray-200' : 'bg-success/10 text-success hover:bg-success/20'}`}>
                  <CheckCircle size={16} />{selectedItem.realizado ? 'Marcar como pendente' : 'Marcar como realizado'}
                </button>
                <button onClick={() => { onDeleteAgenda(selectedItem.id!); setSelectedItem(null) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-error-expired hover:bg-error-expired/10 transition-colors">
                  <Trash2 size={16} /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-surface-card">
              <h2 className="text-xl font-bold">{formData.id ? 'Editar Compromisso' : 'Novo Compromisso'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-text-secondary hover:text-text-main"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-4 overflow-y-auto space-y-4">
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
              <div className="flex justify-end gap-4 pt-2">
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
