import React, { useEffect, useRef, useState } from 'react'
import { X, FileDown, RotateCcw, ImagePlus, Trash2, Sparkles, Undo2, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SERVIDORES } from '../lib/requerimentoAlvara'
import { iaLaudo, type TipoIA } from '../lib/iaLaudo'
import { VISTOS, recortarFoto, reduzirFoto } from '../lib/laudoAlvara'
import { gerarRelatorioVistoria, nomeArquivoRelatorio } from '../lib/relatorioVistoria'
import {
  ORGAOS, type OrgaoEscolhido, nomeOrgao, textoObjeto, textoRecomendacoes, textoConclusao,
  numeroRelatorio, paragrafos, type DadosVistoria, paragrafoEncaminhamento, orgaosForaDaConclusao, fraseDoTipo,
} from '../lib/vistoriaTextos'
import type { Protocolo } from '../types'

interface Foto { id: number; protocolo_id: number; ordem: number; url: string; legenda: string | null }

interface Relatorio {
  ocorrencia: string | null; pessoas_afetadas: string | null; endereco: string | null; bairro: string | null
  coordenadas: string | null; objeto: string | null; situacao: string | null; orgaos: OrgaoEscolhido[] | null
  outras_medidas: string | null; recomendacoes: string | null; conclusao: string | null; anotacoes: string | null
}

interface Ocorrencia {
  tipificacao: string | null; tipificacao_outro: string | null; endereco: string | null; bairro: string | null
  municipio_uf: string | null; latitude: number | null; longitude: number | null
  pessoas_afetadas: number | null; familias_afetadas: number | null
  descricao_situacao: string | null; recomendacoes: string | null; orgao_destino: string | null
  // vindos do app a partir da Fase 1 (12/11/2026)
  nivel_risco?: string | null; risco_iminente?: boolean | null; relatado?: string | null
  origem_tipo?: string | null; orgao_demandante?: string | null; documento_origem?: string | null; escopo_pedido?: string | null
  medidas?: string[] | null; desabrigados?: number | null; desalojados?: number | null; situacao_imovel?: string | null
}

// Risco informado no app, do jeito que a IA e a tela mostram
const textoRisco = (o: Ocorrencia | null) => !o?.nivel_risco && !o?.risco_iminente ? ''
  : [o?.nivel_risco && `Nível de risco: ${o.nivel_risco}`, o?.risco_iminente && 'RISCO IMINENTE (pode ocorrer a qualquer momento)'].filter(Boolean).join(' — ')

interface PessoaRel {
  nome: string | null; cpf: string | null; rg: string | null; telefone: string | null; endereco: string | null
  bairro: string | null; municipio: string | null; gps_lat: number | null; gps_lng: number | null
}

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
const doisDig = (n: number) => String(n).padStart(2, '0')
// "são joão" -> "São João" (só quando veio tudo minúsculo do cadastro)
const capitalizar = (s: string) => s && s === s.toLowerCase()
  ? s.replace(/(^|\s)(\p{L})/gu, (_m, a: string, b: string) => a + b.toUpperCase()).replace(/\s(De|Da|Do|Das|Dos|E)\s/g, m => m.toLowerCase())
  : s

// órgãos que vieram do aplicativo ("SEMIO, SEMMA") -> escolhas
function orgaosDoApp(texto: string | null): OrgaoEscolhido[] {
  if (!texto) return []
  return texto.split(/[,;/]/).map(s => s.trim().toUpperCase()).filter(Boolean)
    .map(s => s === 'SEMMA' ? 'SEMMALP' : s)
    .filter(s => s !== 'SEMDCEP' && s !== 'OUTROS')
    .map(s => ORGAOS.some(o => o.sigla === s) ? { sigla: s } : { sigla: 'OUTRO', nome: s })
}

export const RelatorioVistoriaModal: React.FC<{ protocolo: Protocolo; onClose: () => void }> = ({ protocolo: p, onClose }) => {
  const numero = numeroRelatorio(p.numero)
  const [carregando, setCarregando] = useState(true)
  const [pessoa, setPessoa] = useState<PessoaRel | null>(null)
  const [temOcorrencia, setTemOcorrencia] = useState(false)

  // identificação
  const [ocorrencia, setOcorrencia] = useState('')
  const [afetadas, setAfetadas] = useState('')
  const [endereco, setEndereco] = useState('')
  const [bairro, setBairro] = useState('')
  const [municipio, setMunicipio] = useState('Tefé/AM')
  const [coordenadas, setCoordenadas] = useState('')
  // textos
  const [anotacoes, setAnotacoes] = useState('')
  const [objeto, setObjeto] = useState('')
  const [situacao, setSituacao] = useState('')
  const [orgaos, setOrgaos] = useState<OrgaoEscolhido[]>([])
  const [outroOrgao, setOutroOrgao] = useState('')
  const [outrasMedidas, setOutrasMedidas] = useState('')
  const [recomendacoes, setRecomendacoes] = useState('')
  const [conclusao, setConclusao] = useState('')
  // escolhas
  const [vistoId, setVistoId] = useState(VISTOS[0].id)
  const [assinantes, setAssinantes] = useState<string[]>(['reumano'])
  const [dataEmissao, setDataEmissao] = useState(hojeISO())
  // fotos / IA / geração
  const [fotos, setFotos] = useState<Foto[]>([])
  const [enviandoFoto, setEnviandoFoto] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [slotAlvo, setSlotAlvo] = useState<number | null>(null)
  const [iaOcupada, setIaOcupada] = useState<string | null>(null)
  const [desfazer, setDesfazer] = useState<Record<string, string>>({})
  const [gerando, setGerando] = useState(false)
  const [ultimaVia, setUltimaVia] = useState<string | null>(null)
  const [origem, setOrigem] = useState<{ documento?: string; orgao?: string }>({})
  const [risco, setRisco] = useState('')

  const dados = (): DadosVistoria => ({ ocorrencia, endereco, bairro, municipio, ...origem })

  useEffect(() => {
    let ativo = true
    ;(async () => {
      const [{ data: rel }, { data: oc }, { data: pe }, { data: fts }] = await Promise.all([
        supabase.from('relatorios_vistoria').select('*').eq('protocolo_id', p.id!).maybeSingle(),
        supabase.from('ocorrencias').select('*').eq('protocolo', p.numero).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        p.pessoa_id ? supabase.from('pessoas').select('nome,cpf,rg,telefone,endereco,bairro,municipio,gps_lat,gps_lng').eq('id', p.pessoa_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('vistoria_fotos').select('*').eq('protocolo_id', p.id!).order('ordem'),
      ])
      if (!ativo) return
      const r = rel as Relatorio | null, o = oc as Ocorrencia | null, ps = pe as PessoaRel | null
      setUltimaVia((rel as { relatorio_url?: string | null } | null)?.relatorio_url || null)
      setPessoa(ps); setTemOcorrencia(!!o); setFotos((fts as Foto[]) || [])

      const lat = o?.latitude ?? ps?.gps_lat, lng = o?.longitude ?? ps?.gps_lng
      const tipOc = o ? (o.tipificacao && o.tipificacao !== 'Outros' ? fraseDoTipo(o.tipificacao) : o.tipificacao_outro) : null
      const qtd = (n: number | null | undefined, um: string, varios: string) => n ? `${doisDig(n)} ${n > 1 ? varios : um}` : ''
      const afet = [
        [qtd(o?.pessoas_afetadas, 'pessoa', 'pessoas'), qtd(o?.familias_afetadas, 'família', 'famílias')].filter(Boolean).join(' – '),
        qtd(o?.desabrigados, 'desabrigado', 'desabrigados'), qtd(o?.desalojados, 'desalojado', 'desalojados'),
      ].filter(Boolean).join('; ')
      const orig = o?.origem_tipo === 'orgao' ? { documento: o.documento_origem || undefined, orgao: o.orgao_demandante || undefined } : {}
      setOrigem(orig); setRisco(textoRisco(o))
      const d: DadosVistoria = {
        ocorrencia: r?.ocorrencia || tipOc || p.assunto || '',
        endereco: r?.endereco || o?.endereco || ps?.endereco || '',
        bairro: r?.bairro || capitalizar(o?.bairro || ps?.bairro || ''),
        municipio: o?.municipio_uf || 'Tefé/AM',
        ...orig,
      }
      // medidas marcadas no app + outras medidas digitadas -> "Outras medidas" (uma por linha)
      const medidasApp = [...(o?.medidas || []), ...String(o?.recomendacoes || '').split('\n')].map(x => x.trim()).filter(Boolean).join('\n')
      const org = r?.orgaos?.length ? r.orgaos : orgaosDoApp(o?.orgao_destino ?? null)
      setOcorrencia(d.ocorrencia); setEndereco(d.endereco); setBairro(d.bairro); setMunicipio(d.municipio)
      setAfetadas(r?.pessoas_afetadas || afet)
      setCoordenadas(r?.coordenadas || (lat != null && lng != null ? `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}` : ''))
      setAnotacoes(r?.anotacoes || [
        o?.escopo_pedido && `Pedido do órgão (o relatório deve responder): ${o.escopo_pedido}`,
        o?.descricao_situacao && `Constatado na vistoria: ${o.descricao_situacao}`,
        o?.relatado && `Relatado por moradores (não constatado; escrever como "segundo relatos"): ${o.relatado}`,
        textoRisco(o),
        o?.situacao_imovel && `Situação do imóvel: ${o.situacao_imovel}`,
        !o?.medidas?.length && o?.recomendacoes && `Recomendações de campo: ${o.recomendacoes}`,
      ].filter(Boolean).join('\n'))
      setObjeto(r?.objeto || textoObjeto(d))
      setSituacao(r?.situacao || '')
      setOrgaos(org)
      setOutrasMedidas(r?.outras_medidas || (o?.medidas?.length ? medidasApp : ''))
      setRecomendacoes(r?.recomendacoes || textoRecomendacoes(org, r?.outras_medidas || (o?.medidas?.length ? medidasApp : '')))
      setConclusao(r?.conclusao || textoConclusao(d, org))
      setCarregando(false)
    })()
    return () => { ativo = false }
  }, [p.id, p.numero, p.pessoa_id, p.assunto])

  // ---------- Órgãos ----------
  const marcado = (sigla: string) => orgaos.some(o => o.sigla === sigla)
  const mudarOrgaos = (novos: OrgaoEscolhido[]) => {
    // recomendações e conclusão acompanham, se ainda não foram editadas à mão
    if (recomendacoes === textoRecomendacoes(orgaos, outrasMedidas)) setRecomendacoes(textoRecomendacoes(novos, outrasMedidas))
    if (conclusao === textoConclusao(dados(), orgaos)) setConclusao(textoConclusao(dados(), novos))
    setOrgaos(novos)
  }
  const alternar = (sigla: string) => mudarOrgaos(marcado(sigla) ? orgaos.filter(o => o.sigla !== sigla) : [...orgaos, { sigla }])
  const addOutro = () => {
    const nome = outroOrgao.trim()
    if (!nome) return
    mudarOrgaos([...orgaos, { sigla: 'OUTRO', nome }]); setOutroOrgao('')
  }
  const tirarOutro = (nome?: string) => mudarOrgaos(orgaos.filter(o => !(o.sigla === 'OUTRO' && o.nome === nome)))
  const mudarMedidas = (t: string) => {
    if (recomendacoes === textoRecomendacoes(orgaos, outrasMedidas)) setRecomendacoes(textoRecomendacoes(orgaos, t))
    setOutrasMedidas(t)
  }
  const refazer = () => {
    if (!window.confirm('Refazer Objeto, Recomendações e Conclusão a partir dos dados e órgãos marcados? O que você editou nesses campos será substituído.')) return
    setObjeto(textoObjeto(dados())); setRecomendacoes(textoRecomendacoes(orgaos, outrasMedidas)); setConclusao(textoConclusao(dados(), orgaos))
  }

  // ---------- IA ----------
  type Campo = 'objeto' | 'situacao' | 'recomendacoes' | 'conclusao'
  const campos: Record<Campo, { tipo: TipoIA; valor: string; set: (v: string) => void }> = {
    objeto: { tipo: 'vistoria_objeto', valor: objeto, set: setObjeto },
    situacao: { tipo: 'vistoria_situacao', valor: situacao, set: setSituacao },
    recomendacoes: { tipo: 'vistoria_recomendacoes', valor: recomendacoes, set: setRecomendacoes },
    conclusao: { tipo: 'vistoria_conclusao', valor: conclusao, set: setConclusao },
  }
  const contexto = () => [
    `Ocorrência: ${ocorrencia}`, `Local: ${[endereco, bairro && `bairro ${bairro}`, municipio].filter(Boolean).join(', ')}`,
    origem.documento && `Vistoria em atendimento a: ${origem.documento}${origem.orgao ? ` (${origem.orgao})` : ''}`,
    risco && `${risco}. O texto deve deixar esse grau de risco claro, sem amenizar.`,
    afetadas && `Pessoas afetadas: ${afetadas}`, anotacoes && `Anotações: ${anotacoes}`,
  ].filter(Boolean).join('\n')
  const melhorar = async (campo: Campo) => {
    const c = campos[campo]
    // a situação pode nascer só das anotações; os outros campos precisam de texto-base
    const base = campo === 'situacao' && !c.valor.trim() ? [`Ocorrência: ${ocorrencia}.`, afetadas && `Pessoas afetadas: ${afetadas}.`].filter(Boolean).join(' ') : c.valor
    if (!base.trim()) { alert('Não há texto para a IA trabalhar.'); return }
    setIaOcupada(campo)
    try {
      const { texto, conflitos } = await iaLaudo(c.tipo, base, contexto())
      setDesfazer(d => ({ ...d, [campo]: c.valor }))
      c.set(texto)
      if (conflitos.length) alert('A IA encontrou pontos que NÃO entraram no texto:\n\n• ' + conflitos.join('\n• ') + '\n\nConfira as anotações e, se for o caso, ajuste o texto à mão.')
    } catch (e) {
      alert('IA: ' + (e instanceof Error ? e.message : String(e)) + ' Seu texto foi mantido.')
    } finally {
      setIaOcupada(null)
    }
  }
  const voltar = (campo: Campo) => {
    const antigo = desfazer[campo]
    if (antigo === undefined) return
    campos[campo].set(antigo)
    setDesfazer(d => { const n = { ...d }; delete n[campo]; return n })
  }
  const botaoIA = (campo: Campo) => (
    <span className="flex items-center gap-2 normal-case">
      {desfazer[campo] !== undefined && (
        <button type="button" onClick={() => voltar(campo)} className="flex items-center gap-1 text-[11px] text-text-secondary hover:underline font-normal"><Undo2 size={11} /> Desfazer IA</button>
      )}
      <button type="button" onClick={() => melhorar(campo)} disabled={iaOcupada !== null}
        className="flex items-center gap-1 text-[11px] text-purple-700 hover:underline font-bold disabled:opacity-50">
        <Sparkles size={12} /> {iaOcupada === campo ? 'Escrevendo…' : iaOcupada ? 'aguarde…' : campo === 'situacao' && !situacao.trim() ? 'Escrever com IA' : 'Melhorar com IA'}
      </button>
    </span>
  )
  const corrigirLegendas = async () => {
    const comLegenda = [...fotos].sort((x, y) => x.ordem - y.ordem).filter(f => (f.legenda || '').trim())
    if (!comLegenda.length) { alert('Nenhuma legenda para corrigir.'); return }
    setIaOcupada('legendas')
    try {
      const linhas = (await iaLaudo('laudo_legendas', comLegenda.map(f => (f.legenda || '').trim()).join('\n'))).texto
        .split('\n').map(l => l.trim()).filter(Boolean)
      if (linhas.length !== comLegenda.length) throw new Error('a IA devolveu uma quantidade diferente de legendas.')
      for (let i = 0; i < comLegenda.length; i++) await salvarLegenda(comLegenda[i], linhas[i])
    } catch (e) {
      alert('IA: ' + (e instanceof Error ? e.message : String(e)) + ' As legendas foram mantidas.')
    } finally {
      setIaOcupada(null)
    }
  }

  // ---------- Fotos ----------
  const recarregarFotos = async () => {
    const { data, error } = await supabase.from('vistoria_fotos').select('*').eq('protocolo_id', p.id!).order('ordem')
    if (!error && data) setFotos(data as Foto[])
  }
  const escolherFoto = (ordem: number) => { setSlotAlvo(ordem); fileRef.current?.click() }
  const onFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || slotAlvo == null) return
    setEnviandoFoto(slotAlvo)
    try {
      const reduzida = await reduzirFoto(file)
      const path = `vistorias/fotos/${p.id}_${slotAlvo}_${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage.from('documentos').upload(path, reduzida, { upsert: true, contentType: 'image/jpeg' })
      if (upErr) throw upErr
      const url = supabase.storage.from('documentos').getPublicUrl(path).data.publicUrl
      const atual = fotos.find(f => f.ordem === slotAlvo)
      const { error } = await supabase.from('vistoria_fotos').upsert(
        { protocolo_id: p.id, ordem: slotAlvo, url, legenda: atual?.legenda ?? '' }, { onConflict: 'protocolo_id,ordem' })
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
    const { error } = await supabase.from('vistoria_fotos').update({ legenda }).eq('id', f.id)
    if (error) alert('Não foi possível salvar a legenda: ' + error.message)
    else setFotos(prev => prev.map(x => x.id === f.id ? { ...x, legenda } : x))
  }
  const removerFoto = async (f: Foto) => {
    if (!window.confirm(`Remover a foto ${f.ordem}?`)) return
    const { error } = await supabase.from('vistoria_fotos').delete().eq('id', f.id)
    if (error) alert('Não foi possível remover: ' + error.message)
    else setFotos(prev => prev.filter(x => x.id !== f.id))
  }
  // quantos quadros mostrar: as fotos existentes + 1 vazio (até 8)
  const maiorOrdem = fotos.reduce((m, f) => Math.max(m, f.ordem), 0)
  const quadros = Math.min(MAX_FOTOS, Math.max(4, maiorOrdem + 1))
  const buracos = Array.from({ length: maiorOrdem }, (_, i) => i + 1).filter(o => !fotos.some(f => f.ordem === o))

  // ---------- Salvar / gerar ----------
  const itensRecomendacao = recomendacoes.split('\n').map(s => s.trim().replace(/^\d+[.)-]\s*/, '')).filter(Boolean)
  const faltando = [
    !ocorrencia.trim() && 'a ocorrência',
    !endereco.trim() && 'o endereço',
    !objeto.trim() && 'o Objeto',
    !situacao.trim() && 'a Situação constatada',
    !itensRecomendacao.length && 'as Recomendações',
    !conclusao.trim() && 'a Conclusão',
    orgaos.some(o => !nomeOrgao(o)) && 'o nome de um órgão',
    buracos.length > 0 && `a foto ${buracos.join(', ')} (há quadro vazio no meio)`,
    fotos.some(f => !(f.legenda || '').trim()) && 'a legenda de alguma foto',
  ].filter(Boolean) as string[]

  const registro = () => ({
    protocolo_id: p.id, ocorrencia: ocorrencia.trim(), pessoas_afetadas: afetadas.trim() || null,
    endereco: endereco.trim(), bairro: bairro.trim() || null, coordenadas: coordenadas.trim() || null,
    objeto: objeto.trim(), situacao: situacao.trim(), orgaos, outras_medidas: outrasMedidas.trim() || null,
    recomendacoes: recomendacoes.trim(), conclusao: conclusao.trim(), anotacoes: anotacoes.trim() || null,
    atualizado_em: new Date().toISOString(),
  })
  const salvarRascunho = async () => {
    const { error } = await supabase.from('relatorios_vistoria').upsert(registro(), { onConflict: 'protocolo_id' })
    if (error) alert('Não foi possível salvar: ' + error.message)
    else alert('Rascunho salvo.')
  }

  const gerar = async () => {
    if (faltando.length) { alert('Falta preencher: ' + faltando.join('; ') + '.'); return }
    // a Conclusão tem que encaminhar para os mesmos órgãos das Recomendações
    const fora = orgaosForaDaConclusao(conclusao, orgaos)
    if (fora.length) {
      if (window.confirm(`A Conclusão não cita: ${fora.join(', ')}, que ${fora.length > 1 ? 'estão' : 'está'} nas Recomendações.\n\n` +
        'OK = trocar o último parágrafo da Conclusão pelo encaminhamento certo (confira e clique em Baixar Word de novo).\n' +
        'Cancelar = gerar assim mesmo.')) {
        const ps = paragrafos(conclusao)
        const ultimoEhEncaminhamento = ps.length > 1 && /encaminh/i.test(ps[ps.length - 1])
        setConclusao([...(ultimoEhEncaminhamento ? ps.slice(0, -1) : ps), paragrafoEncaminhamento(orgaos)].join('\n\n'))
        return
      }
    }
    if (!window.confirm(`Gerar o Relatório ${numero} com ${fotos.length} foto(s)?`)) return
    setGerando(true)
    try {
      const fotosRel = []
      for (const f of [...fotos].sort((x, y) => x.ordem - y.ordem)) {
        const blob = await (await fetch(f.url)).blob()
        fotosRel.push({ bytes: await recortarFoto(blob), legenda: ajeitarLegenda(f.legenda || '') })
      }
      const doc = await gerarRelatorioVistoria({
        numero,
        solicitante: pessoa?.nome || p.pessoa_nome || '',
        ocorrencia: ocorrencia.trim(),
        identificacao: [
          ['CPF', pessoa?.cpf], ['RG', pessoa?.rg], ['Telefone', pessoa?.telefone],
          ['Endereço', endereco], ['Bairro', bairro], ['Município/UF', municipio],
          ['Coordenadas geográficas', coordenadas], ['Pessoas afetadas', afetadas],
        ],
        objeto: paragrafos(objeto),
        situacao: paragrafos(situacao),
        recomendacoes: itensRecomendacao,
        conclusao: paragrafos(conclusao),
        assinantes: SERVIDORES.filter(s => assinantes.includes(s.id)),
        visto: VISTOS.find(v => v.id === vistoId)!,
        dataEmissao,
        fotos: fotosRel,
      })
      const nomeArq = nomeArquivoRelatorio(dataEmissao, numero, `${ocorrencia} ${pessoa?.nome?.split(' ')[0] || ''}`)
      const url = URL.createObjectURL(doc)
      const link = document.createElement('a')
      link.href = url; link.download = nomeArq
      document.body.appendChild(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)

      // guarda os textos e o Word num lugar só: o dossiê da pessoa, ligado a este protocolo
      // (aparece em Pessoas/Dossiês e no protocolo). Gerar de novo substitui a via anterior.
      const avisos: string[] = []
      const path = `vistorias/relatorios/${p.id}_${Date.now()}.docx`
      const { error: e1 } = await supabase.storage.from('documentos').upload(path, doc, { upsert: true })
      const pub = e1 ? null : supabase.storage.from('documentos').getPublicUrl(path).data.publicUrl
      if (e1) avisos.push('cópia do Word: ' + e1.message)
      const { error: e2 } = await supabase.from('relatorios_vistoria').upsert({ ...registro(), relatorio_url: pub }, { onConflict: 'protocolo_id' })
      if (e2) avisos.push('textos: ' + e2.message)
      if (pub) {
        const hoje = new Date()
        const dataRec = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
        const reg = {
          pessoa_id: p.pessoa_id || null, protocolo_id: p.id, nome: nomeArq,
          tipo: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          caminho: pub, descricao: `Relatório Técnico de Vistoria nº ${numero} (gerado no SAD)`, data_recebimento: dataRec,
        }
        // via anterior: o registro que aponta para a última cópia salva
        const { data: antigo } = ultimaVia
          ? await supabase.from('documentos_recebidos').select('id').eq('caminho', ultimaVia).maybeSingle()
          : { data: null }
        const { error: e3 } = antigo
          ? await supabase.from('documentos_recebidos').update(reg).eq('id', (antigo as { id: number }).id)
          : await supabase.from('documentos_recebidos').insert({ ...reg, criado_em: hoje.toISOString() })
        if (e3) avisos.push('dossiê: ' + e3.message)
        else if (ultimaVia && ultimaVia !== pub) {
          // apaga o arquivo da via anterior (só se for uma cópia gerada aqui)
          const velho = decodeURIComponent(ultimaVia.split('/documentos/')[1] || '')
          if (velho.startsWith('vistorias/relatorios/')) await supabase.storage.from('documentos').remove([velho])
        }
      }
      if (avisos.length) alert('O Word foi baixado, mas não consegui salvar tudo no SAD: ' + avisos.join('; '))
      onClose()
    } catch (e) {
      alert('Não foi possível gerar o relatório: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setGerando(false)
    }
  }

  const toggleAssinante = (id: string) => setAssinantes(prev =>
    prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id])

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFoto} />
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="min-w-0">
            <span className="text-xs text-text-secondary font-mono">Protocolo {numero}</span>
            <h2 className="text-lg font-bold truncate">Relatório Técnico de Vistoria</h2>
            <p className="text-xs text-text-secondary truncate">{pessoa?.nome || p.pessoa_nome} — {p.assunto}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>

        {carregando ? <div className="p-8 text-center text-sm text-text-secondary">Carregando…</div> : (
        <div className="overflow-y-auto p-4 space-y-4 text-sm">
          {ultimaVia && (
            <p className="text-xs text-text-secondary">Já existe um relatório gerado para este protocolo: <a href={ultimaVia} target="_blank" rel="noreferrer" className="text-primary-btn underline">abrir a última via</a>.</p>
          )}
          {risco && (
            <p className="text-xs font-bold text-error-expired bg-error-expired/5 border border-error-expired/20 rounded p-2">Risco informado no aplicativo: {risco.replace('Nível de risco: ', '')}</p>
          )}
          {!temOcorrencia && (
            <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
              Esta vistoria ainda não chegou do aplicativo. Os dados abaixo vieram do cadastro do protocolo — confira e complete à mão.
            </p>
          )}

          {/* Identificação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2"><label className={lbl}>Ocorrência *</label>
              <input className={inp} value={ocorrencia} onChange={e => setOcorrencia(e.target.value)} placeholder="ex.: Muro inclinado com risco de tombamento" /></div>
            <div><label className={lbl}>Endereço *</label><input className={inp} value={endereco} onChange={e => setEndereco(e.target.value)} /></div>
            <div><label className={lbl}>Bairro / Comunidade</label><input className={inp} value={bairro} onChange={e => setBairro(e.target.value)} /></div>
            <div><label className={lbl}>Município/UF</label><input className={inp} value={municipio} onChange={e => setMunicipio(e.target.value)} /></div>
            <div><label className={lbl}>Coordenadas</label><input className={inp} value={coordenadas} onChange={e => setCoordenadas(e.target.value)} placeholder="-3.358800, -64.711000" /></div>
            <div className="md:col-span-2"><label className={lbl}>Pessoas afetadas</label>
              <input className={inp} value={afetadas} onChange={e => setAfetadas(e.target.value)} placeholder="ex.: 04 pessoas – 01 família" /></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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

          <div><label className={lbl}>Anotações da equipe em campo (a IA usa em todas as seções)</label>
            <textarea rows={3} className={inp} value={anotacoes} onChange={e => setAnotacoes(e.target.value)}
              placeholder="ex.: muro inclinado uns 15 graus; água da caixa do vizinho escorre no terreno; 4 moradores" /></div>

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-text-secondary">Texto entre <b>**asteriscos**</b> sai em negrito. Deixe uma linha em branco entre os parágrafos.</p>
            <button type="button" onClick={refazer} className="flex items-center gap-1 text-xs text-primary-btn hover:underline shrink-0"><RotateCcw size={12} /> Refazer textos</button>
          </div>

          <div><div className="flex items-center justify-between"><label className={lbl}>1. Objeto</label>{botaoIA('objeto')}</div>
            <textarea rows={3} className={inp} value={objeto} onChange={e => setObjeto(e.target.value)} /></div>
          <div><div className="flex items-center justify-between"><label className={lbl}>2. Situação constatada e análise *</label>{botaoIA('situacao')}</div>
            <textarea rows={8} className={inp} value={situacao} onChange={e => setSituacao(e.target.value)}
              placeholder="Escreva o que foi visto ou use “Escrever com IA” a partir das anotações." /></div>

          {/* Recomendações */}
          <div className="border border-gray-200 rounded p-3 space-y-3">
            <label className={lbl}>3. Recomendações — encaminhar para</label>
            <div className="flex flex-wrap gap-2">
              {ORGAOS.map(o => (
                <button key={o.sigla} type="button" onClick={() => alternar(o.sigla)} title={o.nome}
                  className={`px-2 py-1 rounded border text-xs ${marcado(o.sigla) ? 'bg-primary-btn text-white border-primary-btn font-bold' : 'border-gray-200 text-text-secondary hover:bg-gray-50'}`}>
                  {o.sigla === 'GABINETE' ? 'Gabinete do Prefeito' : o.sigla === 'DEFENSORIA' ? 'Defensoria Pública' : o.sigla === 'AMAZONAS ENERGIA' ? 'Amazonas Energia' : o.sigla}
                </button>
              ))}
              {orgaos.filter(o => o.sigla === 'OUTRO').map(o => (
                <span key={o.nome} className="px-2 py-1 rounded border text-xs bg-primary-btn text-white border-primary-btn font-bold flex items-center gap-1">
                  {o.nome}<button type="button" onClick={() => tirarOutro(o.nome)} title="Tirar"><X size={11} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input className={inp} value={outroOrgao} onChange={e => setOutroOrgao(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOutro() } }}
                placeholder="Outro órgão — escreva o nome completo e a sigla (ex.: Secretaria Municipal de Saúde – SEMSA)" />
              <button type="button" onClick={addOutro} className="flex items-center gap-1 px-3 rounded border border-gray-200 text-xs hover:bg-gray-50"><Plus size={13} /> Incluir</button>
            </div>
            <div><label className={lbl}>Outras medidas (uma por linha)</label>
              <textarea rows={2} className={inp} value={outrasMedidas} onChange={e => mudarMedidas(e.target.value)}
                placeholder="ex.: Isolamento preventivo da área próxima ao muro" /></div>
            <div><div className="flex items-center justify-between"><label className={lbl}>Como sai no relatório (um item por linha)</label>{botaoIA('recomendacoes')}</div>
              <textarea rows={5} className={inp} value={recomendacoes} onChange={e => setRecomendacoes(e.target.value)} /></div>
          </div>

          <div><div className="flex items-center justify-between"><label className={lbl}>4. Conclusão</label>{botaoIA('conclusao')}</div>
            <textarea rows={5} className={inp} value={conclusao} onChange={e => setConclusao(e.target.value)} /></div>
          <p className="text-[11px] text-text-secondary">A IA só reescreve o que está no texto e nas anotações — confira sempre antes de baixar.</p>

          {/* Fotos */}
          <div>
            <div className="flex items-center justify-between"><label className={lbl}>Fotos do anexo ({fotos.length} de até {MAX_FOTOS})</label>
              {fotos.some(f => (f.legenda || '').trim()) && (
                <button type="button" onClick={corrigirLegendas} disabled={iaOcupada !== null}
                  className="flex items-center gap-1 text-[11px] text-purple-700 hover:underline font-bold disabled:opacity-50">
                  <Sparkles size={12} /> {iaOcupada === 'legendas' ? 'Corrigindo…' : 'Corrigir legendas com IA'}
                </button>
              )}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: quadros }, (_, i) => i + 1).map(ordem => {
                const f = fotos.find(x => x.ordem === ordem)
                return (
                  <div key={ordem} className="border border-gray-200 rounded p-2 flex flex-col gap-2">
                    <div className="text-[11px] font-bold text-text-secondary">Foto {doisDig(ordem)}</div>
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
                      <input key={`${f.id}-${f.legenda}`} className="w-full p-1 border border-gray-200 rounded text-xs" placeholder="Legenda (ex.: Muro inclinado)"
                        defaultValue={f.legenda || ''} onBlur={e => salvarLegenda(f, e.target.value.trim())} />
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-[11px] text-text-secondary mt-1">Até 4 fotos ocupam uma página do anexo; de 5 a 8, duas páginas.</p>
          </div>
        </div>
        )}

        <div className="p-4 border-t flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[11px] text-text-secondary">{faltando.length ? <span className="text-yellow-700">Falta: {faltando.join(', ')}.</span> : 'O Word gerado fica salvo no dossiê da pessoa e aparece neste protocolo.'}</p>
          <div className="flex gap-2">
            <button onClick={salvarRascunho} disabled={carregando} className="px-4 py-2 border rounded-lg text-sm">Salvar rascunho</button>
            <button onClick={gerar} disabled={gerando || carregando}
              className="flex items-center gap-2 px-4 py-2 bg-primary-btn text-white rounded-lg font-bold text-sm disabled:opacity-50">
              <FileDown size={16} /> {gerando ? 'Gerando...' : 'Baixar Word'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
