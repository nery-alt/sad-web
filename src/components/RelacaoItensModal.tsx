import React, { useMemo, useState } from 'react'
import { X, Printer } from 'lucide-react'
import { agruparItens, itensDistintos, montarRelacaoItens, type FichaRel, type ItemRel, type TipoRelacao } from '../lib/relacaoItens'

interface Props { fichas: FichaRel[]; itens: ItemRel[]; filtros: string; onClose: () => void }

const inp = 'w-full p-2 border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-primary-btn/20'
const lbl = 'block text-xs font-bold text-text-secondary uppercase mb-1'
const OPCOES: [TipoRelacao, string, string][] = [
  ['pendentes', 'Pendentes', 'quem ainda não recebeu, somado por item'],
  ['entregues', 'Entregues', 'quem já recebeu, com data e quem entregou'],
  ['ambos', 'Pendentes e entregues', 'um documento com as duas partes e o resumo pedido / entregue / pendente'],
]

export const RelacaoItensModal: React.FC<Props> = ({ fichas, itens, filtros, onClose }) => {
  const [tipo, setTipo] = useState<TipoRelacao>('pendentes')
  const [item, setItem] = useState('')
  const opcoesItem = useMemo(() => {
    const ids = new Set(fichas.map(f => f.id))
    return itensDistintos(itens.filter(i => ids.has(i.atendimento_id as number)))
  }, [fichas, itens])
  const grupos = useMemo(() => agruparItens(fichas, itens, item || undefined), [fichas, itens, item])
  const nPend = grupos.reduce((n, g) => n + g.pend.length, 0), nEnt = grupos.reduce((n, g) => n + g.ent.length, 0)
  const vazio = tipo === 'pendentes' ? nPend === 0 : tipo === 'entregues' ? nEnt === 0 : nPend + nEnt === 0

  const imprimir = () => {
    const html = montarRelacaoItens({ tipo, fichas, itens, item: item || undefined, filtros, emitidoEm: new Date().toLocaleString('pt-BR') })
    const w = window.open('', '_blank')
    if (!w) { alert('O navegador bloqueou a janela. Permita pop-ups para este site e tente de novo.'); return }
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => w.print(), 400)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-surface-card shrink-0">
          <h2 className="text-lg font-bold">Relação de itens</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-main"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto min-h-0 flex-1 space-y-4">
          <div className="space-y-2">
            {OPCOES.map(([v, rot, desc]) => (
              <label key={v} className="flex items-start gap-2 text-sm cursor-pointer">
                <input type="radio" className="mt-1" checked={tipo === v} onChange={() => setTipo(v)} />
                <span><b>{rot}</b><br /><span className="text-xs text-text-secondary">{desc}</span></span>
              </label>
            ))}
          </div>
          <div><label className={lbl}>Item</label>
            <select className={inp} value={item} onChange={e => setItem(e.target.value)}>
              <option value="">Todos os itens</option>
              {opcoesItem.map(i => <option key={i} value={i}>{i}</option>)}
            </select></div>
          <p className="text-xs text-text-secondary">
            Usa os filtros da tela ({filtros}): {fichas.length} atendimento(s). Itens sem data de entrega contam como pendentes.
          </p>
          {vazio && <p className="text-sm text-yellow-700">Nada para listar com essa escolha.</p>}
        </div>
        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Fechar</button>
          <button onClick={imprimir} disabled={vazio}
            className="flex items-center gap-2 px-4 py-2 bg-primary-btn text-white rounded-lg font-bold text-sm disabled:opacity-50">
            <Printer size={16} /> Imprimir / salvar PDF
          </button>
        </div>
      </div>
    </div>
  )
}
