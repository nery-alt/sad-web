import React, { useEffect, useMemo, useRef, useState } from 'react'
import { X, FileDown, RotateCcw, ImagePlus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SERVIDORES } from '../lib/requerimentoAlvara'
import { VISTOS, gerarLaudoAlvara, nomeArquivoLaudo, recortarFoto, reduzirFoto } from '../lib/laudoAlvara'
import {
  PARECERES, PRAZOS, type Parecer, type ChecklistAlvara,
  textoCaracterizacao, textoCondicoes, textoConclusao, textoParecer, pendencias, sugerirParecer, checklistFaltando,
} from '../lib/laudoTextos'

export interface AlvaraLaudo extends ChecklistAlvara {
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
  gps_lat: number | null
  gps_lng: number | null
  classificacao_porte: string | null
  classificacao_risco: string | null
  caracterizacao: string | null
  parecer: string | null
  ressalvas: string | null
  prazo_adequacao: number | null
  nome_vistoriador: string | null
}

interface Foto { id: number; alvara_id: number; ordem: number; url: string; legenda: string | null }

const RISCOS = ['Baixo', 'Médio', 'Alto']

// "salao" -> "Salao." (primeira letra maiúscula e ponto final)
const ajeitarLegenda = (t: string) => {
  const s = t.trim().replace(/\s+/g, ' ')
  if (!s) return s
  const c = s.charAt(0).toUpperCase() + s.slice(1)
  return /[.!?)]$/.test(c) ? c : c + '.'
}
const hojeISO = () => new Date().toLocaleDateString('sv-SE')
const inp = 'w-full p-2 border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-primary-btn/20'
const lbl = 'block text-xs font-bold text-text-secondary uppercase mb-1'

export const LaudoModal: React.FC<{ alvara: AlvaraLaudo; onClose: () => void; onSaved: () => void }> = ({ alvara: a, onClose, onSaved }) => {
  const parecerInicial = (PARECERES as string[]).includes(a.parecer || '') ? a.parecer as Parecer : sugerirParecer(a)

  const [vistoId, setVistoId] = useState(VISTOS[0].id)
  const [assinantes, setAssinantes] = useState<string[]>(['reumano'])
  const [dataEmissao, setDataEmissao] = useState(hojeISO())
  const [risco, setRisco] = useState(a.classificacao_risco || '')
  const [parecer, setParecer] = useState<Parecer>(parecerInicial)
  const [prazo, setPrazo] = useState(a.prazo_adequacao || 30)
  const [caract, setCaract] = useState(a.caracterizacao || textoCaracterizacao(a, a.classificacao_risco))
  const [condicoes, setCondicoes] = useState(textoCondicoes(a).join('\n\n'))
  const [ressalvas, setRessalvas] = useState(a.ressalvas || pendencias(a).join('\n'))
  const [conclusao, setConclusao] = useState(textoConclusao(parecerInicial))
  const [fotos, setFotos] = useState<Foto[]>([])
  const [enviandoFoto, setEnviandoFoto] = useState<number | null>(null)
  const [gerando, setGerando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [slotAlvo, setSlotAlvo] = useState<number | null>(null)

  useEffect(() => {
    let ativo = true
    supabase.from('alvara_fotos').select('*').eq('alvara_id', a.id).order('ordem').then(({ data, error }) => {
      if (ativo && !error && data) setFotos(data as Foto[])
    })
    return () => { ativo = false }
  }, [a.id])

  const recarregarFotos = async () => {
    const { data, error } = await supabase.from('alvara_fotos').select('*').eq('alvara_id', a.id).order('ordem')
    if (!error && data) setFotos(data as Foto[])
  }

  const itensRessalva = useMemo(() => ressalvas.split('\n').map(s => s.trim().replace(/^\d+[.)-]\s*/, '')).filter(Boolean), [ressalvas])
  const parecerTexto = useMemo(() => textoParecer(parecer, itensRessalva, prazo, a), [parecer, itensRessalva, prazo, a])

  const mudarParecer = (p: Parecer) => { setParecer(p); setConclusao(textoConclusao(p)) }
  const mudarRisco = (r: string) => {
    if (caract === textoCaracterizacao(a, risco)) setCaract(textoCaracterizacao(a, r))
    setRisco(r)
  }

  const refazerTextos = () => {
    if (!window.confirm('Refazer os textos a partir do checklist? O que você editou nesta tela será substituído.')) return
    const p = sugerirParecer(a)
    setCaract(textoCaracterizacao(a, risco)); setCondicoes(textoCondicoes(a).join('\n\n'))
    setRessalvas(pendencias(a).join('\n')); setParecer(p); setConclusao(textoConclusao(p))
  }

  const toggleAssinante = (id: string) => setAssinantes(prev =>
    prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id])

  // ---------- Fotos ----------
  const escolherFoto = (ordem: number) => { setSlotAlvo(ordem); fileRef.current?.click() }
  const onFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || slotAlvo == null) return
    setEnviandoFoto(slotAlvo)
    try {
      const reduzida = await reduzirFoto(file)
      const path = `alvaras/fotos/${a.id}_${slotAlvo}_${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage.from('documentos').upload(path, reduzida, { upsert: true, contentType: 'image/jpeg' })
      if (upErr) throw upErr
      const url = supabase.storage.from('documentos').getPublicUrl(path).data.publicUrl
      const atual = fotos.find(f => f.ordem === slotAlvo)
      const { error } = await supabase.from('alvara_fotos').upsert(
        { alvara_id: a.id, ordem: slotAlvo, url, legenda: atual?.legenda ?? '' }, { onConflict: 'alvara_id,ordem' })
      if (error) throw error
      await recarregarFotos()
    } catch (err) {
      alert('Não foi possível enviar a foto: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setEnviandoFoto(null); setSlotAlvo(null)
    }
  }
  const salvarLegenda = async (f: Foto, legenda: string) => {
    if ((f.legenda || '') === legenda) return
    const { error } = await supabase.from('alvara_fotos').update({ legenda }).eq('id', f.id)
    if (error) alert('Não foi possível salvar a legenda: ' + error.message)
    else setFotos(prev => prev.map(x => x.id === f.id ? { ...x, legenda } : x))
  }
  const removerFoto = async (f: Foto) => {
    if (!window.confirm(`Remover a foto ${f.ordem}?`)) return
    const { error } = await supabase.from('alvara_fotos').delete().eq('id', f.id)
    if (error) alert('Não foi possível remover: ' + error.message)
    else setFotos(prev => prev.filter(x => x.id !== f.id))
  }

  // ---------- Gerar ----------
  const checklist = checklistFaltando(a)
  const cadastro = [
    !(a.cnpj || a.cpf_responsavel) && 'CPF/CNPJ', !a.telefone && 'telefone', !a.endereco && 'endereço',
    !a.area_total && 'área', !a.capacidade_pessoas && 'capacidade', !a.classificacao_porte && 'porte',
    (a.gps_lat == null || a.gps_lng == null) && 'coordenadas GPS',
  ].filter(Boolean) as string[]
  const pend = pendencias(a)
  const faltando = [
    checklist.length > 0 && `checklist (${checklist.join(', ')}) — preencha em Editar`,
    !risco && 'o grau de risco',
    (parecer !== 'Favorável' && itensRessalva.length === 0) && 'as adequações/irregularidades',
    fotos.some(f => !(f.legenda || '').trim()) && 'a legenda de alguma foto',
  ].filter(Boolean) as string[]

  const gerar = async () => {
    if (faltando.length) { alert('Falta preencher: ' + faltando.join('; ') + '.'); return }
    const avisoCoerencia =
      parecer === 'Favorável' && pend.length ? `\n\nATENÇÃO: o checklist aponta ${pend.length} problema(s), mas o parecer é FAVORÁVEL.` :
      parecer !== 'Favorável' && !pend.length ? `\n\nATENÇÃO: o checklist não aponta nenhum problema, mas o parecer é ${parecer.toUpperCase()}.` : ''
    if (!window.confirm(`Gerar o laudo com parecer ${parecer.toUpperCase()}?${avisoCoerencia}`)) return
    setGerando(true)
    try {
      const fotosLaudo = []
      for (const f of [...fotos].sort((x, y) => x.ordem - y.ordem)) {
        const blob = await (await fetch(f.url)).blob()
        fotosLaudo.push({ bytes: await recortarFoto(blob), legenda: ajeitarLegenda(f.legenda || '') })
      }
      const gps = a.gps_lat != null && a.gps_lng != null ? `${a.gps_lat.toFixed(6)}, ${a.gps_lng.toFixed(6)}` : null
      const doc = await gerarLaudoAlvara({
        numero: a.numero,
        nome: a.nome_estabelecimento,
        risco,
        identificacao: [
          ['Nome Comercial', a.nome_estabelecimento], ['CNPJ', a.cnpj], ['Responsável', a.nome_responsavel],
          ['CPF', a.cpf_responsavel], ['Telefone', a.telefone], ['Endereço', a.endereco], ['Bairro', a.bairro],
          ['Município', (a.municipio || '').replace('/', ' – ')], ['Coordenadas GPS', gps],
        ],
        identificacao2: [
          ['Tipo de Estabelecimento', a.tipo_estabelecimento],
          ['Área Total', a.area_total ? `${a.area_total} m²` : null],
          ['Capacidade estimada', a.capacidade_pessoas ? `${a.capacidade_pessoas} pessoas` : null],
          ['Porte', a.classificacao_porte],
        ],
        caracterizacao: caract.trim(),
        condicoes: condicoes.split(/\n\s*\n/).map(s => s.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean),
        conclusao: conclusao.trim(),
        parecer: parecerTexto,
        assinantes: SERVIDORES.filter(s => assinantes.includes(s.id)),
        visto: VISTOS.find(v => v.id === vistoId)!,
        dataEmissao,
        fotos: fotosLaudo,
      })
      const nomeArq = nomeArquivoLaudo(dataEmissao, a.numero, a.nome_estabelecimento)

      // baixa
      const url = URL.createObjectURL(doc)
      const link = document.createElement('a')
      link.href = url; link.download = nomeArq
      document.body.appendChild(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)

      // guarda as escolhas e o laudo como anexo do alvará (segunda via)
      const avisos: string[] = []
      const { error: e1 } = await supabase.from('alvaras').update({
        classificacao_risco: risco, caracterizacao: caract.trim(), parecer,
        ressalvas: itensRessalva.join('\n') || null, prazo_adequacao: prazo,
      }).eq('id', a.id)
      if (e1) avisos.push('dados do laudo: ' + e1.message)
      const path = `alvaras/${a.id}_laudo_${Date.now()}.docx`
      const { error: e2 } = await supabase.storage.from('documentos').upload(path, doc, { upsert: true })
      if (e2) avisos.push('cópia do laudo: ' + e2.message)
      else {
        const pub = supabase.storage.from('documentos').getPublicUrl(path).data.publicUrl
        const { error: e3 } = await supabase.from('alvara_anexos').insert({ alvara_id: a.id, nome: nomeArq, url: pub })
        if (e3) avisos.push('anexo: ' + e3.message)
        await supabase.from('alvaras').update({ relatorio_url: pub }).eq('id', a.id)
      }
      if (avisos.length) alert('O Word foi baixado, mas não consegui salvar no SAD: ' + avisos.join('; '))
      onSaved()
      onClose()
    } catch (e) {
      alert('Não foi possível gerar o laudo: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFoto} />
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="min-w-0">
            <span className="text-xs text-text-secondary font-mono">{a.numero || 'S/N'}</span>
            <h2 className="text-lg font-bold truncate">Laudo — Vistoria contra Incêndio e Estabilidade</h2>
            <p className="text-xs text-text-secondary truncate">{a.nome_estabelecimento}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4 text-sm">
          {checklist.length > 0 && (
            <p className="text-xs text-error-expired bg-error-expired/5 border border-error-expired/30 rounded p-2">
              <b>Checklist incompleto:</b> {checklist.join(', ')}. Feche esta tela, clique em <b>Editar</b> no alvará e preencha o checklist. Sem isso o laudo não é gerado.
            </p>
          )}
          {cadastro.length > 0 && (
            <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
              Falta no cadastro: {cadastro.join(', ')}. Essas linhas não vão aparecer no laudo.
            </p>
          )}

          {/* Escolhas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className={lbl}>Grau de risco *</label>
              <select className={inp} value={risco} onChange={e => mudarRisco(e.target.value)}>
                <option value="">—</option>{RISCOS.map(r => <option key={r}>{r}</option>)}
              </select></div>
            <div><label className={lbl}>Visto</label>
              <select className={inp} value={vistoId} onChange={e => setVistoId(e.target.value)}>
                {VISTOS.map(v => <option key={v.id} value={v.id}>{v.id === 'edivilson' ? 'Edivilson (Secretário)' : 'Welliton (Adjunto)'}</option>)}
              </select></div>
            <div><label className={lbl}>Data de emissão</label>
              <input type="date" className={inp} value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} /></div>
            <div><label className={lbl}>Assinam</label>
              <div className="flex flex-col gap-1 pt-1">
                {SERVIDORES.map(s => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={assinantes.includes(s.id)} onChange={() => toggleAssinante(s.id)} /> {s.nome.split(' ')[0]}
                  </label>
                ))}
              </div></div>
          </div>

          {/* Parecer */}
          <div>
            <label className={lbl}>Parecer</label>
            <div className="flex gap-2 flex-wrap">
              {PARECERES.map(p => (
                <button key={p} type="button" onClick={() => mudarParecer(p)}
                  className={`px-3 py-2 rounded border text-sm ${parecer === p
                    ? (p === 'Favorável' ? 'bg-success text-white border-success' : p === 'Desfavorável' ? 'bg-error-expired text-white border-error-expired' : 'bg-yellow-500 text-white border-yellow-500') + ' font-bold'
                    : 'border-gray-200 text-text-secondary hover:bg-gray-50'}`}>{p}</button>
              ))}
              {parecer === 'Favorável com ressalvas' && (
                <select className="p-2 border border-gray-200 rounded text-sm" value={prazo} onChange={e => setPrazo(Number(e.target.value))}>
                  {PRAZOS.map(d => <option key={d} value={d}>Prazo: {d} dias</option>)}
                </select>
              )}
            </div>
            <div className={`mt-2 p-2 rounded text-sm font-bold text-center ${parecer === 'Favorável' ? 'bg-success/10 text-success' : parecer === 'Desfavorável' ? 'bg-error-expired/10 text-error-expired' : 'bg-yellow-100 text-yellow-800'}`}>
              O laudo vai sair: {parecer.toUpperCase()}
            </div>
            {checklist.length === 0 && sugerirParecer(a) !== parecer && (
              <p className="text-[11px] text-yellow-700 mt-1">Pelo checklist, o sugerido seria: <b>{sugerirParecer(a)}</b>.</p>
            )}
          </div>

          {parecer !== 'Favorável' && (
            <div><label className={lbl}>{parecer === 'Desfavorável' ? 'Irregularidades' : 'Adequações exigidas'} (uma por linha)</label>
              <textarea rows={4} className={inp} value={ressalvas} onChange={e => setRessalvas(e.target.value)} /></div>
          )}

          {/* Textos */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-text-secondary">Texto entre <b>**asteriscos**</b> sai em negrito no Word. Um parágrafo por bloco (deixe uma linha em branco entre eles).</p>
            <button type="button" onClick={refazerTextos} className="flex items-center gap-1 text-xs text-primary-btn hover:underline shrink-0"><RotateCcw size={12} /> Refazer pelo checklist</button>
          </div>
          <div><label className={lbl}>Caracterização do imóvel</label>
            <textarea rows={3} className={inp} value={caract} onChange={e => setCaract(e.target.value)} /></div>
          <div><label className={lbl}>Condições observadas na vistoria</label>
            <textarea rows={10} className={inp} value={condicoes} onChange={e => setCondicoes(e.target.value)} /></div>
          <div><label className={lbl}>Conclusão técnica</label>
            <textarea rows={3} className={inp} value={conclusao} onChange={e => setConclusao(e.target.value)} /></div>
          <div><label className={lbl}>Parecer técnico (sai assim no laudo)</label>
            <div className="p-2 bg-gray-50 border border-gray-200 rounded text-xs whitespace-pre-wrap">{parecerTexto.join('\n').replace(/\*\*/g, '')}</div></div>

          {/* Fotos */}
          <div>
            <label className={lbl}>Fotos do anexo (até 4)</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(ordem => {
                const f = fotos.find(x => x.ordem === ordem)
                return (
                  <div key={ordem} className="border border-gray-200 rounded p-2 flex flex-col gap-2">
                    <div className="text-[11px] font-bold text-text-secondary">Fig.{ordem}</div>
                    {f ? (
                      <img src={f.url} alt={`Foto ${ordem}`} className="w-full aspect-[10/11] object-cover rounded" />
                    ) : (
                      <div className="w-full aspect-[10/11] rounded bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">sem foto</div>
                    )}
                    <div className="flex gap-1">
                      <button type="button" onClick={() => escolherFoto(ordem)} disabled={enviandoFoto !== null}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-xs border border-gray-200 text-text-secondary hover:bg-gray-50">
                        <ImagePlus size={13} /> {enviandoFoto === ordem ? 'Enviando…' : f ? 'Trocar' : 'Enviar'}
                      </button>
                      {f && <button type="button" onClick={() => removerFoto(f)} className="p-1 rounded hover:bg-error-expired/10 text-error-expired" title="Remover"><Trash2 size={13} /></button>}
                    </div>
                    {f && (
                      <input key={f.id} className="w-full p-1 border border-gray-200 rounded text-xs" placeholder="Legenda (ex.: Salão de Festa)"
                        defaultValue={f.legenda || ''} onBlur={e => salvarLegenda(f, e.target.value.trim())} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[11px] text-text-secondary">{faltando.length ? <span className="text-yellow-700">Falta: {faltando.join(', ')}.</span> : 'O laudo também fica salvo nos anexos deste alvará.'}</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
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
