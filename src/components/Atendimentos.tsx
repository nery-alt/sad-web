import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { HeartHandshake, Plus, Search, Printer, Pencil, Trash2, X, Save, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { norm } from '../lib/texto'
import { COBRADES, nomeCobrade } from '../lib/cobrade'
import { RelatorioSocialModal } from './RelatorioSocialModal'

type Situacao = 'em_atendimento' | 'acompanhamento' | 'encerrado'

interface Atendimento {
  id: number
  protocolo: string | null
  evento: string
  cobrade: string | null
  situacao: Situacao
  data_cadastro: string | null
  data_visita: string | null
  data_ocorrencia: string | null
  resp_nome: string
  resp_cpf: string | null
  resp_rg: string | null
  resp_telefone: string | null
  endereco: string | null
  ponto_referencia: string | null
  bairro_comunidade: string | null
  tem_idoso: boolean
  tem_gestante_lactante: boolean
  tem_pcd: boolean
  danos: string[]
  solicitacoes: string[]
  comodos: number | null
  energia: string | null
  agua: string | null
  saneamento: string | null
  vulnerabilidade: 'baixa' | 'media' | 'alta' | null
  area_app: boolean | null
  acomp_psicossocial: boolean | null
  nasf: boolean | null
  observacoes: string | null
  hora_ocorrencia: string | null
  tipificacao: string[]
  tipificacao_outros: string | null
  area_afetada: string | null
  tipo_imovel: string | null
  tipo_residencia: string | null
  tipo_residencia_outros: string | null
  propriedade: string | null
  necessidades_basicas: string[]
  abrigo: string[]
  pessoas_afetadas: number | null
  familias_afetadas: number | null
  danos_materiais: string | null
  renda_familiar: number | null
  resp_nascimento: string | null
  resp_parentesco: string | null
  resp_estado_civil: string | null
  resp_genero: string | null
  material_solicitado: string | null
  consentimento_imagem: boolean | null
  criado_em: string
}

interface Membro {
  id?: number
  atendimento_id?: number
  nome: string
  parentesco: string | null
  nascimento: string | null
  cpf: string | null
  rg: string | null
  telefone: string | null
  estado_civil: string | null
  escolaridade: string | null
  genero: string | null
  deficiencia: string | null
}

interface Entrega {
  id?: number
  atendimento_id?: number
  item: string
  quantidade: number
  data_entrega: string | null
  entregador: string | null
  recibo_assinado: boolean
  obs: string | null
}

interface Encaminhamento {
  id?: number
  atendimento_id?: number
  orgao: string
  tipo: 'emergencial' | 'permanente'
  data_encaminhamento: string | null
  obs: string | null
}

// Linha da ficha em edição: ganha uma chave só para a tela (a linha nova ainda não tem id)
type Linha<T> = T & { _k: number }

const EVENTOS = ['Vendaval', 'Temporal', 'Alagamento / enchente', 'Deslizamento', 'Incêndio', 'Erosão de margem fluvial', 'Estiagem', 'Seca', 'Cesta básica']
const TIPIFICACOES: [string, string][] = [['deslizamento', 'Deslizamento'], ['tempestade', 'Tempestade'], ['incendio', 'Incêndio'], ['alagamento', 'Alagamento'], ['outros', 'Outros']]
const AREAS: [string, string][] = [['urbana', 'Urbana'], ['rural', 'Rural']]
const IMOVEIS: [string, string][] = [['residencial', 'Residencial'], ['comercial', 'Comercial']]
const RESIDENCIAS: [string, string][] = [['alvenaria', 'Alvenaria'], ['madeira', 'Madeira'], ['misto', 'Misto'], ['barro', 'Barro'], ['outros', 'Outros']]
const PROPRIEDADES: [string, string][] = [['propria', 'Própria'], ['cedida', 'Cedida'], ['alugada', 'Alugada']]
const NECESSIDADES: [string, string][] = [['alimentacao', 'Alimentação'], ['saude', 'Saúde']]
const ABRIGOS: [string, string][] = [['desabrigados', 'Desabrigados'], ['desalojados', 'Desalojados']]
const DANOS = ['Perda total', 'Perda parcial', 'Danos em móveis ou eletrodomésticos', 'Perda de documentos']
const SOLICITACOES = ['Cesta básica', 'Água potável', 'Colchão', 'Geladeira', 'Itens necessários', 'Kit de higiene', 'Auxílio aluguel (abrigo temporário)',
  'Auxílio passagem (transporte)', 'Auxílio documentação civil', 'Auxílio para aquisição de medicamento (quando previsto)', 'Auxílio enxoval']
const PARENTESCOS = ['Esposo', 'Esposa', 'Filho', 'Filha', 'Pai', 'Mãe', 'Avô', 'Avó', 'Irmão', 'Irmã', 'Neto', 'Neta', 'Outro']
const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)']
const ESCOLARIDADES = ['Sem escolaridade', 'Fundamental incompleto', 'Fundamental completo', 'Médio incompleto', 'Médio completo', 'Superior incompleto', 'Superior completo']
const GENEROS = ['Feminino', 'Masculino', 'Outro']
const ITENS_SUGERIDOS = ['Folha de alumínio', 'Cesta básica', 'Motor', 'Caixa d\'água', 'Kit de limpeza', 'Kit de higiene', 'Colchão', 'Madeira']
const ORGAOS = ['CRAS', 'CREAS', 'CAPS', 'SEMSA', 'SEMASC', 'Conselho Tutelar', 'INSS', 'APAE', 'Defensoria Pública', 'Ministério Público', 'Polícia Civil', 'IFAM', 'Sebrae']

const SITUACAO_LABEL: Record<Situacao, string> = {
  em_atendimento: 'Em atendimento', acompanhamento: 'Acompanhamento', encerrado: 'Encerrado',
}
const SITUACAO_COR: Record<Situacao, string> = {
  em_atendimento: 'bg-yellow-100 text-yellow-700', acompanhamento: 'bg-blue-100 text-blue-700', encerrado: 'bg-gray-200 text-gray-600',
}

const numOuNull = (v: unknown): number | null => (v === null || v === undefined || v === '' || isNaN(Number(v))) ? null : Number(v)
const dataBR = (d: string | null) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
const vazioNull = (v: string | null | undefined) => (v ?? '').trim() === '' ? null : (v as string).trim()
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const msgErro = (e: unknown) => (e as { message?: string } | null)?.message || 'erro desconhecido'

function idade(nasc: string | null): string {
  if (!nasc) return ''
  const n = new Date(nasc + 'T12:00:00')
  if (isNaN(n.getTime())) return ''
  const h = new Date()
  let a = h.getFullYear() - n.getFullYear()
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) a--
  return a >= 0 ? `${a} ano(s)` : ''
}

// O PostgREST corta em 1000 linhas por pedido: lê em páginas até esgotar.
async function lerTudo<T>(tabela: string, ordem: string, asc: boolean): Promise<{ dados: T[]; erro: string | null }> {
  const pagina = 1000
  let de = 0
  let tudo: T[] = []
  for (;;) {
    const { data, error } = await supabase.from(tabela).select('*').order(ordem, { ascending: asc }).range(de, de + pagina - 1)
    if (error) return { dados: tudo, erro: error.message }
    tudo = tudo.concat((data || []) as T[])
    if (!data || data.length < pagina) break
    de += pagina
  }
  return { dados: tudo, erro: null }
}

const classeInput = 'w-full p-2 border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-primary-btn/20 disabled:bg-gray-50'
const Rotulo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">{children}</label>
)
const Secao: React.FC<{ titulo: string; children: React.ReactNode; acao?: React.ReactNode }> = ({ titulo, children, acao }) => (
  <section className="border border-gray-200 rounded-lg p-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-text-main">{titulo}</h3>
      {acao}
    </div>
    {children}
  </section>
)
const SimNaoVazio: React.FC<{ value: boolean | null; onChange: (v: boolean | null) => void }> = ({ value, onChange }) => (
  <select className={classeInput} value={value === true ? 's' : value === false ? 'n' : ''}
    onChange={e => onChange(e.target.value === 's' ? true : e.target.value === 'n' ? false : null)}>
    <option value="">—</option><option value="s">Sim</option><option value="n">Não</option>
  </select>
)

// Escolha única (como as caixinhas do formulário de papel). Tocar de novo na opção marcada desmarca.
const Escolha: React.FC<{ valor: string | null | undefined; opcoes: [string, string][]; onChange: (v: string | null) => void }> = ({ valor, opcoes, onChange }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1">
    {opcoes.map(([v, rot]) => (
      <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer">
        <input type="radio" checked={valor === v} onChange={() => onChange(v)} onClick={() => { if (valor === v) onChange(null) }} /> {rot}
      </label>
    ))}
  </div>
)
// Várias marcações possíveis
const Marcas: React.FC<{ valor: string[] | null | undefined; opcoes: [string, string][]; onToggle: (v: string) => void }> = ({ valor, opcoes, onToggle }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1">
    {opcoes.map(([v, rot]) => (
      <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer">
        <input type="checkbox" checked={(valor || []).includes(v)} onChange={() => onToggle(v)} /> {rot}
      </label>
    ))}
  </div>
)

interface Props { somenteLeitura: boolean }

let chaveSeq = 0
const nova = <T,>(x: T): Linha<T> => ({ ...x, _k: ++chaveSeq })

export const Atendimentos: React.FC<Props> = ({ somenteLeitura }) => {
  const [lista, setLista] = useState<Atendimento[]>([])
  const [membros, setMembros] = useState<Membro[]>([])
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [encs, setEncs] = useState<Encaminhamento[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [busca, setBusca] = useState('')
  const [filtroEvento, setFiltroEvento] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState('')

  const [aberto, setAberto] = useState(false)
  const [relatorioDe, setRelatorioDe] = useState<Atendimento | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [ficha, setFicha] = useState<Partial<Atendimento>>({})
  const [fMembros, setFMembros] = useState<Linha<Membro>[]>([])
  const [fEntregas, setFEntregas] = useState<Linha<Entrega>[]>([])
  const [fEncs, setFEncs] = useState<Linha<Encaminhamento>[]>([])

  const carregar = useCallback(async () => {
    setLoading(true)
    const [a, m, e, n] = await Promise.all([
      lerTudo<Atendimento>('atendimentos', 'criado_em', false),
      lerTudo<Membro>('atendimento_membros', 'id', true),
      lerTudo<Entrega>('atendimento_entregas', 'id', true),
      lerTudo<Encaminhamento>('atendimento_encaminhamentos', 'id', true),
    ])
    setErro(a.erro || m.erro || e.erro || n.erro)
    setLista(a.dados); setMembros(m.dados); setEntregas(e.dados); setEncs(n.dados)
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const entregasDe = useMemo(() => {
    const mp = new Map<number, Entrega[]>()
    for (const x of entregas) mp.set(x.atendimento_id!, [...(mp.get(x.atendimento_id!) || []), x])
    return mp
  }, [entregas])
  const membrosDe = useMemo(() => {
    const mp = new Map<number, number>()
    for (const x of membros) mp.set(x.atendimento_id!, (mp.get(x.atendimento_id!) || 0) + 1)
    return mp
  }, [membros])

  // Contagens da tela
  const resumo = useMemo(() => {
    const porSit = { em_atendimento: 0, acompanhamento: 0, encerrado: 0 } as Record<Situacao, number>
    let semVisita = 0, comEntrega = 0
    for (const a of lista) {
      porSit[a.situacao]++
      if (!a.data_visita) semVisita++
      if ((entregasDe.get(a.id) || []).length > 0) comEntrega++
    }
    const itens = new Map<string, { nome: string; qtd: number }>()
    for (const e of entregas) {
      const k = norm(e.item)
      const atual = itens.get(k) || { nome: e.item, qtd: 0 }
      atual.qtd += Number(e.quantidade) || 0
      itens.set(k, atual)
    }
    return { porSit, semVisita, comEntrega, itens: [...itens.values()].sort((x, y) => y.qtd - x.qtd) }
  }, [lista, entregas, entregasDe])

  const filtrados = useMemo(() => {
    const b = norm(busca)
    return lista.filter(a =>
      (!filtroEvento || a.evento === filtroEvento) &&
      (!filtroSituacao || a.situacao === filtroSituacao) &&
      (!b || norm([a.resp_nome, a.resp_cpf, a.protocolo, a.endereco, a.bairro_comunidade, a.resp_telefone].join(' ')).includes(b))
    )
  }, [lista, busca, filtroEvento, filtroSituacao])

  const eventosUsados = useMemo(() => [...new Set(lista.map(a => a.evento).filter(Boolean))].sort(), [lista])
  const eventosSugeridos = useMemo(() => [...new Set([...EVENTOS, ...eventosUsados])], [eventosUsados])
  const itensSugeridos = useMemo(() => [...new Set([...ITENS_SUGERIDOS, ...entregas.map(e => e.item)])], [entregas])

  const abrirNovo = () => {
    setFicha({ situacao: 'em_atendimento', danos: [], solicitacoes: [], tipificacao: [], necessidades_basicas: [], abrigo: [], tem_idoso: false, tem_gestante_lactante: false, tem_pcd: false })
    setFMembros([]); setFEntregas([]); setFEncs([])
    setAberto(true)
  }
  const abrirEditar = (a: Atendimento) => {
    setFicha({ ...a })
    setFMembros(membros.filter(m => m.atendimento_id === a.id).map(nova))
    setFEntregas(entregas.filter(e => e.atendimento_id === a.id).map(nova))
    setFEncs(encs.filter(e => e.atendimento_id === a.id).map(nova))
    setAberto(true)
  }

  const set = <K extends keyof Atendimento>(k: K, v: Atendimento[K] | null) => setFicha(f => ({ ...f, [k]: v }))
  const alternar = (campo: 'danos' | 'solicitacoes' | 'tipificacao' | 'necessidades_basicas' | 'abrigo', valor: string) =>
    setFicha(f => {
      const atual = f[campo] || []
      return { ...f, [campo]: atual.includes(valor) ? atual.filter(x => x !== valor) : [...atual, valor] }
    })

  // Grava as linhas de uma lista filha: atualiza as que já existiam, cria as novas e esconde as que foram tiradas.
  async function sincronizar<T extends { id?: number }>(
    tabela: string, atuais: Linha<T>[], originais: T[], atendimentoId: number, paraBanco: (x: T) => Record<string, unknown>,
  ) {
    const ficaram = new Set(atuais.filter(x => x.id).map(x => x.id as number))
    const removidos = originais.filter(o => o.id && !ficaram.has(o.id)).map(o => o.id as number)
    if (removidos.length > 0) {
      const { error } = await supabase.from(tabela).delete().in('id', removidos)
      if (error) throw error
    }
    for (const x of atuais) {
      const { _k, ...resto } = x
      void _k
      const linha = { ...paraBanco(resto as unknown as T), atendimento_id: atendimentoId }
      if (x.id) {
        const { error } = await supabase.from(tabela).update(linha).eq('id', x.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from(tabela).insert(linha)
        if (error) throw error
      }
    }
  }

  const salvar = async () => {
    if (somenteLeitura) return
    if (!(ficha.resp_nome || '').trim()) { alert('Informe o nome do responsável familiar.'); return }
    for (const [v, rot] of [[ficha.pessoas_afetadas, 'Pessoas afetadas'], [ficha.familias_afetadas, 'Famílias afetadas'], [ficha.renda_familiar, 'Renda familiar']] as const) {
      if (v !== null && v !== undefined && !(Number(v) >= 0)) { alert(`${rot}: informe um número igual ou maior que zero.`); return }
    }
    if (fMembros.some(m => !m.nome.trim())) { alert('Há uma pessoa do núcleo familiar sem nome.'); return }
    if (fEntregas.some(e => !e.item.trim())) { alert('Há uma entrega sem o item preenchido.'); return }
    if (fEntregas.some(e => !(Number(e.quantidade) > 0))) { alert('A quantidade de cada entrega precisa ser maior que zero.'); return }
    if (fEncs.some(e => !e.orgao.trim())) { alert('Há um encaminhamento sem o órgão preenchido.'); return }
    setSalvando(true)
    try {
      const campos = {
        evento: (ficha.evento || '').trim(),
        cobrade: vazioNull(ficha.cobrade),
        situacao: ficha.situacao || 'em_atendimento',
        data_cadastro: ficha.data_cadastro || null,
        data_visita: ficha.data_visita || null,
        data_ocorrencia: ficha.data_ocorrencia || null,
        resp_nome: (ficha.resp_nome || '').trim(),
        resp_cpf: vazioNull(ficha.resp_cpf), resp_rg: vazioNull(ficha.resp_rg), resp_telefone: vazioNull(ficha.resp_telefone),
        endereco: vazioNull(ficha.endereco), ponto_referencia: vazioNull(ficha.ponto_referencia), bairro_comunidade: vazioNull(ficha.bairro_comunidade),
        tem_idoso: !!ficha.tem_idoso, tem_gestante_lactante: !!ficha.tem_gestante_lactante, tem_pcd: !!ficha.tem_pcd,
        danos: ficha.danos || [], solicitacoes: ficha.solicitacoes || [],
        comodos: ficha.comodos === null || ficha.comodos === undefined || (ficha.comodos as unknown) === '' ? null : Number(ficha.comodos),
        energia: vazioNull(ficha.energia), agua: vazioNull(ficha.agua), saneamento: vazioNull(ficha.saneamento),
        vulnerabilidade: ficha.vulnerabilidade || null,
        area_app: ficha.area_app ?? null, acomp_psicossocial: ficha.acomp_psicossocial ?? null, nasf: ficha.nasf ?? null,
        observacoes: vazioNull(ficha.observacoes),
        hora_ocorrencia: ficha.hora_ocorrencia || null,
        tipificacao: ficha.tipificacao || [],
        tipificacao_outros: (ficha.tipificacao || []).includes('outros') ? vazioNull(ficha.tipificacao_outros) : null,
        area_afetada: ficha.area_afetada || null, tipo_imovel: ficha.tipo_imovel || null,
        tipo_residencia: ficha.tipo_residencia || null,
        tipo_residencia_outros: ficha.tipo_residencia === 'outros' ? vazioNull(ficha.tipo_residencia_outros) : null,
        propriedade: ficha.propriedade || null,
        necessidades_basicas: ficha.necessidades_basicas || [], abrigo: ficha.abrigo || [],
        pessoas_afetadas: numOuNull(ficha.pessoas_afetadas), familias_afetadas: numOuNull(ficha.familias_afetadas),
        danos_materiais: vazioNull(ficha.danos_materiais), renda_familiar: numOuNull(ficha.renda_familiar),
        resp_nascimento: ficha.resp_nascimento || null, resp_parentesco: vazioNull(ficha.resp_parentesco),
        resp_estado_civil: vazioNull(ficha.resp_estado_civil), resp_genero: vazioNull(ficha.resp_genero),
        material_solicitado: vazioNull(ficha.material_solicitado),
        consentimento_imagem: ficha.consentimento_imagem ?? null,
        atualizado_em: new Date().toISOString(),
      }
      let id = ficha.id
      if (id) {
        const { error } = await supabase.from('atendimentos').update(campos).eq('id', id)
        if (error) throw error
      } else {
        // O número do processo é o protocolo da Assistência (ex.: 001/2026-AS), gerado ao criar.
        const { data: proto, error: e1 } = await supabase.rpc('proximo_protocolo')
        if (e1) throw e1
        const { data, error } = await supabase.from('atendimentos').insert({ ...campos, protocolo: proto }).select('id').single()
        if (error) throw error
        id = (data as { id: number }).id
      }
      const idFinal = id as number
      const origM = membros.filter(m => m.atendimento_id === idFinal)
      const origE = entregas.filter(e => e.atendimento_id === idFinal)
      const origN = encs.filter(e => e.atendimento_id === idFinal)
      await sincronizar<Membro>('atendimento_membros', fMembros, origM, idFinal, m => ({
        nome: m.nome.trim(), parentesco: vazioNull(m.parentesco), nascimento: m.nascimento || null,
        cpf: vazioNull(m.cpf), rg: vazioNull(m.rg), telefone: vazioNull(m.telefone),
        estado_civil: vazioNull(m.estado_civil), escolaridade: vazioNull(m.escolaridade), genero: vazioNull(m.genero),
        deficiencia: vazioNull(m.deficiencia),
      }))
      await sincronizar<Entrega>('atendimento_entregas', fEntregas, origE, idFinal, e => ({
        item: e.item.trim(), quantidade: Number(e.quantidade), data_entrega: e.data_entrega || null,
        entregador: vazioNull(e.entregador), recibo_assinado: !!e.recibo_assinado, obs: vazioNull(e.obs),
      }))
      await sincronizar<Encaminhamento>('atendimento_encaminhamentos', fEncs, origN, idFinal, e => ({
        orgao: e.orgao.trim(), tipo: e.tipo, data_encaminhamento: e.data_encaminhamento || null, obs: vazioNull(e.obs),
      }))
      setAberto(false)
      await carregar()
    } catch (e) {
      alert('Não foi possível salvar o atendimento: ' + msgErro(e))
      await carregar()
    } finally {
      setSalvando(false)
    }
  }

  const apagar = async (a: Atendimento) => {
    if (somenteLeitura) return
    if (!window.confirm(`Apagar o atendimento de ${a.resp_nome}? Ele sai da lista; o Administrador Geral pode restaurar.`)) return
    const { error } = await supabase.from('atendimentos').delete().eq('id', a.id)
    if (error) { alert('Não foi possível apagar: ' + error.message); return }
    await carregar()
  }

  // Relação para imprimir ou salvar em PDF
  const imprimirRelacao = () => {
    if (filtrados.length === 0) return
    const hoje = new Date().toLocaleString('pt-BR')
    const filtros = [filtroEvento && `Evento: ${filtroEvento}`, filtroSituacao && `Situação: ${SITUACAO_LABEL[filtroSituacao as Situacao]}`, busca && `Busca: ${busca}`].filter(Boolean).join(' · ') || 'Sem filtros'
    const linhas = filtrados.map((a, i) => {
      const ents = (entregasDe.get(a.id) || []).map(e => `${esc(e.item)}: ${esc(e.quantidade)}`).join('; ') || '—'
      return `<tr><td>${i + 1}</td><td>${esc(a.protocolo || '—')}</td><td><b>${esc(a.resp_nome)}</b><br>${esc(a.resp_cpf || '')}</td>
        <td>${esc(a.endereco || '')}${a.bairro_comunidade ? '<br>' + esc(a.bairro_comunidade) : ''}</td><td>${esc(a.resp_telefone || '')}</td>
        <td>${esc(a.evento)}</td><td>${esc(SITUACAO_LABEL[a.situacao])}</td><td>${esc(dataBR(a.data_visita))}</td>
        <td style="text-align:center">${membrosDe.get(a.id) || 0}</td><td>${ents}</td></tr>`
    }).join('')
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relação de Atendimentos</title>
      <style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;font-size:11px;color:#111}
      h1{font-size:16px;margin:0}p{margin:2px 0;color:#444}table{width:100%;border-collapse:collapse;margin-top:10px}
      th{background:#eee;text-align:left;font-size:10px;text-transform:uppercase}th,td{border:1px solid #bbb;padding:4px 5px;vertical-align:top}</style></head><body>
      <h1>RELAÇÃO DE ATENDIMENTOS — ASSISTÊNCIA SOCIAL</h1>
      <p>Secretaria Municipal de Defesa Civil e Patrimonial — SEMDCEP · Tefé/AM</p>
      <p>${esc(filtros)} · ${filtrados.length} atendimento(s) · Emitido em ${esc(hoje)}</p>
      <table><tr><th>Nº</th><th>Processo</th><th>Responsável / CPF</th><th>Endereço</th><th>Contato</th><th>Evento</th><th>Situação</th><th>Visita</th><th>Membros</th><th>Entregas</th></tr>${linhas}</table>
      </body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => w.print(), 400)
  }

  const cartao = (rotulo: string, valor: number) => (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 min-w-28">
      <div className="text-2xl font-bold">{valor}</div>
      <div className="text-[11px] text-text-secondary uppercase">{rotulo}</div>
    </div>
  )

  return (
    <div className="p-4 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-3 shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><HeartHandshake size={24} /> Atendimentos</h1>
          <p className="text-text-secondary text-sm">Uma família atendida em um evento: visita, núcleo familiar, entregas e encaminhamentos.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={imprimirRelacao} disabled={filtrados.length === 0}
            className="flex items-center gap-2 border border-gray-300 text-text-secondary px-3 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40">
            <Printer size={15} /> Relação (PDF)
          </button>
          {!somenteLeitura && (
            <button onClick={abrirNovo} className="flex items-center gap-2 bg-primary-btn text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 text-sm">
              <Plus size={16} /> Novo atendimento
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap mb-3 shrink-0">
        {cartao('Famílias', lista.length)}
        {cartao('Em atendimento', resumo.porSit.em_atendimento)}
        {cartao('Acompanhamento', resumo.porSit.acompanhamento)}
        {cartao('Encerrados', resumo.porSit.encerrado)}
        {cartao('Sem visita', resumo.semVisita)}
        {cartao('Com entrega', resumo.comEntrega)}
      </div>
      {resumo.itens.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-3 shrink-0 text-xs">
          <span className="text-text-secondary uppercase font-bold self-center">Entregue no total:</span>
          {resumo.itens.map(i => (
            <span key={i.nome} className="bg-surface-card border border-gray-200 rounded-full px-3 py-1"><b>{i.qtd}</b> {i.nome}</span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-3 shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-btn/20"
            placeholder="Buscar por nome, CPF, processo, endereço ou telefone" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select className="p-2 border border-gray-200 rounded-lg text-sm outline-none" value={filtroEvento} onChange={e => setFiltroEvento(e.target.value)}>
          <option value="">Todos os eventos</option>
          {eventosUsados.map(ev => <option key={ev} value={ev}>{ev}</option>)}
        </select>
        <select className="p-2 border border-gray-200 rounded-lg text-sm outline-none" value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)}>
          <option value="">Todas as situações</option>
          {(Object.keys(SITUACAO_LABEL) as Situacao[]).map(s => <option key={s} value={s}>{SITUACAO_LABEL[s]}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {erro && <p className="text-error-expired text-sm">Não foi possível carregar tudo: {erro}</p>}
        {loading ? (
          <p className="text-text-secondary text-sm italic">Carregando...</p>
        ) : filtrados.length === 0 ? (
          <p className="text-text-secondary text-sm italic">
            {lista.length === 0 ? 'Nenhum atendimento ainda. Toque em "Novo atendimento".' : 'Nenhum atendimento com este filtro.'}
          </p>
        ) : filtrados.map(a => {
          const ents = entregasDe.get(a.id) || []
          return (
            <div key={a.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold">{a.resp_nome}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${SITUACAO_COR[a.situacao]}`}>{SITUACAO_LABEL[a.situacao].toUpperCase()}</span>
                  {a.tem_idoso && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">IDOSO</span>}
                  {a.tem_gestante_lactante && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-100 text-pink-700">GESTANTE/LACTANTE</span>}
                  {a.tem_pcd && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">PCD</span>}
                  {a.vulnerabilidade === 'alta' && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-error-expired/10 text-error-expired">VULNERABILIDADE ALTA</span>}
                </div>
                <div className="text-xs text-text-secondary mt-1">
                  {a.protocolo || 'sem processo'} · {a.evento || 'sem evento'}{a.cobrade ? ` (COBRADE ${a.cobrade}${nomeCobrade(a.cobrade) ? ' ' + nomeCobrade(a.cobrade) : ''})` : ''} · visita: {dataBR(a.data_visita)} · {membrosDe.get(a.id) || 0} no núcleo familiar
                </div>
                <div className="text-xs text-text-secondary">
                  {[a.endereco, a.bairro_comunidade, a.resp_telefone].filter(Boolean).join(' · ') || 'sem endereço'}
                </div>
                <div className="text-xs mt-1">
                  {ents.length === 0 ? <span className="text-text-secondary italic">Nenhuma entrega registrada</span>
                    : ents.map(e => `${e.item}: ${e.quantidade}`).join(' · ')}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setRelatorioDe(a)} title="Relatório Social (Word)" className="p-2 text-text-secondary hover:text-primary-btn"><FileText size={16} /></button>
                <button onClick={() => abrirEditar(a)} title={somenteLeitura ? 'Ver ficha' : 'Editar'} className="p-2 text-text-secondary hover:text-primary-btn"><Pencil size={16} /></button>
                {!somenteLeitura && <button onClick={() => apagar(a)} title="Apagar" className="p-2 text-text-secondary hover:text-error-expired"><Trash2 size={16} /></button>}
              </div>
            </div>
          )
        })}
      </div>

      {aberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-surface-card shrink-0">
              <h2 className="text-lg font-bold">
                {ficha.id ? `Atendimento ${ficha.protocolo || ''}` : 'Novo atendimento'}{somenteLeitura ? ' (somente leitura)' : ''}
              </h2>
              <button onClick={() => setAberto(false)} className="text-text-secondary hover:text-text-main"><X size={18} /></button>
            </div>

            <div className="p-5 overflow-y-auto min-h-0 flex-1">
            <fieldset disabled={somenteLeitura || salvando} className="space-y-4 min-w-0">
              <datalist id="dl-eventos">{eventosSugeridos.map(e => <option key={e} value={e} />)}</datalist>
              <datalist id="dl-cobrade">{COBRADES.map(c => <option key={c.codigo} value={c.codigo} label={`${c.nome} (${c.grupo})`} />)}</datalist>
              <datalist id="dl-itens">{itensSugeridos.map(i => <option key={i} value={i} />)}</datalist>
              <datalist id="dl-orgaos">{ORGAOS.map(o => <option key={o} value={o} />)}</datalist>
              <datalist id="dl-parentesco">{PARENTESCOS.map(o => <option key={o} value={o} />)}</datalist>
              <datalist id="dl-civil">{ESTADOS_CIVIS.map(o => <option key={o} value={o} />)}</datalist>
              <datalist id="dl-escola">{ESCOLARIDADES.map(o => <option key={o} value={o} />)}</datalist>
              <datalist id="dl-genero">{GENEROS.map(o => <option key={o} value={o} />)}</datalist>

              <div className="flex gap-6 flex-wrap bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                {([['tem_idoso', 'Há idoso na residência'], ['tem_gestante_lactante', 'Há gestante ou lactante'], ['tem_pcd', 'Há pessoa com deficiência']] as const).map(([campo, rot]) => (
                  <label key={campo} className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                    <input type="checkbox" checked={!!ficha[campo]} onChange={e => set(campo, e.target.checked)} /> {rot}
                  </label>
                ))}
              </div>

              <Secao titulo="Responsável familiar">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2"><Rotulo>Nome *</Rotulo>
                    <input className={classeInput} value={ficha.resp_nome || ''} onChange={e => set('resp_nome', e.target.value)} /></div>
                  <div><Rotulo>CPF</Rotulo>
                    <input className={classeInput} value={ficha.resp_cpf || ''} onChange={e => set('resp_cpf', e.target.value)} /></div>
                  <div><Rotulo>RG</Rotulo>
                    <input className={classeInput} value={ficha.resp_rg || ''} onChange={e => set('resp_rg', e.target.value)} /></div>
                  <div><Rotulo>Data de nascimento</Rotulo>
                    <input type="date" className={classeInput} value={ficha.resp_nascimento || ''} onChange={e => set('resp_nascimento', e.target.value || null)} /></div>
                  <div><Rotulo>Idade</Rotulo>
                    <input className={classeInput} disabled readOnly value={idade(ficha.resp_nascimento || null)} /></div>
                  <div><Rotulo>Parentesco</Rotulo>
                    <input className={classeInput} list="dl-parentesco" value={ficha.resp_parentesco || ''} onChange={e => set('resp_parentesco', e.target.value)} /></div>
                  <div><Rotulo>Estado civil</Rotulo>
                    <input className={classeInput} list="dl-civil" value={ficha.resp_estado_civil || ''} onChange={e => set('resp_estado_civil', e.target.value)} /></div>
                  <div className="md:col-span-2"><Rotulo>Endereço</Rotulo>
                    <input className={classeInput} value={ficha.endereco || ''} onChange={e => set('endereco', e.target.value)} /></div>
                  <div><Rotulo>Renda familiar (R$)</Rotulo>
                    <input type="number" min={0} step="0.01" className={classeInput} value={ficha.renda_familiar ?? ''}
                      onChange={e => set('renda_familiar', e.target.value === '' ? null : Number(e.target.value))} /></div>
                  <div><Rotulo>Gênero</Rotulo>
                    <input className={classeInput} list="dl-genero" value={ficha.resp_genero || ''} onChange={e => set('resp_genero', e.target.value)} /></div>
                  <div><Rotulo>Contato (telefone)</Rotulo>
                    <input className={classeInput} value={ficha.resp_telefone || ''} onChange={e => set('resp_telefone', e.target.value)} /></div>
                </div>
              </Secao>

              <Secao titulo="Identificação do desastre">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div><Rotulo>Data da ocorrência</Rotulo>
                    <input type="date" className={classeInput} value={ficha.data_ocorrencia || ''} onChange={e => set('data_ocorrencia', e.target.value || null)} /></div>
                  <div><Rotulo>Horário</Rotulo>
                    <input type="time" className={classeInput} value={(ficha.hora_ocorrencia || '').slice(0, 5)} onChange={e => set('hora_ocorrencia', e.target.value || null)} /></div>
                  <div><Rotulo>Evento (nome, para agrupar)</Rotulo>
                    <input className={classeInput} list="dl-eventos" placeholder="escolha ou digite um evento novo" value={ficha.evento || ''} onChange={e => set('evento', e.target.value)} /></div>
                  <div><Rotulo>COBRADE (opcional)</Rotulo>
                    <input className={classeInput} list="dl-cobrade" placeholder="código ou nome" value={ficha.cobrade || ''} onChange={e => set('cobrade', e.target.value)} />
                    {nomeCobrade(ficha.cobrade) && <p className="text-[11px] text-text-secondary mt-1">{nomeCobrade(ficha.cobrade)}</p>}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mt-4">
                  <div className="md:col-span-2"><Rotulo>Tipificação</Rotulo>
                    <Marcas valor={ficha.tipificacao} opcoes={TIPIFICACOES} onToggle={v => alternar('tipificacao', v)} />
                    {(ficha.tipificacao || []).includes('outros') && (
                      <input className={classeInput + ' mt-2'} placeholder="Outros: qual?" value={ficha.tipificacao_outros || ''} onChange={e => set('tipificacao_outros', e.target.value)} />
                    )}</div>
                  <div><Rotulo>Área afetada</Rotulo><Escolha valor={ficha.area_afetada} opcoes={AREAS} onChange={v => set('area_afetada', v)} /></div>
                  <div><Rotulo>Tipo de imóvel</Rotulo><Escolha valor={ficha.tipo_imovel} opcoes={IMOVEIS} onChange={v => set('tipo_imovel', v)} /></div>
                  <div className="md:col-span-2"><Rotulo>Tipo de residência</Rotulo>
                    <Escolha valor={ficha.tipo_residencia} opcoes={RESIDENCIAS} onChange={v => set('tipo_residencia', v)} />
                    {ficha.tipo_residencia === 'outros' && (
                      <input className={classeInput + ' mt-2'} placeholder="Outros: qual?" value={ficha.tipo_residencia_outros || ''} onChange={e => set('tipo_residencia_outros', e.target.value)} />
                    )}</div>
                  <div><Rotulo>Propriedade</Rotulo><Escolha valor={ficha.propriedade} opcoes={PROPRIEDADES} onChange={v => set('propriedade', v)} /></div>
                  <div><Rotulo>Necessidades básicas</Rotulo><Marcas valor={ficha.necessidades_basicas} opcoes={NECESSIDADES} onToggle={v => alternar('necessidades_basicas', v)} /></div>
                  <div><Rotulo>Situação da família</Rotulo><Marcas valor={ficha.abrigo} opcoes={ABRIGOS} onToggle={v => alternar('abrigo', v)} /></div>
                </div>
                <h4 className="text-xs font-bold uppercase text-text-secondary mt-5 mb-2">Danos humanos</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><Rotulo>Pessoas afetadas</Rotulo>
                    <input type="number" min={0} className={classeInput} value={ficha.pessoas_afetadas ?? ''}
                      onChange={e => set('pessoas_afetadas', e.target.value === '' ? null : Number(e.target.value))} /></div>
                  <div><Rotulo>Famílias afetadas</Rotulo>
                    <input type="number" min={0} className={classeInput} value={ficha.familias_afetadas ?? ''}
                      onChange={e => set('familias_afetadas', e.target.value === '' ? null : Number(e.target.value))} /></div>
                </div>
                <div className="mt-3"><Rotulo>Danos materiais</Rotulo>
                  <textarea rows={4} className={classeInput + ' resize-none'} value={ficha.danos_materiais || ''} onChange={e => set('danos_materiais', e.target.value)} /></div>
              </Secao>

              <Secao titulo={`Núcleo familiar (${fMembros.length})`} acao={!somenteLeitura && (
                <button type="button" onClick={() => setFMembros(l => [...l, nova<Membro>({ nome: '', parentesco: null, nascimento: null, cpf: null, rg: null, telefone: null, estado_civil: null, escolaridade: null, genero: null, deficiencia: null })])}
                  className="text-xs font-bold text-primary-btn flex items-center gap-1"><Plus size={13} /> Adicionar pessoa</button>)}>
                {fMembros.length === 0 && <p className="text-text-secondary text-sm italic">Ninguém adicionado.</p>}
                <div className="space-y-3">
                  {fMembros.map(m => {
                    const up = (k: keyof Membro, v: string) => setFMembros(l => l.map(x => x._k === m._k ? { ...x, [k]: v === '' && k !== 'nome' ? null : v } : x))
                    return (
                      <div key={m._k} className="border border-gray-100 bg-surface-card rounded-lg p-3">
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                          <div className="col-span-2"><Rotulo>Nome *</Rotulo><input className={classeInput} value={m.nome} onChange={e => up('nome', e.target.value)} /></div>
                          <div><Rotulo>Parentesco</Rotulo><input className={classeInput} list="dl-parentesco" value={m.parentesco || ''} onChange={e => up('parentesco', e.target.value)} /></div>
                          <div><Rotulo>Nascimento</Rotulo><input type="date" className={classeInput} value={m.nascimento || ''} onChange={e => up('nascimento', e.target.value)} /></div>
                          <div><Rotulo>Idade</Rotulo><input className={classeInput} disabled value={idade(m.nascimento)} readOnly /></div>
                          <div><Rotulo>Gênero</Rotulo><input className={classeInput} list="dl-genero" value={m.genero || ''} onChange={e => up('genero', e.target.value)} /></div>
                          <div><Rotulo>CPF</Rotulo><input className={classeInput} value={m.cpf || ''} onChange={e => up('cpf', e.target.value)} /></div>
                          <div><Rotulo>RG</Rotulo><input className={classeInput} value={m.rg || ''} onChange={e => up('rg', e.target.value)} /></div>
                          <div><Rotulo>Telefone</Rotulo><input className={classeInput} value={m.telefone || ''} onChange={e => up('telefone', e.target.value)} /></div>
                          <div><Rotulo>Estado civil</Rotulo><input className={classeInput} list="dl-civil" value={m.estado_civil || ''} onChange={e => up('estado_civil', e.target.value)} /></div>
                          <div><Rotulo>Escolaridade</Rotulo><input className={classeInput} list="dl-escola" value={m.escolaridade || ''} onChange={e => up('escolaridade', e.target.value)} /></div>
                          <div><Rotulo>Deficiência (qual)</Rotulo><input className={classeInput} value={m.deficiencia || ''} onChange={e => up('deficiencia', e.target.value)} /></div>
                        </div>
                        {!somenteLeitura && (
                          <button type="button" onClick={() => setFMembros(l => l.filter(x => x._k !== m._k))}
                            className="mt-2 text-xs text-error-expired flex items-center gap-1"><Trash2 size={12} /> Tirar da lista</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Secao>

              <Secao titulo="Termo de consentimento para registro fotográfico">
                <p className="text-sm text-text-secondary mb-2">O termo é assinado no papel pelo usuário e pela assistente social. Marque aqui se foi assinado.</p>
                <Escolha valor={ficha.consentimento_imagem === true ? 's' : ficha.consentimento_imagem === false ? 'n' : null}
                  opcoes={[['s', 'Assinado'], ['n', 'Não assinado']]} onChange={v => set('consentimento_imagem', v === 's' ? true : v === 'n' ? false : null)} />
              </Secao>

              <Secao titulo="Complemento da visita">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div><Rotulo>Bairro ou comunidade</Rotulo>
                    <input className={classeInput} value={ficha.bairro_comunidade || ''} onChange={e => set('bairro_comunidade', e.target.value)} /></div>
                  <div className="md:col-span-2"><Rotulo>Ponto de referência</Rotulo>
                    <input className={classeInput} value={ficha.ponto_referencia || ''} onChange={e => set('ponto_referencia', e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Rotulo>Danos sofridos</Rotulo>
                    {DANOS.map(d => (
                      <label key={d} className="flex items-center gap-2 text-sm mb-1 cursor-pointer">
                        <input type="checkbox" checked={(ficha.danos || []).includes(d)} onChange={() => alternar('danos', d)} /> {d}
                      </label>
                    ))}
                  </div>
                  <div>
                    <Rotulo>Solicitações</Rotulo>
                    {SOLICITACOES.map(s => (
                      <label key={s} className="flex items-center gap-2 text-sm mb-1 cursor-pointer">
                        <input type="checkbox" checked={(ficha.solicitacoes || []).includes(s)} onChange={() => alternar('solicitacoes', s)} /> {s}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mt-3"><Rotulo>Material solicitado</Rotulo>
                  <input className={classeInput} placeholder="Ex.: 30 folhas de alumínio" value={ficha.material_solicitado || ''} onChange={e => set('material_solicitado', e.target.value)} /></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <div><Rotulo>Nº de cômodos</Rotulo>
                    <input type="number" min={0} className={classeInput} value={ficha.comodos ?? ''}
                      onChange={e => set('comodos', e.target.value === '' ? null : Number(e.target.value))} /></div>
                  <div><Rotulo>Energia elétrica</Rotulo>
                    <input className={classeInput} placeholder="Sim / Não" value={ficha.energia || ''} onChange={e => set('energia', e.target.value)} /></div>
                  <div><Rotulo>Abastecimento de água</Rotulo>
                    <input className={classeInput} value={ficha.agua || ''} onChange={e => set('agua', e.target.value)} /></div>
                  <div><Rotulo>Saneamento básico</Rotulo>
                    <input className={classeInput} value={ficha.saneamento || ''} onChange={e => set('saneamento', e.target.value)} /></div>
                  <div><Rotulo>Grau de vulnerabilidade</Rotulo>
                    <select className={classeInput} value={ficha.vulnerabilidade || ''} onChange={e => set('vulnerabilidade', (e.target.value || null) as Atendimento['vulnerabilidade'])}>
                      <option value="">—</option><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option>
                    </select></div>
                  <div><Rotulo>Área de APP</Rotulo>
                    <SimNaoVazio value={ficha.area_app ?? null} onChange={v => set('area_app', v)} /></div>
                  <div><Rotulo>Acomp. psicossocial</Rotulo>
                    <SimNaoVazio value={ficha.acomp_psicossocial ?? null} onChange={v => set('acomp_psicossocial', v)} /></div>
                  <div><Rotulo>NASF</Rotulo>
                    <SimNaoVazio value={ficha.nasf ?? null} onChange={v => set('nasf', v)} /></div>
                </div>
                <div className="mt-3"><Rotulo>Observações</Rotulo>
                  <textarea rows={3} className={classeInput + ' resize-none'} value={ficha.observacoes || ''} onChange={e => set('observacoes', e.target.value)} /></div>
              </Secao>

              <Secao titulo={`Entregas (${fEntregas.length})`} acao={!somenteLeitura && (
                <button type="button" onClick={() => setFEntregas(l => [...l, nova<Entrega>({ item: '', quantidade: 1, data_entrega: null, entregador: null, recibo_assinado: false, obs: null })])}
                  className="text-xs font-bold text-primary-btn flex items-center gap-1"><Plus size={13} /> Adicionar entrega</button>)}>
                {fEntregas.length === 0 && <p className="text-text-secondary text-sm italic">Nenhuma entrega registrada.</p>}
                <div className="space-y-2">
                  {fEntregas.map(e => {
                    const up = <K extends keyof Entrega>(k: K, v: Entrega[K]) => setFEntregas(l => l.map(x => x._k === e._k ? { ...x, [k]: v } : x))
                    return (
                      <div key={e._k} className="grid grid-cols-2 md:grid-cols-12 gap-2 items-end border border-gray-100 bg-surface-card rounded-lg p-3">
                        <div className="col-span-2 md:col-span-3"><Rotulo>Item *</Rotulo><input className={classeInput} list="dl-itens" value={e.item} onChange={ev => up('item', ev.target.value)} /></div>
                        <div className="md:col-span-1"><Rotulo>Qtd.</Rotulo><input type="number" min={0} step="any" className={classeInput} value={e.quantidade} onChange={ev => up('quantidade', Number(ev.target.value))} /></div>
                        <div className="md:col-span-2"><Rotulo>Data</Rotulo><input type="date" className={classeInput} value={e.data_entrega || ''} onChange={ev => up('data_entrega', ev.target.value || null)} /></div>
                        <div className="md:col-span-3"><Rotulo>Quem entregou</Rotulo><input className={classeInput} value={e.entregador || ''} onChange={ev => up('entregador', ev.target.value || null)} /></div>
                        <label className="md:col-span-2 flex items-center gap-2 text-sm pb-2 cursor-pointer">
                          <input type="checkbox" checked={e.recibo_assinado} onChange={ev => up('recibo_assinado', ev.target.checked)} /> Recibo assinado
                        </label>
                        {!somenteLeitura && (
                          <button type="button" onClick={() => setFEntregas(l => l.filter(x => x._k !== e._k))} title="Tirar da lista"
                            className="md:col-span-1 pb-2 text-error-expired"><Trash2 size={15} /></button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Secao>

              <Secao titulo={`Encaminhamentos (${fEncs.length})`} acao={!somenteLeitura && (
                <button type="button" onClick={() => setFEncs(l => [...l, nova<Encaminhamento>({ orgao: '', tipo: 'emergencial', data_encaminhamento: null, obs: null })])}
                  className="text-xs font-bold text-primary-btn flex items-center gap-1"><Plus size={13} /> Adicionar encaminhamento</button>)}>
                {fEncs.length === 0 && <p className="text-text-secondary text-sm italic">Nenhum encaminhamento.</p>}
                <div className="space-y-2">
                  {fEncs.map(e => {
                    const up = <K extends keyof Encaminhamento>(k: K, v: Encaminhamento[K]) => setFEncs(l => l.map(x => x._k === e._k ? { ...x, [k]: v } : x))
                    return (
                      <div key={e._k} className="grid grid-cols-2 md:grid-cols-12 gap-2 items-end border border-gray-100 bg-surface-card rounded-lg p-3">
                        <div className="col-span-2 md:col-span-3"><Rotulo>Órgão *</Rotulo><input className={classeInput} list="dl-orgaos" value={e.orgao} onChange={ev => up('orgao', ev.target.value)} /></div>
                        <div className="md:col-span-2"><Rotulo>Tipo</Rotulo>
                          <select className={classeInput} value={e.tipo} onChange={ev => up('tipo', ev.target.value as Encaminhamento['tipo'])}>
                            <option value="emergencial">Emergencial</option><option value="permanente">Permanente</option>
                          </select></div>
                        <div className="md:col-span-2"><Rotulo>Data</Rotulo><input type="date" className={classeInput} value={e.data_encaminhamento || ''} onChange={ev => up('data_encaminhamento', ev.target.value || null)} /></div>
                        <div className="col-span-2 md:col-span-4"><Rotulo>Observação</Rotulo><input className={classeInput} value={e.obs || ''} onChange={ev => up('obs', ev.target.value || null)} /></div>
                        {!somenteLeitura && (
                          <button type="button" onClick={() => setFEncs(l => l.filter(x => x._k !== e._k))} title="Tirar da lista"
                            className="md:col-span-1 pb-2 text-error-expired"><Trash2 size={15} /></button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Secao>

              <Secao titulo="Controle interno">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div><Rotulo>Processo</Rotulo>
                    <input className={classeInput} disabled value={ficha.protocolo || 'gerado ao salvar'} readOnly /></div>
                  <div><Rotulo>Situação</Rotulo>
                    <select className={classeInput} value={ficha.situacao || 'em_atendimento'} onChange={e => set('situacao', e.target.value as Situacao)}>
                      {(Object.keys(SITUACAO_LABEL) as Situacao[]).map(s => <option key={s} value={s}>{SITUACAO_LABEL[s]}</option>)}
                    </select></div>
                  <div><Rotulo>Data do cadastro</Rotulo>
                    <input type="date" className={classeInput} value={ficha.data_cadastro || ''} onChange={e => set('data_cadastro', e.target.value || null)} /></div>
                  <div><Rotulo>Data da visita</Rotulo>
                    <input type="date" className={classeInput} value={ficha.data_visita || ''} onChange={e => set('data_visita', e.target.value || null)} /></div>
                </div>
              </Secao>
            </fieldset>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-surface-card shrink-0">
              <button onClick={() => setAberto(false)} className="px-4 py-2 text-text-secondary font-bold hover:text-text-main text-sm">{somenteLeitura ? 'Fechar' : 'Cancelar'}</button>
              {!somenteLeitura && (
                <button onClick={salvar} disabled={salvando}
                  className="px-4 py-2 bg-success text-white rounded font-bold hover:opacity-90 text-sm flex items-center gap-2 disabled:opacity-60">
                  <Save size={15} /> {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {relatorioDe && (
        <RelatorioSocialModal atendimento={relatorioDe} onClose={() => setRelatorioDe(null)}
          membros={membros.filter(m => m.atendimento_id === relatorioDe.id)}
          entregas={entregas.filter(e => e.atendimento_id === relatorioDe.id)}
          encs={encs.filter(e => e.atendimento_id === relatorioDe.id)} />
      )}
    </div>
  )
}
