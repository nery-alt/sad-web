import React, { useState } from 'react'
import { X, FileDown } from 'lucide-react'
import { SIGNATARIOS_SOCIAL, type AtendimentoSocial } from '../lib/relatorioSocial'
import { AUTORIDADES, gerarTermosDoacao, nomeArquivoTermo } from '../lib/termoDoacao'

interface ItemFicha { item: string; quantidade: number; data_entrega: string | null }
interface Props { atendimento: AtendimentoSocial; nMembros: number; itens: ItemFicha[]; onClose: () => void }

const hojeISO = () => new Date().toLocaleDateString('sv-SE')
const inp = 'w-full p-2 border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-primary-btn/20'
const lbl = 'block text-xs font-bold text-text-secondary uppercase mb-1'
const qtd = (n: number) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 })

export const TermoDoacaoModal: React.FC<Props> = ({ atendimento: a, nMembros, itens, onClose }) => {
  // O termo é para o que a pessoa vai receber agora: os itens pendentes. Sem pendentes, todos.
  const [marcados, setMarcados] = useState<number[]>(() => {
    const pend = itens.map((i, k) => (i.data_entrega ? -1 : k)).filter(k => k >= 0)
    return pend.length ? pend : itens.map((_, k) => k)
  })
  const [data, setData] = useState(hojeISO())
  const [assinam, setAssinam] = useState<string[]>(['barbara'])
  const [autoridadeId, setAutoridadeId] = useState(() => {
    const sel = marcados.map(k => itens[k].item)
    return sel.length > 0 && sel.every(i => /cesta/i.test(i)) ? 'welliton' : 'edivilson'
  })
  const [gerando, setGerando] = useState(false)

  const alternar = (k: number) => setMarcados(l => l.includes(k) ? l.filter(x => x !== k) : [...l, k])
  const alternaAssina = (id: string) => setAssinam(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id])

  const gerar = async () => {
    if (marcados.length === 0) { alert('Marque pelo menos um item.'); return }
    setGerando(true)
    try {
      const doc = await gerarTermosDoacao([{
        atendimento: a, nMembros,
        itens: [...marcados].sort((x, y) => x - y).map(k => ({ item: itens[k].item, quantidade: itens[k].quantidade })),
        data: data || null, assinam, autoridade: AUTORIDADES.find(x => x.id === autoridadeId)!,
      }])
      const url = URL.createObjectURL(doc)
      const link = document.createElement('a')
      link.href = url; link.download = nomeArquivoTermo(data || hojeISO(), a.resp_nome)
      document.body.appendChild(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch (err) {
      alert('Não foi possível gerar o termo: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-surface-card shrink-0">
          <h2 className="text-lg font-bold">Termo de Doação — {a.resp_nome}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-main"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto min-h-0 flex-1 space-y-4">
          <div>
            <label className={lbl}>Itens deste termo</label>
            {itens.length === 0 ? (
              <p className="text-sm text-text-secondary italic">Esta ficha ainda não tem itens. Cadastre-os na ficha (seção Itens) e volte aqui.</p>
            ) : (
              <div className="space-y-1">
                {itens.map((i, k) => (
                  <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={marcados.includes(k)} onChange={() => alternar(k)} />
                    <span><b>{qtd(i.quantidade)}</b> {i.item}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${i.data_entrega ? 'bg-success/10 text-success' : 'bg-yellow-100 text-yellow-700'}`}>
                      {i.data_entrega ? 'ENTREGUE' : 'PENDENTE'}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Data do termo</label>
              <input type="date" className={inp} value={data} onChange={e => setData(e.target.value)} />
              <p className="text-[11px] text-text-secondary mt-1">Apague para deixar a data em branco, para preencher à mão.</p></div>
            <div><label className={lbl}>Assina quem liberou</label>
              <select className={inp} value={autoridadeId} onChange={e => setAutoridadeId(e.target.value)}>
                {AUTORIDADES.map(x => <option key={x.id} value={x.id}>{x.id === 'edivilson' ? 'Edivilson (Secretário)' : 'Welliton (Adjunto)'}</option>)}
              </select></div>
          </div>
          <div>
            <label className={lbl}>Equipe da Assistência que assina</label>
            <div className="flex gap-6 flex-wrap">
              {SIGNATARIOS_SOCIAL.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={assinam.includes(s.id)} onChange={() => alternaAssina(s.id)} /> {s.nome}
                </label>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-text-secondary">
            Dados que faltam na ficha (CPF, endereço, telefone) saem como linha em branco, para preencher à mão.
            Se a ficha tem COBRADE, o termo cita o desastre.
          </p>
        </div>
        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Fechar</button>
          <button onClick={gerar} disabled={gerando || itens.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary-btn text-white rounded-lg font-bold text-sm disabled:opacity-50">
            <FileDown size={16} /> {gerando ? 'Gerando...' : 'Baixar Word'}
          </button>
        </div>
      </div>
    </div>
  )
}
