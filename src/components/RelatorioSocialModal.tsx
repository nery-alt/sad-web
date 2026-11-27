import React, { useMemo, useRef, useState } from 'react'
import { X, FileDown, ImagePlus, Trash2 } from 'lucide-react'
import { recortarFoto, reduzirFoto } from '../lib/laudoAlvara'
import {
  VISTOS, SIGNATARIOS_SOCIAL, ajeitarTexto, montarRascunho, montarIdentificacao, gerarRelatorioSocial, nomeArquivoRelatorioSocial,
  type AtendimentoSocial, type MembroSocial, type EntregaSocial, type EncaminhamentoSocial, type GrupoSocial, type SecaoSocial,
} from '../lib/relatorioSocial'

interface Props {
  atendimento: AtendimentoSocial
  membros: MembroSocial[]
  entregas: EntregaSocial[]
  encs: EncaminhamentoSocial[]
  grupos: GrupoSocial[]
  onClose: () => void
}

interface FotoLocal { id: number; arquivo: Blob; url: string; legenda: string }

const MAX_FOTOS = 8
const hojeISO = () => new Date().toLocaleDateString('sv-SE')
const inp = 'w-full p-2 border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-primary-btn/20'
const lbl = 'block text-xs font-bold text-text-secondary uppercase mb-1'
const ajeitarLegenda = (t: string) => {
  const s = t.trim().replace(/\s+/g, ' ')
  if (!s) return s
  const c = s.charAt(0).toUpperCase() + s.slice(1)
  return /[.!?)]$/.test(c) ? c : c + '.'
}
let seqFoto = 0

export const RelatorioSocialModal: React.FC<Props> = ({ atendimento: a, membros, entregas, encs, grupos, onClose }) => {
  const [numero, setNumero] = useState('')
  const [hora, setHora] = useState('')
  const [dataEmissao, setDataEmissao] = useState(hojeISO())
  const [vistoId, setVistoId] = useState(VISTOS[1].id)               // Adjunto como padrão (assinou os últimos)
  const [assinam, setAssinam] = useState<string[]>(['barbara'])
  const [secoes, setSecoes] = useState<SecaoSocial[]>(() => montarRascunho(a, membros, entregas, encs, grupos))
  const [fotos, setFotos] = useState<FotoLocal[]>([])
  const [gerando, setGerando] = useState(false)
  const arquivoRef = useRef<HTMLInputElement>(null)

  const pendentes = useMemo(() => secoes.reduce((n, s) => n + (s.texto.match(/\[\[/g) || []).length, 0), [secoes])

  const toggleAssina = (id: string) => setAssinam(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id])

  const onFotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arqs = Array.from(e.target.files || [])
    e.target.value = ''
    const vagas = MAX_FOTOS - fotos.length
    const novas: FotoLocal[] = []
    for (const f of arqs.slice(0, Math.max(0, vagas))) {
      try {
        const reduzida = await reduzirFoto(f)
        novas.push({ id: ++seqFoto, arquivo: reduzida, url: URL.createObjectURL(reduzida), legenda: '' })
      } catch {
        alert(`Não foi possível ler a foto ${f.name}.`)
      }
    }
    if (arqs.length > vagas) alert(`O anexo aceita até ${MAX_FOTOS} fotos; as demais ficaram de fora.`)
    setFotos(l => [...l, ...novas])
  }
  const tirarFoto = (id: number) => setFotos(l => {
    const f = l.find(x => x.id === id)
    if (f) URL.revokeObjectURL(f.url)
    return l.filter(x => x.id !== id)
  })

  const gerar = async () => {
    if (assinam.length === 0) { alert('Marque quem assina o relatório.'); return }
    setGerando(true)
    try {
      const equipe = SIGNATARIOS_SOCIAL.filter(s => assinam.includes(s.id))
      const [hh, mm] = hora.split(':')
      const fotosRel = []
      for (const f of fotos) fotosRel.push({ bytes: await recortarFoto(f.arquivo), legenda: ajeitarLegenda(f.legenda) })
      const doc = await gerarRelatorioSocial({
        numero: numero.trim() || '____/' + dataEmissao.slice(0, 4),
        solicitante: a.resp_nome.trim().toUpperCase(),
        ocorrencia: ajeitarTexto((a.evento || '').trim()) || 'Atendimento social',
        identificacao: montarIdentificacao(a, membros, { hora: hora ? `${hh}h${mm}min` : '', equipe, dataVisita: a.data_visita }),
        secoes,
        // com duas pessoas, a primeira da lista sai à direita: a assistente social fica à esquerda
        assinantes: [...equipe].reverse(),
        visto: VISTOS.find(v => v.id === vistoId)!,
        dataEmissao,
        fotos: fotosRel,
      })
      const url = URL.createObjectURL(doc)
      const link = document.createElement('a')
      link.href = url; link.download = nomeArquivoRelatorioSocial(dataEmissao, numero, a.resp_nome)
      document.body.appendChild(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch (err) {
      alert('Não foi possível gerar o relatório: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-surface-card shrink-0">
          <h2 className="text-lg font-bold">Relatório Social — {a.resp_nome}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-main"><X size={18} /></button>
        </div>

        <div className="p-5 overflow-y-auto min-h-0 flex-1 space-y-4">
          <p className="text-sm text-text-secondary">
            O texto abaixo é um rascunho montado com os dados da ficha. Ajuste o que quiser aqui ou no Word depois.
            O que estiver entre <b>[[ ]]</b> sai marcado de <span className="bg-yellow-200 px-1">amarelo</span> no Word, para você completar.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className={lbl}>Nº do relatório</label>
              <input className={inp} value={numero} onChange={e => setNumero(e.target.value)} placeholder="ex.: 50/2026" /></div>
            <div><label className={lbl}>Hora da visita</label>
              <input type="time" className={inp} value={hora} onChange={e => setHora(e.target.value)} /></div>
            <div><label className={lbl}>Data de emissão</label>
              <input type="date" className={inp} value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} /></div>
            <div><label className={lbl}>Visto</label>
              <select className={inp} value={vistoId} onChange={e => setVistoId(e.target.value)}>
                {VISTOS.map(v => <option key={v.id} value={v.id}>{v.id === 'edivilson' ? 'Edivilson (Secretário)' : 'Welliton (Adjunto)'}</option>)}
              </select></div>
          </div>
          <div>
            <label className={lbl}>Assinam</label>
            <div className="flex gap-6 flex-wrap">
              {SIGNATARIOS_SOCIAL.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={assinam.includes(s.id)} onChange={() => toggleAssina(s.id)} /> {s.nome}
                </label>
              ))}
            </div>
          </div>

          {secoes.map((s, i) => (
            <div key={s.titulo}>
              <label className={lbl}>{i + 1}. {s.titulo}</label>
              <textarea rows={Math.min(12, Math.max(4, s.texto.split('\n').length + 1))} className={inp + ' leading-relaxed'}
                value={s.texto} onChange={e => setSecoes(l => l.map((x, k) => k === i ? { ...x, texto: e.target.value } : x))} />
            </div>
          ))}
          <p className="text-[11px] text-text-secondary">Cada linha vira um parágrafo. Linha começando com "-" vira marcador.</p>

          <div>
            <div className="flex items-center justify-between">
              <label className={lbl}>Fotos do anexo ({fotos.length} de até {MAX_FOTOS})</label>
              <button type="button" onClick={() => arquivoRef.current?.click()} disabled={fotos.length >= MAX_FOTOS}
                className="flex items-center gap-1 text-xs font-bold text-primary-btn disabled:opacity-40"><ImagePlus size={13} /> Escolher fotos</button>
              <input ref={arquivoRef} type="file" accept="image/*" multiple className="hidden" onChange={onFotos} />
            </div>
            {fotos.length === 0 && <p className="text-sm text-text-secondary italic">Sem fotos: o anexo não entra no Word.</p>}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {fotos.map((f, k) => (
                <div key={f.id} className="border border-gray-200 rounded p-2 flex flex-col gap-2">
                  <div className="text-[11px] font-bold text-text-secondary">Foto {String(k + 1).padStart(2, '0')}</div>
                  <img src={f.url} alt={`Foto ${k + 1}`} className="w-full aspect-[10/11] object-cover rounded" />
                  <input className="w-full p-1 border border-gray-200 rounded text-xs" placeholder="Legenda (ex.: Frente da residência)"
                    value={f.legenda} onChange={e => setFotos(l => l.map(x => x.id === f.id ? { ...x, legenda: e.target.value } : x))} />
                  <button type="button" onClick={() => tirarFoto(f.id)} className="text-xs text-error-expired flex items-center gap-1"><Trash2 size={12} /> Tirar</button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-text-secondary mt-1">As fotos ficam só neste computador, dentro do Word: não são enviadas para o servidor do sistema.</p>
          </div>
        </div>

        <div className="p-4 border-t flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[11px] text-text-secondary">{pendentes > 0 ? <span className="text-yellow-700">{pendentes} trecho(s) para completar (ficam em amarelo no Word).</span> : 'Nenhum trecho pendente.'}</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Fechar</button>
            <button onClick={gerar} disabled={gerando}
              className="flex items-center gap-2 px-4 py-2 bg-primary-btn text-white rounded-lg font-bold text-sm disabled:opacity-50">
              <FileDown size={16} /> {gerando ? 'Gerando...' : 'Baixar Word'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
