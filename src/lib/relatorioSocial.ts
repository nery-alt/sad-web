// Gera o Relatório Social da Assistência Social em Word. Usa o mesmo modelo oficial do relatório de vistoria
// (/relatorio-vistoria.docx: cabeçalho, rodapé, marca d'água, VISTO e anexo de fotos) e troca os títulos e as seções.
// O texto sai como RASCUNHO montado com os dados da ficha de atendimento; o que faltar fica entre
// [[colchetes]] e sai marcado de amarelo no Word, para a assistente social completar e ajustar.
import JSZip from 'jszip'
import { quebrarTopo } from './relatorioVistoria'
import { esc, trocarParagrafo, tabelaAssinaturas, type Visto, type FotoLaudo } from './laudoAlvara'
import type { Servidor } from './requerimentoAlvara'

export { VISTOS } from './laudoAlvara'

// Quem assina o Relatório Social. O CRESS é da assistente social; o auxiliar só leva o registro dele se tiver.
export const SIGNATARIOS_SOCIAL: Servidor[] = [
  {
    id: 'barbara', nome: 'Bárbara Ketlen de Almeida Macário', cargoTecnico: 'Assistente Social',
    cargoAssinatura1: 'Assistente Social', cargoAssinatura2: 'CRESS 12143 – 15ª Região',
  },
  {
    id: 'odailson', nome: 'Odailson Bastos Magalhães', cargoTecnico: 'Auxiliar de Serviço Social',
    cargoAssinatura1: 'Auxiliar de Serviço Social', cargoAssinatura2: 'Setor de Assistência Social',
  },
]

// ---------- Dados que o relatório lê da ficha (as telas passam os registros inteiros; só estes campos importam) ----------
export interface AtendimentoSocial {
  protocolo: string | null
  evento: string
  cobrade: string | null
  data_visita: string | null
  data_ocorrencia: string | null
  hora_ocorrencia: string | null
  resp_nome: string
  resp_cpf: string | null
  resp_rg: string | null
  resp_telefone: string | null
  resp_nascimento: string | null
  resp_parentesco: string | null
  endereco: string | null
  ponto_referencia: string | null
  bairro_comunidade: string | null
  tem_idoso: boolean
  tem_gestante_lactante: boolean
  tem_pcd: boolean
  danos: string[] | null
  solicitacoes: string[] | null
  comodos: number | null
  energia: string | null
  agua: string | null
  saneamento: string | null
  vulnerabilidade: 'baixa' | 'media' | 'alta' | null
  area_app: boolean | null
  acomp_psicossocial: boolean | null
  nasf: boolean | null
  observacoes: string | null
  tipificacao: string[] | null
  tipificacao_outros: string | null
  area_afetada: string | null
  tipo_imovel: string | null
  tipo_residencia: string | null
  tipo_residencia_outros: string | null
  propriedade: string | null
  abrigo: string[] | null
  pessoas_afetadas: number | null
  familias_afetadas: number | null
  danos_materiais: string | null
  renda_familiar: number | null
  material_solicitado: string | null
}
export interface MembroSocial { nome: string; parentesco: string | null; nascimento: string | null; cpf: string | null; rg: string | null }
export interface EntregaSocial { item: string; quantidade: number; data_entrega: string | null }
export interface GrupoSocial { tipo: string; nome: string | null; detalhe: string | null }   // idoso | gestante | lactante | pcd
export interface EncaminhamentoSocial { orgao: string; tipo: 'emergencial' | 'permanente'; obs: string | null }

export interface SecaoSocial { titulo: string; texto: string }   // texto: um parágrafo por linha; "• " abre marcador

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const dataExtenso = (iso: string | null | undefined, vazio = ''): string => {
  if (!iso) return vazio
  const [a, m, d] = iso.split('-')
  return `${d} de ${MESES[Number(m) - 1]} de ${a}`
}
const dataCurta = (iso: string | null | undefined) => iso ? iso.split('-').reverse().join('/') : ''
const faltou = (o: string) => `[[${o}]]`
const lista = (xs: string[]) => xs.length <= 1 ? (xs[0] || '') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`
const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const reais = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

// Compara textos sem acento, caixa ou pontuação (para não repetir "Comunidade X" duas vezes)
const sem = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const contem = (todo: string, parte: string) => !!sem(parte) && sem(todo).includes(sem(parte))
// endereço e bairro/comunidade, sem repetir um dentro do outro
function partesLocal(a: AtendimentoSocial): string[] {
  const p: string[] = []
  for (const t of [a.endereco, a.bairro_comunidade]) {
    const v = (t || '').trim()
    if (v && !p.some(x => contem(x, v))) p.push(v)
  }
  return p
}
// "ao CRAS", "à SEMASC"
const FEMININOS = /^(semasc|semsa|semiu|semmalp|apae|defensoria|policia|secretaria|prefeitura|procuradoria|delegacia|ouvidoria)\b/
const artigo = (o: string) => FEMININOS.test(sem(o)) ? 'à' : 'ao'
// "sim"/"não" digitados na ficha viram verdadeiro/falso; outro texto fica como veio
const simNao = (v: string | null): boolean | string | null => {
  const t = (v || '').trim()
  return !t ? null : /^n[aã]o\b/i.test(t) ? false : /^sim\b/i.test(t) ? true : t
}
const AUXILIO = /^aux[ií]lio/i

const TIPIF: Record<string, string> = { deslizamento: 'deslizamento', tempestade: 'tempestade', incendio: 'incêndio', alagamento: 'alagamento' }
const RESID: Record<string, string> = { alvenaria: 'alvenaria', madeira: 'madeira', misto: 'material misto (alvenaria e madeira)', barro: 'barro' }
const PROP: Record<string, string> = { propria: 'de propriedade da família', cedida: 'cedido', alugada: 'alugado' }

// ---------- Rascunho ----------
export function montarRascunho(a: AtendimentoSocial, membros: MembroSocial[], entregas: EntregaSocial[], encs: EncaminhamentoSocial[], grupos: GrupoSocial[] = []): SecaoSocial[] {
  // 1. Identificação da ocorrência
  const tip = (a.tipificacao || []).map(t => t === 'outros' ? (a.tipificacao_outros || '').trim() : TIPIF[t]).filter(Boolean)
  const fato = tip.length ? lista(tip) : (a.evento || '').trim() ? minuscula(a.evento.trim()) : faltou('informar o evento')
  const local = partesLocal(a).join(', ')
  const zona = a.area_afetada === 'urbana' ? 'zona urbana' : a.area_afetada === 'rural' ? 'zona rural' : ''
  const quando = a.data_ocorrencia
    ? `ocorrido no dia ${dataExtenso(a.data_ocorrencia)}${a.hora_ocorrencia ? `, por volta das ${a.hora_ocorrencia.slice(0, 5).replace(':', 'h')}min` : ''}`
    : `ocorrido ${faltou('informar a data da ocorrência')}`
  const onde = [local ? `em ${local}` : '', zona ? `${zona} do município de Tefé/AM` : 'no município de Tefé/AM'].filter(Boolean).join(', ')
  const intro = `O presente Relatório Social tem por finalidade apresentar a análise da situação vivenciada por família atingida por ${fato}, ${quando}, ${onde}.`
  const casa: string[] = []
  const tipoRes = a.tipo_residencia === 'outros' ? (a.tipo_residencia_outros || '').trim() : a.tipo_residencia ? RESID[a.tipo_residencia] : ''
  if (a.tipo_imovel || tipoRes || a.propriedade || a.comodos) {
    casa.push(`O imóvel é ${a.tipo_imovel === 'comercial' ? 'comercial' : 'residencial'}${tipoRes ? `, construído em ${tipoRes}` : ''}${a.propriedade ? `, ${PROP[a.propriedade]}` : ''}${a.comodos ? `, com ${plural(a.comodos, 'cômodo', 'cômodos')}` : ''}.`)
  }
  if (a.ponto_referencia && !contem(local, a.ponto_referencia)) casa.push(`Ponto de referência: ${a.ponto_referencia.trim()}.`)
  // o que a equipe anotou nas observações da ficha (estado da casa etc.) é o que foi observado no local
  const observado = (a.observacoes || '').trim()
  const s1 = [intro, ...casa, observado || faltou('descrever o que foi observado no local durante a visita')]

  // 2. Descrição da situação
  const s2: string[] = []
  if ((a.danos || []).length) s2.push(`Foram constatados os seguintes danos: ${lista((a.danos || []).map(minuscula))}.`)
  if (a.pessoas_afetadas || a.familias_afetadas) {
    s2.push(`Foram afetadas ${[a.pessoas_afetadas ? plural(a.pessoas_afetadas, 'pessoa', 'pessoas') : '', a.familias_afetadas ? plural(a.familias_afetadas, 'família', 'famílias') : ''].filter(Boolean).join(', de ')}.`)
  }
  const abr = (a.abrigo || []).map(x => x === 'desabrigados' ? 'desabrigada' : 'desalojada')
  if (abr.length) s2.push(`A família encontra-se ${lista(abr)}.`)
  const perdas = (a.danos_materiais || '').split('\n').map(x => x.trim()).filter(Boolean)
  if (perdas.length) s2.push('Descrição das perdas materiais:', ...perdas.map(x => `• ${x.replace(/^[-•]\s*/, '')}`))
  s2.push(faltou('relato dos moradores e observações da equipe sobre como o fato ocorreu'))

  // 3. Condições socioeconômicas
  const s3: string[] = []
  s3.push(a.renda_familiar ? `Durante a avaliação social, constatou-se que a família possui renda mensal aproximada de ${reais(Number(a.renda_familiar))}, proveniente de ${faltou('informar a origem da renda')}.` : `Renda familiar: ${faltou('informar valor e origem da renda')}.`)
  // nem sempre dá para cadastrar todos no local: vale o maior entre as pessoas afetadas informadas e as cadastradas
  const nucleo = Math.max(Number(a.pessoas_afetadas) || 0, membros.length + 1)
  s3.push(`O núcleo familiar é composto por ${plural(nucleo, 'pessoa', 'pessoas')}.`)
  const pos: string[] = [], neg: string[] = [], outros: string[] = []
  for (const [nome, v] of [['energia elétrica', a.energia], ['abastecimento de água', a.agua], ['saneamento básico', a.saneamento]] as const) {
    const r = simNao(v)
    if (r === true) pos.push(nome)
    else if (r === false) neg.push(nome)
    else if (r) outros.push(`apresenta ${nome}: ${r}`)
  }
  const nem = (xs: string[]) => xs.length <= 1 ? (xs[0] || '') : `${xs.slice(0, -1).join(', ')} nem ${xs[xs.length - 1]}`
  const infra = [
    [pos.length ? `possui ${lista(pos)}` : '', neg.length ? `não possui ${nem(neg)}` : ''].filter(Boolean).join(', mas '),
    ...outros,
  ].filter(Boolean)
  if (infra.length) s3.push(`Quanto à infraestrutura, a residência ${infra.join('; ')}.`)
  const ROTULO_GRUPO: Record<string, string> = { idoso: 'idoso', gestante: 'gestante', lactante: 'lactante', pcd: 'pessoa com deficiência' }
  const prioritarios = grupos.map(g => {
    const nome = (g.nome || '').trim(), det = (g.detalhe || '').trim()
    return `${ROTULO_GRUPO[g.tipo] || g.tipo}${nome ? ' ' + nome.toUpperCase() : ''}${det ? ` (${det})` : ''}`
  })
  // fichas antigas só têm as marcações simples
  const marcas = [a.tem_idoso ? 'idoso' : '', a.tem_gestante_lactante ? 'gestante ou lactante' : '', a.tem_pcd ? 'pessoa com deficiência' : ''].filter(Boolean)
  if (prioritarios.length) s3.push(`Há na residência: ${lista(prioritarios)}.`)
  else if (marcas.length) s3.push(`Há na residência: ${lista(marcas)}.`)

  // 4. Análise social e vulnerabilidades
  const s4: string[] = []
  if (a.vulnerabilidade) s4.push(`Constatou-se grau de vulnerabilidade social ${a.vulnerabilidade === 'media' ? 'médio' : a.vulnerabilidade}.`)
  if (a.area_app) s4.push('A residência está localizada em Área de Preservação Permanente (APP).')
  if (a.acomp_psicossocial) s4.push('Identificou-se a necessidade de acompanhamento psicossocial da família.')
  if (a.nasf) s4.push('Foi indicada a avaliação do NASF.')
  s4.push(faltou('análise técnica da assistente social: impactos emocionais, direitos comprometidos (moradia, segurança, proteção social) e vulnerabilidade temporária ou permanente'))

  // 5. Medidas de proteção social
  const s5: string[] = []
  const sol = a.solicitacoes || []
  const aluguel = sol.find(x => /aluguel/i.test(x))
  const auxilios = sol.filter(x => !/aluguel/i.test(x) && AUXILIO.test(x.trim())).map(minuscula)
  const outras = sol.filter(x => !/aluguel/i.test(x) && !AUXILIO.test(x.trim())).map(minuscula)
  if (aluguel) s5.push('Recomenda-se a inclusão prioritária da família em programa de Aluguel Social, garantindo moradia provisória digna até a recuperação ou reconstrução da residência.')
  if (auxilios.length) s5.push(`Solicita-se a concessão ${auxilios.length === 1 ? 'do benefício eventual' : 'dos benefícios eventuais'}: ${lista(auxilios)}.`)
  if (outras.length) s5.push(`Solicita-se o atendimento emergencial com: ${lista(outras)}.`)
  if ((a.material_solicitado || '').trim()) s5.push(`Material solicitado: ${a.material_solicitado!.trim()}.`)
  if (entregas.length) s5.push(`Já foram realizadas as seguintes entregas: ${entregas.map(e => `${e.item} (${e.quantidade})${e.data_entrega ? ` em ${dataCurta(e.data_entrega)}` : ''}`).join('; ')}.`)
  const orgaos = [...new Set(encs.map(e => e.orgao.trim()).filter(Boolean))]
  for (const e of encs.filter(x => (x.obs || '').trim())) {
    const o = e.orgao.trim(), ob = (e.obs || '').trim().replace(/\.$/, '')
    s5.push(sem(ob).startsWith(sem(o)) ? `Encaminhamento ${artigo(o)} ${ob}.` : `Encaminhamento ${artigo(o)} ${o}: ${ob}.`)
  }
  s5.push(`Este relatório é encaminhado, em caráter de urgência, ${orgaos.length ? lista(orgaos.map(o => `${artigo(o)} ${o}`)) : faltou('informar os órgãos: CRAS, SEMASC, SEMIU…')}, para ciência e adoção das providências cabíveis, em conformidade com a Lei nº 12.608/2012 e demais normativas aplicáveis à proteção e defesa dos cidadãos atingidos por desastres.`)

  return [
    { titulo: 'Identificação da Ocorrência', texto: s1.join('\n') },
    { titulo: 'Descrição da Situação', texto: s2.join('\n') },
    { titulo: 'Condições Socioeconômicas da Família', texto: s3.join('\n') },
    { titulo: 'Análise Social e Vulnerabilidades', texto: s4.join('\n') },
    { titulo: 'Medidas de Proteção Social Recomendadas', texto: s5.join('\n') },
  ]
}

// A linha do endereço corre ao lado do quadro do VISTO: passando de ~50 caracteres entra por baixo dele.
// Quebra em várias linhas (a primeira leva o rótulo em negrito).
function enderecoEmLinhas(endereco: string): string[] {
  if (!endereco) return [`**Endereço:** ${faltou('endereço')}.`]
  const [primeira, ...resto] = quebrarTopo('Endereço: ', endereco + '.')
  return [`**Endereço:** ${primeira}`, ...resto]
}

// Linhas da primeira página (missão, data, equipe e identificação da família). "" = linha em branco.
export function montarIdentificacao(a: AtendimentoSocial, membros: MembroSocial[], opc: { hora: string; equipe: Servidor[]; dataVisita: string | null }): string[] {
  const endereco = partesLocal(a).join(' – ')
  const nomesEquipe = opc.equipe.map(s => s.id === 'barbara' ? `Assistente Social ${s.nome}` : `Auxiliar de Serviço Social ${s.nome}`)
  const equipe = `A equipe técnica de Assistência Social da Secretaria Municipal de Defesa Civil e Patrimonial – SEMDCEP, composta por ${lista([...nomesEquipe, 'agentes da Defesa Civil'])}, estiveram no local realizando a visita domiciliar.`
  const L: string[] = [
    '**Missão:** Visitas da Equipe de Assistência Social na residência.',
    `**Data:** ${dataExtenso(opc.dataVisita) || faltou('data da visita')}.`,
    `**Hora:** ${opc.hora || faltou('hora da visita')}.`,
    ...enderecoEmLinhas(endereco),
    '',
    '**EQUIPE DE ASSISTÊNCIA:**',
    equipe,
    '',
    '**I – Identificação da família:**',
    `• **Responsável familiar: ${a.resp_nome.trim().toUpperCase()}**`,
  ]
  const pessoa = (rg: string | null, cpf: string | null, dn: string | null) => {
    if (rg) L.push(`• RG: ${rg}`)
    if (cpf) L.push(`• CPF: ${cpf}`)
    if (dn) L.push(`• D.N: ${dataCurta(dn)}`)
  }
  pessoa(a.resp_rg, a.resp_cpf, a.resp_nascimento)
  for (const m of membros) {
    L.push('', `• **${(m.parentesco || 'Familiar').trim()}: ${m.nome.trim().toUpperCase()}**`)
    pessoa(m.rg, m.cpf, m.nascimento)
  }
  if (a.resp_telefone) L.push('', `**CONTATO:** ${a.resp_telefone}`)
  return L
}

// ---------- Word ----------
const FONTE = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>'
const runX = (t: string, neg: boolean, amarelo: boolean) =>
  `<w:r><w:rPr>${FONTE}${neg ? '<w:b/><w:bCs/>' : ''}<w:color w:val="000000"/><w:sz w:val="24"/><w:szCs w:val="24"/>${amarelo ? '<w:highlight w:val="yellow"/>' : ''}</w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`

// "texto **negrito** [[a completar]]" -> runs (o que está em [[ ]] sai amarelo, entre colchetes simples)
export function runsSocial(texto: string): string {
  return texto.split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/).filter(Boolean).map(p => {
    if (p.startsWith('**') && p.endsWith('**')) return runX(p.slice(2, -2), true, false)
    if (p.startsWith('[[') && p.endsWith(']]')) return runX(`[${p.slice(2, -2)}]`, false, true)
    return runX(p, false, false)
  }).join('')
}

type Estilo = 'corpo' | 'marcador' | 'linha' | 'titulo'
function paragrafo(texto: string, estilo: Estilo): string {
  const pPr: Record<Estilo, string> = {
    corpo: '<w:pPr><w:spacing w:before="0" w:after="120" w:line="276" w:lineRule="auto"/><w:ind w:firstLine="709"/><w:jc w:val="both"/></w:pPr>',
    marcador: '<w:pPr><w:spacing w:before="0" w:after="60" w:line="276" w:lineRule="auto"/><w:ind w:left="709" w:hanging="283"/><w:jc w:val="left"/></w:pPr>',
    linha: '<w:pPr><w:spacing w:before="0" w:after="0" w:line="276" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr>',
    titulo: '<w:pPr><w:pageBreakBefore/><w:spacing w:before="0" w:after="240" w:line="276" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>',
  }
  return `<w:p>${pPr[estilo]}${runsSocial(texto)}</w:p>`
}
// um parágrafo por linha; "• " ou "- " abre marcador
export function paragrafosDe(texto: string): string[] {
  return texto.split('\n').map(l => l.trim()).filter(Boolean).map(l =>
    /^[•-]\s+/.test(l) ? paragrafo('• ' + l.replace(/^[•-]\s+/, ''), 'marcador') : paragrafo(l, 'corpo'))
}

// Numa página do anexo (tabela de 2x2 quadros), deixa só as `n` primeiras fotos (mesmo ajuste do relatório de vistoria)
function ajustarPagina(trecho: string, n: number): string {
  const ini = trecho.indexOf('<w:tbl>'), fimT = trecho.lastIndexOf('</w:tbl>') + '</w:tbl>'.length
  if (ini < 0) return trecho
  let tbl = trecho.slice(ini, fimT)
  let k = 0
  tbl = tbl.replace(/<w:drawing>[\s\S]*?<\/w:drawing>/g, d => (d.includes('r:embed=') && ++k > n) ? '' : d)
  if (n <= 2) {
    const linhas = [...tbl.matchAll(/<w:tr[ >]/g)].map(m => m.index!)
    if (linhas.length === 4) tbl = tbl.slice(0, linhas[2]) + tbl.slice(tbl.lastIndexOf('</w:tr>') + '</w:tr>'.length)
  }
  return trecho.slice(0, ini) + tbl + trecho.slice(fimT)
}

const fimP = (xml: string, i: number) => xml.indexOf('</w:p>', i) + '</w:p>'.length
const inicioP = (xml: string, i: number) => Math.max(xml.lastIndexOf('<w:p>', i), xml.lastIndexOf('<w:p ', i))

export interface DadosRelatorioSocial {
  numero: string            // "49/2026"
  solicitante: string
  ocorrencia: string
  identificacao: string[]   // de montarIdentificacao (ou ajustado)
  secoes: SecaoSocial[]
  assinantes: Servidor[]
  visto: Visto
  dataEmissao: string       // AAAA-MM-DD
  fotos: FotoLaudo[]        // 0 a 8
}

// Transforma o texto do modelo de vistoria no modelo do Relatório Social:
// títulos trocados e as 4 seções fixas viram um par título/corpo ({{H}} / {{B}}) repetido para cada seção.
function prepararModelo(xml: string): string {
  const tirar = (x: string, texto: string) => {
    const i = x.indexOf(`<w:t>${texto}</w:t>`)
    if (i < 0) throw new Error(`Modelo de relatório mudou: não achei "${texto}".`)
    return x.slice(0, inicioP(x, i)) + x.slice(fimP(x, i))
  }
  let m = xml
    .replace(/RELATÓRIO TÉCNICO DE VISTORIA/g, 'RELATÓRIO SOCIAL')
    .replace(/PROTOCOLO:/g, 'RELATÓRIO Nº:')
    .replace(/ANEXO\/FOTOS DO RELATÓRIO Nº \{numero\}/g, 'ANEXO/FOTOS PARA COMPROVAÇÃO DOS FATOS')
  for (const t of ['2. SITUAÇÃO CONSTATADA E ANÁLISE', '{{SITUACAO}}', '3. RECOMENDAÇÕES', '{{RECOMENDACOES}}', '4. CONCLUSÃO', '{{CONCLUSAO}}']) m = tirar(m, t)
  if (!m.includes('<w:t>1. OBJETO</w:t>') || !m.includes('<w:t>{{OBJETO}}</w:t>')) throw new Error('Modelo de relatório mudou: seção 1 não encontrada.')
  return m.replace('<w:t>1. OBJETO</w:t>', '<w:t>{{H}}</w:t>').replace('<w:t>{{OBJETO}}</w:t>', '<w:t>{{B}}</w:t>')
}

export async function gerarRelatorioSocial(d: DadosRelatorioSocial): Promise<Blob> {
  const resp = await fetch('/relatorio-vistoria.docx')
  if (!resp.ok) throw new Error('Modelo do relatório não encontrado no servidor.')
  const zip = await JSZip.loadAsync(await resp.arrayBuffer())
  const caminho = 'word/document.xml'
  let xml = prepararModelo(await zip.file(caminho)!.async('string'))

  const fotos = d.fotos.slice(0, 8)
  const emLinhas = (rotulo: string, v: string) =>
    quebrarTopo(rotulo, v).map(esc).join('</w:t><w:br/><w:t xml:space="preserve">')
  xml = xml.replace('{solicitante}', () => emLinhas('SOLICITANTE: ', d.solicitante)).replace('{ocorrencia}', () => emLinhas('OCORRÊNCIA: ', d.ocorrencia))
  const valores: Record<string, string> = {
    numero: d.numero,
    visto_nome: d.visto.nome, visto_cargo: d.visto.cargo, visto_decreto: d.visto.decreto,
    data_extenso: dataExtenso(d.dataEmissao),
  }
  for (let k = 1; k <= 8; k++) {
    const f = fotos[k - 1]
    valores[`leg${k}`] = f ? `Foto ${String(k).padStart(2, '0')} – ${f.legenda.trim()}` : ''
  }
  xml = xml.replace(/\{(\w+)\}/g, (tag, chave: string) => chave in valores ? esc(valores[chave]) : tag)

  // Primeira página: identificação (um parágrafo por linha)
  xml = trocarParagrafo(xml, '{{IDENT}}', d.identificacao.map(l => runsSocial(l)))

  // Seções: título e corpo do modelo são repetidos para cada seção; o "RELATÓRIO SOCIAL" abre a página 2
  {
    const iH = xml.indexOf('<w:t>{{H}}</w:t>'), iB = xml.indexOf('<w:t>{{B}}</w:t>')
    const aH = inicioP(xml, iH), bH = fimP(xml, iH), bB = fimP(xml, iB)
    const protoH = xml.slice(aH, bH)
    const blocos = [paragrafo('**RELATÓRIO SOCIAL**', 'titulo')]
    d.secoes.forEach((s, i) => {
      blocos.push(protoH.replace('{{H}}', () => esc(`${i + 1}. ${s.titulo.toUpperCase()}`)))
      blocos.push(...paragrafosDe(s.texto))
    })
    xml = xml.slice(0, aH) + blocos.join('') + xml.slice(bB)
  }

  xml = trocarParagrafo(xml, '{{RESPONSAVEIS}}', [runsSocial('Atenciosamente,')])
  {
    const i = xml.indexOf('<w:t>{{ASSINATURAS}}</w:t>')
    const maiusc = d.assinantes.map(s => ({ ...s, nome: s.nome.toUpperCase() }))
    xml = xml.slice(0, inicioP(xml, i)) + tabelaAssinaturas(maiusc) + xml.slice(fimP(xml, i))
  }

  // ---------- Anexo de fotos ----------
  const iIni = xml.indexOf('<w:t>{{ANEXO_INI}}</w:t>')
  const iFim = xml.indexOf('<w:t>{{ANEXO_FIM}}</w:t>')
  if (fotos.length === 0) {
    xml = xml.slice(0, inicioP(xml, iIni)) + xml.slice(fimP(xml, iFim))
  } else {
    const ids = [...xml.slice(iIni, iFim).matchAll(/r:embed="(rId\d+)"/g)].map(m => m[1])
    const rels = await zip.file('word/_rels/document.xml.rels')!.async('string')
    fotos.forEach((f, k) => {
      const alvo = rels.match(new RegExp(`Id="${ids[k]}"[^>]*Target="([^"]+)"`))?.[1]
      if (alvo) zip.file(`word/${alvo}`, f.bytes)
    })
    const pa = inicioP(xml, xml.indexOf('<w:t>{{ANEXO_INI}}</w:t>'))
    const pb = inicioP(xml, xml.indexOf('<w:t>{{ANEXO2_INI}}</w:t>'))
    const pc = inicioP(xml, xml.indexOf('<w:t>{{ANEXO_FIM}}</w:t>'))
    const limpar = (s: string) => s.replace(/<w:jc w:val="(both|distribute)"\/>/g, '<w:jc w:val="left"/>').replace(/<a:srcRect [^>]*\/>/g, '<a:srcRect/>')
    const pag1 = limpar(ajustarPagina(xml.slice(pa, pb), Math.min(fotos.length, 4)))
    const pag2 = fotos.length > 4 ? limpar(ajustarPagina(xml.slice(pb, pc), fotos.length - 4)) : ''
    xml = xml.slice(0, pa) + pag1 + pag2 + xml.slice(pc)
    if (pag2) xml = trocarParagrafo(xml, '{{ANEXO2_INI}}', ['<w:r><w:br w:type="page"/></w:r>'])
    xml = trocarParagrafo(xml, '{{ANEXO_INI}}', ['<w:r><w:br w:type="page"/></w:r>'])
    xml = trocarParagrafo(xml, '{{ANEXO_FIM}}', [''])
  }

  if (xml.includes('{{')) throw new Error('Ficou campo sem preencher no relatório.')
  zip.file(caminho, xml)
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

// 2026-11-26_49_RELATORIO_SOCIAL_Moises.docx
export function nomeArquivoRelatorioSocial(dataEmissao: string, numero: string, resp: string) {
  const num = numero.split('/')[0].replace(/\D/g, '') || 'SN'
  const nome = resp.trim().split(/\s+/)[0].normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]/g, '')
  return `${dataEmissao}_${num}_RELATORIO_SOCIAL_${nome || 'familia'}.docx`
}
