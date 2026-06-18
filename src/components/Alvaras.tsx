import React, { useState, useEffect, useCallback } from 'react'
import { FileCheck, Plus, Search, Printer, Copy, Check, ChevronDown, ChevronUp, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Alvara {
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
  tipo_estabelecimento: string | null
  area_total: number | null
  capacidade_pessoas: number | null
  classificacao_porte: string | null
  possui_extintor: boolean | null
  qtd_extintores: number | null
  tipo_extintor: string | null
  extintor_validade: boolean | null
  extintor_localizacao_ok: boolean | null
  sinalizacao_emergencia: boolean | null
  saida_desobstruida: boolean | null
  qtd_saidas: number | null
  rotas_fuga_ok: boolean | null
  instalacao_irregular: boolean | null
  possui_glp: boolean | null
  glp_armazenamento_ok: boolean | null
  sistema_fixo_incendio: boolean | null
  qual_sistema_fixo: string | null
  iluminacao_emergencia: boolean | null
  obs_iluminacao: string | null
  hidrante_reserva: boolean | null
  planta_baixa: boolean | null
  apto_alvara: boolean | null
  necessita_adequacoes: boolean | null
  observacoes: string | null
  descricao_tecnica: string | null
  situacao_imovel: string | null
  reavaliacao: boolean | null
  orgao_destino: string | null
  qual_orgao_outro: string | null
  nome_vistoriador: string | null
  matricula_vistoriador: string | null
  data_vistoria: string | null
  validade_vistoria: string | null
  documento_url: string | null
  criado_em: string
}

const SIM_NAO = (v: boolean | null) => v === true ? 'Sim' : v === false ? 'Não' : '—'
const fmt = (v: string | null | undefined) => v || '—'

function gerarTextoRelatorio(a: Alvara): string {
  const dataVistoria = a.data_vistoria
    ? new Date(a.data_vistoria + 'T12:00:00').toLocaleDateString('pt-BR')
    : '—'
  const validade = a.validade_vistoria
    ? new Date(a.validade_vistoria + 'T12:00:00').toLocaleDateString('pt-BR')
    : '—'
  const parecer = a.apto_alvara ? 'FAVORÁVEL à emissão do Alvará de Funcionamento' : 'DESFAVORÁVEL à emissão do Alvará de Funcionamento'
  const conclusao = a.apto_alvara
    ? 'o estabelecimento apresenta condições satisfatórias de segurança contra incêndio e estabilidade estrutural, estando apto para funcionamento.'
    : 'o estabelecimento NÃO apresenta condições satisfatórias de segurança, necessitando das adequações indicadas antes da emissão do Alvará de Funcionamento.'

  const orgaoDestino = a.orgao_destino === 'Outros' && a.qual_orgao_outro
    ? a.qual_orgao_outro
    : fmt(a.orgao_destino)

  return `RELATÓRIO DE VISTORIA CONTRA INCÊNDIO E ESTABILIDADE ESTRUTURAL PARA FINS DE ALVARÁ
PROTOCOLO: ${fmt(a.numero)}
EMPREENDIMENTO: ${a.nome_estabelecimento}
SITUAÇÃO: ${fmt(a.situacao_imovel)}

IDENTIFICAÇÃO DO ESTABELECIMENTO

Nome Empresarial: ${a.nome_estabelecimento}
CNPJ: ${fmt(a.cnpj)}
Responsável: ${fmt(a.nome_responsavel)}
CPF: ${fmt(a.cpf_responsavel)}
Telefone: ${fmt(a.telefone)}
Endereço: ${fmt(a.endereco)}
Bairro: ${fmt(a.bairro)}
Município: ${fmt(a.municipio)}
${a.gps_lat && a.gps_lng ? `Coordenadas GPS: ${a.gps_lat.toFixed(6)}, ${a.gps_lng.toFixed(6)}` : ''}

Tipo de Estabelecimento: ${fmt(a.tipo_estabelecimento)}
Área Total: ${a.area_total ? a.area_total + ' m²' : '—'}
Capacidade estimada: ${a.capacidade_pessoas ? a.capacidade_pessoas + ' pessoas' : '—'}
${a.classificacao_porte ? `Classificação de Porte: ${a.classificacao_porte}` : ''}

DADOS DA VISTORIA TÉCNICA

Responsável Técnico: ${fmt(a.nome_vistoriador)}
Data da Vistoria: ${dataVistoria}
Validade da Vistoria: ${validade}

OBJETIVO

O presente relatório tem por finalidade registrar as condições observadas durante vistoria técnica, visando avaliar os aspectos de segurança contra incêndio e estabilidade estrutural do estabelecimento para fins de emissão de Alvará de Funcionamento.

CONDIÇÕES OBSERVADAS NA VISTORIA

Extintores de Incêndio:
- Possui extintor: ${SIM_NAO(a.possui_extintor)}
${a.possui_extintor ? `- Quantidade: ${a.qtd_extintores || '—'}
- Tipo: ${fmt(a.tipo_extintor)}
- Dentro do prazo de validade: ${SIM_NAO(a.extintor_validade)}
- Localização adequada: ${SIM_NAO(a.extintor_localizacao_ok)}` : ''}

Saídas e Sinalização:
- Sinalização de emergência: ${SIM_NAO(a.sinalizacao_emergencia)}
- Saída desobstruída: ${SIM_NAO(a.saida_desobstruida)}
- Quantidade de saídas de emergência: ${a.qtd_saidas || '—'}
- Rotas de fuga adequadas: ${SIM_NAO(a.rotas_fuga_ok)}

Instalações Elétricas e GLP:
- Instalação elétrica irregular: ${SIM_NAO(a.instalacao_irregular)}
- Possui GLP: ${SIM_NAO(a.possui_glp)}
${a.possui_glp ? `- GLP armazenado corretamente: ${SIM_NAO(a.glp_armazenamento_ok)}` : ''}

Iluminação e Hidrante:
- Iluminação de emergência: ${SIM_NAO(a.iluminacao_emergencia)}
${a.obs_iluminacao ? `- Obs: ${a.obs_iluminacao}` : ''}
- Hidrante ou reserva d'água: ${SIM_NAO(a.hidrante_reserva)}

Sistema Fixo de Combate a Incêndio: ${SIM_NAO(a.sistema_fixo_incendio)}
${a.sistema_fixo_incendio && a.qual_sistema_fixo ? `- Tipo: ${a.qual_sistema_fixo}` : ''}

Documentação Técnica:
- Planta baixa / Croqui: ${SIM_NAO(a.planta_baixa)}

LEGISLAÇÃO E NORMAS TÉCNICAS APLICÁVEIS

- NR-23 – Proteção Contra Incêndios;
- ABNT NBR 12693 – Sistemas de proteção por extintores de incêndio;
- ABNT NBR 9077 – Saídas de emergência em edificações;
- ABNT NBR 10898 – Sistema de iluminação de emergência;
- ABNT NBR 5410 – Instalações elétricas de baixa tensão;
- Normas e diretrizes do Corpo de Bombeiros Militar do Estado do Amazonas.

DESCRIÇÃO TÉCNICA

${a.descricao_tecnica || 'Não informado.'}

CONCLUSÃO TÉCNICA

Considerando as condições observadas durante a vistoria, os equipamentos de proteção existentes, as condições de estabilidade estrutural verificadas e as características da atividade exercida, conclui-se que ${conclusao}

PARECER TÉCNICO

Diante do exposto, o parecer técnico é ${parecer}${a.apto_alvara ? ', devendo o responsável manter as condições atuais de segurança, realizar inspeções periódicas dos equipamentos de combate a incêndio e preservar as condições de conservação da edificação.' : '.'}
${a.necessita_adequacoes && !a.apto_alvara ? '\nO estabelecimento necessita de adequações antes da emissão do alvará.' : ''}
${a.observacoes ? `\nObservações: ${a.observacoes}` : ''}

O processo segue com encaminhamento ao ${orgaoDestino} para a continuidade dos trâmites legais.

Responsável pela Vistoria:
${fmt(a.nome_vistoriador)}
Coordenador – Chefe do Setor de Vistorias`
}

export const Alvaras: React.FC = () => {
  const [alvaras, setAlvaras] = useState<Alvara[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState('todos')
  const [expandido, setExpandido] = useState<number | null>(null)
  const [copiado, setCopiado] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<Alvara>>({
    municipio: 'Tefé/AM',
    situacao_imovel: 'Em análise',
    nome_vistoriador: 'Reumano Nery da Silva',
    matricula_vistoriador: '0000',
  })
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('alvaras')
      .select('*')
      .order('criado_em', { ascending: false })
    if (data) setAlvaras(data as Alvara[])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const filtrados = alvaras.filter(a => {
    const busca = filtro.toLowerCase()
    const ok = !busca ||
      (a.nome_estabelecimento || '').toLowerCase().includes(busca) ||
      (a.nome_responsavel || '').toLowerCase().includes(busca) ||
      (a.bairro || '').toLowerCase().includes(busca) ||
      (a.numero || '').toLowerCase().includes(busca) ||
      (a.cnpj || '').includes(busca)
    const sit = filtroSituacao === 'todos' || (a.situacao_imovel || '') === filtroSituacao
    return ok && sit
  })

  const copiar = async (a: Alvara) => {
    await navigator.clipboard.writeText(gerarTextoRelatorio(a))
    setCopiado(a.id)
    setTimeout(() => setCopiado(null), 2000)
  }

  const imprimirOperacao = () => {
    const rows = filtrados.map(a => `
      <tr>
        <td>${fmt(a.numero)}</td>
        <td>${a.nome_estabelecimento}</td>
        <td>${fmt(a.nome_responsavel)}</td>
        <td>${fmt(a.telefone)}</td>
        <td>${fmt(a.endereco)}, ${fmt(a.bairro)}</td>
        <td>${fmt(a.tipo_estabelecimento)}</td>
        <td style="font-weight:bold;color:${a.situacao_imovel === 'Liberado' ? '#166534' : a.situacao_imovel === 'Não liberado' ? '#991b1b' : '#92400e'}">
          ${fmt(a.situacao_imovel)}
        </td>
        <td>${a.data_vistoria ? new Date(a.data_vistoria + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
      </tr>`).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Lista de Alvarás — SEMDECP</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:10px;margin:20px}
      h2{font-size:13px;margin:0}h3{font-size:11px;margin:4px 0 12px}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}
      th{background:#f3f4f6;font-weight:bold}
      .rodape{margin-top:40px;font-size:9px;color:#666}
    </style></head><body>
    <h2>ESTADO DO AMAZONAS — PREFEITURA MUNICIPAL DE TEFÉ</h2>
    <h3>SECRETARIA MUNICIPAL DE DEFESA CIVIL E PATRIMONIAL — SEMDECP<br>
    Lista de Estabelecimentos Vistoriados — Operação</h3>
    <table><thead><tr>
      <th>Protocolo</th><th>Estabelecimento</th><th>Responsável</th>
      <th>Telefone</th><th>Endereço / Bairro</th><th>Tipo</th>
      <th>Situação</th><th>Data Vistoria</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <div class="rodape">
      <p>Total: ${filtrados.length} estabelecimento(s) | Emitido em: ${new Date().toLocaleDateString('pt-BR')}</p>
      <p>_____________________________________ &nbsp;&nbsp;&nbsp; _____________________________________</p>
      <p>Rêumano Nery da Silva &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      Edivilson Braga da Silva</p>
      <p>Chefe do Setor de Vistoria &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      Secretário Municipal de Defesa Civil</p>
    </div>
    </body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); w.print() }
  }

  const salvarNovo = async () => {
    if (!form.nome_estabelecimento?.trim()) return
    setSalvando(true)
    const { data: numData } = await supabase.rpc('proximo_alvara')
    const numero = numData || null
    const validade = form.data_vistoria
      ? new Date(new Date(form.data_vistoria + 'T12:00:00').setFullYear(
          new Date(form.data_vistoria + 'T12:00:00').getFullYear() + 1
        )).toISOString().split('T')[0]
      : null
    await supabase.from('alvaras').insert({
      ...form, numero, validade_vistoria: validade,
    })
    setSalvando(false)
    setShowForm(false)
    setForm({ municipio: 'Tefé/AM', situacao_imovel: 'Em análise', nome_vistoriador: 'Reumano Nery da Silva', matricula_vistoriador: '0000' })
    carregar()
  }

  const badgeSituacao = (s: string | null) => {
    if (s === 'Liberado') return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-success/10 text-success">LIBERADO</span>
    if (s === 'Não liberado') return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-error-expired/10 text-error-expired">NÃO LIBERADO</span>
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">EM ANÁLISE</span>
  }

  const inp = "w-full p-2 border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-primary-btn/20"
  const lbl = "block text-xs font-bold text-text-secondary uppercase mb-1"

  return (
    <div className="p-4 flex flex-col h-full overflow-hidden">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-4 shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileCheck size={24} /> Alvarás</h1>
          <p className="text-text-secondary text-sm">Vistorias técnicas de estabelecimentos para fins de alvará de funcionamento.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={imprimirOperacao} className="flex items-center gap-2 border border-gray-300 text-text-secondary px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
            <Printer size={16} /> Lista Operação
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary-btn text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 text-sm">
            <Plus size={18} /> Novo Alvará
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-btn/20"
            placeholder="Buscar estabelecimento, responsável, protocolo..."
            value={filtro} onChange={e => setFiltro(e.target.value)} />
        </div>
        <select className="p-2 border border-gray-200 rounded-lg text-sm outline-none"
          value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)}>
          <option value="todos">Todas situações</option>
          <option value="Liberado">Liberado</option>
          <option value="Não liberado">Não liberado</option>
          <option value="Em análise">Em análise</option>
        </select>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <p className="text-text-secondary text-sm italic">Carregando...</p>
        ) : filtrados.length === 0 ? (
          <p className="text-text-secondary text-sm italic">Nenhum alvará encontrado.</p>
        ) : filtrados.map(a => (
          <div key={a.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Linha principal */}
            <div className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-text-secondary font-mono">{a.numero || 'S/N'}</span>
                  {badgeSituacao(a.situacao_imovel)}
                  {a.reavaliacao && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">REAVALIAÇÃO</span>}
                </div>
                <p className="font-bold text-sm mt-0.5 truncate">{a.nome_estabelecimento}</p>
                <p className="text-xs text-text-secondary truncate">{[a.nome_responsavel, a.telefone, a.bairro].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => copiar(a)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-gray-200 hover:bg-gray-50 text-text-secondary"
                  title="Copiar texto do relatório">
                  {copiado === a.id ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                  <span className="hidden sm:inline">{copiado === a.id ? 'Copiado!' : 'Copiar relatório'}</span>
                </button>
                {a.documento_url && (
                  <a href={a.documento_url} target="_blank" rel="noopener noreferrer"
                    className="px-2 py-1 rounded text-xs border border-gray-200 hover:bg-gray-50 text-text-secondary">
                    PDF
                  </a>
                )}
                <button onClick={() => setExpandido(expandido === a.id ? null : a.id)}
                  className="p-1 rounded hover:bg-gray-100 text-text-secondary">
                  {expandido === a.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            {/* Detalhe expandido */}
            {expandido === a.id && (
              <div className="border-t border-gray-100 p-3 bg-gray-50 text-xs space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                  <div><span className="font-bold">CNPJ:</span> {fmt(a.cnpj)}</div>
                  <div><span className="font-bold">CPF Resp.:</span> {fmt(a.cpf_responsavel)}</div>
                  <div><span className="font-bold">Tipo:</span> {fmt(a.tipo_estabelecimento)}</div>
                  <div><span className="font-bold">Área:</span> {a.area_total ? a.area_total + ' m²' : '—'}</div>
                  <div><span className="font-bold">Capacidade:</span> {a.capacidade_pessoas ? a.capacidade_pessoas + ' pessoas' : '—'}</div>
                  <div><span className="font-bold">Data vistoria:</span> {a.data_vistoria ? new Date(a.data_vistoria + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</div>
                  <div><span className="font-bold">Extintor:</span> {SIM_NAO(a.possui_extintor)} {a.possui_extintor ? `(${a.qtd_extintores || '?'} un., ${fmt(a.tipo_extintor)})` : ''}</div>
                  <div><span className="font-bold">Sinalização:</span> {SIM_NAO(a.sinalizacao_emergencia)}</div>
                  <div><span className="font-bold">Saídas:</span> {a.qtd_saidas || '—'}</div>
                  <div><span className="font-bold">Iluminação emerg.:</span> {SIM_NAO(a.iluminacao_emergencia)}</div>
                  <div><span className="font-bold">GLP:</span> {SIM_NAO(a.possui_glp)}</div>
                  <div><span className="font-bold">Instal. irregular:</span> {SIM_NAO(a.instalacao_irregular)}</div>
                  <div><span className="font-bold">Hidrante/reserva:</span> {SIM_NAO(a.hidrante_reserva)}</div>
                  <div><span className="font-bold">Sistema fixo:</span> {SIM_NAO(a.sistema_fixo_incendio)}</div>
                  <div><span className="font-bold">Planta baixa:</span> {SIM_NAO(a.planta_baixa)}</div>
                  <div><span className="font-bold">Vistoriador:</span> {fmt(a.nome_vistoriador)}</div>
                </div>
                {a.descricao_tecnica && <div><span className="font-bold">Descrição técnica:</span><br />{a.descricao_tecnica}</div>}
                {a.observacoes && <div><span className="font-bold">Observações:</span> {a.observacoes}</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal novo alvará */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold">Novo Alvará</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto p-4 grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2"><label className={lbl}>Nome do Estabelecimento *</label>
                <input className={inp} value={form.nome_estabelecimento || ''} onChange={e => setForm(f => ({...f, nome_estabelecimento: e.target.value}))} /></div>
              <div><label className={lbl}>CNPJ</label>
                <input className={inp} value={form.cnpj || ''} onChange={e => setForm(f => ({...f, cnpj: e.target.value}))} /></div>
              <div><label className={lbl}>Tipo de Estabelecimento</label>
                <input className={inp} value={form.tipo_estabelecimento || ''} onChange={e => setForm(f => ({...f, tipo_estabelecimento: e.target.value}))} /></div>
              <div><label className={lbl}>Responsável</label>
                <input className={inp} value={form.nome_responsavel || ''} onChange={e => setForm(f => ({...f, nome_responsavel: e.target.value}))} /></div>
              <div><label className={lbl}>CPF Responsável</label>
                <input className={inp} value={form.cpf_responsavel || ''} onChange={e => setForm(f => ({...f, cpf_responsavel: e.target.value}))} /></div>
              <div><label className={lbl}>Telefone</label>
                <input className={inp} value={form.telefone || ''} onChange={e => setForm(f => ({...f, telefone: e.target.value}))} /></div>
              <div><label className={lbl}>Data da Vistoria</label>
                <input type="date" className={inp} value={form.data_vistoria || ''} onChange={e => setForm(f => ({...f, data_vistoria: e.target.value}))} /></div>
              <div className="col-span-2"><label className={lbl}>Endereço</label>
                <input className={inp} value={form.endereco || ''} onChange={e => setForm(f => ({...f, endereco: e.target.value}))} /></div>
              <div><label className={lbl}>Bairro</label>
                <input className={inp} value={form.bairro || ''} onChange={e => setForm(f => ({...f, bairro: e.target.value}))} /></div>
              <div><label className={lbl}>Área Total (m²)</label>
                <input type="number" className={inp} value={form.area_total || ''} onChange={e => setForm(f => ({...f, area_total: Number(e.target.value)}))} /></div>
              <div><label className={lbl}>Capacidade (pessoas)</label>
                <input type="number" className={inp} value={form.capacidade_pessoas || ''} onChange={e => setForm(f => ({...f, capacidade_pessoas: Number(e.target.value)}))} /></div>
              <div><label className={lbl}>Situação</label>
                <select className={inp} value={form.situacao_imovel || 'Em análise'} onChange={e => setForm(f => ({...f, situacao_imovel: e.target.value, apto_alvara: e.target.value === 'Liberado'}))}>
                  <option>Em análise</option><option>Liberado</option><option>Não liberado</option>
                </select></div>
              <div className="col-span-2"><label className={lbl}>Descrição Técnica</label>
                <textarea rows={3} className={inp} value={form.descricao_tecnica || ''} onChange={e => setForm(f => ({...f, descricao_tecnica: e.target.value}))} /></div>
              <div className="col-span-2"><label className={lbl}>Observações</label>
                <textarea rows={2} className={inp} value={form.observacoes || ''} onChange={e => setForm(f => ({...f, observacoes: e.target.value}))} /></div>
              <div><label className={lbl}>Vistoriador</label>
                <input className={inp} value={form.nome_vistoriador || ''} onChange={e => setForm(f => ({...f, nome_vistoriador: e.target.value}))} /></div>
              <div><label className={lbl}>Matrícula</label>
                <input className={inp} value={form.matricula_vistoriador || ''} onChange={e => setForm(f => ({...f, matricula_vistoriador: e.target.value}))} /></div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={salvarNovo} disabled={salvando || !form.nome_estabelecimento?.trim()}
                className="px-4 py-2 bg-primary-btn text-white rounded-lg font-bold text-sm disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
