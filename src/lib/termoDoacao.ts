// Termo de Doação (recebimento de material) da Assistência Social: um modelo só para qualquer material
// (madeira, cesta básica, alumínio...). Usa o papel timbrado do modelo oficial (/relatorio-vistoria.docx:
// cabeçalho, rodapé e marca d'água) e troca o corpo. Gera um ou vários termos, cada um começando em página nova.
import JSZip from 'jszip'
import { esc } from './laudoAlvara'
import { COBRADES } from './cobrade'
import { dataExtenso, ajeitarTexto, ajeitarEndereco, SIGNATARIOS_SOCIAL, type AtendimentoSocial } from './relatorioSocial'

export interface Autoridade { id: string; nome: string; cargo: string; decreto: string }
// Assina quem liberou o material (ex.: a cesta básica foi liberada pelo Secretário Adjunto)
export const AUTORIDADES: Autoridade[] = [
  { id: 'edivilson', nome: 'EDIVILSON BRAGA DA SILVA', cargo: 'Secretário Municipal de Defesa Civil e Patrimonial - PMT', decreto: 'Decreto n° 116/2025' },
  { id: 'welliton', nome: 'WELLITON BRAGA DE FREITAS', cargo: 'Secretário Adjunto Municipal de Defesa Civil e Patrimonial - PMT', decreto: 'Decreto n° 117/2025' },
]

export interface ItemTermo { item: string; quantidade: number }
export interface DadosTermo {
  atendimento: AtendimentoSocial
  nMembros: number              // pessoas cadastradas no núcleo familiar, além do responsável
  itens: ItemTermo[]
  data: string | null           // AAAA-MM-DD; vazio deixa a data para preencher à mão
  assinam: string[]             // ids de SIGNATARIOS_SOCIAL
  autoridade: Autoridade
}

const FONTE = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>'
const run = (t: string, o: { b?: boolean; i?: boolean; sz?: number } = {}) =>
  `<w:r><w:rPr>${FONTE}${o.b ? '<w:b/><w:bCs/>' : ''}${o.i ? '<w:i/><w:iCs/>' : ''}<w:color w:val="000000"/><w:sz w:val="${o.sz ?? 22}"/><w:szCs w:val="${o.sz ?? 22}"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`
const par = (conteudo: string, o: { jc?: string; depois?: number; antes?: number; recuo?: number; manter?: boolean; novaPagina?: boolean } = {}) =>
  `<w:p><w:pPr>${o.manter ? '<w:keepNext/>' : ''}${o.novaPagina ? '<w:pageBreakBefore/>' : ''}<w:spacing w:before="${o.antes ?? 0}" w:after="${o.depois ?? 120}" w:line="259" w:lineRule="auto"/>${o.recuo ? `<w:ind w:firstLine="${o.recuo}"/>` : ''}<w:jc w:val="${o.jc ?? 'both'}"/></w:pPr>${conteudo}</w:p>`

// pedaços ["texto", negrito]
type Peca = [string, boolean?]
const pecas = (ps: Peca[], sz = 22) => ps.map(([t, b]) => run(t, { b, sz })).join('')

const branco = (n: number) => '_'.repeat(n)
const ou = (v: string | null | undefined, n: number) => (v ?? '').trim() || branco(n)
const qtd = (n: number) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 })

function trechoCobrade(a: AtendimentoSocial): string {
  const cod = (a.cobrade || '').trim()
  if (!cod) return ''
  const c = COBRADES.find(x => x.codigo === cod)
  const desc = c ? `GRUPO ${c.grupo.toUpperCase()}, ${c.nome.toUpperCase()}, COBRADE ${cod}` : `COBRADE ${cod}`
  return `, para que sejam utilizados no desastre classificado conforme a CLASSIFICAÇÃO E CODIFICAÇÃO BRASILEIRA DE DESASTRES (COBRADE), ${desc}`
}

const SEM_BORDA = '<w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/>'
const COM_BORDA = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(l => `<w:${l} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join('')

function tabelaItens(itens: ItemTermo[]): string {
  const cel = (larg: number, t: string, o: { b?: boolean; jc?: string; sombra?: boolean } = {}) =>
    `<w:tc><w:tcPr><w:tcW w:w="${larg}" w:type="dxa"/>${o.sombra ? '<w:shd w:val="clear" w:color="auto" w:fill="E7E6E6"/>' : ''}</w:tcPr>` +
    `<w:p><w:pPr><w:spacing w:before="20" w:after="20"/><w:jc w:val="${o.jc ?? 'left'}"/></w:pPr>${run(t, { b: o.b })}</w:p></w:tc>`
  const linha = (a: string, b: string, o: { b?: boolean; sombra?: boolean } = {}) =>
    `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cel(1500, a, { ...o, jc: 'center' })}${cel(7004, b, o)}</w:tr>`
  return `<w:tbl><w:tblPr><w:tblW w:w="8504" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>${COM_BORDA}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblLook w:val="0000"/></w:tblPr>` +
    `<w:tblGrid><w:gridCol w:w="1500"/><w:gridCol w:w="7004"/></w:tblGrid>` +
    linha('QUANT.', 'MATERIAL', { b: true, sombra: true }) +
    itens.map(i => linha(qtd(i.quantidade), ajeitarTexto(i.item))).join('') + '</w:tbl>'
}

interface Assina { nome: string; l1: string; l2: string }
// Cada linha da tabela tem 1 ou 2 assinaturas; uma sozinha fica centralizada.
function tabelaAssinaturas(linhas: Assina[][]): string {
  const p = (t: string, b: boolean, sz = 20) =>
    `<w:p><w:pPr><w:keepNext/><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr>${run(t, { b, sz })}</w:p>`
  const bloco = (a: Assina) => p('_____________________________', false) + p(a.nome, true) + (a.l1 ? p(a.l1, false) : '') + (a.l2 ? p(a.l2, false) : '')
  const celula = (a: Assina, larg: number, span = 1) =>
    `<w:tc><w:tcPr><w:tcW w:w="${larg}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}</w:tcPr>${bloco(a)}</w:tc>`
  const folga = '<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="420"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="8504" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:p></w:tc></w:tr>'
  const rows = linhas.filter(l => l.length).map(l =>
    `<w:tr><w:trPr><w:cantSplit/></w:trPr>${l.length === 1 ? celula(l[0], 8504, 2) : l.map(x => celula(x, 4252)).join('')}</w:tr>`)
  return `<w:tbl><w:tblPr><w:tblW w:w="8504" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>${SEM_BORDA}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblLook w:val="0000"/></w:tblPr>` +
    `<w:tblGrid><w:gridCol w:w="4252"/><w:gridCol w:w="4252"/></w:tblGrid>` + rows.join(folga) + '</w:tbl>'
}

function umTermo(d: DadosTermo, indice: number): string {
  const a = d.atendimento
  const nome = a.resp_nome.trim().toUpperCase()
  const doc = [a.resp_cpf, a.resp_rg].map(x => (x || '').trim()).filter(Boolean).join(' / ')
  const nucleo = Math.max(Number(a.pessoas_afetadas) || 0, d.nMembros > 0 ? d.nMembros + 1 : 0)
  const evento = a.data_ocorrencia ? `, referente ao evento ocorrido em ${a.data_ocorrencia.split('-').reverse().join('/')}` : ''
  const hoje = new Date().getFullYear()
  const dataLinha = d.data ? `Tefé/AM, ${dataExtenso(d.data)}.` : `Tefé/AM, ____ de _______________ de ${hoje}.`

  const corpo: Peca[] = [
    ['Eu '], [nome, true], [', portador do CPF/RG: '], [ou(doc, 20), true], [', residente no endereço: '],
    [ou(a.endereco ? ajeitarEndereco(a.endereco) : '', 30), true],
    [', bairro/comunidade: '], [ou(a.bairro_comunidade ? ajeitarEndereco(a.bairro_comunidade) : '', 18), true],
    [', telefone para contato: '], [ou(a.resp_telefone, 16), true], [', constituída por '], [nucleo > 0 ? String(nucleo) : branco(3), true],
    [' membro(s). Declaro para os devidos fins de direito, inclusive para servir de prova e juízo, que nesta data recebi da Prefeitura Municipal de Tefé - CNPJ nº 04.426.383/0001-15, junto com a Defesa Civil/SEMDCEP, os itens abaixo descritos' + trechoCobrade(a) + evento + '.'],
  ]
  const equipe = SIGNATARIOS_SOCIAL.filter(s => d.assinam.includes(s.id))
  const as = (s: typeof equipe[number]): Assina => ({ nome: s.nome, l1: s.cargoAssinatura1, l2: s.cargoAssinatura2 })
  const odailson = equipe.filter(s => s.id !== 'barbara').map(as)
  const barbara = equipe.filter(s => s.id === 'barbara').map(as)
  const aut: Assina = { nome: d.autoridade.nome, l1: d.autoridade.cargo, l2: d.autoridade.decreto }
  const linha1: Assina[] = [{ nome, l1: 'DONATÁRIO(A)', l2: '' }, ...odailson.slice(0, 1)]
  const linha2: Assina[] = [...barbara, aut]

  return [
    par(run('TERMO DE DOAÇÃO', { b: true, sz: 28 }), { jc: 'center', depois: 40, novaPagina: indice > 0 }),
    a.protocolo ? par(run(`Atendimento nº ${a.protocolo}`, { i: true, sz: 18 }), { jc: 'right', depois: 120 }) : par('', { depois: 60 }),
    par(pecas(corpo), { recuo: 709, depois: 100 }),
    par(run('Declaro que as informações acima são verdadeiras e assumo a responsabilidade sob as penas da lei. Declaro que os itens recebidos estão em conformidade com o que foi acordado e estou ciente de que sou responsável por sua guarda e utilização a partir dessa data.', { sz: 22 }), { recuo: 709, depois: 120 }),
    par(run('Descrição dos materiais:', { b: true }), { jc: 'left', depois: 60, manter: true }),
    tabelaItens(d.itens),
    par('', { depois: 60 }),
    par(run('Termo de Consentimento para Registro Fotográfico', { b: true, sz: 21 }), { jc: 'center', depois: 60, manter: true }),
    par(run('Declaro para os devidos fins que: Autorizo a equipe técnica de Assistência Social da SECRETARIA MUNICIPAL DE DEFESA CIVIL E PATRIMONIAL-SEMDCEP situada na Rua: Monteiro de Souza, Nº: 278 – Centro | Tefé – Amazonas – Brasil, o direito de utilizar registrar fotograficamente a minha imagem e da minha residência para fins de confecção de documentos e relatórios internos e externos. Declaro estar ciente de que a referida imagem será utilizada exclusivamente para os fins mencionados acima e não será divulgada ou utilizada para outros propósitos sem a minha autorização prévia e por escrito.', { sz: 19 }), { depois: 100 }),
    par(run('Por ser esta a expressão da verdade, afirmo o presente.', { sz: 21 }), { jc: 'left', depois: 60, manter: true }),
    par(run(dataLinha, { sz: 21 }), { jc: 'right', depois: 200, manter: true }),
    tabelaAssinaturas([linha1, linha2]),
  ].join('')
}

export async function gerarTermosDoacao(termos: DadosTermo[]): Promise<Blob> {
  if (termos.length === 0) throw new Error('Nenhum termo para gerar.')
  const resp = await fetch('/relatorio-vistoria.docx')
  if (!resp.ok) throw new Error('Modelo do documento não encontrado no servidor.')
  const zip = await JSZip.loadAsync(await resp.arrayBuffer())
  const caminho = 'word/document.xml'
  const xml = await zip.file(caminho)!.async('string')
  const ini = xml.indexOf('<w:body>') + '<w:body>'.length
  const fim = xml.lastIndexOf('<w:sectPr')
  if (ini < 8 || fim < ini) throw new Error('Modelo do documento mudou: corpo não encontrado.')
  zip.file(caminho, xml.slice(0, ini) + termos.map(umTermo).join('') + xml.slice(fim))

  // o termo não leva "Página X de Y" no cabeçalho
  const cab = zip.file('word/header1.xml')
  if (cab) {
    let h = await cab.async('string')
    const i = h.indexOf('Página ')
    if (i >= 0) {
      const a = Math.max(h.lastIndexOf('<w:p>', i), h.lastIndexOf('<w:p ', i))
      const b = h.indexOf('</w:p>', i) + '</w:p>'.length
      h = h.slice(0, a) + h.slice(b)
      zip.file('word/header1.xml', h)
    }
  }

  // sem as fotos do modelo de relatório (o arquivo fica bem menor)
  const relsPath = 'word/_rels/document.xml.rels'
  let rels = await zip.file(relsPath)!.async('string')
  const alvos: string[] = []
  rels = rels.replace(/<Relationship [^>]*Type="[^"]*\/image"[^>]*\/>/g, r => { const t = r.match(/Target="([^"]+)"/)?.[1]; if (t) alvos.push(t); return '' })
  zip.file(relsPath, rels)
  let outras = ''
  for (const nome of Object.keys(zip.files)) if (/^word\/_rels\/.+\.rels$/.test(nome) && nome !== relsPath) outras += await zip.file(nome)!.async('string')
  for (const t of alvos) if (!outras.includes(t.replace(/^.*\//, ''))) zip.remove(`word/${t}`)

  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

export function nomeArquivoTermo(data: string, resp: string, varios = false) {
  const nome = resp.trim().split(/\s+/)[0].normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]/g, '')
  return varios ? `${data}_TERMOS_DOACAO.docx` : `${data}_TERMO_DOACAO_${nome || 'familia'}.docx`
}
